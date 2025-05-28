import { Request, Response } from 'express'
import {
    createRateLimiter,
    globalRateLimiter,
    authRateLimiter,
    apiRateLimiter,
    chatflowRateLimiter,
    uploadRateLimiter,
    ipBlockingMiddleware,
    blockIP,
    rateLimitViolationMonitor
} from '../../../middlewares/rateLimiter'
import { createClient } from 'redis'

// Mock dependencies
jest.mock('redis')
jest.mock('../../../utils/logger')

// Mock express-rate-limit
jest.mock('express-rate-limit', () => {
    return jest.fn((options: any) => {
        const middleware = (req: Request, res: Response, next: Function) => {
            // Simulate rate limit behavior
            const key = options.keyGenerator ? options.keyGenerator(req) : req.ip
            const isWhitelisted = options.skip ? options.skip(req) : false
            
            if (isWhitelisted) {
                return next()
            }

            // For testing, trigger handler on specific IPs
            if (key === '192.168.1.100') {
                (req as any).rateLimit = {
                    resetTime: new Date(Date.now() + 60000)
                }
                return options.handler(req, res)
            }
            
            next()
        }
        middleware._options = options
        return middleware
    })
})

describe('Rate Limiter Middleware', () => {
    let mockRequest: Partial<Request>
    let mockResponse: Partial<Response>
    let mockNext: jest.Mock

    beforeEach(() => {
        mockRequest = {
            ip: '192.168.1.1',
            connection: { remoteAddress: '192.168.1.1' } as any,
            headers: {}
        }
        
        mockResponse = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn().mockReturnThis(),
            setHeader: jest.fn().mockReturnThis()
        }
        
        mockNext = jest.fn()

        // Reset environment variables
        delete process.env.RATE_LIMIT_WHITELIST
        delete process.env.REDIS_URL
    })

    describe('createRateLimiter', () => {
        it('should create rate limiter with default options', () => {
            const limiter = createRateLimiter({})
            
            expect(limiter).toBeDefined()
            expect((limiter as any)._options.windowMs).toBe(60000)
            expect((limiter as any)._options.max).toBe(100)
        })

        it('should create rate limiter with custom options', () => {
            const limiter = createRateLimiter({
                windowMs: 120000,
                max: 50,
                message: 'Custom message'
            })
            
            expect((limiter as any)._options.windowMs).toBe(120000)
            expect((limiter as any)._options.max).toBe(50)
            expect((limiter as any)._options.message).toBe('Custom message')
        })

        it('should skip whitelisted IPs', () => {
            process.env.RATE_LIMIT_WHITELIST = '10.0.0.1,192.168.1.1'
            
            const limiter = createRateLimiter({})
            const skipFn = (limiter as any)._options.skip
            
            mockRequest.ip = '192.168.1.1'
            expect(skipFn(mockRequest as Request)).toBe(true)
            
            mockRequest.ip = '192.168.1.2'
            expect(skipFn(mockRequest as Request)).toBe(false)
        })

        it('should generate key based on IP and API key', () => {
            const limiter = createRateLimiter({})
            const keyGenerator = (limiter as any)._options.keyGenerator
            
            // Test with IP only
            expect(keyGenerator(mockRequest as Request)).toBe('192.168.1.1')
            
            // Test with API key
            mockRequest.headers = { 'x-api-key': 'test-api-key-12345' }
            expect(keyGenerator(mockRequest as Request)).toBe('192.168.1.1:test-api')
        })

        it('should handle rate limit exceeded', async () => {
            const limiter = createRateLimiter({})
            mockRequest.ip = '192.168.1.100' // Trigger rate limit
            
            await limiter(mockRequest as Request, mockResponse as Response, mockNext)
            
            expect(mockResponse.status).toHaveBeenCalledWith(429)
            expect(mockResponse.json).toHaveBeenCalledWith({
                error: 'Too many requests, please try again later.',
                retryAfter: expect.any(Number)
            })
            expect(mockNext).not.toHaveBeenCalled()
        })
    })

    describe('Predefined Rate Limiters', () => {
        it('should have correct configuration for globalRateLimiter', () => {
            const options = (globalRateLimiter as any)._options
            expect(options.windowMs).toBe(60000)
            expect(options.max).toBe(100)
        })

        it('should have correct configuration for authRateLimiter', () => {
            const options = (authRateLimiter as any)._options
            expect(options.windowMs).toBe(60000)
            expect(options.max).toBe(5)
            expect(options.skipSuccessfulRequests).toBe(true)
        })

        it('should have correct configuration for apiRateLimiter', () => {
            const options = (apiRateLimiter as any)._options
            expect(options.windowMs).toBe(60000)
            expect(options.max).toBe(1000)
        })

        it('should have correct configuration for chatflowRateLimiter', () => {
            const options = (chatflowRateLimiter as any)._options
            expect(options.windowMs).toBe(60000)
            expect(options.max).toBe(20)
        })

        it('should have correct configuration for uploadRateLimiter', () => {
            const options = (uploadRateLimiter as any)._options
            expect(options.windowMs).toBe(3600000) // 1 hour
            expect(options.max).toBe(10)
        })
    })

    describe('ipBlockingMiddleware', () => {
        beforeEach(() => {
            // Clear blocked IPs
            jest.clearAllMocks()
        })

        it('should allow non-blocked IPs', () => {
            ipBlockingMiddleware(mockRequest as Request, mockResponse as Response, mockNext)
            
            expect(mockNext).toHaveBeenCalled()
            expect(mockResponse.status).not.toHaveBeenCalled()
        })

        it('should block blocked IPs', () => {
            const blockedIp = '192.168.1.1'
            blockIP(blockedIp, 100) // Block for 100ms
            
            ipBlockingMiddleware(mockRequest as Request, mockResponse as Response, mockNext)
            
            expect(mockResponse.status).toHaveBeenCalledWith(403)
            expect(mockResponse.json).toHaveBeenCalledWith({
                error: 'Access denied. Your IP has been blocked due to repeated violations.'
            })
            expect(mockNext).not.toHaveBeenCalled()
        })

        it('should handle missing IP gracefully', () => {
            mockRequest.ip = undefined
            mockRequest.connection = { remoteAddress: undefined as any } as any
            
            ipBlockingMiddleware(mockRequest as Request, mockResponse as Response, mockNext)
            
            expect(mockNext).toHaveBeenCalled()
        })
    })

    describe('blockIP', () => {
        jest.useFakeTimers()

        it('should block IP temporarily', () => {
            const ip = '10.0.0.1'
            const duration = 1000
            
            blockIP(ip, duration)
            
            // IP should be blocked
            mockRequest.ip = ip
            ipBlockingMiddleware(mockRequest as Request, mockResponse as Response, mockNext)
            expect(mockResponse.status).toHaveBeenCalledWith(403)
            
            // Fast forward time
            jest.advanceTimersByTime(duration + 100)
            
            // IP should be unblocked
            mockResponse.status = jest.fn().mockReturnThis()
            ipBlockingMiddleware(mockRequest as Request, mockResponse as Response, mockNext)
            expect(mockResponse.status).not.toHaveBeenCalled()
            expect(mockNext).toHaveBeenCalled()
        })

        it('should use default duration if not specified', () => {
            const ip = '10.0.0.2'
            
            blockIP(ip)
            
            mockRequest.ip = ip
            ipBlockingMiddleware(mockRequest as Request, mockResponse as Response, mockNext)
            expect(mockResponse.status).toHaveBeenCalledWith(403)
            
            // Default is 1 hour (3600000ms)
            jest.advanceTimersByTime(3600000 + 100)
            
            mockResponse.status = jest.fn().mockReturnThis()
            ipBlockingMiddleware(mockRequest as Request, mockResponse as Response, mockNext)
            expect(mockNext).toHaveBeenCalled()
        })

        jest.useRealTimers()
    })

    describe('rateLimitViolationMonitor', () => {
        it('should log rate limit violations', () => {
            mockRequest.ip = '192.168.1.50'
            
            // Should not throw
            expect(() => {
                rateLimitViolationMonitor(mockRequest as Request)
            }).not.toThrow()
        })

        it('should handle missing IP', () => {
            mockRequest.ip = undefined
            
            expect(() => {
                rateLimitViolationMonitor(mockRequest as Request)
            }).not.toThrow()
        })
    })

    describe('Redis Integration', () => {
        it('should use Redis store when available', () => {
            const mockRedisClient = {
                isReady: true,
                on: jest.fn(),
                connect: jest.fn().mockResolvedValue(undefined)
            }
            
            ;(createClient as jest.Mock).mockReturnValue(mockRedisClient)
            process.env.REDIS_URL = 'redis://localhost:6379'
            
            // Re-import to trigger Redis initialization
            jest.resetModules()
            const { createRateLimiter: newCreateRateLimiter } = require('../../../middlewares/rateLimiter')
            
            const limiter = newCreateRateLimiter({})
            expect(limiter).toBeDefined()
        })
    })
})