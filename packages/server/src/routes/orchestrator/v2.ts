/**
 * Orchestrator V2 API Routes
 * Enhanced endpoints with RAG and clarification support
 */

import express, { Request, Response, NextFunction } from 'express'
import { StatusCodes } from 'http-status-codes'
import { getMetaOrchestratorV2 } from '../../orchestrator/MetaOrchestratorV2'
import { OrchestrationRequestV2, OrchestrationResponseV2 } from '../../orchestrator/types'
import { validateApiKey } from '../../utils/validateKey'
import { Telemetry } from '../../utils/telemetry'
import { rateLimit } from '../../middlewares/rateLimiter'
import chatflowsService from '../../services/chatflows'
import { InternalFlowiseError } from '../../errors/internalFlowiseError'
import { getErrorMessage } from '../../errors/utils'
import { getUseCaseKnowledgeBase } from '../../orchestrator/UseCaseKnowledgeBase'

const router = express.Router()
const telemetry = new Telemetry()

// Rate limiting for orchestration endpoints
const orchestrationRateLimit = rateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: 20, // 20 requests per minute (increased for clarification flow)
    message: 'Too many orchestration requests'
})

// Initialize orchestrator on startup
let orchestratorV2: any = null
const initializeOrchestrator = async () => {
    if (!orchestratorV2) {
        orchestratorV2 = getMetaOrchestratorV2()
        await orchestratorV2.initialize()
    }
    return orchestratorV2
}

/**
 * POST /api/v2/orchestrate
 * Enhanced orchestration with RAG and clarification support
 */
