/**
 * Flow Generator for NubemGenesis
 * Converts orchestration requirements into executable Flowise flows
 */

import { ICommonObject, INode, INodeData } from '../../../components/src/Interface'
import { ComponentCapability } from './CapabilityAnalyzer'
import { InterpretedIntent } from './MetaOrchestrator'
import { v4 as uuidv4 } from 'uuid'

export interface FlowGenerationConfig {
    intent: InterpretedIntent
    components: ComponentCapability[]
    models: string[]
    constraints?: {
        maxCost?: number
        maxLatency?: number
        securityLevel?: 'low' | 'medium' | 'high'
    }
}

export interface FlowNode {
    id: string
    type: string
    position: { x: number; y: number }
    data: {
        id: string
        label: string
        name: string
        type: string
        baseClasses: string[]
        inputs: ICommonObject
        outputs: ICommonObject
        config?: ICommonObject
    }
}

export interface FlowEdge {
    id: string
    source: string
    sourceHandle: string
    target: string
    targetHandle: string
    type: string
    animated?: boolean
}

export interface GeneratedFlow {
    id: string
    name: string
    flowData: string // JSON string of nodes and edges
    deployed: boolean
    isPublic: boolean
    apikeyid?: string
    chatbotConfig?: ICommonObject
    createdDate: Date
    updatedDate: Date
    type: 'CHATFLOW' | 'AGENTFLOW' | 'MULTIAGENT'
    flowConfig?: ICommonObject
}

export class FlowGenerator {
    private nodeTemplates: Map<string, ICommonObject>
    private flowTemplates: Map<string, ICommonObject>

    constructor() {
        this.nodeTemplates = new Map()
        this.flowTemplates = new Map()
        this.initializeTemplates()
    }

    /**
     * Initialize common node and flow templates
     */
    private initializeTemplates(): void {
        // ChatModel template
        this.nodeTemplates.set('chatmodel', {
            category: 'chatmodels',
            baseClasses: ['BaseChatModel', 'BaseLanguageModel'],
            inputs: {
                temperature: 0.7,
                maxTokens: 2000,
                topP: 1,
                frequencyPenalty: 0,
                presencePenalty: 0
            }
        })

        // Agent template
        this.nodeTemplates.set('agent', {
            category: 'agents',
            baseClasses: ['Agent'],
            inputs: {
                maxIterations: 5,
                returnIntermediateSteps: true,
                verbose: true
            }
        })

        // Memory template
        this.nodeTemplates.set('memory', {
            category: 'memory',
            baseClasses: ['BaseMemory'],
            inputs: {
                sessionId: '{{sessionId}}',
                memoryKey: 'chat_history'
            }
        })

        // Tool template
        this.nodeTemplates.set('tool', {
            category: 'tools',
            baseClasses: ['Tool'],
            inputs: {}
        })

        // Vector Store template
        this.nodeTemplates.set('vectorstore', {
            category: 'vectorstores',
            baseClasses: ['VectorStore'],
            inputs: {
                topK: 4
            }
        })
    }

    /**
     * Generate a complete flow based on configuration
     */
    async generateFlow(config: FlowGenerationConfig): Promise<GeneratedFlow> {
        console.log('🔧 Generating flow for:', config.intent.primaryGoal)

        let nodes: FlowNode[] = []
        let edges: FlowEdge[] = []

        // Generate flow based on workflow type
        switch (config.intent.workflowType) {
            case 'simple':
                ({ nodes, edges } = this.generateSimpleFlow(config))
                break
            case 'chain':
                ({ nodes, edges } = this.generateChainFlow(config))
                break
            case 'agent':
                ({ nodes, edges } = this.generateAgentFlow(config))
                break
            case 'multi-agent':
                ({ nodes, edges } = this.generateMultiAgentFlow(config))
                break
            default:
                ({ nodes, edges } = this.generateSimpleFlow(config))
        }

        // Optimize node positions
        this.optimizeNodePositions(nodes)

        // Add security configurations if needed
        if (config.constraints?.securityLevel) {
            this.addSecurityConfigurations(nodes, config.constraints.securityLevel)
        }

        // Create flow object
        const flow: GeneratedFlow = {
            id: uuidv4(),
            name: `AI ${config.intent.primaryGoal}`,
            flowData: JSON.stringify({ nodes, edges }),
            deployed: false,
            isPublic: false,
            createdDate: new Date(),
            updatedDate: new Date(),
            type: this.determineFlowType(config.intent.workflowType),
            flowConfig: {
                generatedBy: 'MetaOrchestrator',
                intent: config.intent.primaryGoal,
                confidence: 0.85
            }
        }

        return flow
    }

