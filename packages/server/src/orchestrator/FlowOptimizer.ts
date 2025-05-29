/**
 * Flow Optimizer for NubemGenesis
 * Optimizes generated flows for performance, cost, and reliability
 */

import { ICommonObject } from '../../../components/src/Interface'
import { v4 as uuidv4 } from 'uuid'

export interface OptimizationConfig {
    enableCaching?: boolean
    enableParallelization?: boolean
    enableRetry?: boolean
    maxCost?: number
    maxLatency?: number
    targetReliability?: number
}

export interface OptimizationResult {
    optimizedFlow: ICommonObject
    optimizations: string[]
    metrics: {
        estimatedCostReduction: number
        estimatedLatencyReduction: number
        reliabilityImprovement: number
        nodeCount: {
            before: number
            after: number
        }
    }
}

interface FlowNode {
    id: string
    type: string
    position: { x: number; y: number }
    data: any
}

interface FlowEdge {
    id: string
    source: string
    sourceHandle?: string
    target: string
    targetHandle?: string
    type?: string
}

export class FlowOptimizer {
    /**
     * Optimize a flow based on constraints and best practices
     */
    async optimizeFlow(
        flow: ICommonObject,
        config: OptimizationConfig = {}
    ): Promise<OptimizationResult> {
        const optimizations: string[] = []
        let optimizedFlow = JSON.parse(JSON.stringify(flow)) // Deep clone
        
        const { nodes: originalNodes, edges: originalEdges } = JSON.parse(flow.flowData)
        let { nodes, edges } = JSON.parse(optimizedFlow.flowData)
        
        // Track metrics
        const nodeCountBefore = nodes.length

        // 1. Remove redundant nodes
        const redundantResult = this.removeRedundantNodes(nodes, edges)
        if (redundantResult.removed > 0) {
            nodes = redundantResult.nodes
            edges = redundantResult.edges
            optimizations.push(`removed-${redundantResult.removed}-redundant-nodes`)
        }

        // 2. Merge compatible nodes
        const mergeResult = this.mergeCompatibleNodes(nodes, edges)
        if (mergeResult.merged > 0) {
            nodes = mergeResult.nodes
            edges = mergeResult.edges
            optimizations.push(`merged-${mergeResult.merged}-compatible-nodes`)
        }

        // 3. Add caching where beneficial
        if (config.enableCaching !== false) {
            const cacheResult = this.addCachingNodes(nodes, edges, config)
            if (cacheResult.added > 0) {
                nodes = cacheResult.nodes
                edges = cacheResult.edges
                optimizations.push(`added-${cacheResult.added}-cache-nodes`)
            }
        }

        // 4. Configure retry logic
        if (config.enableRetry !== false) {
            const retryResult = this.configureRetryLogic(nodes, config)
            if (retryResult.configured > 0) {
                nodes = retryResult.nodes
                optimizations.push(`configured-retry-for-${retryResult.configured}-nodes`)
            }
        }

        // 5. Add parallelization
        if (config.enableParallelization !== false) {
            const parallelResult = this.addParallelization(nodes, edges)
            if (parallelResult.parallelized > 0) {
                nodes = parallelResult.nodes
                edges = parallelResult.edges
                optimizations.push(`parallelized-${parallelResult.parallelized}-operations`)
            }
        }

        // 6. Optimize for cost if constraint exists
        if (config.maxCost) {
            const costResult = this.optimizeForCost(nodes, edges, config.maxCost)
            if (costResult.optimized) {
                nodes = costResult.nodes
                edges = costResult.edges
                optimizations.push('cost-optimized')
            }
        }

        // 7. Optimize for latency if constraint exists
        if (config.maxLatency) {
            const latencyResult = this.optimizeForLatency(nodes, edges, config.maxLatency)
            if (latencyResult.optimized) {
                nodes = latencyResult.nodes
                edges = latencyResult.edges
                optimizations.push('latency-optimized')
            }
        }

        // 8. Optimize node positions for better visualization
        this.optimizeNodePositions(nodes, edges)
        optimizations.push('layout-optimized')

        // Update flow data
        optimizedFlow.flowData = JSON.stringify({ nodes, edges })

        // Calculate metrics
        const metrics = this.calculateOptimizationMetrics(
            originalNodes.length,
            nodes.length,
            optimizations
        )

        return {
            optimizedFlow,
            optimizations,
            metrics
        }
    }

