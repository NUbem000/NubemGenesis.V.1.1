/**
 * Type definitions for the Orchestration system
 */

export interface ClarificationQuestion {
    id: string
    question: string
    options: Array<{
        value: string
        label: string
        popular?: boolean
    }>
    multiSelect: boolean
    required: boolean
}

export interface ClarificationAnswer {
    questionId: string
    values: string[]
}

export interface OrchestrationRequestV2 {
    query: string
    clarifications?: ClarificationAnswer[]
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
        userProfile?: any
        environment?: 'development' | 'staging' | 'production'
    }
}

export interface InterpretedIntentV2 {
    primaryGoal: string
    requiredCapabilities: string[]
    suggestedComponents: any[]
    workflowType: 'simple' | 'chain' | 'agent' | 'multi-agent'
    complexity: 'low' | 'medium' | 'high'
    specialRequirements: string[]
    needsClarification?: boolean
    questions?: ClarificationQuestion[]
    suggestions?: Array<{
        title: string
        description: string
        useThis: boolean
    }>
}

export interface OrchestrationResponseV2 {
    flowId?: string
    flow?: any
    explanation?: string
    estimatedCost?: number
    estimatedLatency?: number
    confidence?: number
    needsClarification?: boolean
    questions?: ClarificationQuestion[]
    suggestions?: Array<{
        id: string
        title: string
        description: string
        similarity: number
    }>
    alternatives?: Array<{
        flowId: string
        reason: string
        tradeoffs: string[]
    }>
    metadata?: {
        generationTime: number
        componentsUsed?: string[]
        modelsSelected?: string[]
        securityChecks?: string[]
        similarCasesFound?: number
    }
}