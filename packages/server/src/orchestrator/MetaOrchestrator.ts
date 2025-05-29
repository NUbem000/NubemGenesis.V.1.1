/**
 * Meta-Orchestrator for NubemGenesis
 * Central intelligence layer that interprets user requests and generates optimal agent flows
 */

import { ICommonObject } from '../../../components/src/Interface'
import { CapabilityAnalyzer, ComponentCapability } from './CapabilityAnalyzer'
import { FlowGenerator } from './FlowGenerator'
import { LiteLLMRouter } from './LiteLLMRouter'
import { LiteLLMRouterV2 } from './LiteLLMRouterV2'
import { FlowOptimizer } from './FlowOptimizer'
import { CapabilityWatcher, getCapabilityWatcher } from './CapabilityWatcher'
import { EvaluationScheduler, createEvaluationScheduler } from './EvaluationScheduler'
import { evaluationPipeline } from './EvaluationPipeline'
import { getRunningExpressApp } from '../utils/getRunningExpressApp'
import { Telemetry } from '../utils/telemetry'

export interface OrchestrationRequest {
    query: string
    constraints?: {
        maxCost?: number
        maxLatency?: number
        preferredModels?: string[]
        requireLocal?: boolean
        securityLevel?: 'low' | 'medium' | 'high'
        capabilities?: string[]
    }
    context?: {
        previousFlows?: string[]
        userProfile?: ICommonObject
        environment?: 'development' | 'staging' | 'production'
    }
}

export interface OrchestrationResponse {
    flowId: string
    flow: ICommonObject
    explanation: string
    estimatedCost: number
    estimatedLatency: number
    confidence: number
    alternatives?: Array<{
        flowId: string
        reason: string
        tradeoffs: string[]
    }>
    metadata: {
        generationTime: number
        componentsUsed: string[]
        modelsSelected: string[]
        securityChecks: string[]
    }
}

export interface InterpretedIntent {
    primaryGoal: string
    requiredCapabilities: string[]
    suggestedComponents: ComponentCapability[]
    workflowType: 'simple' | 'chain' | 'agent' | 'multi-agent'
    complexity: 'low' | 'medium' | 'high'
    specialRequirements: string[]
}

export class MetaOrchestrator {
    private capabilityAnalyzer: CapabilityAnalyzer
    private flowGenerator: FlowGenerator
    private llmRouter: LiteLLMRouter
    private llmRouterV2: LiteLLMRouterV2
    private flowOptimizer: FlowOptimizer
    private capabilityWatcher?: CapabilityWatcher
    private evaluationScheduler?: EvaluationScheduler
    private telemetry: Telemetry
    private orchestrationCache: Map<string, OrchestrationResponse>
    private useLiteLLMV2: boolean

    constructor() {
        this.capabilityAnalyzer = new CapabilityAnalyzer()
        this.flowGenerator = new FlowGenerator()
        this.llmRouter = new LiteLLMRouter()
        this.llmRouterV2 = new LiteLLMRouterV2()
        this.flowOptimizer = new FlowOptimizer()
        this.telemetry = new Telemetry()
        this.orchestrationCache = new Map()
        this.useLiteLLMV2 = process.env.USE_LITELLM_V2 === 'true'
    }

    /**
     * Initialize the orchestrator
     */
    async initialize(): Promise<void> {
        console.log('🚀 Initializing Meta-Orchestrator...')
        
        // Analyze all available capabilities
        await this.capabilityAnalyzer.analyzeCapabilities()
        
        // Initialize LLM router with available models
        if (this.useLiteLLMV2) {
            await this.llmRouterV2.initialize()
            console.log('   Using LiteLLM V2 with proxy server')
        } else {
            await this.llmRouter.initialize()
            console.log('   Using LiteLLM V1 (simulated)')
        }
        
        // Start capability watcher
        this.capabilityWatcher = getCapabilityWatcher(this.capabilityAnalyzer)
        await this.capabilityWatcher.start()
        
        // Set up watcher event handlers
        this.capabilityWatcher.on('catalogUpdated', (event) => {
            console.log('📚 Capability catalog updated:', event.changes.length, 'changes')
            // Clear cache when capabilities change
            this.orchestrationCache.clear()
        })
        
        // Start evaluation scheduler
        this.evaluationScheduler = createEvaluationScheduler(
            evaluationPipeline,
            this.llmRouterV2,
            {
                primaryModels: ['gpt-4-turbo-preview', 'claude-3-opus-20240229', 'gemini-pro']
            }
        )
        await this.evaluationScheduler.start()
        
        // Load any cached orchestrations
        await this.loadCache()
        
        console.log('✅ Meta-Orchestrator initialized with all enhancements')
    }

