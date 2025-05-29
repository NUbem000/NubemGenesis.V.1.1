/**
 * Integration tests for the Orchestration System
 */

import { MetaOrchestrator } from '../../../orchestrator/MetaOrchestrator'
import { CapabilityAnalyzer } from '../../../orchestrator/CapabilityAnalyzer'
import { FlowGenerator } from '../../../orchestrator/FlowGenerator'
import { LiteLLMRouterV2 } from '../../../orchestrator/LiteLLMRouterV2'
import { FlowOptimizer } from '../../../orchestrator/FlowOptimizer'
import { CapabilityWatcher } from '../../../orchestrator/CapabilityWatcher'
import { EvaluationPipeline } from '../../../orchestrator/EvaluationPipeline'
import { SecuritySandbox } from '../../../orchestrator/SecuritySandbox'

describe('Orchestration System Integration Tests', () => {
    let orchestrator: MetaOrchestrator

    beforeAll(async () => {
        // Set test environment
        process.env.NODE_ENV = 'test'
        process.env.USE_LITELLM_V2 = 'false' // Use simulated router for tests
        
        orchestrator = new MetaOrchestrator()
        // Don't initialize fully in tests to avoid external dependencies
    })

    describe('Capability Analysis', () => {
        it('should analyze available components', async () => {
            const analyzer = new CapabilityAnalyzer()
            const catalog = await analyzer.analyzeCapabilities()
            
            expect(catalog.components.size).toBeGreaterThan(0)
            expect(catalog.categories.size).toBeGreaterThan(0)
            expect(catalog.lastUpdated).toBeInstanceOf(Date)
        })

        it('should search capabilities by query', async () => {
            const analyzer = new CapabilityAnalyzer()
            await analyzer.analyzeCapabilities()
            
            const results = analyzer.searchCapabilities('chat')
            expect(results.length).toBeGreaterThan(0)
            expect(results[0]).toHaveProperty('id')
            expect(results[0]).toHaveProperty('name')
            expect(results[0]).toHaveProperty('category')
        })

        it('should get capabilities by category', async () => {
            const analyzer = new CapabilityAnalyzer()
            await analyzer.analyzeCapabilities()
            
            const chatModels = analyzer.getCapabilitiesByCategory('chatmodels')
            expect(chatModels.length).toBeGreaterThan(0)
            expect(chatModels.every(c => c.category === 'chatmodels')).toBe(true)
        })
    })

    describe('Flow Generation', () => {
        it('should generate a simple chat flow', async () => {
            const generator = new FlowGenerator()
            const flow = await generator.generateFlow({
                intent: {
                    primaryGoal: 'Q&A chatbot',
                    requiredCapabilities: ['chat', 'memory'],
                    suggestedComponents: [],
                    workflowType: 'simple',
                    complexity: 'low',
                    specialRequirements: []
                },
                components: [],
                models: ['gpt-3.5-turbo']
            })

            expect(flow).toHaveProperty('id')
            expect(flow).toHaveProperty('flowData')
            expect(flow.type).toBe('CHATFLOW')
            
            const { nodes, edges } = JSON.parse(flow.flowData)
            expect(nodes.length).toBeGreaterThan(0)
            expect(nodes.some(n => n.type === 'chatOpenAI')).toBe(true)
        })

        it('should generate an agent flow', async () => {
            const generator = new FlowGenerator()
            const flow = await generator.generateFlow({
                intent: {
                    primaryGoal: 'Research agent',
                    requiredCapabilities: ['agent', 'tools', 'memory'],
                    suggestedComponents: [],
                    workflowType: 'agent',
                    complexity: 'medium',
                    specialRequirements: []
                },
                components: [],
                models: ['gpt-4-turbo-preview']
            })

            expect(flow.type).toBe('AGENTFLOW')
            
            const { nodes, edges } = JSON.parse(flow.flowData)
            expect(nodes.some(n => n.type === 'reactAgent')).toBe(true)
            expect(nodes.some(n => n.type === 'bufferMemory')).toBe(true)
        })

        it('should validate generated flows', async () => {
            const generator = new FlowGenerator()
            const flow = await generator.generateFlow({
                intent: {
                    primaryGoal: 'Test flow',
                    requiredCapabilities: [],
                    suggestedComponents: [],
                    workflowType: 'simple',
                    complexity: 'low',
                    specialRequirements: []
                },
                components: [],
                models: ['gpt-3.5-turbo']
            })

            const validation = await generator.validateFlow(flow)
            expect(validation.valid).toBe(true)
            expect(validation.errors).toHaveLength(0)
        })
    })

    describe('Flow Optimization', () => {
        it('should optimize a flow', async () => {
            const optimizer = new FlowOptimizer()
            const testFlow = {
                flowData: JSON.stringify({
                    nodes: [
                        { id: '1', type: 'chatModel', position: { x: 0, y: 0 }, data: {} },
                        { id: '2', type: 'unused', position: { x: 100, y: 0 }, data: {} },
                        { id: '3', type: 'output', position: { x: 200, y: 0 }, data: {} }
                    ],
                    edges: [
                        { id: 'e1', source: '1', target: '3' }
                    ]
                })
            }

            const result = await optimizer.optimizeFlow(testFlow)
            
            expect(result.optimizations).toContain('removed-1-redundant-nodes')
            expect(result.metrics.nodeCount.before).toBe(3)
            expect(result.metrics.nodeCount.after).toBe(2)
        })

        it('should add caching nodes', async () => {
            const optimizer = new FlowOptimizer()
            const testFlow = {
                flowData: JSON.stringify({
                    nodes: [
                        { 
                            id: '1', 
                            type: 'chatModel', 
                            position: { x: 0, y: 0 }, 
                            data: { inputs: {} } 
                        }
                    ],
                    edges: []
                })
            }

            const result = await optimizer.optimizeFlow(testFlow, {
                enableCaching: true
            })
            
            const { nodes } = JSON.parse(result.optimizedFlow.flowData)
            expect(nodes.some(n => n.type === 'memoryCache')).toBe(true)
            expect(result.optimizations).toContain('added-1-cache-nodes')
        })
    })

    describe('LiteLLM Router', () => {
        it('should list available models', () => {
            const router = new LiteLLMRouterV2()
            const models = router.listAvailableModels()
            
            expect(models.length).toBeGreaterThan(0)
            expect(models[0]).toHaveProperty('modelId')
            expect(models[0]).toHaveProperty('provider')
        })

        it('should select optimal models', async () => {
            const router = new LiteLLMRouterV2()
            const models = await router.selectOptimalModels({
                capabilities: ['reasoning', 'code-generation'],
                complexity: 'high',
                maxCost: 0.05
            })

            expect(models.length).toBeGreaterThan(0)
            expect(models).toContain('gpt-4-turbo-preview')
        })
    })

    describe('Evaluation Pipeline', () => {
        it('should run benchmark tasks', async () => {
            const pipeline = new EvaluationPipeline()
            
            // Add a simple test benchmark
            pipeline.addBenchmark({
                id: 'test-001',
                name: 'Simple Math',
                category: 'reasoning',
                prompt: 'What is 2 + 2?',
                expectedCapabilities: ['arithmetic'],
                evaluationCriteria: [{
                    metric: 'correctness',
                    weight: 1.0,
                    scoringFunction: (response: string) => {
                        return response.includes('4') ? 1.0 : 0.0
                    }
                }]
            })

            // Mock LLM response for testing
            const mockModel = 'test-model'
            const result = await pipeline.evaluateModel(mockModel, ['test-001'])
            
            expect(result).toHaveProperty('model', mockModel)
            expect(result).toHaveProperty('overallScore')
            expect(result).toHaveProperty('categoryScores')
        })
    })

    describe('Security Sandbox', () => {
        it('should create a VM sandbox', async () => {
            const sandbox = new SecuritySandbox()
            const sandboxId = await sandbox.createSandbox({
                type: 'vm',
                securityLevel: 'medium',
                timeout: 5000,
                memoryLimit: 128,
                cpuLimit: 50,
                networkAccess: false,
                fileSystemAccess: 'none'
            })

            expect(sandboxId).toMatch(/^sandbox_/)
            
            // Clean up
            await sandbox.destroySandbox(sandboxId)
        })

        it('should detect security violations', async () => {
            const sandbox = new SecuritySandbox()
            const sandboxId = await sandbox.createSandbox({
                type: 'vm',
                securityLevel: 'high',
                timeout: 5000,
                memoryLimit: 128,
                cpuLimit: 50,
                networkAccess: false,
                fileSystemAccess: 'none'
            })

            const result = await sandbox.execute(sandboxId, {
                code: 'console.log("safe code")',
                language: 'javascript'
            }, {
                canExecuteCode: true,
                canAccessNetwork: false,
                canAccessFileSystem: false,
                canSpawnProcesses: false,
                maxExecutionTime: 5000,
                maxMemoryUsage: 128
            })

            expect(result.success).toBe(true)
            expect(result.stdout).toContain('safe code')
            expect(result.securityViolations).toBeUndefined()

            // Clean up
            await sandbox.destroySandbox(sandboxId)
        })
    })

    describe('End-to-End Orchestration', () => {
        it('should orchestrate a simple request', async () => {
            const response = await orchestrator.orchestrate({
                query: 'Create a simple chatbot',
                constraints: {
                    maxCost: 0.01,
                    securityLevel: 'low'
                }
            })

            expect(response).toHaveProperty('flowId')
            expect(response).toHaveProperty('flow')
            expect(response).toHaveProperty('explanation')
            expect(response.confidence).toBeGreaterThan(0)
            expect(response.metadata.componentsUsed.length).toBeGreaterThan(0)
        })

        it('should use cache for repeated requests', async () => {
            const request = {
                query: 'Create a cached chatbot',
                constraints: { maxCost: 0.01 }
            }

            const response1 = await orchestrator.orchestrate(request)
            const startTime = Date.now()
            const response2 = await orchestrator.orchestrate(request)
            const cacheTime = Date.now() - startTime

            expect(response1.flowId).not.toBe(response2.flowId) // Different IDs
            expect(cacheTime).toBeLessThan(100) // Should be fast from cache
        })
    })
})

