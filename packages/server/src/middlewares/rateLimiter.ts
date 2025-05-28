import rateLimit from 'express-rate-limit'
import RedisStore from 'rate-limit-redis'
import { Request, Response } from 'express'
import { createClient } from 'redis'
import logger from '../utils/logger'

// Redis client for rate limiting
const redisClient = process.env.REDIS_URL
    ? createClient({
          url: process.env.REDIS_URL,
          socket: {
              reconnectStrategy: (retries) => Math.min(retries * 50, 500)
          }
      })
    : null

// Initialize Redis connection
if (redisClient) {
    redisClient.on('error', (err) => logger.error('Redis Client Error:', err))
    redisClient.connect().catch((err) => {
        logger.error('Failed to connect to Redis:', err)
    })
}

// Custom key generator based on IP and optional API key
const keyGenerator = (req: Request): string => {
    const apiKey = req.headers['x-api-key'] as string
    const ip = req.ip || req.connection.remoteAddress || 'unknown'
    
    // If API key is provided, use combination of IP and API key
    if (apiKey) {
        return `${ip}:${apiKey.substring(0, 8)}`
    }
    
    // Otherwise, just use IP
    return ip
}

// Create different rate limiters for different endpoints
export const createRateLimiter = (options: {
    windowMs?: number
    max?: number
    message?: string
    skipSuccessfulRequests?: boolean
    skipFailedRequests?: boolean
}) => {
    const baseConfig = {
        windowMs: options.windowMs || 60 * 1000, // 1 minute default
        max: options.max || 100, // 100 requests per window default
        message: options.message || 'Too many requests, please try again later.',
        standardHeaders: true,
        legacyHeaders: false,
        keyGenerator,
        handler: (req: Request, res: Response) => {
            logger.warn(`Rate limit exceeded for ${keyGenerator(req)}`)
            res.status(429).json({
                error: options.message || 'Too many requests, please try again later.',
                retryAfter: Math.round(req.rateLimit?.resetTime?.getTime() || 0 / 1000)
            })
        },
        skip: (req: Request) => {
            // Skip rate limiting for whitelisted IPs
            const whitelist = process.env.RATE_LIMIT_WHITELIST?.split(',') || []
            const ip = req.ip || req.connection.remoteAddress || ''
            return whitelist.includes(ip)
        },
        ...options
    }

    // Use Redis store if available, otherwise use memory store
    if (redisClient && redisClient.isReady) {
        return rateLimit({
            ...baseConfig,
            store: new RedisStore({
                client: redisClient,
                prefix: 'rl:'
            })
        })
    }

    return rateLimit(baseConfig)
}

// Global rate limiter - 100 requests per minute
export const globalRateLimiter = createRateLimiter({
    windowMs: 60 * 1000,
    max: 100,
    message: 'Too many requests from this IP, please try again later.'
})

// Strict rate limiter for auth endpoints - 5 requests per minute
export const authRateLimiter = createRateLimiter({
    windowMs: 60 * 1000,
    max: 5,
    message: 'Too many authentication attempts, please try again later.',
    skipSuccessfulRequests: true
})

// API rate limiter - 1000 requests per minute for authenticated users
export const apiRateLimiter = createRateLimiter({
    windowMs: 60 * 1000,
    max: 1000,
    message: 'API rate limit exceeded, please try again later.'
})

// Chatflow execution rate limiter - 20 requests per minute
export const chatflowRateLimiter = createRateLimiter({
    windowMs: 60 * 1000,
    max: 20,
    message: 'Too many chatflow executions, please try again later.'
})

// File upload rate limiter - 10 uploads per hour
export const uploadRateLimiter = createRateLimiter({
    windowMs: 60 * 60 * 1000,
    max: 10,
    message: 'Too many file uploads, please try again later.'
})

// Dynamic rate limiter based on API key tier
export const tieredRateLimiter = (req: Request, res: Response, next: Function) => {
    const apiKey = req.headers['x-api-key'] as string
    
    if (!apiKey) {
        return globalRateLimiter(req, res, next)
    }

    // TODO: Implement tier lookup from database
    // For now, use default API rate limiter
    return apiRateLimiter(req, res, next)
}

// IP-based blocking for repeated violations
const blockedIPs = new Set<string>()

export const ipBlockingMiddleware = (req: Request, res: Response, next: Function) => {
    const ip = req.ip || req.connection.remoteAddress || 'unknown'
    
    if (blockedIPs.has(ip)) {
        logger.error(`Blocked IP attempted access: ${ip}`)
        return res.status(403).json({
            error: 'Access denied. Your IP has been blocked due to repeated violations.'
        })
    }
    
    next()
}

// Function to block an IP
export const blockIP = (ip: string, duration: number = 3600000) => {
    blockedIPs.add(ip)
    logger.warn(`IP blocked: ${ip} for ${duration}ms`)
    
    // Auto-unblock after duration
    setTimeout(() => {
        blockedIPs.delete(ip)
        logger.info(`IP unblocked: ${ip}`)
    }, duration)
}

// Monitor for repeated rate limit violations
export const rateLimitViolationMonitor = (req: Request) => {
    const ip = req.ip || req.connection.remoteAddress || 'unknown'
    const key = `violations:${ip}`
    
    // TODO: Implement violation tracking with Redis
    // For now, just log
    logger.warn(`Rate limit violation from IP: ${ip}`)
}