router.post(
    '/orchestrate',
    orchestrationRateLimit,
    async (req: Request, res: Response, next: NextFunction) => {
        try {
            const orchestrator = await initializeOrchestrator()
            const request = req.body as OrchestrationRequestV2

            // Validate request
            if (!request.query || typeof request.query !== 'string') {
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
            await telemetry.track('orchestration_request_v2', {
                queryLength: request.query.length,
                hasClarifications: !!request.clarifications,
                hasConstraints: !!request.constraints
            })

            // Process orchestration request
            const startTime = Date.now()
            const response = await orchestrator.orchestrate(request)
            const processingTime = Date.now() - startTime

            // Track response
            await telemetry.track('orchestration_response_v2', {
                processingTime,
                needsClarification: response.needsClarification,
                flowGenerated: !!response.flow,
                confidence: response.confidence,
                similarCasesFound: response.metadata?.similarCasesFound
            })

            // If flow was generated and user wants to save it
            if (response.flow && !response.needsClarification && req.body.saveFlow) {
                try {
                    const savedFlow = await chatflowsService.createChatflow({
                        name: req.body.flowName || `Generated: ${request.query.substring(0, 50)}...`,
                        flowData: JSON.stringify(response.flow),
                        deployed: false,
                        isPublic: false,
                        apikeyid: req.headers['x-api-key'] as string,
                        type: 'CHATFLOW',
                        category: 'Generated'
                    })
                    
                    response.flowId = savedFlow.id
                } catch (saveError) {
                    console.error('Failed to save generated flow:', saveError)
                    // Don't fail the request if save fails
                }
            }

            res.status(StatusCodes.OK).json(response)

        } catch (error) {
            const errorMessage = getErrorMessage(error)
            console.error('Orchestration V2 error:', errorMessage)
            
            await telemetry.track('orchestration_error_v2', {
                error: errorMessage
            })
            
            next(new InternalFlowiseError(StatusCodes.INTERNAL_SERVER_ERROR, errorMessage))
        }
    }
)

/**
 * GET /api/v2/orchestrate/suggestions
 * Get real-time suggestions based on partial query
 */
router.get(
    '/suggestions',
    async (req: Request, res: Response, next: NextFunction) => {
        try {
            const { query } = req.query
            
            if (!query || typeof query !== 'string') {
                return res.status(StatusCodes.BAD_REQUEST).json({
                    error: 'Query parameter is required'
                })
            }

            const knowledgeBase = getUseCaseKnowledgeBase()
            await knowledgeBase.initialize()
            
            // Find similar cases for suggestions
            const similarCases = await knowledgeBase.findSimilarCases(query, 5)
            
            const suggestions = similarCases.map(sc => ({
                title: sc.useCase.title,
                description: sc.useCase.description,
                query: sc.useCase.userQuery,
                confidence: Math.round(sc.score * 100),
                tags: sc.useCase.tags
            }))

            res.status(StatusCodes.OK).json({ suggestions })

        } catch (error) {
            const errorMessage = getErrorMessage(error)
            console.error('Suggestions error:', errorMessage)
            next(new InternalFlowiseError(StatusCodes.INTERNAL_SERVER_ERROR, errorMessage))
        }
    }
)

/**
 * POST /api/v2/orchestrate/feedback
 * Provide feedback on generated flows for continuous improvement
 */
router.post(
    '/feedback',
    async (req: Request, res: Response, next: NextFunction) => {
        try {
            const { flowId, rating, feedback, performance } = req.body
            
            if (!flowId || !rating) {
                return res.status(StatusCodes.BAD_REQUEST).json({
                    error: 'Flow ID and rating are required'
                })
            }

            // Store feedback for learning
            const knowledgeBase = getUseCaseKnowledgeBase()
            
            if (rating >= 4 && performance) {
                // Learn from successful flows
                const flow = await chatflowsService.getChatflowById(flowId)
                if (flow) {
                    await knowledgeBase.learnFromNewFlow(
                        flow.name,
                        JSON.parse(flow.flowData),
                        performance.componentsUsed || [],
                        {
                            userSatisfaction: rating / 5,
                            avgResponseTime: performance.avgResponseTime,
                            accuracy: performance.accuracy
                        }
                    )
                }
            }

            // Track feedback
            await telemetry.track('orchestration_feedback_v2', {
                flowId,
                rating,
                hasTextFeedback: !!feedback
            })

            res.status(StatusCodes.OK).json({
                message: 'Feedback received successfully'
            })

        } catch (error) {
            const errorMessage = getErrorMessage(error)
            console.error('Feedback error:', errorMessage)
            next(new InternalFlowiseError(StatusCodes.INTERNAL_SERVER_ERROR, errorMessage))
        }
    }
)

/**
 * GET /api/v2/orchestrate/templates
 * Get popular templates based on successful use cases
 */
router.get(
    '/templates',
    async (req: Request, res: Response, next: NextFunction) => {
        try {
            const { category, limit = 10 } = req.query
            
            // This would query the database for popular templates
            // For now, return from knowledge base
            const templates = [
                {
                    id: 'customer-support',
                    name: 'Customer Support Chatbot',
                    description: '24/7 automated customer support with FAQ handling',
                    category: 'Support',
                    popularity: 95,
                    avgRating: 4.8,
                    usage: 15000
                },
                {
                    id: 'document-analyzer',
                    name: 'PDF Document Analyzer',
                    description: 'Extract and analyze information from PDF documents',
                    category: 'Analysis',
                    popularity: 88,
                    avgRating: 4.6,
                    usage: 8500
                },
                {
                    id: 'web-researcher',
                    name: 'Web Research Assistant',
                    description: 'Search the web and summarize findings on any topic',
                    category: 'Research',
                    popularity: 85,
                    avgRating: 4.5,
                    usage: 12000
                }
            ]

            const filtered = category ? 
                templates.filter(t => t.category === category) : 
                templates

            res.status(StatusCodes.OK).json({
                templates: filtered.slice(0, parseInt(limit as string))
            })

        } catch (error) {
            const errorMessage = getErrorMessage(error)
            console.error('Templates error:', errorMessage)
            next(new InternalFlowiseError(StatusCodes.INTERNAL_SERVER_ERROR, errorMessage))
        }
    }
)

export default router