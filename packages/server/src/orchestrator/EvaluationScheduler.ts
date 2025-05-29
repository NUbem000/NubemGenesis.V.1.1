/**
 * Evaluation Scheduler for NubemGenesis
 * Automated scheduling and execution of model evaluations
 */

import * as cron from 'node-cron'
import { EventEmitter } from 'events'
import { EvaluationPipeline, EvaluationReport } from './EvaluationPipeline'
import { LiteLLMRouterV2 } from './LiteLLMRouterV2'
import { getRunningExpressApp } from '../utils/getRunningExpressApp'
import axios from 'axios'
import * as fs from 'fs/promises'
import * as path from 'path'

export interface SchedulerConfig {
    enableDailyEval?: boolean
    enableWeeklyEval?: boolean
    enableNewModelCheck?: boolean
    dailyEvalTime?: string  // Cron expression
    weeklyEvalTime?: string // Cron expression
    newModelCheckInterval?: string // Cron expression
    primaryModels?: string[]
    webhookUrl?: string
    storageDir?: string
}

export interface ModelUpdate {
    provider: string
    modelId: string
    version?: string
    releaseDate?: Date
    capabilities?: string[]
}

export interface ScheduledJob {
    name: string
    schedule: string
    task: cron.ScheduledTask
    lastRun?: Date
    nextRun?: Date
    status: 'active' | 'paused' | 'error'
}

export class EvaluationScheduler extends EventEmitter {
    private jobs: Map<string, ScheduledJob> = new Map()
    private evaluationPipeline: EvaluationPipeline
    private litellmRouter: LiteLLMRouterV2
    private config: Required<SchedulerConfig>
    private isRunning: boolean = false
    private knownModels: Set<string> = new Set()

    constructor(
        evaluationPipeline: EvaluationPipeline,
        litellmRouter: LiteLLMRouterV2,
        config?: SchedulerConfig
    ) {
        super()
        this.evaluationPipeline = evaluationPipeline
        this.litellmRouter = litellmRouter
        this.config = {
            enableDailyEval: config?.enableDailyEval ?? true,
            enableWeeklyEval: config?.enableWeeklyEval ?? true,
            enableNewModelCheck: config?.enableNewModelCheck ?? true,
            dailyEvalTime: config?.dailyEvalTime || '0 2 * * *',      // 2 AM daily
            weeklyEvalTime: config?.weeklyEvalTime || '0 3 * * 0',   // 3 AM Sunday
            newModelCheckInterval: config?.newModelCheckInterval || '0 */6 * * *', // Every 6 hours
            primaryModels: config?.primaryModels || [
                'gpt-4-turbo-preview',
                'claude-3-opus-20240229',
                'gemini-pro'
            ],
            webhookUrl: config?.webhookUrl || process.env.EVAL_WEBHOOK_URL || '',
            storageDir: config?.storageDir || path.join(process.cwd(), 'evaluations')
        }
    }

    /**
     * Start the scheduler
     */
    async start(): Promise<void> {
        if (this.isRunning) {
            console.log('⚠️ Evaluation scheduler is already running')
            return
        }

        console.log('🚀 Starting evaluation scheduler...')

        // Load known models
        await this.loadKnownModels()

        // Schedule daily evaluation
        if (this.config.enableDailyEval) {
            this.scheduleJob('daily-eval', this.config.dailyEvalTime, 
                this.runDailyEvaluation.bind(this))
        }

        // Schedule weekly comprehensive evaluation
        if (this.config.enableWeeklyEval) {
            this.scheduleJob('weekly-eval', this.config.weeklyEvalTime,
                this.runWeeklyEvaluation.bind(this))
        }

        // Schedule new model checks
        if (this.config.enableNewModelCheck) {
            this.scheduleJob('new-model-check', this.config.newModelCheckInterval,
                this.checkForNewModels.bind(this))
        }

        this.isRunning = true
        console.log('✅ Evaluation scheduler started')
        this.emit('started')
    }

    /**
     * Stop the scheduler
     */
    stop(): void {
        if (!this.isRunning) return

        console.log('🛑 Stopping evaluation scheduler...')

        // Stop all jobs
        this.jobs.forEach((job, name) => {
            job.task.stop()
            console.log(`   Stopped job: ${name}`)
        })

        this.jobs.clear()
        this.isRunning = false
        
        console.log('✅ Evaluation scheduler stopped')
        this.emit('stopped')
    }

