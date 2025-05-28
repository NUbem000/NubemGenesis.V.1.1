import helmet from 'helmet'
import { Request, Response, NextFunction } from 'express'
import logger from '../utils/logger'

// Content Security Policy configuration
const contentSecurityPolicy = {
    directives: {
        defaultSrc: ["'self'"],
        scriptSrc: [
            "'self'",
            "'unsafe-inline'", // Required for React/Vite in development
            "'unsafe-eval'", // Remove in production
            "https://cdn.jsdelivr.net",
            "https://unpkg.com"
        ],
        styleSrc: [
            "'self'",
            "'unsafe-inline'", // Required for Material-UI
            "https://fonts.googleapis.com",
            "https://cdn.jsdelivr.net"
        ],
        fontSrc: [
            "'self'",
            "https://fonts.gstatic.com",
            "data:"
        ],
        imgSrc: [
            "'self'",
            "data:",
            "blob:",
            "https:",
            "http://localhost:*" // Development only
        ],
        connectSrc: [
            "'self'",
            "wss:",
            "https:",
            "http://localhost:*" // Development only
        ],
        mediaSrc: ["'self'"],
        objectSrc: ["'none'"],
        childSrc: ["'self'", "blob:"],
        workerSrc: ["'self'", "blob:"],
        formAction: ["'self'"],
        frameAncestors: process.env.IFRAME_ORIGINS?.split(',') || ["'none'"],
        baseUri: ["'self'"],
        upgradeInsecureRequests: process.env.NODE_ENV === 'production' ? [] : undefined
    }
}

// Helmet configuration
export const securityHeaders = helmet({
    // Content Security Policy
    contentSecurityPolicy: process.env.NODE_ENV === 'production' ? contentSecurityPolicy : false,
    
    // Cross-Origin-Embedder-Policy
    crossOriginEmbedderPolicy: false, // Set to false for API compatibility
    
    // Cross-Origin-Opener-Policy
    crossOriginOpenerPolicy: { policy: "same-origin" },
    
    // Cross-Origin-Resource-Policy
    crossOriginResourcePolicy: { policy: "cross-origin" },
    
    // DNS Prefetch Control
    dnsPrefetchControl: { allow: false },
    
    // Frameguard (X-Frame-Options)
    frameguard: { action: 'deny' },
    
    // Hide Powered By
    hidePoweredBy: true,
    
    // HSTS
    hsts: {
        maxAge: 31536000,
        includeSubDomains: true,
        preload: true
    },
    
    // IE No Open
    ieNoOpen: true,
    
    // No Sniff
    noSniff: true,
    
    // Origin Agent Cluster
    originAgentCluster: true,
    
    // Permitted Cross Domain Policies
    permittedCrossDomainPolicies: false,
    
    // Referrer Policy
    referrerPolicy: { policy: "strict-origin-when-cross-origin" },
    
    // X-XSS-Protection (legacy browsers)
    xssFilter: true
})

// Additional security headers not covered by Helmet
export const additionalSecurityHeaders = (req: Request, res: Response, next: NextFunction) => {
    // Permissions Policy (formerly Feature Policy)
    res.setHeader(
        'Permissions-Policy',
        'accelerometer=(), camera=(), geolocation=(), gyroscope=(), magnetometer=(), microphone=(), payment=(), usb=()'
    )
    
    // Cache Control for security
    if (req.path.includes('/api/')) {
        res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate')
        res.setHeader('Pragma', 'no-cache')
        res.setHeader('Expires', '0')
        res.setHeader('Surrogate-Control', 'no-store')
    }
    
    // Clear Site Data (logout endpoints)
    if (req.path.includes('/logout')) {
        res.setHeader('Clear-Site-Data', '"cache", "cookies", "storage"')
    }
    
    // CORP headers for API responses
    if (req.path.includes('/api/')) {
        res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin')
    }
    
    next()
}

// Security headers for development
export const developmentSecurityHeaders = (req: Request, res: Response, next: NextFunction) => {
    // More permissive CSP for development
    res.setHeader(
        'Content-Security-Policy',
        "default-src * 'unsafe-inline' 'unsafe-eval' data: blob:; script-src * 'unsafe-inline' 'unsafe-eval'; connect-src * wss: ws:;"
    )
    next()
}

// CORS configuration factory
export const getCorsOptions = () => {
    const allowedOrigins = process.env.CORS_ALLOWED_ORIGINS?.split(',') || []
    
    return {
        origin: (origin: string | undefined, callback: Function) => {
            // Allow requests with no origin (mobile apps, Postman, etc.)
            if (!origin) return callback(null, true)
            
            // In development, allow all localhost origins
            if (process.env.NODE_ENV !== 'production' && origin.includes('localhost')) {
                return callback(null, true)
            }
            
            // Check against whitelist
            if (allowedOrigins.includes('*') || allowedOrigins.includes(origin)) {
                return callback(null, true)
            }
            
            // Log rejected origin
            logger.warn(`CORS rejected origin: ${origin}`)
            callback(new Error('Not allowed by CORS'))
        },
        credentials: true,
        methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
        allowedHeaders: ['Content-Type', 'Authorization', 'X-API-Key', 'X-Requested-With'],
        exposedHeaders: ['X-RateLimit-Limit', 'X-RateLimit-Remaining', 'X-RateLimit-Reset'],
        maxAge: 86400 // 24 hours
    }
}

// Security middleware for file uploads
export const uploadSecurityMiddleware = (req: Request, res: Response, next: NextFunction) => {
    // Set security headers for file uploads
    res.setHeader('X-Content-Type-Options', 'nosniff')
    res.setHeader('X-Download-Options', 'noopen')
    res.setHeader('X-Frame-Options', 'DENY')
    
    // Validate content type
    const contentType = req.headers['content-type']
    if (contentType && contentType.includes('multipart/form-data')) {
        // Check for suspicious file extensions in the request
        const body = JSON.stringify(req.body)
        const suspiciousExtensions = ['.exe', '.dll', '.bat', '.cmd', '.scr', '.vbs', '.js']
        
        for (const ext of suspiciousExtensions) {
            if (body.includes(ext)) {
                logger.error(`Suspicious file extension detected: ${ext}`)
                return res.status(400).json({ error: 'Invalid file type' })
            }
        }
    }
    
    next()
}

// API Security Headers
export const apiSecurityHeaders = (req: Request, res: Response, next: NextFunction) => {
    // Prevent API responses from being cached
    res.setHeader('Cache-Control', 'no-store')
    res.setHeader('Pragma', 'no-cache')
    
    // Add API versioning header
    res.setHeader('X-API-Version', process.env.API_VERSION || '1.0.0')
    
    // Add request ID for tracing
    const requestId = req.headers['x-request-id'] || `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    res.setHeader('X-Request-ID', requestId)
    
    next()
}

// Combined security middleware
export const setupSecurityMiddleware = (app: any) => {
    // Apply Helmet
    app.use(securityHeaders)
    
    // Apply additional headers
    app.use(additionalSecurityHeaders)
    
    // Apply development headers if needed
    if (process.env.NODE_ENV !== 'production') {
        app.use(developmentSecurityHeaders)
    }
    
    // Apply API security headers
    app.use('/api', apiSecurityHeaders)
    
    // Apply upload security
    app.use('/api/v1/upload', uploadSecurityMiddleware)
    
    logger.info('Security headers configured successfully')
}