    /**
     * Main orchestration method - interprets request and generates optimal flow
     */
    async orchestrate(request: OrchestrationRequest): Promise<OrchestrationResponse> {
        const startTime = Date.now()
        
        try {
            // Check cache first
            const cacheKey = this.generateCacheKey(request)
            if (this.orchestrationCache.has(cacheKey)) {
                console.log('📦 Returning cached orchestration')
                return this.orchestrationCache.get(cacheKey)!
            }

            // Step 1: Interpret the user's intent
            const intent = await this.interpretRequest(request)
            
            // Step 2: Select optimal components
            const components = await this.selectComponents(intent, request.constraints)
            
            // Step 3: Choose appropriate models
            const models = await this.selectModels(intent, request.constraints)
            
            // Step 4: Generate the flow
            const flow = await this.flowGenerator.generateFlow({
                intent,
                components,
                models,
                constraints: request.constraints
            })
            
            // Step 5: Validate and optimize
            const optimizedFlow = await this.optimizeFlow(flow, request.constraints)
            
            // Step 6: Perform security checks
            const securityChecks = await this.performSecurityChecks(optimizedFlow, request.constraints?.securityLevel)
            
            // Step 7: Generate alternatives if requested
            const alternatives = request.constraints?.requireLocal ? 
                await this.generateAlternatives(intent, components, models) : undefined
            
            // Step 8: Calculate estimates
            const estimates = await this.calculateEstimates(optimizedFlow, models)
            
            // Build response
            const response: OrchestrationResponse = {
                flowId: this.generateFlowId(),
                flow: optimizedFlow,
                explanation: await this.generateExplanation(intent, components, models),
                estimatedCost: estimates.cost,
                estimatedLatency: estimates.latency,
                confidence: this.calculateConfidence(intent, components),
                alternatives,
                metadata: {
                    generationTime: Date.now() - startTime,
                    componentsUsed: components.map(c => c.id),
                    modelsSelected: models,
                    securityChecks
                }
            }
            
            // Cache the response
            this.orchestrationCache.set(cacheKey, response)
            
            // Track telemetry
            await this.trackOrchestration(request, response)
            
            return response
            
        } catch (error) {
            console.error('Orchestration error:', error)
            throw new Error(`Failed to orchestrate request: ${error.message}`)
        }
    }

    /**
     * Interpret user request using LLM
     */
    private async interpretRequest(request: OrchestrationRequest): Promise<InterpretedIntent> {
        const interpretationPrompt = `
You are an AI orchestration expert. Analyze the following user request and extract the intent and requirements.

User Request: "${request.query}"

Context: ${JSON.stringify(request.context || {})}

Please provide a structured analysis with:
1. Primary goal (what the user wants to achieve)
2. Required capabilities (e.g., text generation, code execution, web search, etc.)
3. Workflow type (simple/chain/agent/multi-agent)
4. Complexity level (low/medium/high)
5. Special requirements (security, local execution, specific tools, etc.)

Respond in JSON format.
`

        const response = await this.llmRouter.route({
            prompt: interpretationPrompt,
            preferredModels: ['gpt-4', 'claude-3-opus'],
            constraints: {
                maxTokens: 1000,
                temperature: 0.3
            }
        })

        const interpretation = JSON.parse(response.content)
        
        // Search for matching components
        const suggestedComponents = this.findMatchingComponents(interpretation.requiredCapabilities)
        
        return {
            primaryGoal: interpretation.primaryGoal,
            requiredCapabilities: interpretation.requiredCapabilities,
            suggestedComponents,
            workflowType: interpretation.workflowType,
            complexity: interpretation.complexity,
            specialRequirements: interpretation.specialRequirements || []
        }
    }

