/**
 * Orchestration System Demo
 * Examples of using the NubemGenesis Intelligent Orchestration System
 */

import axios from 'axios'

const API_BASE_URL = process.env.API_URL || 'http://localhost:3000/api/v1'
const API_KEY = process.env.API_KEY || 'your-api-key'

// Helper function to make API calls
async function apiCall(endpoint: string, method: string = 'GET', data?: any) {
    const response = await axios({
        method,
        url: `${API_BASE_URL}${endpoint}`,
        headers: {
            'Content-Type': 'application/json',
            'x-api-key': API_KEY
        },
        data
    })
    return response.data
}

// Example 1: Create a Simple Q&A Bot
async function createSimpleQABot() {
    console.log('\n🤖 Example 1: Creating a Simple Q&A Bot\n')
    
    const request = {
        query: "Create a friendly Q&A bot that remembers conversation history",
        constraints: {
            maxCost: 0.05,
            preferredModels: ["gpt-3.5-turbo"]
        }
    }

    try {
        const response = await apiCall('/orchestrate', 'POST', request)
        
        console.log('✅ Flow generated successfully!')
        console.log(`Flow ID: ${response.flowId}`)
        console.log(`Explanation: ${response.explanation}`)
        console.log(`Estimated cost per request: $${response.estimatedCost}`)
        console.log(`Confidence: ${(response.confidence * 100).toFixed(1)}%`)
        
        // Save the flow
        if (response.flow) {
            const saved = await apiCall('/chatflows', 'POST', {
                name: 'Simple Q&A Bot',
                flowData: response.flow.flowData,
                type: response.flow.type
            })
            console.log(`\n💾 Flow saved with ID: ${saved.id}`)
        }
        
    } catch (error) {
        console.error('❌ Error:', error.response?.data || error.message)
    }
}

// Example 2: Create a Research Agent
async function createResearchAgent() {
    console.log('\n🔬 Example 2: Creating a Research Agent\n')
    
    const request = {
        query: `I need an AI agent that can:
        1. Search the web for information about a topic
        2. Read and analyze multiple sources
        3. Generate a comprehensive summary with citations
        4. Answer follow-up questions about the research`,
        constraints: {
            maxCost: 0.20,
            maxLatency: 10000,
            preferredModels: ["claude-3-sonnet-20240229", "gpt-4-turbo-preview"],
            capabilities: ["web-search", "document-analysis", "memory"]
        }
    }

    try {
        const response = await apiCall('/orchestrate', 'POST', request)
        
        console.log('✅ Research agent flow generated!')
        console.log(`Components used: ${response.metadata.componentsUsed.join(', ')}`)
        console.log(`Models selected: ${response.metadata.modelsSelected.join(', ')}`)
        
        // Show alternatives if available
        if (response.alternatives && response.alternatives.length > 0) {
            console.log('\n🔄 Alternative approaches:')
            response.alternatives.forEach((alt, index) => {
                console.log(`${index + 1}. ${alt.reason}`)
                console.log(`   Trade-offs: ${alt.tradeoffs.join(', ')}`)
            })
        }
        
    } catch (error) {
        console.error('❌ Error:', error.response?.data || error.message)
    }
}

// Example 3: Create a Code Assistant with Sandboxing
async function createSecureCodeAssistant() {
    console.log('\n💻 Example 3: Creating a Secure Code Assistant\n')
    
    const request = {
        query: `Create a Python programming assistant that can:
        - Write Python code based on requirements
        - Execute code in a secure sandbox
        - Debug and fix errors
        - Explain code step by step
        - Suggest optimizations`,
        constraints: {
            securityLevel: "high",
            requireLocal: false,
            maxCost: 0.15,
            capabilities: ["code-generation", "code-execution", "debugging"]
        }
    }

    try {
        const response = await apiCall('/orchestrate', 'POST', request)
        
        console.log('✅ Secure code assistant created!')
        console.log(`Security checks performed: ${response.metadata.securityChecks.join(', ')}`)
        console.log(`Sandbox type: Docker with network isolation`)
        console.log(`Estimated latency: ${response.estimatedLatency}ms`)
        
        // Test the code execution capability
        console.log('\n🧪 Testing code execution in sandbox...')
        
        const testCode = `
def fibonacci(n):
    if n <= 1:
        return n
    return fibonacci(n-1) + fibonacci(n-2)

# Test the function
for i in range(10):
    print(f"F({i}) = {fibonacci(i)}")
`
        
        // This would be handled by the generated flow
        console.log('Code execution would be sandboxed with:')
        console.log('- Memory limit: 512MB')
        console.log('- CPU limit: 25%')
        console.log('- Network access: Disabled')
        console.log('- Timeout: 30 seconds')
        
    } catch (error) {
        console.error('❌ Error:', error.response?.data || error.message)
    }
}