    /**
     * Schedule a job
     */
    private scheduleJob(name: string, schedule: string, handler: () => Promise<void>): void {
        if (!cron.validate(schedule)) {
            console.error(`❌ Invalid cron expression for ${name}: ${schedule}`)
            return
        }

        const task = cron.schedule(schedule, async () => {
            const job = this.jobs.get(name)
            if (!job) return

            job.lastRun = new Date()
            console.log(`🔄 Running scheduled job: ${name}`)
            
            try {
                await handler()
                this.emit('jobCompleted', { name, timestamp: new Date() })
            } catch (error) {
                console.error(`❌ Error in scheduled job ${name}:`, error)
                job.status = 'error'
                this.emit('jobError', { name, error, timestamp: new Date() })
            }
        }, {
            scheduled: true,
            timezone: process.env.TZ || 'UTC'
        })

        const job: ScheduledJob = {
            name,
            schedule,
            task,
            nextRun: this.getNextRunTime(schedule),
            status: 'active'
        }

        this.jobs.set(name, job)
        console.log(`📅 Scheduled job: ${name} (${schedule})`)
    }

    /**
     * Run daily evaluation on primary models
     */
    private async runDailyEvaluation(): Promise<void> {
        console.log('🔍 Starting daily model evaluation...')
        
        const results = new Map<string, EvaluationReport>()
        
        for (const modelId of this.config.primaryModels) {
            try {
                console.log(`   Evaluating ${modelId}...`)
                const report = await this.evaluationPipeline.evaluateModel(modelId, [
                    'reasoning-001',
                    'instruction-001'
                ])
                results.set(modelId, report)
                
                // Update router metrics
                await this.updateRouterMetrics(modelId, report)
                
            } catch (error) {
                console.error(`   Failed to evaluate ${modelId}:`, error)
            }
        }

        // Process and store results
        await this.processEvaluationResults(results, 'daily')
        
        // Send summary
        await this.sendEvaluationSummary(results, 'daily')
        
        console.log('✅ Daily evaluation completed')
    }

    /**
     * Run comprehensive weekly evaluation
     */
    private async runWeeklyEvaluation(): Promise<void> {
        console.log('🔍 Starting weekly comprehensive evaluation...')
        
        // Get all available models
        const models = await this.litellmRouter.listModels()
        const modelIds = models.map(m => m.model_name || m.id)
        
        console.log(`   Found ${modelIds.length} models to evaluate`)
        
        const results = await this.evaluationPipeline.compareModels(modelIds)
        
        // Process and store results
        await this.processEvaluationResults(results, 'weekly')
        
        // Update all router metrics
        for (const [modelId, report] of results) {
            await this.updateRouterMetrics(modelId, report)
        }
        
        // Generate insights
        const insights = this.generateWeeklyInsights(results)
        await this.storeInsights(insights)
        
        // Send comprehensive report
        await this.sendEvaluationSummary(results, 'weekly', insights)
        
        console.log('✅ Weekly evaluation completed')
    }

    /**
     * Check for new models across providers
     */
    private async checkForNewModels(): Promise<void> {
        console.log('🔍 Checking for new models...')
        
        const newModels: ModelUpdate[] = []
        const providers = ['openai', 'anthropic', 'google', 'mistral']
        
        for (const provider of providers) {
            try {
                const models = await this.fetchProviderModels(provider)
                const updates = this.identifyNewModels(provider, models)
                
                if (updates.length > 0) {
                    console.log(`   Found ${updates.length} new models from ${provider}`)
                    newModels.push(...updates)
                }
            } catch (error) {
                console.error(`   Error checking ${provider}:`, error)
            }
        }

        if (newModels.length > 0) {
            console.log(`🆕 Total new models found: ${newModels.length}`)
            
            // Evaluate new models
            for (const model of newModels) {
                await this.evaluateNewModel(model)
            }
            
            // Update known models
            await this.updateKnownModels(newModels)
            
            // Notify about new models
            await this.notifyNewModels(newModels)
        } else {
            console.log('   No new models found')
        }
    }

    /**
     * Fetch models from a provider
     */
    private async fetchProviderModels(provider: string): Promise<any[]> {
        // This would integrate with actual provider APIs
        // For now, using LiteLLM's model list
        const models = await this.litellmRouter.listModels()
        return models.filter(m => 
            m.model_name?.toLowerCase().includes(provider) ||
            m.id?.toLowerCase().includes(provider)
        )
    }

