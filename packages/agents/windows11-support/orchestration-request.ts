import { OrchestrationRequestV2, OrchestrationResponseV2 } from '../../server/src/orchestrator/types'
import { getMetaOrchestratorV2 } from '../../server/src/orchestrator/MetaOrchestratorV2'

/**
 * Windows 11 Support Agent Orchestration Request
 * This creates an optimized flow for Windows 11 technical support
 */

export interface Windows11SupportRequest {
    userProblem: string
    errorCode?: string
    screenshot?: string
    systemInfo?: any
    language?: 'es' | 'en'
    urgency?: 'low' | 'medium' | 'high' | 'critical'
}

export class Windows11SupportOrchestrator {
    private orchestrator = getMetaOrchestratorV2()
    
    async createSupportFlow(request: Windows11SupportRequest): Promise<OrchestrationResponseV2> {
        // Initialize orchestrator if needed
        if (!this.orchestrator) {
            await this.orchestrator.initialize()
        }
        
        // Build the orchestration request
        const orchRequest: OrchestrationRequestV2 = {
            query: this.buildQuery(request),
            constraints: {
                preferredModels: ['gpt-4', 'gpt-4-vision-preview'],
                requireLocal: false,
                securityLevel: 'high',
                capabilities: [
                    'system-diagnostics',
                    'script-generation',
                    'multi-language',
                    'image-analysis',
                    'knowledge-retrieval'
                ]
            },
            context: {
                environment: 'production',
                userProfile: {
                    technicalLevel: 'variable',
                    preferredLanguage: request.language || 'es'
                }
            }
        }
        
        // Add clarifications if we have additional info
        if (request.systemInfo || request.errorCode) {
            orchRequest.clarifications = []
            
            if (request.errorCode) {
                orchRequest.clarifications.push({
                    questionId: 'error_code',
                    values: [request.errorCode]
                })
            }
            
            if (request.systemInfo) {
                orchRequest.clarifications.push({
                    questionId: 'system_info',
                    values: [JSON.stringify(request.systemInfo)]
                })
            }
        }
        
        // Request orchestration
        const response = await this.orchestrator.orchestrate(orchRequest)
        
        // Enhance response with Windows 11 specific configurations
        if (response.flow) {
            this.enhanceFlowWithWindows11Tools(response.flow)
        }
        
        return response
    }
    
    private buildQuery(request: Windows11SupportRequest): string {
        let query = `Create a Windows 11 technical support agent to help with: ${request.userProblem}. `
        
        query += `The agent should: `
        query += `1) Diagnose the issue systematically using Windows diagnostic tools, `
        query += `2) Analyze error logs and system information, `
        query += `3) Search the knowledge base for similar issues and solutions, `
        query += `4) Generate safe PowerShell scripts if needed for fixes, `
        query += `5) Provide step-by-step instructions in ${request.language === 'en' ? 'English' : 'Spanish'}, `
        query += `6) Prioritize user data safety and create restore points before major changes. `
        
        if (request.screenshot) {
            query += `The user has provided a screenshot that needs to be analyzed. `
        }
        
        if (request.urgency === 'critical') {
            query += `This is a CRITICAL issue that may involve data loss or system failure. `
        }
        
        query += `The agent should be conversational, patient, and able to explain technical concepts in simple terms.`
        
        return query
    }
    
    private enhanceFlowWithWindows11Tools(flow: any): void {
        // Add Windows 11 specific tool configurations
        const nodes = JSON.parse(flow.flowData).nodes
        
        // Find and enhance the diagnostic agent node
        const diagnosticAgent = nodes.find((n: any) => n.type === 'reactAgent')
        if (diagnosticAgent) {
            diagnosticAgent.data.inputs = {
                ...diagnosticAgent.data.inputs,
                tools: [
                    'windows-diagnostics',
                    'powershell-executor',
                    'registry-analyzer',
                    'event-viewer',
                    'driver-checker',
                    'network-diagnostics'
                ],
                systemMessage: `You are a Windows 11 technical support expert. Your priorities are:
1. User data safety - always recommend backups before major changes
2. Clear communication - explain technical issues in simple terms
3. Systematic approach - diagnose before attempting fixes
4. Security awareness - validate all scripts and commands
5. Multilingual support - respond in the user's preferred language

When generating PowerShell scripts:
- Always create a restore point first
- Validate scripts for safety
- Explain what each command does
- Provide rollback instructions`,
                maxIterations: 10,
                verbose: true
            }
        }
        
        // Add memory configuration for conversation context
        const memoryNode = nodes.find((n: any) => n.type === 'bufferMemory')
        if (memoryNode) {
            memoryNode.data.inputs = {
                ...memoryNode.data.inputs,
                maxMessages: 100, // Keep more context for complex troubleshooting
                returnMessages: true,
                inputKey: 'input',
                outputKey: 'output',
                memoryKey: 'chat_history'
            }
        }
        
        // Update flow data
        flow.flowData = JSON.stringify({ nodes, edges: JSON.parse(flow.flowData).edges })
    }
}

// Example usage function
export async function createWindows11SupportAgent(problem: string, options?: Partial<Windows11SupportRequest>) {
    const orchestrator = new Windows11SupportOrchestrator()
    
    const request: Windows11SupportRequest = {
        userProblem: problem,
        language: options?.language || 'es',
        urgency: options?.urgency || 'medium',
        ...options
    }
    
    try {
        const response = await orchestrator.createSupportFlow(request)
        
        if (response.needsClarification && response.questions) {
            console.log('Additional information needed:')
            response.questions.forEach(q => {
                console.log(`- ${q.question}`)
                if (q.options) {
                    q.options.forEach(opt => console.log(`  • ${opt.label}`))
                }
            })
            return response
        }
        
        if (response.flow) {
            console.log(`✅ Windows 11 Support Agent created successfully!`)
            console.log(`Flow ID: ${response.flowId}`)
            console.log(`Explanation: ${response.explanation}`)
            console.log(`Confidence: ${(response.confidence || 0) * 100}%`)
            
            return {
                success: true,
                flowId: response.flowId,
                flow: response.flow,
                explanation: response.explanation
            }
        }
        
    } catch (error) {
        console.error('Failed to create Windows 11 support agent:', error)
        throw error
    }
}

// Export for use in API endpoints
export default Windows11SupportOrchestrator