// Example 4: Create a Multi-Agent System
async function createMultiAgentSystem() {
    console.log('\n👥 Example 4: Creating a Multi-Agent System\n')
    
    const request = {
        query: `Build a customer support system with multiple specialized agents:
        - Routing Agent: Understands customer intent and routes to appropriate specialist
        - Technical Support Agent: Handles technical issues and troubleshooting
        - Billing Agent: Handles payment and subscription queries
        - General Support Agent: Handles general inquiries
        All agents should share context and work together seamlessly`,
        constraints: {
            maxCost: 0.30,
            preferredModels: ["gpt-4-turbo-preview", "claude-3-sonnet-20240229"],
            capabilities: ["multi-agent", "memory", "routing"]
        }
    }

    try {
        const response = await apiCall('/orchestrate', 'POST', request)
        
        console.log('✅ Multi-agent system generated!')
        console.log(`Flow type: ${response.flow.type}`)
        console.log(`Number of agents: 4 specialized + 1 supervisor`)
        console.log('\nAgent responsibilities:')
        console.log('- Supervisor: Coordinates and routes requests')
        console.log('- Technical: Troubleshooting and technical guidance')
        console.log('- Billing: Payment processing and account management')
        console.log('- General: FAQ and general customer service')
        
    } catch (error) {
        console.error('❌ Error:', error.response?.data || error.message)
    }
}

// Example 5: View System Capabilities
async function viewSystemCapabilities() {
    console.log('\n📊 Example 5: Viewing System Capabilities\n')
    
    try {
        // Get all capabilities
        const capabilities = await apiCall('/orchestrate/capabilities')
        
        console.log(`Total components available: ${capabilities.components.length}`)
        console.log('\nComponents by category:')
        Object.entries(capabilities.categories).forEach(([category, components]) => {
            console.log(`- ${category}: ${(components as string[]).length} components`)
        })
        
        // Search for specific capabilities
        console.log('\n🔍 Searching for web-related components...')
        const webComponents = await apiCall('/orchestrate/capabilities/search?q=web')
        
        console.log(`Found ${webComponents.count} web-related components:`)
        webComponents.results.slice(0, 5).forEach((comp: any) => {
            console.log(`- ${comp.name}: ${comp.description}`)
        })
        
    } catch (error) {
        console.error('❌ Error:', error.response?.data || error.message)
    }
}

// Example 6: Evaluate Models
async function evaluateModels() {
    console.log('\n📈 Example 6: Evaluating Model Performance\n')
    
    try {
        // Get available models
        const modelsResponse = await apiCall('/orchestrate/models')
        
        console.log(`Available models: ${modelsResponse.count}`)
        console.log('\nTop 5 models by performance:')
        
        const sortedModels = modelsResponse.models
            .filter((m: any) => m.available)
            .sort((a: any, b: any) => a.performance.avgLatency - b.performance.avgLatency)
            .slice(0, 5)
        
        sortedModels.forEach((model: any, index: number) => {
            console.log(`${index + 1}. ${model.modelId}`)
            console.log(`   Provider: ${model.provider}`)
            console.log(`   Avg Latency: ${model.performance.avgLatency}ms`)
            console.log(`   Cost: $${model.capabilities.costPer1kTokens.input}/$${model.capabilities.costPer1kTokens.output} per 1k tokens`)
            console.log(`   Features: ${[
                model.capabilities.supportsStreaming && 'streaming',
                model.capabilities.supportsFunctionCalling && 'functions',
                model.capabilities.supportsVision && 'vision'
            ].filter(Boolean).join(', ')}`)
            console.log()
        })
        
        // Trigger evaluation for a specific model
        console.log('🧪 Triggering evaluation for gpt-4-turbo-preview...')
        const evalResponse = await apiCall('/orchestrate/evaluate', 'POST', {
            type: 'model',
            target: 'gpt-4-turbo-preview',
            config: {
                benchmarks: ['reasoning', 'coding', 'creativity', 'instruction-following']
            }
        })
        
        console.log(`Evaluation started: ${evalResponse.evaluationId}`)
        console.log(`Estimated completion: ${evalResponse.estimatedTime}`)
        
    } catch (error) {
        console.error('❌ Error:', error.response?.data || error.message)
    }
}