    /**
     * Select optimal components based on intent and constraints
     */
    private async selectComponents(
        intent: InterpretedIntent,
        constraints?: OrchestrationRequest['constraints']
    ): Promise<ComponentCapability[]> {
        let components = [...intent.suggestedComponents]
        
        // Filter based on constraints
        if (constraints?.requireLocal) {
            components = components.filter(c => !c.features.includes('cloud-only'))
        }
        
        if (constraints?.securityLevel === 'high') {
            components = components.filter(c => c.features.includes('secure') || c.features.includes('sandboxed'))
        }
        
        // Add required supporting components
        components = this.addSupportingComponents(components, intent)
        
        // Optimize component selection
        components = this.optimizeComponentSelection(components, constraints)
        
        return components
    }

    /**
     * Select optimal models based on requirements
     */
    private async selectModels(
        intent: InterpretedIntent,
        constraints?: OrchestrationRequest['constraints']
    ): Promise<string[]> {
        const modelRequirements = {
            capabilities: intent.requiredCapabilities,
            complexity: intent.complexity,
            maxCost: constraints?.maxCost,
            maxLatency: constraints?.maxLatency,
            preferredModels: constraints?.preferredModels
        }
        
        return await this.llmRouter.selectOptimalModels(modelRequirements)
    }

    /**
     * Find components matching required capabilities
     */
    private findMatchingComponents(capabilities: string[]): ComponentCapability[] {
        const components: ComponentCapability[] = []
        
        for (const capability of capabilities) {
            const matches = this.capabilityAnalyzer.searchCapabilities(capability)
            components.push(...matches.slice(0, 3)) // Top 3 matches per capability
        }
        
        // Remove duplicates
        const uniqueComponents = new Map<string, ComponentCapability>()
        for (const component of components) {
            uniqueComponents.set(component.id, component)
        }
        
        return Array.from(uniqueComponents.values())
    }

    /**
     * Add supporting components (memory, tools, etc.)
     */
    private addSupportingComponents(
        components: ComponentCapability[],
        intent: InterpretedIntent
    ): ComponentCapability[] {
        const enhanced = [...components]
        
        // Add memory if agent-based workflow
        if (intent.workflowType === 'agent' || intent.workflowType === 'multi-agent') {
            const memoryComponents = this.capabilityAnalyzer.getCapabilitiesByCategory('memory')
            if (memoryComponents.length > 0) {
                enhanced.push(memoryComponents[0]) // Add default memory
            }
        }
        
        // Add vector store if retrieval is needed
        if (intent.requiredCapabilities.includes('retrieval') || intent.requiredCapabilities.includes('search')) {
            const vectorStores = this.capabilityAnalyzer.getCapabilitiesByCategory('vectorstores')
            if (vectorStores.length > 0) {
                enhanced.push(vectorStores[0]) // Add default vector store
            }
        }
        
        // Add tools if agent needs external capabilities
        if (intent.specialRequirements.includes('web-search') || intent.specialRequirements.includes('code-execution')) {
            const tools = this.capabilityAnalyzer.getCapabilitiesByCategory('tools')
            enhanced.push(...tools.filter(t => 
                intent.specialRequirements.some(req => t.features.includes(req))
            ))
        }
        
        return enhanced
    }

    /**
     * Optimize component selection based on constraints
     */
    private optimizeComponentSelection(
        components: ComponentCapability[],
        constraints?: OrchestrationRequest['constraints']
    ): ComponentCapability[] {
        // Sort by estimated cost if cost constraint exists
        if (constraints?.maxCost) {
            components.sort((a, b) => 
                (a.cost?.perRequest || 0) - (b.cost?.perRequest || 0)
            )
        }
        
        // Sort by latency if latency constraint exists
        if (constraints?.maxLatency) {
            components.sort((a, b) => 
                (a.performance?.avgLatency || 0) - (b.performance?.avgLatency || 0)
            )
        }
        
        return components
    }

    /**
     * Optimize the generated flow
     */
    private async optimizeFlow(flow: ICommonObject, constraints?: OrchestrationRequest['constraints']): Promise<ICommonObject> {
        // Use the FlowOptimizer with configuration based on constraints
        const optimizationResult = await this.flowOptimizer.optimizeFlow(flow, {
            enableCaching: true,
            enableParallelization: true,
            enableRetry: true,
            maxCost: constraints?.maxCost,
            maxLatency: constraints?.maxLatency,
            targetReliability: 0.99
        })
        
        console.log(`🔧 Flow optimized: ${optimizationResult.optimizations.join(', ')}`)
        console.log(`   Cost reduction: ${(optimizationResult.metrics.estimatedCostReduction * 100).toFixed(0)}%`)
        console.log(`   Latency reduction: ${(optimizationResult.metrics.estimatedLatencyReduction * 100).toFixed(0)}%`)
        
        return optimizationResult.optimizedFlow
    }

