/**
 * LiteLLM Router V2 - Real Integration
 * Uses actual LiteLLM proxy server for unified multi-model routing
 */

import axios, { AxiosInstance } from 'axios'
import { ICommonObject } from '../../../components/src/Interface'
import EventSource from 'eventsource'

export interface LiteLLMConfig {
    apiBase: string
    apiKey: string
    timeout?: number
    maxRetries?: number
}

export interface CompletionRequest {
    model: string
    messages: Array<{ role: string; content: string }>
    temperature?: number
    max_tokens?: number
    stream?: boolean
    user?: string
    metadata?: ICommonObject
    fallbacks?: string[]
}

export interface StreamChunk {
    id: string
    object: string
    created: number
    model: string
    choices: Array<{
        index: number
        delta: { content?: string; role?: string }
        finish_reason?: string
    }>
}

export class LiteLLMRouterV2 {
    private client: AxiosInstance
    private config: LiteLLMConfig
    private healthCheckInterval?: NodeJS.Timer

    constructor(config?: Partial<LiteLLMConfig>) {
        this.config = {
            apiBase: config?.apiBase || process.env.LITELLM_PROXY_URL || 'http://localhost:4000',
            apiKey: config?.apiKey || process.env.LITELLM_MASTER_KEY || '',
            timeout: config?.timeout || 120000,
            maxRetries: config?.maxRetries || 3
        }

        this.client = axios.create({
            baseURL: this.config.apiBase,
            timeout: this.config.timeout,
            headers: {
                'Authorization': `Bearer ${this.config.apiKey}`,
                'Content-Type': 'application/json'
            }
        })

        // Add response interceptor for retry logic
        this.setupInterceptors()
    }

    /**
     * Initialize router and verify connection
     */
    async initialize(): Promise<void> {
        console.log('🚀 Initializing LiteLLM Router V2...')
        
        try {
            // Test connection
            await this.healthCheck()
            
            // Get available models
            const models = await this.listModels()
            console.log(`✅ Connected to LiteLLM. Available models: ${models.length}`)
            
            // Start health check monitoring
            this.startHealthMonitoring()
            
        } catch (error) {
            console.error('❌ Failed to initialize LiteLLM Router:', error)
            throw error
        }
    }

    /**
     * Make a completion request with automatic routing
     */
    async completion(request: CompletionRequest): Promise<any> {
        try {
            const response = await this.client.post('/chat/completions', {
                ...request,
                // Add metadata for tracking
                metadata: {
                    ...request.metadata,
                    source: 'nubemgenesis-orchestrator',
                    timestamp: new Date().toISOString()
                }
            })

            return response.data
        } catch (error) {
            console.error('Completion error:', error)
            throw this.handleError(error)
        }
    }

    /**
     * Stream completion with Server-Sent Events
     */
    async *streamCompletion(request: CompletionRequest): AsyncGenerator<StreamChunk> {
        const streamRequest = { ...request, stream: true }
        
        const response = await this.client.post('/chat/completions', streamRequest, {
            responseType: 'stream'
        })

        const stream = response.data
        let buffer = ''

        for await (const chunk of stream) {
            buffer += chunk.toString()
            const lines = buffer.split('\n')
            buffer = lines.pop() || ''

            for (const line of lines) {
                if (line.startsWith('data: ')) {
                    const data = line.slice(6)
                    if (data === '[DONE]') return
                    
                    try {
                        const parsed = JSON.parse(data)
                        yield parsed
                    } catch (e) {
                        console.error('Error parsing stream chunk:', e)
                    }
                }
            }
        }
    }

    /**
     * List available models from LiteLLM
     */
    async listModels(): Promise<any[]> {
        try {
            const response = await this.client.get('/models')
            return response.data.data || []
        } catch (error) {
            console.error('Error listing models:', error)
            return []
        }
    }

    /**
     * Get model information
     */
    async getModelInfo(modelId: string): Promise<any> {
        try {
            const response = await this.client.get(`/model/info?model=${modelId}`)
            return response.data
        } catch (error) {
            console.error(`Error getting model info for ${modelId}:`, error)
            return null
        }
    }

    /**
     * Health check
     */
    async healthCheck(): Promise<boolean> {
        try {
            const response = await this.client.get('/health')
            return response.status === 200
        } catch (error) {
            return false
        }
    }

    /**
     * Get usage statistics
     */
    async getUsage(startDate?: string, endDate?: string): Promise<any> {
        try {
            const params = new URLSearchParams()
            if (startDate) params.append('start_date', startDate)
            if (endDate) params.append('end_date', endDate)
            
            const response = await this.client.get(`/usage?${params.toString()}`)
            return response.data
        } catch (error) {
            console.error('Error getting usage:', error)
            return null
        }
    }

    /**
     * Setup axios interceptors for retry logic
     */
    private setupInterceptors(): void {
        let retryCount = 0

        this.client.interceptors.response.use(
            response => {
                retryCount = 0
                return response
            },
            async error => {
                const config = error.config

                if (!config || retryCount >= this.config.maxRetries!) {
                    return Promise.reject(error)
                }

                // Retry on specific error codes
                const retryableCodes = [429, 500, 502, 503, 504]
                if (error.response && retryableCodes.includes(error.response.status)) {
                    retryCount++
                    
                    // Exponential backoff
                    const delay = Math.min(1000 * Math.pow(2, retryCount), 10000)
                    console.log(`Retrying request (${retryCount}/${this.config.maxRetries}) after ${delay}ms...`)
                    
                    await new Promise(resolve => setTimeout(resolve, delay))
                    return this.client(config)
                }

                return Promise.reject(error)
            }
        )
    }

    /**
     * Start health monitoring
     */
    private startHealthMonitoring(): void {
        // Check health every 30 seconds
        this.healthCheckInterval = setInterval(async () => {
            const isHealthy = await this.healthCheck()
            if (!isHealthy) {
                console.warn('⚠️ LiteLLM proxy is unhealthy')
            }
        }, 30000)
    }

    /**
     * Handle errors with better messages
     */
    private handleError(error: any): Error {
        if (error.response) {
            const status = error.response.status
            const data = error.response.data

            switch (status) {
                case 400:
                    return new Error(`Bad Request: ${data.error?.message || 'Invalid request'}`)
                case 401:
                    return new Error('Unauthorized: Invalid API key')
                case 429:
                    return new Error('Rate limit exceeded. Please try again later.')
                case 500:
                    return new Error('LiteLLM server error. Please try again.')
                default:
                    return new Error(`LiteLLM error: ${data.error?.message || error.message}`)
            }
        }
        
        return new Error(`Network error: ${error.message}`)
    }

    /**
     * Cleanup resources
     */
    destroy(): void {
        if (this.healthCheckInterval) {
            clearInterval(this.healthCheckInterval)
        }
    }
}

// Export singleton instance
export const liteLLMRouterV2 = new LiteLLMRouterV2()