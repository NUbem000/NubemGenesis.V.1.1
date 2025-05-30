import { Request, Response, NextFunction } from 'express'
import { AuthService } from '../services/auth'
import { getDataSource } from '../DataSource'

export interface AuthenticatedRequest extends Request {
    user?: {
        id: string
        username: string
        email: string
        role: string
    }
}

export const authenticateToken = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
        const authHeader = req.headers.authorization
        const token = authHeader && authHeader.split(' ')[1] // Bearer TOKEN

        if (!token) {
            return res.status(401).json({ 
                error: 'Token de acceso requerido',
                code: 'MISSING_TOKEN'
            })
        }

        const appDataSource = getDataSource()
        const authService = new AuthService(appDataSource)
        
        const userProfile = await authService.verifyToken(token)

        if (!userProfile) {
            return res.status(403).json({ 
                error: 'Token inválido o expirado',
                code: 'INVALID_TOKEN'
            })
        }

        req.user = {
            id: userProfile.id,
            username: userProfile.username,
            email: userProfile.email,
            role: userProfile.role
        }

        next()
    } catch (error) {
        return res.status(403).json({ 
            error: 'Error de autenticación',
            code: 'AUTH_ERROR'
        })
    }
}

export const requireRole = (roles: string[]) => {
    return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
        if (!req.user) {
            return res.status(401).json({ 
                error: 'Usuario no autenticado',
                code: 'NOT_AUTHENTICATED'
            })
        }

        if (!roles.includes(req.user.role)) {
            return res.status(403).json({ 
                error: 'Permisos insuficientes',
                code: 'INSUFFICIENT_PERMISSIONS'
            })
        }

        next()
    }
}

export const requireAdmin = requireRole(['admin'])

export const optionalAuth = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
        const authHeader = req.headers.authorization
        const token = authHeader && authHeader.split(' ')[1]

        if (token) {
            const appDataSource = getDataSource()
            const authService = new AuthService(appDataSource)
            
            const userProfile = await authService.verifyToken(token)

            if (userProfile) {
                req.user = {
                    id: userProfile.id,
                    username: userProfile.username,
                    email: userProfile.email,
                    role: userProfile.role
                }
            }
        }

        next()
    } catch (error) {
        // En caso de error, continúa sin usuario autenticado
        next()
    }
}