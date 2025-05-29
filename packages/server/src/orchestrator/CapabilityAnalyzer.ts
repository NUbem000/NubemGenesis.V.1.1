/**
 * Capability Analyzer for NubemGenesis
 * Dynamically analyzes and catalogs all available components and their capabilities
 */

import * as fs from 'fs'
import * as path from 'path'
import { INode, INodeData, INodeParams } from '../../../components/src/Interface'

export interface ComponentCapability {
    id: string
    name: string
    category: string
    description: string
    version: number
    baseClasses: string[]
    inputs: INodeParams[]
    outputs: string[]
    features: string[]
    modelSupport?: string[]
    cost?: {
        setup?: number
        perRequest?: number
    }
    performance?: {
        avgLatency?: number
        throughput?: number
    }
    tags: string[]
}

export interface CapabilityCatalog {
    components: Map<string, ComponentCapability>
    categories: Map<string, string[]>
    features: Map<string, string[]>
    lastUpdated: Date
}

export class CapabilityAnalyzer {
    private componentsPath: string
    private catalog: CapabilityCatalog
    private semanticIndex: Map<string, Set<string>> // keyword -> component IDs

    constructor(componentsPath?: string) {
        this.componentsPath = componentsPath || path.join(__dirname, '../../../components/nodes')
        this.catalog = {
            components: new Map(),
            categories: new Map(),
            features: new Map(),
            lastUpdated: new Date()
        }
        this.semanticIndex = new Map()
    }

    /**
     * Scan all components and build capability catalog
     */
    async analyzeCapabilities(): Promise<CapabilityCatalog> {
        console.log('🔍 Starting capability analysis...')
        
        try {
            // Get all node categories
            const categories = await this.getNodeCategories()
            
            for (const category of categories) {
                const categoryPath = path.join(this.componentsPath, category)
                const nodes = await this.getNodesInCategory(categoryPath)
                
                for (const node of nodes) {
                    try {
                        const capability = await this.analyzeNode(category, node)
                        if (capability) {
                            this.catalog.components.set(capability.id, capability)
                            this.updateCategoryIndex(category, capability.id)
                            this.updateFeatureIndex(capability)
                            this.updateSemanticIndex(capability)
                        }
                    } catch (error) {
                        console.error(`Error analyzing node ${node}:`, error)
                    }
                }
            }
            
            this.catalog.lastUpdated = new Date()
            console.log(`✅ Analysis complete. Found ${this.catalog.components.size} components`)
            
            return this.catalog
        } catch (error) {
            console.error('Error during capability analysis:', error)
            throw error
        }
    }

    /**
     * Get all node categories by scanning directory structure
     */
    private async getNodeCategories(): Promise<string[]> {
        const items = await fs.promises.readdir(this.componentsPath, { withFileTypes: true })
        return items
            .filter(item => item.isDirectory())
            .map(item => item.name)
            .filter(name => !name.startsWith('.'))
    }

    /**
     * Get all nodes in a category
     */
    private async getNodesInCategory(categoryPath: string): Promise<string[]> {
        const items = await fs.promises.readdir(categoryPath, { withFileTypes: true })
        return items
            .filter(item => item.isDirectory())
            .map(item => item.name)
            .filter(name => !name.startsWith('.'))
    }

    /**
     * Analyze a single node and extract its capabilities
     */
    private async analyzeNode(category: string, nodeName: string): Promise<ComponentCapability | null> {
        const nodePath = path.join(this.componentsPath, category, nodeName)
        const indexPath = path.join(nodePath, `${nodeName}.ts`)
        
        if (!fs.existsSync(indexPath)) {
            return null
        }
        
        try {
            // Read the node file to extract metadata
            const content = await fs.promises.readFile(indexPath, 'utf-8')
            
            // Extract component info using regex patterns
            const capability: ComponentCapability = {
                id: `${category}/${nodeName}`,
                name: this.extractNodeName(content) || nodeName,
                category: category,
                description: this.extractDescription(content),
                version: this.extractVersion(content) || 1.0,
                baseClasses: this.extractBaseClasses(content),
                inputs: this.extractInputs(content),
                outputs: this.extractOutputs(content),
                features: this.extractFeatures(content, category, nodeName),
                tags: this.generateTags(category, nodeName, content)
            }
            
            // Add model support for LLM nodes
            if (category === 'chatmodels' || category === 'llms') {
                capability.modelSupport = this.extractModelSupport(content)
            }
            
            return capability
        } catch (error) {
            console.error(`Error reading node ${nodeName}:`, error)
            return null
        }
    }

