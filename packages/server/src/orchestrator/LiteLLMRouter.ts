/**
 * LiteLLM Router for NubemGenesis
 * Unified interface for routing requests across multiple LLM providers
 */

import axios from 'axios'
import { ICommonObject } from '../../../components/src/Interface'

export interface ModelCapabilities {
    modelId: string
    provider: string
    contextLength: number
    supportsStreaming: boolean
    supportsFunctionCalling: boolean
    supportsVision: boolean
    costPer1kTokens: {
        input: number
        output: number
    }
    latency: {
        firstToken: number // ms
        throughput: number // tokens/sec
    }
    quality: {
        reasoning: number // 0-1
        creativity: number // 0-1
        factuality: number // 0-1
        instruction: number // 0-1
    }
}

export interface RoutingRequest {
    prompt: string
    systemPrompt?: string
    messages?: Array<{ role: string; content: string }>
    preferredModels?: string[]
    constraints?: {
        maxTokens?: number
        temperature?: number
        maxCost?: number
        maxLatency?: number
        requiredCapabilities?: string[]
    }
}

export interface RoutingResponse {
    content: string
    model: string
    usage: {
        promptTokens: number
        completionTokens: number
        totalTokens: number
        cost: number
    }
    latency: number
    metadata?: ICommonObject
}

export interface ModelSelectionCriteria {
    capabilities: string[]
    complexity: 'low' | 'medium' | 'high'
    maxCost?: number
    maxLatency?: number
    preferredModels?: string[]
}

export class LiteLLMRouter {
    private modelRegistry: Map<string, ModelCapabilities>
    private providerStatus: Map<string, boolean>
    private litellmEndpoint: string
    private apiKeys: Map<string, string>
    private performanceHistory: Map<string, Array<{ latency: number; timestamp: Date }>>

    constructor() {
        this.modelRegistry = new Map()
        this.providerStatus = new Map()
        this.litellmEndpoint = process.env.LITELLM_ENDPOINT || 'http://localhost:4000'
        this.apiKeys = new Map()
        this.performanceHistory = new Map()
        this.initializeModels()
    }

    /**
     * Initialize model registry with capabilities
     */
    private initializeModels(): void {
        // OpenAI Models
        this.registerModel({
            modelId: 'gpt-4-turbo-preview',
            provider: 'openai',
            contextLength: 128000,
            supportsStreaming: true,
            supportsFunctionCalling: true,
            supportsVision: true,
            costPer1kTokens: { input: 0.01, output: 0.03 },
            latency: { firstToken: 800, throughput: 60 },
            quality: { reasoning: 0.95, creativity: 0.9, factuality: 0.92, instruction: 0.95 }
        })

        this.registerModel({
            modelId: 'gpt-3.5-turbo',
            provider: 'openai',
            contextLength: 16385,
            supportsStreaming: true,
            supportsFunctionCalling: true,
            supportsVision: false,
            costPer1kTokens: { input: 0.0005, output: 0.0015 },
            latency: { firstToken: 400, throughput: 90 },
            quality: { reasoning: 0.8, creativity: 0.75, factuality: 0.85, instruction: 0.85 }
        })

        // Anthropic Models
        this.registerModel({
            modelId: 'claude-3-opus-20240229',
            provider: 'anthropic',
            contextLength: 200000,
            supportsStreaming: true,
            supportsFunctionCalling: false,
            supportsVision: true,
            costPer1kTokens: { input: 0.015, output: 0.075 },
            latency: { firstToken: 1000, throughput: 40 },
            quality: { reasoning: 0.98, creativity: 0.95, factuality: 0.95, instruction: 0.98 }
        })

        this.registerModel({
            modelId: 'claude-3-sonnet-20240229',
            provider: 'anthropic',
            contextLength: 200000,
            supportsStreaming: true,
            supportsFunctionCalling: false,
            supportsVision: true,
            costPer1kTokens: { input: 0.003, output: 0.015 },
            latency: { firstToken: 600, throughput: 50 },
            quality: { reasoning: 0.9, creativity: 0.85, factuality: 0.9, instruction: 0.92 }
        })

        // Google Models
        this.registerModel({
            modelId: 'gemini-pro',
            provider: 'google',
            contextLength: 32000,
            supportsStreaming: true,
            supportsFunctionCalling: true,
            supportsVision: false,
            costPer1kTokens: { input: 0.0005, output: 0.0015 },
            latency: { firstToken: 500, throughput: 70 },
            quality: { reasoning: 0.85, creativity: 0.8, factuality: 0.88, instruction: 0.87 }
        })

        // Mistral Models
        this.registerModel({
            modelId: 'mistral-large-latest',
            provider: 'mistral',
            contextLength: 32000,
            supportsStreaming: true,
            supportsFunctionCalling: true,
            supportsVision: false,
            costPer1kTokens: { input: 0.004, output: 0.012 },
            latency: { firstToken: 700, throughput: 55 },
            quality: { reasoning: 0.88, creativity: 0.82, factuality: 0.86, instruction: 0.89 }
        })

        // Open Source Models (via Together/Replicate)
        this.registerModel({
            modelId: 'mixtral-8x7b-instruct',
            provider: 'together',
            contextLength: 32000,
            supportsStreaming: true,
            supportsFunctionCalling: false,
            supportsVision: false,
            costPer1kTokens: { input: 0.0006, output: 0.0006 },
            latency: { firstToken: 400, throughput: 80 },
            quality: { reasoning: 0.82, creativity: 0.78, factuality: 0.8, instruction: 0.83 }
        })

        this.registerModel({
            modelId: 'llama-3-70b-instruct',
            provider: 'together',
            contextLength: 8192,
            supportsStreaming: true,
            supportsFunctionCalling: false,
            supportsVision: false,
            costPer1kTokens: { input: 0.0009, output: 0.0009 },
            latency: { firstToken: 450, throughput: 75 },
            quality: { reasoning: 0.85, creativity: 0.8, factuality: 0.83, instruction: 0.86 }
        })
    }

