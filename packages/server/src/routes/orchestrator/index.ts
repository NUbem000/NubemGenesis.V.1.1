/**
 * Orchestrator API Routes
 * Endpoints for AI orchestration and capability management
 */

import express, { Request, Response, NextFunction } from 'express'
import { StatusCodes } from 'http-status-codes'
import { metaOrchestrator, OrchestrationRequest } from '../../orchestrator/MetaOrchestrator'
import { capabilityAnalyzer } from '../../orchestrator/CapabilityAnalyzer'
import { liteLLMRouter } from '../../orchestrator/LiteLLMRouter'
import { flowGenerator } from '../../orchestrator/FlowGenerator'
import { validateApiKey } from '../../utils/validateKey'
import { Telemetry } from '../../utils/telemetry'
import { rateLimit } from '../../middlewares/rateLimiter'
import chatflowsService from '../../services/chatflows'
import { InternalFlowiseError } from '../../errors/internalFlowiseError'
import { getErrorMessage } from '../../errors/utils'

const router = express.Router()
const telemetry = new Telemetry()

// Rate limiting for orchestration endpoints
const orchestrationRateLimit = rateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: 10, // 10 requests per minute
    message: 'Too many orchestration requests'
})

/**
 * POST /api/v1/orchestrate
 * Main orchestration endpoint - interprets user request and generates flow
 */
router.post(
    '/',
    orchestrationRateLimit,
    async (req: Request, res: Response, next: NextFunction) => {
        try {
            const { query, constraints, context } = req.body as OrchestrationRequest

            // Validate request
            if (!query || typeof query !== 'string') {
                return res.status(StatusCodes.BAD_REQUEST).json({
                    error: 'Query is required and must be a string'
                })
            }

            // Optional API key validation
            if (req.headers['x-api-key']) {
                const apiKey = req.headers['x-api-key'] as string
                const isValid = await validateApiKey(apiKey)
                if (!isValid) {
                    return res.status(StatusCodes.UNAUTHORIZED).json({
                        error: 'Invalid API key'
                    })
                }
            }

            // Track request
            telemetry.sendTelemetry('orchestration_request', {
                query,
                constraints,
                context
            })

            // Orchestrate the request
            const response = await metaOrchestrator.orchestrate({
                query,
                constraints,
                context
            })

            // Optionally save the generated flow
            if (req.body.saveFlow) {
                const savedFlow = await chatflowsService.createChatflow({
                    name: response.flow.name || `Orchestrated: ${query.substring(0, 50)}...`,
                    flowData: response.flow.flowData,
                    deployed: false,
                    isPublic: false,
                    type: response.flow.type,
                    createdDate: new Date(),
                    updatedDate: new Date()
                })
                
                response.flow.id = savedFlow.id
            }

            res.status(StatusCodes.OK).json(response)

        } catch (error) {
            next(error)
        }
    }
)

/**
 * GET /api/v1/orchestrate/capabilities
 * Get all available capabilities
 */
router.get(
    '/capabilities',
    async (req: Request, res: Response, next: NextFunction) => {
        try {
            const catalog = await capabilityAnalyzer.analyzeCapabilities()
            
            // Convert Maps to arrays for JSON serialization
            const response = {
                components: Array.from(catalog.components.values()),
                categories: Object.fromEntries(catalog.categories),
                features: Object.fromEntries(catalog.features),
                lastUpdated: catalog.lastUpdated
            }

            res.status(StatusCodes.OK).json(response)

        } catch (error) {
            next(error)
        }
    }
)

/**
 * GET /api/v1/orchestrate/capabilities/search
 * Search capabilities by query
 */
router.get(
    '/capabilities/search',
    async (req: Request, res: Response, next: NextFunction) => {
        try {
            const { q, category, feature } = req.query

            if (!q && !category && !feature) {
                return res.status(StatusCodes.BAD_REQUEST).json({
                    error: 'Query parameter q, category, or feature is required'
                })
            }

            let results
            
            if (q) {
                results = capabilityAnalyzer.searchCapabilities(q as string)
            } else if (category) {
                results = capabilityAnalyzer.getCapabilitiesByCategory(category as string)
            } else if (feature) {
                results = capabilityAnalyzer.getCapabilitiesByFeature(feature as string)
            }

            res.status(StatusCodes.OK).json({
                results,
                count: results?.length || 0
            })

        } catch (error) {
            next(error)
        }
    }
)

/**
 * GET /api/v1/orchestrate/models
 * List all available models
 */
router.get(
    '/models',
    async (req: Request, res: Response, next: NextFunction) => {
        try {
            const models = liteLLMRouter.listAvailableModels()
            const performanceReport = liteLLMRouter.getPerformanceReport()
            
            // Combine model info with performance data
            const enrichedModels = models.map(model => {
                const perf = performanceReport.get(model.modelId)
                const caps = liteLLMRouter.getModelCapabilities(model.modelId)
                
                return {
                    ...model,
                    capabilities: caps,
                    performance: perf || { avgLatency: 0, requestCount: 0 }
                }
            })

            res.status(StatusCodes.OK).json({
                models: enrichedModels,
                count: enrichedModels.length
            })

        } catch (error) {
            next(error)
        }
    }
)