    /**
     * Identify new models
     */
    private identifyNewModels(provider: string, models: any[]): ModelUpdate[] {
        const updates: ModelUpdate[] = []
        
        for (const model of models) {
            const modelId = model.model_name || model.id
            
            if (!this.knownModels.has(modelId)) {
                updates.push({
                    provider,
                    modelId,
                    version: model.version,
                    releaseDate: model.created ? new Date(model.created * 1000) : undefined,
                    capabilities: this.extractCapabilities(model)
                })
            }
        }
        
        return updates
    }

    /**
     * Extract capabilities from model info
     */
    private extractCapabilities(model: any): string[] {
        const capabilities: string[] = []
        
        if (model.capabilities) {
            if (model.capabilities.vision) capabilities.push('vision')
            if (model.capabilities.function_calling) capabilities.push('function-calling')
            if (model.capabilities.streaming) capabilities.push('streaming')
        }
        
        // Infer from model name
        const name = (model.model_name || model.id || '').toLowerCase()
        if (name.includes('vision') || name.includes('gpt-4v')) capabilities.push('vision')
        if (name.includes('instruct')) capabilities.push('instruction-following')
        if (name.includes('code')) capabilities.push('code-generation')
        
        return capabilities
    }

    /**
     * Evaluate a new model
     */
    private async evaluateNewModel(model: ModelUpdate): Promise<void> {
        console.log(`🧪 Evaluating new model: ${model.modelId}`)
        
        try {
            // Run quick evaluation
            const report = await this.evaluationPipeline.evaluateModel(model.modelId, [
                'reasoning-001',
                'instruction-001'
            ])
            
            // Store results
            await this.storeNewModelEvaluation(model, report)
            
            // Update router if model performs well
            if (report.overallScore > 0.7) {
                await this.updateRouterMetrics(model.modelId, report)
                console.log(`   ✅ Model ${model.modelId} added to router`)
            } else {
                console.log(`   ⚠️ Model ${model.modelId} scored too low (${report.overallScore})`)
            }
            
        } catch (error) {
            console.error(`   Failed to evaluate ${model.modelId}:`, error)
        }
    }

    /**
     * Update router metrics with evaluation results
     */
    private async updateRouterMetrics(modelId: string, report: EvaluationReport): Promise<void> {
        // This would update the actual router metrics
        // For now, logging the update
        console.log(`📊 Updating router metrics for ${modelId}`)
        
        const app = getRunningExpressApp()
        if (app) {
            app.emit('model:metrics:updated', {
                modelId,
                metrics: {
                    quality: report.categoryScores,
                    performance: report.performanceMetrics,
                    cost: report.costAnalysis,
                    lastEvaluated: new Date()
                }
            })
        }
    }

    /**
     * Process evaluation results
     */
    private async processEvaluationResults(
        results: Map<string, EvaluationReport>,
        evaluationType: 'daily' | 'weekly'
    ): Promise<void> {
        // Store results
        const timestamp = new Date().toISOString().replace(/:/g, '-')
        const filename = `${evaluationType}-evaluation-${timestamp}.json`
        const filepath = path.join(this.config.storageDir, filename)
        
        const data = {
            type: evaluationType,
            timestamp: new Date(),
            results: Array.from(results.entries()),
            summary: this.generateSummary(results)
        }
        
        try {
            await fs.mkdir(this.config.storageDir, { recursive: true })
            await fs.writeFile(filepath, JSON.stringify(data, null, 2))
            console.log(`💾 Results saved to: ${filename}`)
        } catch (error) {
            console.error('Failed to save results:', error)
        }
    }

    /**
     * Generate summary of results
     */
    private generateSummary(results: Map<string, EvaluationReport>): any {
        const models = Array.from(results.entries())
        
        return {
            totalModels: models.length,
            topPerformer: models.sort((a, b) => b[1].overallScore - a[1].overallScore)[0]?.[0],
            averageScore: models.reduce((sum, [_, r]) => sum + r.overallScore, 0) / models.length,
            bestByCategory: this.getBestByCategory(results),
            recommendations: this.generateRecommendations(results)
        }
    }

    /**
     * Get best model by category
     */
    private getBestByCategory(results: Map<string, EvaluationReport>): Record<string, string> {
        const categories = ['reasoning', 'coding', 'creativity', 'instruction-following']
        const bestByCategory: Record<string, string> = {}
        
        for (const category of categories) {
            let bestModel = ''
            let bestScore = 0
            
            for (const [modelId, report] of results) {
                const score = report.categoryScores[category] || 0
                if (score > bestScore) {
                    bestScore = score
                    bestModel = modelId
                }
            }
            
            if (bestModel) {
                bestByCategory[category] = bestModel
            }
        }
        
        return bestByCategory
    }

