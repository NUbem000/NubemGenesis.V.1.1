import express from 'express'
import { Request, Response } from 'express'
import rateLimit from 'express-rate-limit'
import { getDataSource } from '../../DataSource'
import { AuthService, IUserRegistration, IUserLogin } from '../../services/auth'
import { AuthenticatedRequest, authenticateToken } from '../../middlewares/auth'
import { getAppVersion } from '../../utils'

const router = express.Router()

// Rate limiting específico para autenticación
const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutos
    max: 10, // límite de 10 intentos por IP
    message: {
        error: 'Demasiados intentos de autenticación. Intenta de nuevo en 15 minutos.',
        code: 'TOO_MANY_ATTEMPTS'
    },
    standardHeaders: true,
    legacyHeaders: false
})

const registerLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hora
    max: 3, // límite de 3 registros por IP por hora
    message: {
        error: 'Demasiados registros desde esta IP. Intenta de nuevo en 1 hora.',
        code: 'TOO_MANY_REGISTRATIONS'
    },
    standardHeaders: true,
    legacyHeaders: false
})

// POST /api/v1/auth/register
router.post('/register', registerLimiter, async (req: Request, res: Response) => {
    try {
        const registrationData: IUserRegistration = req.body

        if (!registrationData.username || !registrationData.email || !registrationData.password) {
            return res.status(400).json({
                error: 'Username, email y password son requeridos',
                code: 'MISSING_REQUIRED_FIELDS'
            })
        }

        const appDataSource = getDataSource()
        const authService = new AuthService(appDataSource)

        const result = await authService.registerUser(registrationData)

        res.status(201).json({
            message: 'Usuario registrado exitosamente',
            user: result.user,
            token: result.token,
            version: getAppVersion()
        })

    } catch (error: any) {
        console.error('Error en registro:', error)
        
        res.status(400).json({
            error: error.message || 'Error al registrar usuario',
            code: 'REGISTRATION_ERROR'
        })
    }
})

// POST /api/v1/auth/login
router.post('/login', authLimiter, async (req: Request, res: Response) => {
    try {
        const loginData: IUserLogin = req.body

        if (!loginData.emailOrUsername || !loginData.password) {
            return res.status(400).json({
                error: 'Email/username y password son requeridos',
                code: 'MISSING_CREDENTIALS'
            })
        }

        const appDataSource = getDataSource()
        const authService = new AuthService(appDataSource)

        const result = await authService.loginUser(loginData)

        // Actualizar IP del último login si está disponible
        const clientIP = req.ip || req.connection.remoteAddress || 'unknown'
        
        res.json({
            message: 'Login exitoso',
            user: result.user,
            token: result.token,
            version: getAppVersion()
        })

    } catch (error: any) {
        console.error('Error en login:', error)
        
        res.status(401).json({
            error: error.message || 'Error de autenticación',
            code: 'LOGIN_ERROR'
        })
    }
})

// GET /api/v1/auth/profile
router.get('/profile', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
    try {
        const appDataSource = getDataSource()
        const authService = new AuthService(appDataSource)

        const userProfile = await authService.getUserById(req.user!.id)

        if (!userProfile) {
            return res.status(404).json({
                error: 'Usuario no encontrado',
                code: 'USER_NOT_FOUND'
            })
        }

        res.json({
            user: userProfile
        })

    } catch (error: any) {
        console.error('Error obteniendo perfil:', error)
        
        res.status(500).json({
            error: 'Error al obtener perfil de usuario',
            code: 'PROFILE_ERROR'
        })
    }
})

// PUT /api/v1/auth/profile
router.put('/profile', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
    try {
        const updateData = req.body
        const appDataSource = getDataSource()
        const authService = new AuthService(appDataSource)

        const updatedProfile = await authService.updateUserProfile(req.user!.id, updateData)

        res.json({
            message: 'Perfil actualizado exitosamente',
            user: updatedProfile
        })

    } catch (error: any) {
        console.error('Error actualizando perfil:', error)
        
        res.status(400).json({
            error: error.message || 'Error al actualizar perfil',
            code: 'UPDATE_PROFILE_ERROR'
        })
    }
})

// POST /api/v1/auth/verify-token
router.post('/verify-token', async (req: Request, res: Response) => {
    try {
        const { token } = req.body

        if (!token) {
            return res.status(400).json({
                error: 'Token requerido',
                code: 'MISSING_TOKEN'
            })
        }

        const appDataSource = getDataSource()
        const authService = new AuthService(appDataSource)

        const userProfile = await authService.verifyToken(token)

        if (!userProfile) {
            return res.status(401).json({
                error: 'Token inválido',
                code: 'INVALID_TOKEN'
            })
        }

        res.json({
            valid: true,
            user: userProfile
        })

    } catch (error: any) {
        console.error('Error verificando token:', error)
        
        res.status(401).json({
            valid: false,
            error: 'Token inválido',
            code: 'TOKEN_VERIFICATION_ERROR'
        })
    }
})

// GET /api/v1/auth/status
router.get('/status', (req: Request, res: Response) => {
    res.json({
        message: 'Servicio de autenticación disponible',
        version: getAppVersion(),
        timestamp: new Date().toISOString()
    })
})

export default router