    /**
     * Remove nodes that don't contribute to the flow
     */
    private removeRedundantNodes(
        nodes: FlowNode[],
        edges: FlowEdge[]
    ): { nodes: FlowNode[]; edges: FlowEdge[]; removed: number } {
        const usedNodes = new Set<string>()
        const essentialTypes = ['start', 'end', 'chatModel', 'agent', 'memory']
        
        // Mark all nodes connected by edges
        edges.forEach(edge => {
            usedNodes.add(edge.source)
            usedNodes.add(edge.target)
        })

        // Keep essential nodes even if not connected
        nodes.forEach(node => {
            if (essentialTypes.includes(node.type)) {
                usedNodes.add(node.id)
            }
        })

        // Filter out unused nodes
        const filteredNodes = nodes.filter(node => usedNodes.has(node.id))
        const removed = nodes.length - filteredNodes.length

        return { 
            nodes: filteredNodes, 
            edges,
            removed
        }
    }

    /**
     * Merge nodes that can be combined
     */
    private mergeCompatibleNodes(
        nodes: FlowNode[],
        edges: FlowEdge[]
    ): { nodes: FlowNode[]; edges: FlowEdge[]; merged: number } {
        let merged = 0
        const newNodes = [...nodes]
        const newEdges = [...edges]

        // Find sequential prompt nodes that can be merged
        const promptNodes = nodes.filter(n => 
            n.type === 'systemMessagePrompt' || 
            n.type === 'humanMessagePrompt'
        )

        for (let i = 0; i < promptNodes.length - 1; i++) {
            const node1 = promptNodes[i]
            const node2 = promptNodes[i + 1]

            // Check if they're connected sequentially
            const connection = edges.find(e => 
                e.source === node1.id && e.target === node2.id
            )

            if (connection) {
                // Merge content
                node1.data.inputs.content = 
                    `${node1.data.inputs.content}\n\n${node2.data.inputs.content}`
                
                // Update edges to bypass node2
                newEdges.forEach(edge => {
                    if (edge.source === node2.id) {
                        edge.source = node1.id
                    }
                    if (edge.target === node2.id) {
                        edge.target = node1.id
                    }
                })

                // Remove node2 and its connection
                const node2Index = newNodes.findIndex(n => n.id === node2.id)
                if (node2Index > -1) {
                    newNodes.splice(node2Index, 1)
                    merged++
                }

                const connIndex = newEdges.findIndex(e => e.id === connection.id)
                if (connIndex > -1) {
                    newEdges.splice(connIndex, 1)
                }
            }
        }

        return { nodes: newNodes, edges: newEdges, merged }
    }

    /**
     * Add caching nodes for expensive operations
     */
    private addCachingNodes(
        nodes: FlowNode[],
        edges: FlowEdge[],
        config: OptimizationConfig
    ): { nodes: FlowNode[]; edges: FlowEdge[]; added: number } {
        const newNodes = [...nodes]
        const newEdges = [...edges]
        let added = 0

        // Identify expensive nodes that benefit from caching
        const cacheableTypes = ['chatModel', 'agent', 'vectorStore', 'retriever']
        const expensiveNodes = nodes.filter(n => cacheableTypes.includes(n.type))

        expensiveNodes.forEach(node => {
            // Check if node already has cache
            const hasCache = edges.some(e => 
                e.target === node.id && 
                newNodes.find(n => n.id === e.source && n.type === 'cache')
            )

            if (!hasCache) {
                // Create cache node
                const cacheNode: FlowNode = {
                    id: `cache_${node.id}`,
                    type: 'memoryCache',
                    position: {
                        x: node.position.x - 150,
                        y: node.position.y
                    },
                    data: {
                        id: `cache_${node.id}`,
                        label: 'Memory Cache',
                        name: 'memoryCache',
                        type: 'Cache',
                        baseClasses: ['Cache'],
                        inputs: {
                            ttl: 3600, // 1 hour
                            maxItems: 100,
                            keyPrefix: node.type
                        },
                        outputs: {
                            [`cache_${node.id}-output-cache`]: 'cache'
                        }
                    }
                }

                newNodes.push(cacheNode)

                // Redirect incoming edges through cache
                const incomingEdges = newEdges.filter(e => e.target === node.id)
                incomingEdges.forEach(edge => {
                    // Create new edge to cache
                    const toCacheEdge: FlowEdge = {
                        id: `${edge.source}_to_${cacheNode.id}`,
                        source: edge.source,
                        sourceHandle: edge.sourceHandle,
                        target: cacheNode.id,
                        targetHandle: `${cacheNode.id}-input`,
                        type: edge.type
                    }
                    newEdges.push(toCacheEdge)

                    // Update original edge to come from cache
                    edge.source = cacheNode.id
                    edge.sourceHandle = `${cacheNode.id}-output-cache`
                })

                added++
            }
        })

        return { nodes: newNodes, edges: newEdges, added }
    }