    /**
     * Generate recommendations based on results
     */
    private generateRecommendations(results: Map<string, EvaluationReport>): string[] {
        const recommendations: string[] = []
        const models = Array.from(results.entries())
        
        // Find cost-effective models
        const costEffective = models
            .filter(([_, r]) => r.overallScore > 0.7 && r.costAnalysis.avgCostPerRequest < 0.01)
            .map(([id]) => id)
        
        if (costEffective.length > 0) {
            recommendations.push(`Consider ${costEffective.join(', ')} for cost-sensitive applications`)
        }
        
        // Find high-performance models
        const highPerf = models
            .filter(([_, r]) => r.performanceMetrics.avgLatency < 1000)
            .map(([id]) => id)
        
        if (highPerf.length > 0) {
            recommendations.push(`Use ${highPerf.join(', ')} for low-latency requirements`)
        }
        
        return recommendations
    }

    /**
     * Generate weekly insights
     */
    private generateWeeklyInsights(results: Map<string, EvaluationReport>): any {
        return {
            trends: this.analyzeTrends(results),
            anomalies: this.detectAnomalies(results),
            costAnalysis: this.analyzeCosts(results),
            performanceAnalysis: this.analyzePerformance(results),
            recommendations: this.generateRecommendations(results)
        }
    }

    /**
     * Analyze trends (simplified)
     */
    private analyzeTrends(results: Map<string, EvaluationReport>): any {
        // This would compare with historical data
        return {
            improving: [],
            declining: [],
            stable: Array.from(results.keys())
        }
    }

    /**
     * Detect anomalies (simplified)
     */
    private detectAnomalies(results: Map<string, EvaluationReport>): any[] {
        const anomalies: any[] = []
        
        for (const [modelId, report] of results) {
            // High error rate
            if (report.performanceMetrics.errorRate > 0.1) {
                anomalies.push({
                    model: modelId,
                    type: 'high-error-rate',
                    value: report.performanceMetrics.errorRate
                })
            }
            
            // Unusually high latency
            if (report.performanceMetrics.avgLatency > 5000) {
                anomalies.push({
                    model: modelId,
                    type: 'high-latency',
                    value: report.performanceMetrics.avgLatency
                })
            }
        }
        
        return anomalies
    }

    /**
     * Analyze costs
     */
    private analyzeCosts(results: Map<string, EvaluationReport>): any {
        const models = Array.from(results.entries())
        const costs = models.map(([id, r]) => ({
            model: id,
            costPerRequest: r.costAnalysis.avgCostPerRequest,
            costEfficiency: r.costAnalysis.costEfficiencyScore
        }))
        
        return {
            mostExpensive: costs.sort((a, b) => b.costPerRequest - a.costPerRequest)[0],
            mostCostEfficient: costs.sort((a, b) => b.costEfficiency - a.costEfficiency)[0],
            averageCost: costs.reduce((sum, c) => sum + c.costPerRequest, 0) / costs.length
        }
    }

    /**
     * Analyze performance
     */
    private analyzePerformance(results: Map<string, EvaluationReport>): any {
        const models = Array.from(results.entries())
        const perfs = models.map(([id, r]) => ({
            model: id,
            avgLatency: r.performanceMetrics.avgLatency,
            p95Latency: r.performanceMetrics.p95Latency,
            throughput: r.performanceMetrics.throughput
        }))
        
        return {
            fastest: perfs.sort((a, b) => a.avgLatency - b.avgLatency)[0],
            highestThroughput: perfs.sort((a, b) => b.throughput - a.throughput)[0],
            averageLatency: perfs.reduce((sum, p) => sum + p.avgLatency, 0) / perfs.length
        }
    }

    /**
     * Send evaluation summary
     */
    private async sendEvaluationSummary(
        results: Map<string, EvaluationReport>,
        type: 'daily' | 'weekly',
        insights?: any
    ): Promise<void> {
        if (!this.config.webhookUrl) return
        
        const summary = this.generateSummary(results)
        
        try {
            await axios.post(this.config.webhookUrl, {
                event: `evaluation_${type}_completed`,
                timestamp: new Date(),
                summary,
                insights,
                modelCount: results.size
            })
            
            console.log('📤 Evaluation summary sent to webhook')
        } catch (error) {
            console.error('Failed to send webhook:', error)
        }
    }