    /**
     * Generate a simple conversational flow
     */
    private generateSimpleFlow(config: FlowGenerationConfig): { nodes: FlowNode[]; edges: FlowEdge[] } {
        const nodes: FlowNode[] = []
        const edges: FlowEdge[] = []

        // 1. Add Chat Model
        const chatModelNode = this.createChatModelNode(config.models[0], { x: 300, y: 100 })
        nodes.push(chatModelNode)

        // 2. Add Memory if needed
        if (config.components.some(c => c.category === 'memory')) {
            const memoryNode = this.createMemoryNode({ x: 100, y: 100 })
            nodes.push(memoryNode)
            
            edges.push({
                id: `${memoryNode.id}-${chatModelNode.id}`,
                source: memoryNode.id,
                sourceHandle: `${memoryNode.id}-output-memory`,
                target: chatModelNode.id,
                targetHandle: `${chatModelNode.id}-input-memory`,
                type: 'buttonedge'
            })
        }

        // 3. Add System Message
        const systemMessageNode = this.createSystemMessageNode(
            config.intent.primaryGoal,
            { x: 100, y: 250 }
        )
        nodes.push(systemMessageNode)

        edges.push({
            id: `${systemMessageNode.id}-${chatModelNode.id}`,
            source: systemMessageNode.id,
            sourceHandle: `${systemMessageNode.id}-output-prompt`,
            target: chatModelNode.id,
            targetHandle: `${chatModelNode.id}-input-systemmessage`,
            type: 'buttonedge'
        })

        return { nodes, edges }
    }

    /**
     * Generate a chain flow with multiple steps
     */
    private generateChainFlow(config: FlowGenerationConfig): { nodes: FlowNode[]; edges: FlowEdge[] } {
        const nodes: FlowNode[] = []
        const edges: FlowEdge[] = []

        let previousNode: FlowNode | null = null
        let yPosition = 100

        // Create chain of components
        for (let i = 0; i < config.components.length; i++) {
            const component = config.components[i]
            const node = this.createNodeFromComponent(component, { x: 300, y: yPosition })
            nodes.push(node)

            if (previousNode) {
                edges.push({
                    id: `${previousNode.id}-${node.id}`,
                    source: previousNode.id,
                    sourceHandle: `${previousNode.id}-output-chain`,
                    target: node.id,
                    targetHandle: `${node.id}-input-chain`,
                    type: 'buttonedge'
                })
            }

            previousNode = node
            yPosition += 150
        }

        return { nodes, edges }
    }