    /**
     * Configure retry logic for nodes
     */
    private configureRetryLogic(
        nodes: FlowNode[],
        config: OptimizationConfig
    ): { nodes: FlowNode[]; configured: number } {
        let configured = 0

        nodes.forEach(node => {
            // Add retry to external API calls and LLM nodes
            if (node.type === 'chatModel' || 
                node.type === 'agent' || 
                node.type.includes('api')) {
                
                if (!node.data.inputs.retry) {
                    node.data.inputs.retry = {
                        enabled: true,
                        maxAttempts: 3,
                        backoffMultiplier: 2,
                        initialDelay: 1000,
                        maxDelay: 10000
                    }
                    configured++
                }
            }
        })

        return { nodes, configured }
    }

    /**
     * Add parallelization where possible
     */
    private addParallelization(
        nodes: FlowNode[],
        edges: FlowEdge[]
    ): { nodes: FlowNode[]; edges: FlowEdge[]; parallelized: number } {
        let parallelized = 0

        // Find nodes that can run in parallel
        const nodesByDepth = this.calculateNodeDepths(nodes, edges)
        
        // Look for nodes at the same depth that aren't connected
        nodesByDepth.forEach((nodesAtDepth, depth) => {
            if (nodesAtDepth.length > 1) {
                // Check if these nodes can run in parallel
                const canParallelize = nodesAtDepth.every(node1 =>
                    nodesAtDepth.every(node2 => 
                        node1 === node2 || 
                        !this.areNodesConnected(node1.id, node2.id, edges)
                    )
                )

                if (canParallelize) {
                    // Add parallel execution flag
                    nodesAtDepth.forEach(node => {
                        if (!node.data.parallel) {
                            node.data.parallel = {
                                enabled: true,
                                group: `parallel_group_${depth}`
                            }
                        }
                    })
                    parallelized += nodesAtDepth.length
                }
            }
        })

        return { nodes, edges, parallelized }
    }

    /**
     * Optimize for cost constraint
     */
    private optimizeForCost(
        nodes: FlowNode[],
        edges: FlowEdge[],
        maxCost: number
    ): { nodes: FlowNode[]; edges: FlowEdge[]; optimized: boolean } {
        let optimized = false

        // Replace expensive models with cheaper alternatives
        nodes.forEach(node => {
            if (node.type === 'chatModel' && node.data.inputs.modelName) {
                const currentModel = node.data.inputs.modelName
                
                // Model cost mapping (simplified)
                const modelCosts: Record<string, number> = {
                    'gpt-4-turbo-preview': 0.03,
                    'gpt-3.5-turbo': 0.002,
                    'claude-3-opus-20240229': 0.075,
                    'claude-3-sonnet-20240229': 0.015,
                    'gemini-pro': 0.001,
                    'mixtral-8x7b-instruct': 0.0006
                }

                if (modelCosts[currentModel] && modelCosts[currentModel] > maxCost) {
                    // Find cheaper alternative
                    const cheaperModel = Object.entries(modelCosts)
                        .filter(([_, cost]) => cost <= maxCost)
                        .sort((a, b) => b[1] - a[1])[0] // Get most expensive within budget

                    if (cheaperModel) {
                        node.data.inputs.modelName = cheaperModel[0]
                        node.data.inputs.costOptimized = true
                        optimized = true
                    }
                }
            }
        })

        return { nodes, edges, optimized }
    }