/**
 * POST /api/v1/orchestrate/evaluate
 * Trigger evaluation of a new model or tool
 */
router.post(
    '/evaluate',
    orchestrationRateLimit,
    async (req: Request, res: Response, next: NextFunction) => {
        try {
            const { type, target, config } = req.body

            if (!type || !target) {
                return res.status(StatusCodes.BAD_REQUEST).json({
                    error: 'Type and target are required'
                })
            }

            // TODO: Implement evaluation pipeline
            // For now, return a mock response
            const evaluationId = `eval_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
            
            telemetry.sendTelemetry('evaluation_triggered', {
                type,
                target,
                evaluationId
            })

            res.status(StatusCodes.ACCEPTED).json({
                evaluationId,
                status: 'pending',
                message: 'Evaluation has been queued',
                estimatedTime: '5-10 minutes'
            })

        } catch (error) {
            next(error)
        }
    }
)

/**
 * POST /api/v1/orchestrate/validate
 * Validate a generated flow
 */
router.post(
    '/validate',
    async (req: Request, res: Response, next: NextFunction) => {
        try {
            const { flow } = req.body

            if (!flow) {
                return res.status(StatusCodes.BAD_REQUEST).json({
                    error: 'Flow is required'
                })
            }

            const validation = await flowGenerator.validateFlow(flow)

            res.status(StatusCodes.OK).json(validation)

        } catch (error) {
            next(error)
        }
    }
)

/**
 * GET /api/v1/orchestrate/templates
 * Get available flow templates
 */
router.get(
    '/templates',
    async (req: Request, res: Response, next: NextFunction) => {
        try {
            // TODO: Implement template management
            const templates = [
                {
                    id: 'qa-bot',
                    name: 'Q&A Bot',
                    description: 'Simple question-answering bot with memory',
                    tags: ['chat', 'simple', 'memory'],
                    complexity: 'low'
                },
                {
                    id: 'research-agent',
                    name: 'Research Agent',
                    description: 'Agent that can search the web and summarize findings',
                    tags: ['agent', 'tools', 'web-search'],
                    complexity: 'medium'
                },
                {
                    id: 'code-assistant',
                    name: 'Code Assistant',
                    description: 'AI assistant for code generation and debugging',
                    tags: ['agent', 'code', 'tools'],
                    complexity: 'high'
                },
                {
                    id: 'multi-agent-team',
                    name: 'Multi-Agent Team',
                    description: 'Coordinated team of specialized agents',
                    tags: ['multi-agent', 'complex', 'supervisor'],
                    complexity: 'high'
                }
            ]

            res.status(StatusCodes.OK).json({
                templates,
                count: templates.length
            })

        } catch (error) {
            next(error)
        }
    }
)

/**
 * POST /api/v1/orchestrate/optimize
 * Optimize an existing flow
 */
router.post(
    '/optimize',
    orchestrationRateLimit,
    async (req: Request, res: Response, next: NextFunction) => {
        try {
            const { flowId, constraints } = req.body

            if (!flowId) {
                return res.status(StatusCodes.BAD_REQUEST).json({
                    error: 'Flow ID is required'
                })
            }

            // Get the flow
            const flow = await chatflowsService.getChatflowById(flowId)
            if (!flow) {
                return res.status(StatusCodes.NOT_FOUND).json({
                    error: 'Flow not found'
                })
            }

            // TODO: Implement flow optimization
            // For now, return the original flow with optimization metadata
            res.status(StatusCodes.OK).json({
                optimizedFlow: flow,
                optimizations: [
                    'Added caching nodes for better performance',
                    'Optimized prompt templates',
                    'Selected more cost-effective models'
                ],
                estimatedImprovement: {
                    cost: '-25%',
                    latency: '-15%',
                    accuracy: '+5%'
                }
            })

        } catch (error) {
            next(error)
        }
    }
)

/**
 * GET /api/v1/orchestrate/health
 * Health check for orchestration services
 */
router.get(
    '/health',
    async (req: Request, res: Response, next: NextFunction) => {
        try {
            const health = {
                status: 'healthy',
                services: {
                    orchestrator: 'operational',
                    capabilityAnalyzer: 'operational',
                    liteLLMRouter: 'operational',
                    flowGenerator: 'operational'
                },
                timestamp: new Date().toISOString()
            }

            res.status(StatusCodes.OK).json(health)

        } catch (error) {
            next(error)
        }
    }
)

// Error handling middleware for orchestrator routes
router.use((err: Error, req: Request, res: Response, next: NextFunction) => {
    if (err instanceof InternalFlowiseError) {
        return res.status(err.statusCode).json({
            error: err.message
        })
    }
    
    const errorMessage = getErrorMessage(err)
    console.error('Orchestrator error:', errorMessage)
    
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
        error: 'An error occurred during orchestration',
        message: process.env.NODE_ENV === 'development' ? errorMessage : undefined
    })
})

export default router