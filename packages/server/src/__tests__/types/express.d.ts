// Extend Express Request type for tests
import { Request as ExpressRequest } from 'express'

declare module 'express-serve-static-core' {
    interface Request {
        rateLimit?: {
            resetTime: Date
        }
    }
}