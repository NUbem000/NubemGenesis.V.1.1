/**
 * Capability Watcher for NubemGenesis
 * Monitors component changes and updates capabilities in real-time
 */

import { watch, FSWatcher } from 'chokidar'
import { debounce } from 'lodash'
import * as path from 'path'
import { EventEmitter } from 'events'
import { CapabilityAnalyzer, CapabilityCatalog } from './CapabilityAnalyzer'
import { getRunningExpressApp } from '../utils/getRunningExpressApp'
import * as fs from 'fs/promises'

export interface WatcherConfig {
    componentsPath?: string
    debounceDelay?: number
    ignorePatterns?: string[]
    enableCache?: boolean
    cacheDir?: string
}

export interface ChangeEvent {
    type: 'add' | 'change' | 'unlink'
    path: string
    component?: string
    category?: string
    timestamp: Date
}

export class CapabilityWatcher extends EventEmitter {
    private watcher?: FSWatcher
    private analyzer: CapabilityAnalyzer
    private config: Required<WatcherConfig>
    private isWatching: boolean = false
    private changeQueue: ChangeEvent[] = []
    private processing: boolean = false
    private lastCatalog?: CapabilityCatalog

    constructor(analyzer: CapabilityAnalyzer, config?: WatcherConfig) {
        super()
        this.analyzer = analyzer
        this.config = {
            componentsPath: config?.componentsPath || path.join(__dirname, '../../../components/nodes'),
            debounceDelay: config?.debounceDelay || 5000,
            ignorePatterns: config?.ignorePatterns || ['**/*.test.ts', '**/*.spec.ts', '**/node_modules/**'],
            enableCache: config?.enableCache ?? true,
            cacheDir: config?.cacheDir || path.join(process.cwd(), '.capability-cache')
        }

        // Debounce the processing function
        this.processChanges = debounce(this.processChanges.bind(this), this.config.debounceDelay)
    }

    /**
     * Start watching for component changes
     */
    async start(): Promise<void> {
        if (this.isWatching) {
            console.log('⚠️ Capability watcher is already running')
            return
        }

        console.log('👀 Starting capability watcher...')

        // Load cached catalog if available
        if (this.config.enableCache) {
            await this.loadCachedCatalog()
        }

        // Initialize watcher
        this.watcher = watch(this.config.componentsPath, {
            ignored: this.config.ignorePatterns,
            persistent: true,
            ignoreInitial: true,
            depth: 3,
            awaitWriteFinish: {
                stabilityThreshold: 2000,
                pollInterval: 100
            }
        })

        // Set up event handlers
        this.watcher
            .on('add', path => this.handleFileChange('add', path))
            .on('change', path => this.handleFileChange('change', path))
            .on('unlink', path => this.handleFileChange('unlink', path))
            .on('error', error => this.handleError(error))
            .on('ready', () => this.handleReady())

        this.isWatching = true
    }

    /**
     * Stop watching
     */
    async stop(): Promise<void> {
        if (!this.isWatching) return

        console.log('🛑 Stopping capability watcher...')
        
        if (this.watcher) {
            await this.watcher.close()
            this.watcher = undefined
        }

        this.isWatching = false
        this.changeQueue = []
        this.processing = false
    }

    /**
     * Handle file change events
     */
    private handleFileChange(type: 'add' | 'change' | 'unlink', filePath: string): void {
        // Filter out non-TypeScript files
        if (!filePath.endsWith('.ts') && !filePath.endsWith('.js')) return

        // Extract component info from path
        const relativePath = path.relative(this.config.componentsPath, filePath)
        const parts = relativePath.split(path.sep)
        
        if (parts.length < 2) return

        const category = parts[0]
        const component = parts[1]

        const event: ChangeEvent = {
            type,
            path: filePath,
            category,
            component,
            timestamp: new Date()
        }

        console.log(`📝 Detected ${type} in ${category}/${component}`)
        
        // Add to queue
        this.changeQueue.push(event)
        
        // Trigger processing (debounced)
        this.processChanges()
    }