    /**
     * Extract node display name from content
     */
    private extractNodeName(content: string): string | null {
        const match = content.match(/label:\s*['"`](.+?)['"`]/);
        return match ? match[1] : null;
    }

    /**
     * Extract node description
     */
    private extractDescription(content: string): string {
        const match = content.match(/description:\s*['"`](.+?)['"`]/);
        if (match) return match[1];
        
        // Try to extract from comments
        const commentMatch = content.match(/\/\*\*\s*\n\s*\*\s*(.+?)\n/);
        return commentMatch ? commentMatch[1] : 'No description available';
    }

    /**
     * Extract version number
     */
    private extractVersion(content: string): number | null {
        const match = content.match(/version:\s*(\d+\.?\d*)/);
        return match ? parseFloat(match[1]) : null;
    }

    /**
     * Extract base classes
     */
    private extractBaseClasses(content: string): string[] {
        const match = content.match(/baseClasses:\s*\[([^\]]+)\]/);
        if (!match) return [];
        
        return match[1]
            .split(',')
            .map(s => s.trim().replace(/['"]/g, ''))
            .filter(s => s.length > 0);
    }

    /**
     * Extract input parameters
     */
    private extractInputs(content: string): INodeParams[] {
        const inputs: INodeParams[] = [];
        const inputsMatch = content.match(/inputs:\s*\[[\s\S]*?\](?=\s*(outputs|async))/);
        
        if (inputsMatch) {
            // Parse individual input objects
            const inputPattern = /\{([^}]+)\}/g;
            let match;
            
            while ((match = inputPattern.exec(inputsMatch[0])) !== null) {
                const inputStr = match[1];
                const input: any = {};
                
                // Extract properties
                const labelMatch = inputStr.match(/label:\s*['"`](.+?)['"`]/);
                if (labelMatch) input.label = labelMatch[1];
                
                const nameMatch = inputStr.match(/name:\s*['"`](.+?)['"`]/);
                if (nameMatch) input.name = nameMatch[1];
                
                const typeMatch = inputStr.match(/type:\s*['"`](.+?)['"`]/);
                if (typeMatch) input.type = typeMatch[1];
                
                const optionalMatch = inputStr.match(/optional:\s*(true|false)/);
                if (optionalMatch) input.optional = optionalMatch[1] === 'true';
                
                if (input.name) inputs.push(input);
            }
        }
        
        return inputs;
    }

    /**
     * Extract outputs
     */
    private extractOutputs(content: string): string[] {
        const match = content.match(/outputs:\s*\[([^\]]+)\]/);
        if (!match) return [];
        
        return match[1]
            .split(',')
            .map(s => s.trim().replace(/['"]/g, ''))
            .filter(s => s.length > 0);
    }

    /**
     * Extract features based on category and content analysis
     */
    private extractFeatures(content: string, category: string, nodeName: string): string[] {
        const features: string[] = [];
        
        // Category-based features
        switch (category) {
            case 'chatmodels':
                features.push('language-model', 'text-generation');
                if (content.includes('streaming')) features.push('streaming');
                if (content.includes('function')) features.push('function-calling');
                break;
            case 'agents':
                features.push('autonomous', 'tool-use');
                if (content.includes('memory')) features.push('memory');
                if (content.includes('planning')) features.push('planning');
                break;
            case 'vectorstores':
                features.push('vector-search', 'embedding-storage');
                if (content.includes('metadata')) features.push('metadata-filtering');
                break;
            case 'documentloaders':
                features.push('document-processing');
                if (content.includes('pdf')) features.push('pdf-support');
                if (content.includes('csv')) features.push('csv-support');
                break;
            case 'tools':
                features.push('external-integration');
                if (content.includes('api')) features.push('api-calling');
                if (content.includes('browser')) features.push('web-browsing');
                break;
        }
        
        // Content-based features
        if (content.includes('memory')) features.push('stateful');
        if (content.includes('cache')) features.push('caching');
        if (content.includes('retry')) features.push('error-handling');
        if (content.includes('auth')) features.push('authentication');
        
        return [...new Set(features)]; // Remove duplicates
    }

    /**
     * Extract supported models for LLM nodes
     */
    private extractModelSupport(content: string): string[] {
        const models: string[] = [];
        
        // Common model patterns
        const modelPatterns = [
            /gpt-4/gi,
            /gpt-3\.5/gi,
            /claude/gi,
            /palm/gi,
            /llama/gi,
            /mistral/gi,
            /gemini/gi,
            /cohere/gi
        ];
        
        for (const pattern of modelPatterns) {
            if (pattern.test(content)) {
                models.push(pattern.source.replace(/[\\^$]/g, ''));
            }
        }
        
        return models;
    }

    /**
     * Generate semantic tags for searching
     */
    private generateTags(category: string, nodeName: string, content: string): string[] {
        const tags: string[] = [category, nodeName.toLowerCase()];
        
        // Add common keywords
        const keywords = [
            'chat', 'completion', 'embedding', 'vector', 'memory',
            'tool', 'agent', 'chain', 'document', 'loader', 'store',
            'api', 'function', 'search', 'retrieval', 'generation'
        ];
        
        for (const keyword of keywords) {
            if (content.toLowerCase().includes(keyword)) {
                tags.push(keyword);
            }
        }
        
        return [...new Set(tags)];
    }

    /**
     * Update category index
     */
    private updateCategoryIndex(category: string, componentId: string): void {
        if (!this.catalog.categories.has(category)) {
            this.catalog.categories.set(category, []);
        }
        this.catalog.categories.get(category)!.push(componentId);
    }

    /**
     * Update feature index
     */
    private updateFeatureIndex(capability: ComponentCapability): void {
        for (const feature of capability.features) {
            if (!this.catalog.features.has(feature)) {
                this.catalog.features.set(feature, []);
            }
            this.catalog.features.get(feature)!.push(capability.id);
        }
    }

    /**
     * Update semantic index for natural language search
     */
    private updateSemanticIndex(capability: ComponentCapability): void {
        const keywords = [
            ...capability.tags,
            ...capability.features,
            capability.name.toLowerCase(),
            capability.category.toLowerCase()
        ];
        
        for (const keyword of keywords) {
            if (!this.semanticIndex.has(keyword)) {
                this.semanticIndex.set(keyword, new Set());
            }
            this.semanticIndex.get(keyword)!.add(capability.id);
        }
    }

    /**
     * Search capabilities by natural language query
     */
    searchCapabilities(query: string): ComponentCapability[] {
        const queryTokens = query.toLowerCase().split(/\s+/);
        const scores = new Map<string, number>();
        
        // Score each component based on keyword matches
        for (const token of queryTokens) {
            const matches = this.semanticIndex.get(token);
            if (matches) {
                for (const componentId of matches) {
                    scores.set(componentId, (scores.get(componentId) || 0) + 1);
                }
            }
        }
        
        // Sort by score and return top matches
        return Array.from(scores.entries())
            .sort((a, b) => b[1] - a[1])
            .map(([id]) => this.catalog.components.get(id)!)
            .filter(Boolean);
    }

    /**
     * Get capabilities by feature
     */
    getCapabilitiesByFeature(feature: string): ComponentCapability[] {
        const componentIds = this.catalog.features.get(feature) || [];
        return componentIds
            .map(id => this.catalog.components.get(id)!)
            .filter(Boolean);
    }

    /**
     * Get capabilities by category
     */
    getCapabilitiesByCategory(category: string): ComponentCapability[] {
        const componentIds = this.catalog.categories.get(category) || [];
        return componentIds
            .map(id => this.catalog.components.get(id)!)
            .filter(Boolean);
    }

    /**
     * Export catalog as JSON
     */
    exportCatalog(): string {
        const exportData = {
            components: Array.from(this.catalog.components.entries()),
            categories: Array.from(this.catalog.categories.entries()),
            features: Array.from(this.catalog.features.entries()),
            lastUpdated: this.catalog.lastUpdated
        };
        
        return JSON.stringify(exportData, null, 2);
    }

    /**
     * Import catalog from JSON
     */
    importCatalog(jsonData: string): void {
        const data = JSON.parse(jsonData);
        
        this.catalog.components = new Map(data.components);
        this.catalog.categories = new Map(data.categories);
        this.catalog.features = new Map(data.features);
        this.catalog.lastUpdated = new Date(data.lastUpdated);
        
        // Rebuild semantic index
        this.semanticIndex.clear();
        for (const [, capability] of this.catalog.components) {
            this.updateSemanticIndex(capability);
        }
    }
}

// Singleton instance
export const capabilityAnalyzer = new CapabilityAnalyzer()