    /**
     * Optimize for latency constraint
     */
    private optimizeForLatency(
        nodes: FlowNode[],
        edges: FlowEdge[],
        maxLatency: number
    ): { nodes: FlowNode[]; edges: FlowEdge[]; optimized: boolean } {
        let optimized = false

        nodes.forEach(node => {
            // Enable streaming for compatible nodes
            if (node.type === 'chatModel' && !node.data.inputs.streaming) {
                node.data.inputs.streaming = true
                optimized = true
            }

            // Reduce token limits to speed up responses
            if (node.data.inputs.maxTokens && node.data.inputs.maxTokens > 1000) {
                node.data.inputs.maxTokens = Math.min(node.data.inputs.maxTokens, 1000)
                node.data.inputs.latencyOptimized = true
                optimized = true
            }

            // Use faster models
            if (node.type === 'chatModel' && node.data.inputs.modelName) {
                const fastModels = ['gpt-3.5-turbo', 'gemini-pro', 'mixtral-8x7b-instruct']
                if (!fastModels.includes(node.data.inputs.modelName)) {
                    node.data.inputs.modelName = 'gpt-3.5-turbo'
                    node.data.inputs.latencyOptimized = true
                    optimized = true
                }
            }
        })

        return { nodes, edges, optimized }
    }

    /**
     * Optimize node positions for better visualization
     */
    private optimizeNodePositions(nodes: FlowNode[], edges: FlowEdge[]): void {
        const nodesByDepth = this.calculateNodeDepths(nodes, edges)
        const horizontalSpacing = 250
        const verticalSpacing = 150
        const startX = 100
        const startY = 100

        nodesByDepth.forEach((nodesAtDepth, depth) => {
            const centerY = startY + (Math.max(...Array.from(nodesByDepth.keys())) * verticalSpacing) / 2

            nodesAtDepth.forEach((node, index) => {
                const totalWidth = (nodesAtDepth.length - 1) * horizontalSpacing
                const offsetX = -totalWidth / 2 + index * horizontalSpacing

                node.position = {
                    x: startX + depth * horizontalSpacing,
                    y: centerY + offsetX
                }
            })
        })
    }

    /**
     * Calculate node depths for layout
     */
    private calculateNodeDepths(
        nodes: FlowNode[],
        edges: FlowEdge[]
    ): Map<number, FlowNode[]> {
        const depths = new Map<string, number>()
        const nodeMap = new Map(nodes.map(n => [n.id, n]))
        
        // Find start nodes (no incoming edges)
        const startNodes = nodes.filter(node =>
            !edges.some(edge => edge.target === node.id)
        )

        // BFS to calculate depths
        const queue: Array<{ node: FlowNode; depth: number }> = 
            startNodes.map(node => ({ node, depth: 0 }))

        while (queue.length > 0) {
            const { node, depth } = queue.shift()!
            
            if (!depths.has(node.id) || depths.get(node.id)! > depth) {
                depths.set(node.id, depth)

                // Find connected nodes
                const connectedEdges = edges.filter(e => e.source === node.id)
                connectedEdges.forEach(edge => {
                    const targetNode = nodeMap.get(edge.target)
                    if (targetNode) {
                        queue.push({ node: targetNode, depth: depth + 1 })
                    }
                })
            }
        }

        // Group nodes by depth
        const nodesByDepth = new Map<number, FlowNode[]>()
        nodes.forEach(node => {
            const depth = depths.get(node.id) || 0
            if (!nodesByDepth.has(depth)) {
                nodesByDepth.set(depth, [])
            }
            nodesByDepth.get(depth)!.push(node)
        })

        return nodesByDepth
    }

    /**
     * Check if two nodes are connected
     */
    private areNodesConnected(
        nodeId1: string,
        nodeId2: string,
        edges: FlowEdge[]
    ): boolean {
        return edges.some(edge =>
            (edge.source === nodeId1 && edge.target === nodeId2) ||
            (edge.source === nodeId2 && edge.target === nodeId1)
        )
    }

    /**
     * Calculate optimization metrics
     */
    private calculateOptimizationMetrics(
        nodeCountBefore: number,
        nodeCountAfter: number,
        optimizations: string[]
    ): OptimizationResult['metrics'] {
        const nodeReduction = (nodeCountBefore - nodeCountAfter) / nodeCountBefore

        return {
            estimatedCostReduction: optimizations.includes('cost-optimized') ? 0.3 : 
                                  optimizations.some(o => o.includes('cache')) ? 0.15 : 0,
            estimatedLatencyReduction: optimizations.includes('latency-optimized') ? 0.4 :
                                     optimizations.some(o => o.includes('parallel')) ? 0.25 : 0.1,
            reliabilityImprovement: optimizations.some(o => o.includes('retry')) ? 0.2 : 0,
            nodeCount: {
                before: nodeCountBefore,
                after: nodeCountAfter
            }
        }
    }
}

// Export singleton instance
export const flowOptimizer = new FlowOptimizer()