    /**
     * Perform security checks on the flow
     */
    private async performSecurityChecks(
        flow: ICommonObject,
        securityLevel?: 'low' | 'medium' | 'high'
    ): Promise<string[]> {
        const checks: string[] = []
        
        // Basic validation
        checks.push('input-validation')
        checks.push('output-sanitization')
        
        if (securityLevel === 'medium' || securityLevel === 'high') {
            checks.push('api-key-encryption')
            checks.push('rate-limiting')
            checks.push('access-control')
        }
        
        if (securityLevel === 'high') {
            checks.push('sandboxing')
            checks.push('audit-logging')
            checks.push('data-encryption')
            checks.push('network-isolation')
        }
        
        // TODO: Actually perform these checks on the flow
        
        return checks
    }

    /**
     * Generate alternative flows
     */
    private async generateAlternatives(
        intent: InterpretedIntent,
        components: ComponentCapability[],
        models: string[]
    ): Promise<OrchestrationResponse['alternatives']> {
        // TODO: Generate 2-3 alternative approaches
        return [
            {
                flowId: this.generateFlowId(),
                reason: 'Lower cost alternative using open-source models',
                tradeoffs: ['Slightly higher latency', 'May require fine-tuning']
            },
            {
                flowId: this.generateFlowId(),
                reason: 'Higher performance using specialized models',
                tradeoffs: ['Higher cost', 'Requires API keys']
            }
        ]
    }

    /**
     * Calculate cost and latency estimates
     */
    private async calculateEstimates(
        flow: ICommonObject,
        models: string[]
    ): Promise<{ cost: number; latency: number }> {
        // TODO: Implement actual calculation based on:
        // - Number of model calls
        // - Token usage estimates
        // - Component costs
        // - Network latency
        
        return {
            cost: 0.05, // $0.05 per request estimate
            latency: 2000 // 2 second estimate
        }
    }

    /**
     * Generate human-readable explanation
     */
    private async generateExplanation(
        intent: InterpretedIntent,
        components: ComponentCapability[],
        models: string[]
    ): Promise<string> {
        const componentNames = components.map(c => c.name).join(', ')
        const modelNames = models.join(', ')
        
        return `Generated a ${intent.workflowType} flow to ${intent.primaryGoal}. ` +
               `Using components: ${componentNames}. ` +
               `Selected models: ${modelNames} for optimal performance.`
    }

    /**
     * Calculate confidence score
     */
    private calculateConfidence(intent: InterpretedIntent, components: ComponentCapability[]): number {
        let confidence = 0.5 // Base confidence
        
        // Increase confidence based on component matches
        const capabilityMatches = intent.requiredCapabilities.filter(cap =>
            components.some(comp => comp.features.includes(cap))
        ).length
        
        confidence += (capabilityMatches / intent.requiredCapabilities.length) * 0.3
        
        // Adjust based on complexity
        if (intent.complexity === 'low') confidence += 0.1
        if (intent.complexity === 'high') confidence -= 0.1
        
        // Ensure within bounds
        return Math.max(0.1, Math.min(1.0, confidence))
    }

    /**
     * Generate unique flow ID
     */
    private generateFlowId(): string {
        return `flow_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    }

    /**
     * Generate cache key for request
     */
    private generateCacheKey(request: OrchestrationRequest): string {
        return `${request.query}_${JSON.stringify(request.constraints || {})}`
    }

    /**
     * Load cached orchestrations
     */
    private async loadCache(): Promise<void> {
        // TODO: Load from persistent storage
    }

    /**
     * Track orchestration telemetry
     */
    private async trackOrchestration(
        request: OrchestrationRequest,
        response: OrchestrationResponse
    ): Promise<void> {
        // TODO: Send telemetry data
        console.log('📊 Orchestration tracked:', {
            query: request.query,
            flowId: response.flowId,
            generationTime: response.metadata.generationTime,
            confidence: response.confidence
        })
    }
}

// Export singleton instance
export const metaOrchestrator = new MetaOrchestrator()