    /**
     * Process accumulated changes
     */
    private async processChanges(): Promise<void> {
        if (this.processing || this.changeQueue.length === 0) return

        this.processing = true
        const changes = [...this.changeQueue]
        this.changeQueue = []

        console.log(`🔄 Processing ${changes.length} component changes...`)

        try {
            // Re-analyze capabilities
            const startTime = Date.now()
            const newCatalog = await this.analyzer.analyzeCapabilities()
            const analysisTime = Date.now() - startTime

            // Compare with previous catalog
            const diff = this.compareCatalogs(this.lastCatalog, newCatalog)
            
            // Emit change event
            this.emit('catalogUpdated', {
                catalog: newCatalog,
                changes,
                diff,
                analysisTime
            })

            // Notify Express app
            const app = getRunningExpressApp()
            if (app) {
                app.emit('capabilities:updated', {
                    catalog: newCatalog,
                    changes,
                    diff,
                    timestamp: new Date()
                })
            }

            // Cache the new catalog
            if (this.config.enableCache) {
                await this.cacheCatalog(newCatalog)
            }

            this.lastCatalog = newCatalog

            console.log(`✅ Capability analysis completed in ${analysisTime}ms`)
            console.log(`   Added: ${diff.added.length}, Modified: ${diff.modified.length}, Removed: ${diff.removed.length}`)

        } catch (error) {
            console.error('❌ Error processing changes:', error)
            this.emit('error', error)
        } finally {
            this.processing = false
        }
    }

    /**
     * Compare two catalogs to find differences
     */
    private compareCatalogs(oldCatalog?: CapabilityCatalog, newCatalog?: CapabilityCatalog): {
        added: string[]
        modified: string[]
        removed: string[]
    } {
        const diff = {
            added: [] as string[],
            modified: [] as string[],
            removed: [] as string[]
        }

        if (!oldCatalog || !newCatalog) {
            return diff
        }

        // Find added and modified components
        for (const [id, newComponent] of newCatalog.components) {
            const oldComponent = oldCatalog.components.get(id)
            
            if (!oldComponent) {
                diff.added.push(id)
            } else if (JSON.stringify(oldComponent) !== JSON.stringify(newComponent)) {
                diff.modified.push(id)
            }
        }

        // Find removed components
        for (const [id] of oldCatalog.components) {
            if (!newCatalog.components.has(id)) {
                diff.removed.push(id)
            }
        }

        return diff
    }

    /**
     * Load cached catalog
     */
    private async loadCachedCatalog(): Promise<void> {
        try {
            const cachePath = path.join(this.config.cacheDir, 'capability-catalog.json')
            const data = await fs.readFile(cachePath, 'utf-8')
            const cached = JSON.parse(data)
            
            // Verify cache is recent (less than 1 hour old)
            const cacheAge = Date.now() - new Date(cached.lastUpdated).getTime()
            if (cacheAge < 3600000) {
                this.analyzer.importCatalog(data)
                this.lastCatalog = cached
                console.log('📦 Loaded cached capability catalog')
            }
        } catch (error) {
            // Cache doesn't exist or is invalid, will be created on first analysis
        }
    }

    /**
     * Cache the catalog
     */
    private async cacheCatalog(catalog: CapabilityCatalog): Promise<void> {
        try {
            await fs.mkdir(this.config.cacheDir, { recursive: true })
            const cachePath = path.join(this.config.cacheDir, 'capability-catalog.json')
            const data = this.analyzer.exportCatalog()
            await fs.writeFile(cachePath, data)
        } catch (error) {
            console.error('Failed to cache catalog:', error)
        }
    }

    /**
     * Handle watcher ready event
     */
    private handleReady(): void {
        console.log('✅ Capability watcher is ready')
        this.emit('ready')
        
        // Perform initial analysis
        this.processChanges()
    }

    /**
     * Handle watcher errors
     */
    private handleError(error: Error): void {
        console.error('❌ Watcher error:', error)
        this.emit('error', error)
    }

    /**
     * Get current watching status
     */
    isActive(): boolean {
        return this.isWatching
    }

    /**
     * Get change statistics
     */
    getStats(): {
        isWatching: boolean
        queueLength: number
        isProcessing: boolean
        lastUpdate?: Date
    } {
        return {
            isWatching: this.isWatching,
            queueLength: this.changeQueue.length,
            isProcessing: this.processing,
            lastUpdate: this.lastCatalog?.lastUpdated
        }
    }
}

// Create and export singleton instance
let watcherInstance: CapabilityWatcher | null = null

export function getCapabilityWatcher(analyzer?: CapabilityAnalyzer): CapabilityWatcher {
    if (!watcherInstance && analyzer) {
        watcherInstance = new CapabilityWatcher(analyzer)
    }
    
    if (!watcherInstance) {
        throw new Error('CapabilityWatcher not initialized. Provide analyzer on first call.')
    }
    
    return watcherInstance
}