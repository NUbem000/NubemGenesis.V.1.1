import { Request, Response } from 'express'
import { getRunningExpressApp } from '../utils/getRunningExpressApp'

/**
 * Health check endpoint for production monitoring
 */
export const healthCheck = async (req: Request, res: Response) => {
    try {
        const app = getRunningExpressApp()
        
        // Basic health checks
        const health = {
            status: 'healthy',
            timestamp: new Date().toISOString(),
            uptime: process.uptime(),
            environment: process.env.NODE_ENV || 'development',
            version: process.env.npm_package_version || '1.0.0',
            memory: {
                used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
                total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024),
                external: Math.round(process.memoryUsage().external / 1024 / 1024)
            }
        }

        // Check database connection if available
        if (app?.locals?.AppDataSource) {
            try {
                await app.locals.AppDataSource.query('SELECT 1')
                health.database = 'connected'
            } catch (error) {
                health.database = 'disconnected'
                health.status = 'degraded'
            }
        }

        // Return appropriate status code
        const statusCode = health.status === 'healthy' ? 200 : 503
        res.status(statusCode).json(health)
        
    } catch (error) {
        res.status(503).json({
            status: 'unhealthy',
            timestamp: new Date().toISOString(),
            error: error instanceof Error ? error.message : 'Unknown error'
        })
    }
}

/**
 * Simple ping endpoint for load balancer health checks
 */
export const ping = (req: Request, res: Response) => {
    res.status(200).json({ 
        status: 'ok', 
        timestamp: new Date().toISOString() 
    })
}