    /**
     * Generate an agent-based flow
     */
    private generateAgentFlow(config: FlowGenerationConfig): { nodes: FlowNode[]; edges: FlowEdge[] } {
        const nodes: FlowNode[] = []
        const edges: FlowEdge[] = []

        // 1. Create Agent Node
        const agentNode = this.createAgentNode(config.intent, { x: 400, y: 200 })
        nodes.push(agentNode)

        // 2. Add Chat Model
        const chatModelNode = this.createChatModelNode(config.models[0], { x: 200, y: 100 })
        nodes.push(chatModelNode)

        edges.push({
            id: `${chatModelNode.id}-${agentNode.id}`,
            source: chatModelNode.id,
            sourceHandle: `${chatModelNode.id}-output-chatmodel`,
            target: agentNode.id,
            targetHandle: `${agentNode.id}-input-model`,
            type: 'buttonedge'
        })

        // 3. Add Tools
        const tools = config.components.filter(c => c.category === 'tools')
        let toolYPosition = 300
        
        for (const tool of tools) {
            const toolNode = this.createNodeFromComponent(tool, { x: 200, y: toolYPosition })
            nodes.push(toolNode)
            
            edges.push({
                id: `${toolNode.id}-${agentNode.id}`,
                source: toolNode.id,
                sourceHandle: `${toolNode.id}-output-tool`,
                target: agentNode.id,
                targetHandle: `${agentNode.id}-input-tools`,
                type: 'buttonedge'
            })
            
            toolYPosition += 100
        }

        // 4. Add Memory
        const memoryNode = this.createMemoryNode({ x: 600, y: 200 })
        nodes.push(memoryNode)
        
        edges.push({
            id: `${agentNode.id}-${memoryNode.id}`,
            source: agentNode.id,
            sourceHandle: `${agentNode.id}-output-memory`,
            target: memoryNode.id,
            targetHandle: `${memoryNode.id}-input-agent`,
            type: 'buttonedge'
        })

        return { nodes, edges }
    }

    /**
     * Generate a multi-agent flow
     */
    private generateMultiAgentFlow(config: FlowGenerationConfig): { nodes: FlowNode[]; edges: FlowEdge[] } {
        const nodes: FlowNode[] = []
        const edges: FlowEdge[] = []

        // 1. Create Supervisor Agent
        const supervisorNode = this.createSupervisorNode({ x: 400, y: 100 })
        nodes.push(supervisorNode)

        // 2. Add Worker Agents
        const numWorkers = Math.min(config.components.length, 3) // Max 3 workers
        let workerXPosition = 200

        for (let i = 0; i < numWorkers; i++) {
            const workerNode = this.createWorkerAgentNode(
                `Worker ${i + 1}`,
                { x: workerXPosition, y: 300 }
            )
            nodes.push(workerNode)

            // Connect to supervisor
            edges.push({
                id: `${supervisorNode.id}-${workerNode.id}`,
                source: supervisorNode.id,
                sourceHandle: `${supervisorNode.id}-output-workers`,
                target: workerNode.id,
                targetHandle: `${workerNode.id}-input-supervisor`,
                type: 'buttonedge'
            })

            workerXPosition += 200
        }

        // 3. Add shared model
        const chatModelNode = this.createChatModelNode(config.models[0], { x: 400, y: 500 })
        nodes.push(chatModelNode)

        // Connect model to all agents
        for (const node of nodes) {
            if (node.data.type === 'Agent' || node.data.type === 'Supervisor') {
                edges.push({
                    id: `${chatModelNode.id}-${node.id}`,
                    source: chatModelNode.id,
                    sourceHandle: `${chatModelNode.id}-output-chatmodel`,
                    target: node.id,
                    targetHandle: `${node.id}-input-model`,
                    type: 'buttonedge'
                })
            }
        }

        return { nodes, edges }
    }

    /**
     * Create a chat model node
     */
    private createChatModelNode(model: string, position: { x: number; y: number }): FlowNode {
        const nodeId = uuidv4()
        
        // Determine which chat model node to use based on model name
        let nodeType = 'chatOpenAI'
        let nodeName = 'ChatOpenAI'
        
        if (model.includes('claude')) {
            nodeType = 'chatAnthropic'
            nodeName = 'ChatAnthropic'
        } else if (model.includes('gemini')) {
            nodeType = 'chatGoogleGenerativeAI'
            nodeName = 'ChatGoogleGenerativeAI'
        } else if (model.includes('mistral')) {
            nodeType = 'chatMistralAI'
            nodeName = 'ChatMistralAI'
        }

        return {
            id: nodeId,
            type: nodeType,
            position,
            data: {
                id: nodeId,
                label: nodeName,
                name: nodeType,
                type: 'ChatModel',
                baseClasses: ['BaseChatModel', 'BaseLanguageModel'],
                inputs: {
                    modelName: model,
                    temperature: 0.7,
                    maxTokens: 2000,
                    streaming: true
                },
                outputs: {
                    [`${nodeId}-output-chatmodel`]: 'chatmodel'
                }
            }
        }
    }