    /**
     * Register a model with its capabilities
     */
    private registerModel(capabilities: ModelCapabilities): void {
        this.modelRegistry.set(capabilities.modelId, capabilities)
        this.providerStatus.set(capabilities.provider, true)
        this.performanceHistory.set(capabilities.modelId, [])
    }

    /**
     * Initialize router and load API keys
     */
    async initialize(): Promise<void> {
        // Load API keys from environment
        this.apiKeys.set('openai', process.env.OPENAI_API_KEY || '')
        this.apiKeys.set('anthropic', process.env.ANTHROPIC_API_KEY || '')
        this.apiKeys.set('google', process.env.GOOGLE_API_KEY || '')
        this.apiKeys.set('mistral', process.env.MISTRAL_API_KEY || '')
        this.apiKeys.set('together', process.env.TOGETHER_API_KEY || '')

        // Check provider availability
        await this.checkProviderHealth()
    }

    /**
     * Route a request to the optimal model
     */
    async route(request: RoutingRequest): Promise<RoutingResponse> {
        const startTime = Date.now()

        // Select optimal model based on request
        const selectedModel = await this.selectOptimalModel(request)
        
        if (!selectedModel) {
            throw new Error('No suitable model found for request')
        }

        console.log(`🎯 Routing to model: ${selectedModel}`)

        // Prepare request for LiteLLM
        const litellmRequest = this.prepareLiteLLMRequest(request, selectedModel)

        try {
            // Make request through LiteLLM proxy
            const response = await axios.post(
                `${this.litellmEndpoint}/chat/completions`,
                litellmRequest,
                {
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${this.apiKeys.get(this.modelRegistry.get(selectedModel)!.provider)}`
                    }
                }
            )

            const latency = Date.now() - startTime
            
            // Update performance history
            this.updatePerformanceHistory(selectedModel, latency)

            // Calculate cost
            const usage = response.data.usage
            const modelCaps = this.modelRegistry.get(selectedModel)!
            const cost = this.calculateCost(usage, modelCaps)

            return {
                content: response.data.choices[0].message.content,
                model: selectedModel,
                usage: {
                    promptTokens: usage.prompt_tokens,
                    completionTokens: usage.completion_tokens,
                    totalTokens: usage.total_tokens,
                    cost
                },
                latency,
                metadata: {
                    finishReason: response.data.choices[0].finish_reason,
                    provider: modelCaps.provider
                }
            }

        } catch (error) {
            console.error(`Error routing to ${selectedModel}:`, error)
            
            // Try fallback model
            const fallbackModel = await this.selectFallbackModel(selectedModel, request)
            if (fallbackModel && fallbackModel !== selectedModel) {
                console.log(`🔄 Falling back to: ${fallbackModel}`)
                request.preferredModels = [fallbackModel]
                return this.route(request)
            }
            
            throw error
        }
    }

    /**
     * Select optimal model based on request constraints
     */
    private async selectOptimalModel(request: RoutingRequest): Promise<string | null> {
        const candidates = Array.from(this.modelRegistry.entries())
            .filter(([modelId, caps]) => {
                // Filter by required capabilities
                if (request.constraints?.requiredCapabilities) {
                    for (const req of request.constraints.requiredCapabilities) {
                        switch (req) {
                            case 'streaming':
                                if (!caps.supportsStreaming) return false
                                break
                            case 'function-calling':
                                if (!caps.supportsFunctionCalling) return false
                                break
                            case 'vision':
                                if (!caps.supportsVision) return false
                                break
                        }
                    }
                }

                // Filter by cost constraint
                if (request.constraints?.maxCost) {
                    const estimatedTokens = this.estimateTokens(request.prompt)
                    const estimatedCost = (estimatedTokens / 1000) * caps.costPer1kTokens.output
                    if (estimatedCost > request.constraints.maxCost) return false
                }

                // Filter by latency constraint
                if (request.constraints?.maxLatency) {
                    if (caps.latency.firstToken > request.constraints.maxLatency) return false
                }

                // Check provider availability
                if (!this.providerStatus.get(caps.provider)) return false

                return true
            })

        if (candidates.length === 0) return null

        // Score and rank models
        const scored = candidates.map(([modelId, caps]) => {
            let score = 0

            // Prefer requested models
            if (request.preferredModels?.includes(modelId)) {
                score += 10
            }

            // Score based on quality (average of all quality metrics)
            const avgQuality = Object.values(caps.quality).reduce((a, b) => a + b, 0) / 4
            score += avgQuality * 5

            // Penalize cost
            score -= caps.costPer1kTokens.output * 2

            // Penalize latency
            score -= caps.latency.firstToken / 1000

            // Boost based on recent performance
            const recentPerf = this.getRecentPerformance(modelId)
            if (recentPerf && recentPerf.avgLatency < caps.latency.firstToken) {
                score += 1
            }

            return { modelId, score }
        })

        // Sort by score and return best model
        scored.sort((a, b) => b.score - a.score)
        return scored[0].modelId
    }

    /**
     * Select optimal models for multi-model scenarios
     */
    async selectOptimalModels(criteria: ModelSelectionCriteria): Promise<string[]> {
        const models: string[] = []

        // Categorize requirements
        const needsReasoning = criteria.capabilities.includes('reasoning') || 
                              criteria.complexity === 'high'
        const needsCreativity = criteria.capabilities.includes('creativity') ||
                               criteria.capabilities.includes('generation')
        const needsSpeed = criteria.maxLatency && criteria.maxLatency < 1000
        const needsCostOptimization = criteria.maxCost && criteria.maxCost < 0.01

        // Select primary model
        if (needsReasoning && !needsCostOptimization) {
            models.push('claude-3-opus-20240229')
        } else if (needsSpeed && needsCostOptimization) {
            models.push('gpt-3.5-turbo')
        } else if (needsCreativity) {
            models.push('gpt-4-turbo-preview')
        } else {
            models.push('claude-3-sonnet-20240229')
        }

        // Add fallback models
        if (!needsCostOptimization) {
            models.push('gpt-4-turbo-preview')
        }
        models.push('mixtral-8x7b-instruct') // Always include an open-source option

        // Filter by preferences
        if (criteria.preferredModels) {
            const preferred = models.filter(m => criteria.preferredModels!.includes(m))
            if (preferred.length > 0) {
                return preferred
            }
        }

        return [...new Set(models)] // Remove duplicates
    }

    /**
     * Select fallback model when primary fails
     */
    private async selectFallbackModel(failedModel: string, request: RoutingRequest): Promise<string | null> {
        const failedCaps = this.modelRegistry.get(failedModel)
        if (!failedCaps) return null

        // Find similar models from different providers
        const alternatives = Array.from(this.modelRegistry.entries())
            .filter(([modelId, caps]) => {
                return modelId !== failedModel &&
                       caps.provider !== failedCaps.provider &&
                       this.providerStatus.get(caps.provider) === true
            })
            .sort((a, b) => {
                // Sort by quality similarity
                const qualityDiffA = Math.abs(
                    Object.values(a[1].quality).reduce((sum, q) => sum + q, 0) -
                    Object.values(failedCaps.quality).reduce((sum, q) => sum + q, 0)
                )
                const qualityDiffB = Math.abs(
                    Object.values(b[1].quality).reduce((sum, q) => sum + q, 0) -
                    Object.values(failedCaps.quality).reduce((sum, q) => sum + q, 0)
                )
                return qualityDiffA - qualityDiffB
            })

        return alternatives.length > 0 ? alternatives[0][0] : null
    }

    /**
     * Prepare request for LiteLLM format
     */
    private prepareLiteLLMRequest(request: RoutingRequest, model: string): ICommonObject {
        const messages = request.messages || []
        
        if (request.systemPrompt) {
            messages.unshift({ role: 'system', content: request.systemPrompt })
        }
        
        if (request.prompt && !request.messages) {
            messages.push({ role: 'user', content: request.prompt })
        }

        return {
            model,
            messages,
            temperature: request.constraints?.temperature || 0.7,
            max_tokens: request.constraints?.maxTokens || 2000,
            stream: false // TODO: Add streaming support
        }
    }

    /**
     * Calculate cost based on token usage
     */
    private calculateCost(usage: any, capabilities: ModelCapabilities): number {
        const inputCost = (usage.prompt_tokens / 1000) * capabilities.costPer1kTokens.input
        const outputCost = (usage.completion_tokens / 1000) * capabilities.costPer1kTokens.output
        return inputCost + outputCost
    }

    /**
     * Estimate tokens in a prompt (rough estimation)
     */
    private estimateTokens(text: string): number {
        // Rough estimation: 1 token ≈ 4 characters
        return Math.ceil(text.length / 4)
    }

    /**
     * Update performance history for a model
     */
    private updatePerformanceHistory(modelId: string, latency: number): void {
        const history = this.performanceHistory.get(modelId) || []
        history.push({ latency, timestamp: new Date() })
        
        // Keep only last 100 entries
        if (history.length > 100) {
            history.shift()
        }
        
        this.performanceHistory.set(modelId, history)
    }

    /**
     * Get recent performance metrics
     */
    private getRecentPerformance(modelId: string): { avgLatency: number } | null {
        const history = this.performanceHistory.get(modelId)
        if (!history || history.length === 0) return null

        // Get last 10 entries
        const recent = history.slice(-10)
        const avgLatency = recent.reduce((sum, h) => sum + h.latency, 0) / recent.length
        
        return { avgLatency }
    }

    /**
     * Check health of all providers
     */
    private async checkProviderHealth(): Promise<void> {
        // TODO: Implement health checks for each provider
        // For now, assume all providers with API keys are healthy
        for (const [provider, apiKey] of this.apiKeys) {
            this.providerStatus.set(provider, apiKey.length > 0)
        }
    }

    /**
     * Get model capabilities
     */
    getModelCapabilities(modelId: string): ModelCapabilities | undefined {
        return this.modelRegistry.get(modelId)
    }

    /**
     * List all available models
     */
    listAvailableModels(): Array<{ modelId: string; provider: string; available: boolean }> {
        return Array.from(this.modelRegistry.entries()).map(([modelId, caps]) => ({
            modelId,
            provider: caps.provider,
            available: this.providerStatus.get(caps.provider) || false
        }))
    }

    /**
     * Get performance report
     */
    getPerformanceReport(): Map<string, { avgLatency: number; requestCount: number }> {
        const report = new Map<string, { avgLatency: number; requestCount: number }>()
        
        for (const [modelId, history] of this.performanceHistory) {
            if (history.length > 0) {
                const avgLatency = history.reduce((sum, h) => sum + h.latency, 0) / history.length
                report.set(modelId, { avgLatency, requestCount: history.length })
            }
        }
        
        return report
    }
}

// Export singleton instance
export const liteLLMRouter = new LiteLLMRouter()