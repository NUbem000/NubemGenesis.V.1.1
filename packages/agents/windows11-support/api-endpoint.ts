import { Request, Response } from 'express'
import { body, validationResult } from 'express-validator'
import { Windows11SupportOrchestrator } from './orchestration-request'
import { WindowsDiagnosticsTool } from './tools/WindowsDiagnosticsTool'
import { PowerShellExecutorTool } from './tools/PowerShellExecutorTool'
import { getRunningExpressApp } from '../../server/src/utils/getRunningExpressApp'
import { IReactFlowObject } from '../../server/src/Interface'

/**
 * API endpoints for Windows 11 Technical Support Agent
 */

// Validation middleware
export const validateSupportRequest = [
    body('problem').isString().notEmpty().withMessage('Problem description is required'),
    body('language').optional().isIn(['es', 'en']).withMessage('Language must be es or en'),
    body('urgency').optional().isIn(['low', 'medium', 'high', 'critical']),
    body('errorCode').optional().isString(),
    body('screenshot').optional().isString(),
    body('systemInfo').optional().isObject()
]

// Main support endpoint
export const createWindows11SupportFlow = async (req: Request, res: Response) => {
    try {
        // Validate request
        const errors = validationResult(req)
        if (!errors.isEmpty()) {
            return res.status(400).json({ 
                success: false, 
                errors: errors.array() 
            })
        }

        const { problem, language, urgency, errorCode, screenshot, systemInfo } = req.body
        
        // Create orchestrator instance
        const orchestrator = new Windows11SupportOrchestrator()
        
        // Generate the support flow
        const response = await orchestrator.createSupportFlow({
            userProblem: problem,
            language: language || 'es',
            urgency: urgency || 'medium',
            errorCode,
            screenshot,
            systemInfo
        })
        
        // Handle clarification requests
        if (response.needsClarification) {
            return res.status(200).json({
                success: true,
                needsClarification: true,
                questions: response.questions,
                suggestions: response.suggestions,
                message: 'Additional information needed to create the optimal support flow'
            })
        }
        
        // Save the flow to database if successful
        if (response.flow && response.flowId) {
            const app = getRunningExpressApp()
            const chatflowModel = app.get('chatflowModel')
            
            // Prepare flow data for storage
            const flowData: Partial<IReactFlowObject> = {
                id: response.flowId,
                name: `Windows 11 Support: ${problem.substring(0, 50)}...`,
                flowData: response.flow.flowData,
                deployed: true,
                isPublic: false,
                type: 'AGENTFLOW',
                createdDate: new Date(),
                updatedDate: new Date()
            }
            
            // Save to database
            await chatflowModel.create(flowData)
            
            return res.status(201).json({
                success: true,
                flowId: response.flowId,
                explanation: response.explanation,
                confidence: response.confidence,
                estimatedCost: response.estimatedCost,
                estimatedLatency: response.estimatedLatency,
                metadata: response.metadata,
                chatUrl: `/chatbot/${response.flowId}`,
                message: 'Windows 11 support agent created successfully'
            })
        }
        
        // If no flow was generated
        return res.status(500).json({
            success: false,
            message: 'Failed to generate support flow',
            error: 'No flow data returned from orchestrator'
        })
        
    } catch (error) {
        console.error('Error creating Windows 11 support flow:', error)
        return res.status(500).json({
            success: false,
            message: 'Internal server error',
            error: error.message
        })
    }
}

// Diagnostic endpoint
export const runDiagnostics = async (req: Request, res: Response) => {
    try {
        const { diagnosticType = 'Quick' } = req.body
        
        // Create diagnostic tool instance
        const diagnosticTool = new WindowsDiagnosticsTool()
        
        // Run diagnostics
        const result = await diagnosticTool._call(diagnosticType)
        
        return res.status(200).json({
            success: true,
            diagnostics: result,
            timestamp: new Date().toISOString()
        })
        
    } catch (error) {
        console.error('Error running diagnostics:', error)
        return res.status(500).json({
            success: false,
            message: 'Failed to run diagnostics',
            error: error.message
        })
    }
}

// Fix execution endpoint
export const executeFix = async (req: Request, res: Response) => {
    try {
        const { fixType, createRestorePoint = true } = req.body
        
        if (!fixType) {
            return res.status(400).json({
                success: false,
                message: 'Fix type is required'
            })
        }
        
        // Create PowerShell executor instance
        const psExecutor = new PowerShellExecutorTool()
        
        // Build the fix script
        const fixScript = `
            .\\common-fixes.ps1 -FixType ${fixType} -CreateRestorePoint $${createRestorePoint}
        `
        
        // Execute the fix
        const result = await psExecutor._call(fixScript)
        
        return res.status(200).json({
            success: true,
            result,
            fixType,
            timestamp: new Date().toISOString()
        })
        
    } catch (error) {
        console.error('Error executing fix:', error)
        return res.status(500).json({
            success: false,
            message: 'Failed to execute fix',
            error: error.message
        })
    }
}

// Knowledge base search endpoint
export const searchKnowledgeBase = async (req: Request, res: Response) => {
    try {
        const { query, category, limit = 5 } = req.query
        
        if (!query) {
            return res.status(400).json({
                success: false,
                message: 'Search query is required'
            })
        }
        
        // Load knowledge base
        const knowledgeBase = require('./knowledge-base.json')
        
        // Filter issues based on query and category
        let results = knowledgeBase.issues.filter((issue: any) => {
            const matchesQuery = 
                issue.title.toLowerCase().includes(query.toString().toLowerCase()) ||
                issue.symptoms.some((s: string) => s.toLowerCase().includes(query.toString().toLowerCase()))
            
            const matchesCategory = !category || issue.category === category
            
            return matchesQuery && matchesCategory
        })
        
        // Limit results
        results = results.slice(0, parseInt(limit.toString()))
        
        return res.status(200).json({
            success: true,
            query: query.toString(),
            category: category || 'all',
            count: results.length,
            results
        })
        
    } catch (error) {
        console.error('Error searching knowledge base:', error)
        return res.status(500).json({
            success: false,
            message: 'Failed to search knowledge base',
            error: error.message
        })
    }
}

// Health check endpoints
export const healthCheck = async (req: Request, res: Response) => {
    return res.status(200).json({
        status: 'healthy',
        agent: 'windows11-support',
        version: '1.0.0',
        timestamp: new Date().toISOString()
    })
}

export const readinessCheck = async (req: Request, res: Response) => {
    try {
        // Check if all required services are available
        const app = getRunningExpressApp()
        const datasource = app.get('datasource')
        
        // Check database connection
        await datasource.query('SELECT 1')
        
        // Check if orchestrator is initialized
        const orchestrator = new Windows11SupportOrchestrator()
        
        return res.status(200).json({
            status: 'ready',
            services: {
                database: 'connected',
                orchestrator: 'initialized',
                tools: 'loaded'
            },
            timestamp: new Date().toISOString()
        })
        
    } catch (error) {
        return res.status(503).json({
            status: 'not ready',
            error: error.message,
            timestamp: new Date().toISOString()
        })
    }
}

// Export all endpoints
export default {
    createWindows11SupportFlow,
    runDiagnostics,
    executeFix,
    searchKnowledgeBase,
    healthCheck,
    readinessCheck,
    validateSupportRequest
}