    /**
     * Create an agent node
     */
    private createAgentNode(intent: InterpretedIntent, position: { x: number; y: number }): FlowNode {
        const nodeId = uuidv4()
        
        return {
            id: nodeId,
            type: 'reactAgent',
            position,
            data: {
                id: nodeId,
                label: 'ReAct Agent',
                name: 'reactAgent',
                type: 'Agent',
                baseClasses: ['Agent'],
                inputs: {
                    agentName: `${intent.primaryGoal} Agent`,
                    systemMessage: `You are an AI agent specialized in: ${intent.primaryGoal}`,
                    maxIterations: 5,
                    returnIntermediateSteps: true
                },
                outputs: {
                    [`${nodeId}-output-agent`]: 'agent',
                    [`${nodeId}-output-memory`]: 'memory'
                }
            }
        }
    }

    /**
     * Create a memory node
     */
    private createMemoryNode(position: { x: number; y: number }): FlowNode {
        const nodeId = uuidv4()
        
        return {
            id: nodeId,
            type: 'bufferMemory',
            position,
            data: {
                id: nodeId,
                label: 'Buffer Memory',
                name: 'bufferMemory',
                type: 'Memory',
                baseClasses: ['BaseMemory'],
                inputs: {
                    sessionId: '{{sessionId}}',
                    memoryKey: 'chat_history',
                    returnMessages: true
                },
                outputs: {
                    [`${nodeId}-output-memory`]: 'memory'
                }
            }
        }
    }

    /**
     * Create a system message node
     */
    private createSystemMessageNode(goal: string, position: { x: number; y: number }): FlowNode {
        const nodeId = uuidv4()
        
        return {
            id: nodeId,
            type: 'systemMessagePrompt',
            position,
            data: {
                id: nodeId,
                label: 'System Message',
                name: 'systemMessagePrompt',
                type: 'Prompt',
                baseClasses: ['SystemMessagePromptTemplate'],
                inputs: {
                    content: `You are a helpful AI assistant focused on: ${goal}. 
                             Provide clear, accurate, and helpful responses.`
                },
                outputs: {
                    [`${nodeId}-output-prompt`]: 'prompt'
                }
            }
        }
    }

    /**
     * Create a supervisor node for multi-agent flows
     */
    private createSupervisorNode(position: { x: number; y: number }): FlowNode {
        const nodeId = uuidv4()
        
        return {
            id: nodeId,
            type: 'supervisor',
            position,
            data: {
                id: nodeId,
                label: 'Supervisor',
                name: 'supervisor',
                type: 'Supervisor',
                baseClasses: ['Supervisor', 'Agent'],
                inputs: {
                    supervisorName: 'Task Coordinator',
                    supervisorPrompt: 'Coordinate worker agents to accomplish complex tasks efficiently.'
                },
                outputs: {
                    [`${nodeId}-output-supervisor`]: 'supervisor',
                    [`${nodeId}-output-workers`]: 'workers'
                }
            }
        }
    }

    /**
     * Create a worker agent node
     */
    private createWorkerAgentNode(name: string, position: { x: number; y: number }): FlowNode {
        const nodeId = uuidv4()
        
        return {
            id: nodeId,
            type: 'workerAgent',
            position,
            data: {
                id: nodeId,
                label: name,
                name: 'workerAgent',
                type: 'Agent',
                baseClasses: ['Agent'],
                inputs: {
                    agentName: name,
                    role: 'Specialized task executor'
                },
                outputs: {
                    [`${nodeId}-output-agent`]: 'agent'
                }
            }
        }
    }