// Example 7: Using Templates
async function useFlowTemplates() {
    console.log('\n📋 Example 7: Using Flow Templates\n')
    
    try {
        // Get available templates
        const templates = await apiCall('/orchestrate/templates')
        
        console.log(`Available templates: ${templates.count}`)
        templates.templates.forEach((template: any) => {
            console.log(`\n📌 ${template.name}`)
            console.log(`   ID: ${template.id}`)
            console.log(`   Description: ${template.description}`)
            console.log(`   Complexity: ${template.complexity}`)
            console.log(`   Tags: ${template.tags.join(', ')}`)
        })
        
        // Use a template as a starting point
        console.log('\n🔧 Creating flow from "research-agent" template...')
        const response = await apiCall('/orchestrate', 'POST', {
            query: "Use the research agent template but optimize it for scientific papers",
            constraints: {
                template: "research-agent",
                maxCost: 0.25,
                capabilities: ["academic-search", "pdf-processing", "citations"]
            }
        })
        
        console.log('✅ Flow created from template and customized!')
        
    } catch (error) {
        console.error('❌ Error:', error.response?.data || error.message)
    }
}

// Main demo function
async function runDemo() {
    console.log('🚀 NubemGenesis Orchestration System Demo')
    console.log('=' .repeat(50))
    
    // Check system health first
    try {
        const health = await apiCall('/orchestrate/health')
        console.log('\n✅ System Status:', health.status)
        console.log('Services:', Object.entries(health.services)
            .map(([service, status]) => `${service}: ${status}`)
            .join(', '))
    } catch (error) {
        console.error('❌ System appears to be offline')
        return
    }
    
    // Run examples
    const examples = [
        { name: 'Simple Q&A Bot', fn: createSimpleQABot },
        { name: 'Research Agent', fn: createResearchAgent },
        { name: 'Secure Code Assistant', fn: createSecureCodeAssistant },
        { name: 'Multi-Agent System', fn: createMultiAgentSystem },
        { name: 'View Capabilities', fn: viewSystemCapabilities },
        { name: 'Evaluate Models', fn: evaluateModels },
        { name: 'Use Templates', fn: useFlowTemplates }
    ]
    
    // Interactive menu
    console.log('\n📋 Available Examples:')
    examples.forEach((ex, index) => {
        console.log(`${index + 1}. ${ex.name}`)
    })
    console.log('0. Run all examples')
    console.log('q. Quit')
    
    // In a real implementation, you would handle user input here
    // For this demo, we'll run all examples if called directly
    if (require.main === module) {
        console.log('\n▶️  Running all examples...\n')
        for (const example of examples) {
            await example.fn()
            console.log('\n' + '─'.repeat(50) + '\n')
            
            // Add delay between examples
            await new Promise(resolve => setTimeout(resolve, 2000))
        }
        
        console.log('✨ Demo completed!')
    }
}

// Export functions for use in other scripts
export {
    createSimpleQABot,
    createResearchAgent,
    createSecureCodeAssistant,
    createMultiAgentSystem,
    viewSystemCapabilities,
    evaluateModels,
    useFlowTemplates
}

// Run demo if called directly
if (require.main === module) {
    runDemo().catch(console.error)
}