    /**
     * Store insights
     */
    private async storeInsights(insights: any): Promise<void> {
        const timestamp = new Date().toISOString().replace(/:/g, '-')
        const filepath = path.join(this.config.storageDir, 'insights', `weekly-insights-${timestamp}.json`)
        
        try {
            await fs.mkdir(path.dirname(filepath), { recursive: true })
            await fs.writeFile(filepath, JSON.stringify(insights, null, 2))
        } catch (error) {
            console.error('Failed to store insights:', error)
        }
    }

    /**
     * Notify about new models
     */
    private async notifyNewModels(models: ModelUpdate[]): Promise<void> {
        this.emit('newModelsFound', models)
        
        if (this.config.webhookUrl) {
            try {
                await axios.post(this.config.webhookUrl, {
                    event: 'new_models_found',
                    timestamp: new Date(),
                    models
                })
            } catch (error) {
                console.error('Failed to send new models notification:', error)
            }
        }
    }

    /**
     * Load known models from storage
     */
    private async loadKnownModels(): Promise<void> {
        const filepath = path.join(this.config.storageDir, 'known-models.json')
        
        try {
            const data = await fs.readFile(filepath, 'utf-8')
            const models = JSON.parse(data)
            this.knownModels = new Set(models)
            console.log(`📋 Loaded ${this.knownModels.size} known models`)
        } catch (error) {
            // File doesn't exist, will be created on first update
            console.log('📋 No known models file found, starting fresh')
        }
    }

    /**
     * Update known models
     */
    private async updateKnownModels(newModels: ModelUpdate[]): Promise<void> {
        newModels.forEach(m => this.knownModels.add(m.modelId))
        
        const filepath = path.join(this.config.storageDir, 'known-models.json')
        
        try {
            await fs.mkdir(this.config.storageDir, { recursive: true })
            await fs.writeFile(
                filepath, 
                JSON.stringify(Array.from(this.knownModels), null, 2)
            )
        } catch (error) {
            console.error('Failed to update known models:', error)
        }
    }

    /**
     * Store new model evaluation
     */
    private async storeNewModelEvaluation(
        model: ModelUpdate,
        report: EvaluationReport
    ): Promise<void> {
        const filepath = path.join(
            this.config.storageDir,
            'new-models',
            `${model.modelId.replace(/[^a-zA-Z0-9-]/g, '_')}.json`
        )
        
        try {
            await fs.mkdir(path.dirname(filepath), { recursive: true })
            await fs.writeFile(filepath, JSON.stringify({
                model,
                report,
                evaluatedAt: new Date()
            }, null, 2))
        } catch (error) {
            console.error('Failed to store new model evaluation:', error)
        }
    }

    /**
     * Get next run time for a cron expression
     */
    private getNextRunTime(cronExpression: string): Date {
        // This is a simplified implementation
        // In production, use a proper cron parser
        const now = new Date()
        const next = new Date(now)
        
        // Parse hour from daily schedule (e.g., "0 2 * * *" -> 2 AM)
        const parts = cronExpression.split(' ')
        if (parts.length >= 2) {
            const hour = parseInt(parts[1])
            if (!isNaN(hour)) {
                next.setHours(hour, 0, 0, 0)
                if (next <= now) {
                    next.setDate(next.getDate() + 1)
                }
            }
        }
        
        return next
    }

    /**
     * Get scheduler status
     */
    getStatus(): {
        isRunning: boolean
        jobs: Array<{
            name: string
            schedule: string
            status: string
            lastRun?: Date
            nextRun?: Date
        }>
    } {
        return {
            isRunning: this.isRunning,
            jobs: Array.from(this.jobs.entries()).map(([name, job]) => ({
                name,
                schedule: job.schedule,
                status: job.status,
                lastRun: job.lastRun,
                nextRun: job.nextRun
            }))
        }
    }

    /**
     * Manually trigger a job
     */
    async triggerJob(jobName: string): Promise<void> {
        const handlers: Record<string, () => Promise<void>> = {
            'daily-eval': this.runDailyEvaluation.bind(this),
            'weekly-eval': this.runWeeklyEvaluation.bind(this),
            'new-model-check': this.checkForNewModels.bind(this)
        }
        
        const handler = handlers[jobName]
        if (!handler) {
            throw new Error(`Unknown job: ${jobName}`)
        }
        
        console.log(`🔧 Manually triggering job: ${jobName}`)
        await handler()
    }
}

// Export factory function
export function createEvaluationScheduler(
    evaluationPipeline: EvaluationPipeline,
    litellmRouter: LiteLLMRouterV2,
    config?: SchedulerConfig
): EvaluationScheduler {
    return new EvaluationScheduler(evaluationPipeline, litellmRouter, config)
}