    /**
     * Create a node from a component capability
     */
    private createNodeFromComponent(component: ComponentCapability, position: { x: number; y: number }): FlowNode {
        const nodeId = uuidv4()
        
        return {
            id: nodeId,
            type: component.name,
            position,
            data: {
                id: nodeId,
                label: component.name,
                name: component.name,
                type: component.category,
                baseClasses: component.baseClasses,
                inputs: this.generateInputsFromComponent(component),
                outputs: this.generateOutputsFromComponent(component, nodeId)
            }
        }
    }

    /**
     * Generate inputs configuration from component
     */
    private generateInputsFromComponent(component: ComponentCapability): ICommonObject {
        const inputs: ICommonObject = {}
        
        for (const input of component.inputs) {
            if (!input.optional) {
                // Set default values based on type
                switch (input.type) {
                    case 'string':
                        inputs[input.name] = ''
                        break
                    case 'number':
                        inputs[input.name] = 0
                        break
                    case 'boolean':
                        inputs[input.name] = false
                        break
                    default:
                        inputs[input.name] = null
                }
            }
        }
        
        return inputs
    }

    /**
     * Generate outputs configuration from component
     */
    private generateOutputsFromComponent(component: ComponentCapability, nodeId: string): ICommonObject {
        const outputs: ICommonObject = {}
        
        for (const output of component.outputs) {
            outputs[`${nodeId}-output-${output}`] = output
        }
        
        return outputs
    }

    /**
     * Optimize node positions for better visualization
     */
    private optimizeNodePositions(nodes: FlowNode[]): void {
        // Simple grid layout optimization
        const gridSize = 200
        const nodesPerRow = 3
        
        nodes.forEach((node, index) => {
            const row = Math.floor(index / nodesPerRow)
            const col = index % nodesPerRow
            
            node.position = {
                x: 100 + (col * gridSize),
                y: 100 + (row * gridSize)
            }
        })
    }

    /**
     * Add security configurations to nodes
     */
    private addSecurityConfigurations(nodes: FlowNode[], level: 'low' | 'medium' | 'high'): void {
        for (const node of nodes) {
            if (!node.data.config) {
                node.data.config = {}
            }
            
            // Add security configurations based on level
            switch (level) {
                case 'high':
                    node.data.config.sandboxed = true
                    node.data.config.auditLogging = true
                    node.data.config.encryptData = true
                case 'medium':
                    node.data.config.validateInputs = true
                    node.data.config.sanitizeOutputs = true
                case 'low':
                    node.data.config.rateLimiting = true
                    break
            }
        }
    }

    /**
     * Determine flow type based on workflow type
     */
    private determineFlowType(workflowType: string): 'CHATFLOW' | 'AGENTFLOW' | 'MULTIAGENT' {
        switch (workflowType) {
            case 'multi-agent':
                return 'MULTIAGENT'
            case 'agent':
                return 'AGENTFLOW'
            default:
                return 'CHATFLOW'
        }
    }

    /**
     * Validate generated flow
     */
    async validateFlow(flow: GeneratedFlow): Promise<{ valid: boolean; errors: string[] }> {
        const errors: string[] = []
        
        try {
            const { nodes, edges } = JSON.parse(flow.flowData)
            
            // Check if flow has at least one node
            if (!nodes || nodes.length === 0) {
                errors.push('Flow must have at least one node')
            }
            
            // Check if all edges connect valid nodes
            const nodeIds = new Set(nodes.map((n: FlowNode) => n.id))
            for (const edge of edges) {
                if (!nodeIds.has(edge.source) || !nodeIds.has(edge.target)) {
                    errors.push(`Invalid edge connection: ${edge.id}`)
                }
            }
            
            // Check for required node types
            const hasModel = nodes.some((n: FlowNode) => n.data.type === 'ChatModel')
            if (!hasModel && flow.type !== 'MULTIAGENT') {
                errors.push('Flow must have at least one chat model')
            }
            
        } catch (error) {
            errors.push(`Invalid flow data: ${error.message}`)
        }
        
        return {
            valid: errors.length === 0,
            errors
        }
    }
}

// Export singleton instance
export const flowGenerator = new FlowGenerator()