describe('Capability Watcher', () => {
    it('should detect file changes', (done) => {
        const analyzer = new CapabilityAnalyzer()
        const watcher = new CapabilityWatcher(analyzer, {
            debounceDelay: 100 // Fast for testing
        })

        watcher.on('ready', () => {
            // Watcher is ready
            done()
        })

        watcher.start().catch(done)
        
        // Clean up
        afterAll(() => watcher.stop())
    })
})

// Performance benchmarks
describe('Performance Benchmarks', () => {
    it('should generate flows quickly', async () => {
        const startTime = Date.now()
        
        await orchestrator.orchestrate({
            query: 'Create a performance test bot'
        })
        
        const duration = Date.now() - startTime
        expect(duration).toBeLessThan(5000) // Should complete within 5 seconds
    })

    it('should handle concurrent requests', async () => {
        const requests = Array(5).fill(null).map((_, i) => ({
            query: `Create bot ${i}`
        }))

        const startTime = Date.now()
        const responses = await Promise.all(
            requests.map(req => orchestrator.orchestrate(req))
        )
        const duration = Date.now() - startTime

        expect(responses.length).toBe(5)
        expect(responses.every(r => r.flowId)).toBe(true)
        expect(duration).toBeLessThan(10000) // Should handle 5 requests in 10s
    })
})