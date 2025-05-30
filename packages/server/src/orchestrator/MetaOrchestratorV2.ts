/**
 * Meta-Orchestrator V2 for NubemGenesis
 * Enhanced with RAG capabilities and intelligent clarification system
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
import { UseCaseKnowledgeBase, getUseCaseKnowledgeBase, SimilarCase } from './UseCaseKnowledgeBase'
import { 
    OrchestrationRequestV2, 
    OrchestrationResponseV2, 
    InterpretedIntentV2,
    ClarificationQuestion,
    ClarificationAnswer 
} from './types'

export class MetaOrchestratorV2 {
    private capabilityAnalyzer: CapabilityAnalyzer
    private flowGenerator: FlowGenerator
    private llmRouter: LiteLLMRouter
    private llmRouterV2: LiteLLMRouterV2
    private flowOptimizer: FlowOptimizer
    private knowledgeBase: UseCaseKnowledgeBase
    private capabilityWatcher?: CapabilityWatcher
    private evaluationScheduler?: EvaluationScheduler
    private telemetry: Telemetry
    private orchestrationCache: Map<string, OrchestrationResponseV2>
    private useLiteLLMV2: boolean

    constructor() {
        this.capabilityAnalyzer = new CapabilityAnalyzer()
        this.flowGenerator = new FlowGenerator()
        this.llmRouter = new LiteLLMRouter()
        this.llmRouterV2 = new LiteLLMRouterV2()
        this.flowOptimizer = new FlowOptimizer()
        this.knowledgeBase = getUseCaseKnowledgeBase()
        this.telemetry = new Telemetry()
        this.orchestrationCache = new Map()
        this.useLiteLLMV2 = process.env.USE_LITELLM_V2 === 'true'
    }

    /**
     * Initialize the orchestrator
     */
    async initialize(): Promise<void> {
        console.log('🚀 Initializing Meta-Orchestrator V2 with RAG...')
        
        // Initialize all components
        await Promise.all([
            this.capabilityAnalyzer.analyzeCapabilities(),
            this.knowledgeBase.initialize(),
            this.useLiteLLMV2 ? this.llmRouterV2.initialize() : this.llmRouter.initialize()
        ])
        
        // Start capability watcher if enabled
        if (process.env.ORCHESTRATOR_WATCH_CAPABILITIES === 'true') {
            this.capabilityWatcher = getCapabilityWatcher()
            await this.capabilityWatcher.startWatching()
        }
        
        // Start evaluation scheduler if enabled
        if (process.env.ORCHESTRATOR_ENABLE_EVALUATION === 'true') {
            this.evaluationScheduler = createEvaluationScheduler(evaluationPipeline)
            await this.evaluationScheduler.start()
        }
        
        console.log('✅ Meta-Orchestrator V2 initialized successfully')
    }

    /**
     * Main orchestration method with RAG and clarification support
     */
    async orchestrate(request: OrchestrationRequestV2): Promise<OrchestrationResponseV2> {
        const startTime = Date.now()
        
        try {
            // Check cache first
            const cacheKey = this.generateCacheKey(request)
            const cached = this.orchestrationCache.get(cacheKey)
            if (cached && Date.now() - (cached.metadata?.generationTime || 0) < 3600000) {
                return cached
            }

            // Step 1: Find similar use cases
            const similarCases = await this.knowledgeBase.findSimilarCases(request.query, 5)
            
            // Step 2: Detect missing information
            const missingInfo = await this.detectMissingInformation(request.query, similarCases)
            
            // Step 3: If clarification needed and not provided, return questions
            if (missingInfo.length > 0 && !request.clarifications) {
                return await this.generateClarificationResponse(request, missingInfo, similarCases)
            }
            
            // Step 4: Interpret request with RAG context
            const intent = await this.interpretRequestWithRAG(request, similarCases)
            
            // Step 5: If still needs clarification after interpretation
            if (intent.needsClarification && intent.questions) {
                return {
                    needsClarification: true,
                    questions: intent.questions,
                    suggestions: similarCases.slice(0, 3).map(sc => ({
                        id: sc.useCase.id || '',
                        title: sc.useCase.title,
                        description: sc.useCase.description,
                        similarity: sc.score
                    })),
                    metadata: {
                        generationTime: Date.now() - startTime,
                        similarCasesFound: similarCases.length
                    }
                }
            }
            
            // Step 6: Select components based on intent and similar cases
            const components = await this.selectComponentsWithRAG(intent, request.constraints, similarCases)
            
            // Step 7: Choose appropriate models
            const models = await this.selectModels(intent, request.constraints)
            
            // Step 8: Generate the flow
            const flow = await this.flowGenerator.generateFlow({
                intent,
                components,
                models,
                constraints: request.constraints
            })
            
            // Step 9: Validate and optimize
            const optimizedFlow = await this.flowOptimizer.optimize(flow, request.constraints)
            
            // Step 10: Perform security checks
            const securityChecks = await this.performSecurityChecks(optimizedFlow, request.constraints?.securityLevel)
            
            // Step 11: Calculate estimates
            const estimates = await this.calculateEstimates(optimizedFlow, models)
            
            // Build response
            const response: OrchestrationResponseV2 = {
                flowId: this.generateFlowId(),
                flow: optimizedFlow,
                explanation: await this.generateExplanationWithContext(intent, components, models, similarCases),
                estimatedCost: estimates.cost,
                estimatedLatency: estimates.latency,
                confidence: this.calculateConfidenceWithRAG(intent, components, similarCases),
                alternatives: request.constraints?.requireLocal ? 
                    await this.generateAlternatives(intent, components, models) : undefined,
                metadata: {
                    generationTime: Date.now() - startTime,
                    componentsUsed: components.map(c => c.id),
                    modelsSelected: models,
                    securityChecks,
                    similarCasesFound: similarCases.length
                }
            }
            
            // Cache the response
            this.orchestrationCache.set(cacheKey, response)
            
            // Track telemetry
            await this.trackOrchestration(request, response)
            
            // Learn from this interaction (async, don't wait)
            this.learnFromInteraction(request, response).catch(err => 
                console.error('Failed to learn from interaction:', err)
            )
            
            return response
            
        } catch (error) {
            console.error('Orchestration error:', error)
            throw new Error(`Failed to orchestrate request: ${error.message}`)
        }
    }

    /**
     * Detect missing information using patterns and context
     */
    private async detectMissingInformation(query: string, similarCases: SimilarCase[]): Promise<string[]> {
        const missingInfo = []
        
        // Pattern-based detection
        const patterns = {
            dataSource: {
                regex: /analiz|extract|process|read|parse|scan|review|examine/i,
                required: /pdf|csv|excel|web|database|api|file|document|data/i
            },
            outputFormat: {
                regex: /generat|create|produc|report|summar|output|export|save/i,
                required: /report|summary|json|csv|dashboard|text|markdown|html/i
            },
            volume: {
                regex: /large|scale|bulk|many|multiple|batch|mass/i,
                required: /small|medium|large|hundreds|thousands|millions/i
            },
            integrations: {
                regex: /connect|integrat|sync|send|notify|alert|webhook/i,
                required: /slack|email|webhook|database|api|discord|teams/i
            },
            realtime: {
                regex: /real.?time|live|stream|continuous|monitor|watch/i,
                required: /yes|no|realtime|batch|scheduled/i
            }
        }
        
        // Check each pattern
        for (const [key, pattern] of Object.entries(patterns)) {
            if (pattern.regex.test(query) && !pattern.required.test(query)) {
                missingInfo.push(key)
            }
        }
        
        // Context-based detection from similar cases
        if (similarCases.length > 0) {
            const avgComponents = similarCases.reduce((sum, sc) => 
                sum + sc.useCase.components.length, 0) / similarCases.length
            
            // If query is vague but similar cases have many components
            if (query.split(' ').length < 10 && avgComponents > 4) {
                if (!missingInfo.includes('dataSource')) {
                    missingInfo.push('clarify_requirements')
                }
            }
        }
        
        return missingInfo
    }

    /**
     * Generate clarification response with questions
     */
    private async generateClarificationResponse(
        request: OrchestrationRequestV2,
        missingInfo: string[],
        similarCases: SimilarCase[]
    ): Promise<OrchestrationResponseV2> {
        const questions = await this.knowledgeBase.getSuggestedQuestions(request.query, missingInfo)
        
        // Add dynamic questions based on similar cases
        if (missingInfo.includes('clarify_requirements') && similarCases.length > 0) {
            const commonFeatures = this.extractCommonFeatures(similarCases)
            questions.push({
                id: 'features',
                question: '¿Qué funcionalidades específicas necesitas?',
                options: commonFeatures.map(f => ({
                    value: f.value,
                    label: f.label,
                    popular: f.count > 2
                })),
                multiSelect: true,
                required: false
            })
        }
        
        return {
            needsClarification: true,
            questions,
            suggestions: similarCases.slice(0, 3).map(sc => ({
                id: sc.useCase.id || '',
                title: sc.useCase.title,
                description: sc.useCase.description,
                similarity: Math.round(sc.score * 100)
            })),
            metadata: {
                generationTime: Date.now(),
                similarCasesFound: similarCases.length
            }
        }
    }

    /**
     * Interpret request with RAG context
     */
    private async interpretRequestWithRAG(
        request: OrchestrationRequestV2,
        similarCases: SimilarCase[]
    ): Promise<InterpretedIntentV2> {
        // Build enhanced prompt with RAG context
        const enhancedPrompt = `
You are an AI orchestration expert. Analyze the following user request with enhanced context.

User Request: "${request.query}"

${request.clarifications ? `
User Clarifications:
${request.clarifications.map(c => `- ${c.questionId}: ${c.values.join(', ')}`).join('\n')}
` : ''}

Similar Successful Cases:
${similarCases.map(sc => `
- ${sc.useCase.title} (${Math.round(sc.score * 100)}% match)
  Components: ${sc.useCase.components.join(', ')}
  Performance: ${JSON.stringify(sc.useCase.metrics)}
`).join('\n')}

Available Components Summary:
${await this.capabilityAnalyzer.getComponentsSummary()}

Best Practices:
- For document analysis: PDF/Word loaders → Text splitters → Embeddings → Vector store → Retrieval chain
- For web research: Web browser → Search API → Content extraction → Summarization
- For data analysis: Data loaders → Processing tools → Analysis chain → Visualization
- For conversational AI: Chat model → Memory → Context management → Response generation

Please provide a structured analysis:
1. Primary goal (clear, specific objective)
2. Required capabilities (specific features needed)
3. Workflow type (simple/chain/agent/multi-agent)
4. Complexity level (low/medium/high)
5. Special requirements (security, local execution, specific tools)
6. Suggested components based on similar cases
7. Any remaining ambiguities that need clarification

Respond in JSON format.
`

        const response = await this.llmRouter.route({
            prompt: enhancedPrompt,
            preferredModels: ['gpt-4', 'claude-3-opus'],
            constraints: {
                maxTokens: 1500,
                temperature: 0.3
            }
        })

        const interpretation = JSON.parse(response.content)
        
        // Search for matching components
        const suggestedComponents = await this.findMatchingComponentsWithRAG(
            interpretation.requiredCapabilities,
            similarCases
        )
        
        return {
            primaryGoal: interpretation.primaryGoal,
            requiredCapabilities: interpretation.requiredCapabilities,
            suggestedComponents,
            workflowType: interpretation.workflowType,
            complexity: interpretation.complexity,
            specialRequirements: interpretation.specialRequirements || [],
            needsClarification: interpretation.remainingAmbiguities?.length > 0,
            questions: interpretation.remainingAmbiguities ? 
                await this.generateDynamicQuestions(interpretation.remainingAmbiguities) : undefined
        }
    }

    /**
     * Select components with RAG context
     */
    private async selectComponentsWithRAG(
        intent: InterpretedIntentV2,
        constraints: any,
        similarCases: SimilarCase[]
    ): Promise<ComponentCapability[]> {
        // Get base components from capability analyzer
        const baseComponents = await this.selectComponents(intent, constraints)
        
        // Enhance with components from similar successful cases
        const enhancedComponents = new Set(baseComponents.map(c => c.id))
        
        // Add highly successful components from similar cases
        similarCases.forEach(sc => {
            if (sc.score > 0.8 && sc.useCase.metrics.satisfaction && sc.useCase.metrics.satisfaction > 0.85) {
                sc.useCase.components.forEach(compId => {
                    const component = this.capabilityAnalyzer.getComponentById(compId)
                    if (component && this.isComponentCompatible(component, intent)) {
                        enhancedComponents.add(compId)
                    }
                })
            }
        })
        
        // Convert back to ComponentCapability array
        return Array.from(enhancedComponents).map(id => 
            this.capabilityAnalyzer.getComponentById(id)
        ).filter(Boolean) as ComponentCapability[]
    }

    /**
     * Learn from user interaction for continuous improvement
     */
    private async learnFromInteraction(
        request: OrchestrationRequestV2,
        response: OrchestrationResponseV2
    ): Promise<void> {
        // Only learn if we generated a flow successfully
        if (!response.flow || !response.flowId) return
        
        // Create a performance tracking record
        const app = getRunningExpressApp()
        const datasource = app.get('datasource')
        
        try {
            await datasource.query(
                `INSERT INTO orchestration_history 
                (flow_id, user_query, clarifications, components_used, model_used, confidence, created_at)
                VALUES ($1, $2, $3, $4, $5, $6, $7)`,
                [
                    response.flowId,
                    request.query,
                    JSON.stringify(request.clarifications || []),
                    JSON.stringify(response.metadata?.componentsUsed || []),
                    JSON.stringify(response.metadata?.modelsSelected || []),
                    response.confidence,
                    new Date()
                ]
            )
        } catch (error) {
            console.error('Failed to record orchestration history:', error)
        }
    }

    /**
     * Helper methods
     */
    private async selectComponents(intent: any, constraints: any): Promise<ComponentCapability[]> {
        return this.capabilityAnalyzer.findComponents({
            capabilities: intent.requiredCapabilities,
            constraints
        })
    }

    private async selectModels(intent: any, constraints: any): Promise<string[]> {
        const criteria = {
            capabilities: intent.requiredCapabilities,
            complexity: intent.complexity,
            maxCost: constraints?.maxCost,
            maxLatency: constraints?.maxLatency,
            preferredModels: constraints?.preferredModels
        }
        
        return this.useLiteLLMV2 ? 
            await this.llmRouterV2.selectModels(criteria) :
            await this.llmRouter.selectModels(criteria)
    }

    private async performSecurityChecks(flow: any, securityLevel?: string): Promise<string[]> {
        const checks = ['input-validation', 'output-sanitization']
        
        if (securityLevel === 'medium' || securityLevel === 'high') {
            checks.push('api-key-encryption', 'rate-limiting')
        }
        
        if (securityLevel === 'high') {
            checks.push('sandbox-execution', 'audit-logging', 'data-encryption')
        }
        
        return checks
    }

    private async calculateEstimates(flow: any, models: string[]): Promise<any> {
        const modelCosts = models.map(m => 
            this.llmRouter.getModelCapabilities(m)?.costPer1kTokens.output || 0.01
        )
        
        return {
            cost: Math.max(...modelCosts) * 10, // Estimate 10k tokens
            latency: 3000 // 3 seconds average
        }
    }

    private calculateConfidenceWithRAG(
        intent: any, 
        components: ComponentCapability[],
        similarCases: SimilarCase[]
    ): number {
        let confidence = 0.5 // Base confidence
        
        // Boost confidence based on clear intent
        if (intent.primaryGoal && intent.requiredCapabilities.length > 0) {
            confidence += 0.2
        }
        
        // Boost confidence based on component match
        if (components.length >= intent.requiredCapabilities.length) {
            confidence += 0.15
        }
        
        // Boost confidence based on similar cases
        if (similarCases.length > 0 && similarCases[0].score > 0.85) {
            confidence += 0.15
        }
        
        return Math.min(confidence, 0.95)
    }

    private async generateExplanationWithContext(
        intent: any,
        components: ComponentCapability[],
        models: string[],
        similarCases: SimilarCase[]
    ): Promise<string> {
        let explanation = `Generated a ${intent.workflowType} workflow for: ${intent.primaryGoal}. `
        
        if (similarCases.length > 0 && similarCases[0].score > 0.8) {
            explanation += `Based on similar successful case: "${similarCases[0].useCase.title}". `
        }
        
        explanation += `Using ${components.length} components including ${components.slice(0, 3).map(c => c.name).join(', ')}. `
        explanation += `Optimized for ${models[0]} model.`
        
        return explanation
    }

    private async findMatchingComponentsWithRAG(
        capabilities: string[],
        similarCases: SimilarCase[]
    ): Promise<ComponentCapability[]> {
        // Get base matches
        const baseMatches = this.findMatchingComponents(capabilities)
        
        // Enhance with successful patterns from similar cases
        const successfulComponents = new Map<string, number>()
        
        similarCases.forEach(sc => {
            if (sc.useCase.metrics.satisfaction && sc.useCase.metrics.satisfaction > 0.8) {
                sc.useCase.components.forEach(comp => {
                    successfulComponents.set(comp, (successfulComponents.get(comp) || 0) + sc.score)
                })
            }
        })
        
        // Sort by score and add top components
        const topComponents = Array.from(successfulComponents.entries())
            .sort((a, b) => b[1] - a[1])
            .slice(0, 3)
            .map(([compId]) => this.capabilityAnalyzer.getComponentById(compId))
            .filter(Boolean) as ComponentCapability[]
        
        // Combine and deduplicate
        const combined = [...baseMatches, ...topComponents]
        return Array.from(new Map(combined.map(c => [c.id, c])).values())
    }

    private findMatchingComponents(capabilities: string[]): ComponentCapability[] {
        return this.capabilityAnalyzer.searchComponents(capabilities)
    }

    private extractCommonFeatures(similarCases: SimilarCase[]): any[] {
        const featureCounts = new Map<string, number>()
        
        similarCases.forEach(sc => {
            // Extract features from components
            sc.useCase.components.forEach(comp => {
                const feature = this.componentToFeature(comp)
                if (feature) {
                    featureCounts.set(feature, (featureCounts.get(feature) || 0) + 1)
                }
            })
        })
        
        return Array.from(featureCounts.entries())
            .map(([feature, count]) => ({
                value: feature.toLowerCase().replace(/\s+/g, '_'),
                label: feature,
                count
            }))
            .sort((a, b) => b.count - a.count)
    }

    private componentToFeature(component: string): string | null {
        const featureMap: Record<string, string> = {
            'pdfLoader': 'PDF Processing',
            'webBrowser': 'Web Browsing',
            'csvLoader': 'CSV/Excel Processing',
            'sqlDatabase': 'Database Queries',
            'apiChain': 'API Integration',
            'summarization': 'Text Summarization',
            'conversationChain': 'Conversational Memory',
            'pythonREPL': 'Code Execution'
        }
        
        return featureMap[component] || null
    }

    private isComponentCompatible(component: ComponentCapability, intent: any): boolean {
        // Check if component capabilities match intent requirements
        return intent.requiredCapabilities.some((cap: string) => 
            component.features?.includes(cap) || 
            component.category === cap ||
            component.description?.toLowerCase().includes(cap.toLowerCase())
        )
    }

    private async generateDynamicQuestions(ambiguities: string[]): Promise<ClarificationQuestion[]> {
        // Generate questions based on detected ambiguities
        const questions: ClarificationQuestion[] = []
        
        for (const ambiguity of ambiguities) {
            // This would be enhanced with more sophisticated question generation
            questions.push({
                id: ambiguity.toLowerCase().replace(/\s+/g, '_'),
                question: `Could you clarify: ${ambiguity}?`,
                options: [],
                multiSelect: false,
                required: true
            })
        }
        
        return questions
    }

    private generateCacheKey(request: OrchestrationRequestV2): string {
        return `${request.query}_${JSON.stringify(request.clarifications || [])}_${JSON.stringify(request.constraints || {})}`
    }

    private generateFlowId(): string {
        return `flow_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    }

    private async generateAlternatives(intent: any, components: any[], models: string[]): Promise<any[]> {
        // Generate alternative flows with different tradeoffs
        return []
    }

    private async trackOrchestration(request: OrchestrationRequestV2, response: OrchestrationResponseV2): Promise<void> {
        // Track telemetry
        if (this.telemetry) {
            await this.telemetry.track('orchestration', {
                query: request.query,
                hasClarifications: !!request.clarifications,
                confidence: response.confidence,
                generationTime: response.metadata?.generationTime,
                similarCasesFound: response.metadata?.similarCasesFound
            })
        }
    }

    /**
     * Shutdown the orchestrator
     */
    async shutdown(): Promise<void> {
        console.log('🛑 Shutting down Meta-Orchestrator V2...')
        
        if (this.capabilityWatcher) {
            this.capabilityWatcher.stopWatching()
        }
        
        if (this.evaluationScheduler) {
            await this.evaluationScheduler.stop()
        }
        
        // Clear cache
        this.orchestrationCache.clear()
        
        console.log('✅ Meta-Orchestrator V2 shutdown complete')
    }
}

// Export singleton instance
let orchestratorInstance: MetaOrchestratorV2 | null = null

export function getMetaOrchestratorV2(): MetaOrchestratorV2 {
    if (!orchestratorInstance) {
        orchestratorInstance = new MetaOrchestratorV2()
    }
    return orchestratorInstance
}