import { DataSource } from 'typeorm'
import { User } from '../../database/entities/User'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import crypto from 'crypto'
import { getAppVersion } from '../../utils'

export interface IUserRegistration {
    username: string
    email: string
    password: string
    firstName?: string
    lastName?: string
}

export interface IUserLogin {
    emailOrUsername: string
    password: string
}

export interface IUserProfile {
    id: string
    username: string
    email: string
    firstName?: string
    lastName?: string
    role: string
    isActive: boolean
    isEmailVerified: boolean
    lastLogin?: Date
    preferences?: Record<string, any>
    avatar?: string
    language?: string
    timezone?: string
    createdDate: Date
}

export class AuthService {
    constructor(private appDataSource: DataSource) {}

    async registerUser(userData: IUserRegistration): Promise<{ user: IUserProfile; token: string }> {
        const userRepository = this.appDataSource.getRepository(User)

        // Verificar si el usuario ya existe
        const existingUser = await userRepository.findOne({
            where: [
                { username: userData.username },
                { email: userData.email }
            ]
        })

        if (existingUser) {
            if (existingUser.username === userData.username) {
                throw new Error('El nombre de usuario ya está en uso')
            }
            if (existingUser.email === userData.email) {
                throw new Error('El email ya está registrado')
            }
        }

        // Validaciones
        this.validateUserData(userData)

        // Hash de la contraseña
        const hashedPassword = await bcrypt.hash(userData.password, 12)

        // Generar token de verificación de email
        const emailVerificationToken = crypto.randomBytes(32).toString('hex')
        const emailVerificationExpires = new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 horas

        // Crear nuevo usuario
        const newUser = userRepository.create({
            username: userData.username,
            email: userData.email,
            password: hashedPassword,
            firstName: userData.firstName,
            lastName: userData.lastName,
            role: 'user',
            isActive: true,
            isEmailVerified: false,
            emailVerificationToken,
            emailVerificationExpires,
            loginCount: 0,
            language: 'es',
            timezone: 'America/Mexico_City'
        })

        const savedUser = await userRepository.save(newUser)

        // Generar JWT token
        const token = this.generateJWT(savedUser)

        // Retornar perfil de usuario (sin password)
        const userProfile = this.getUserProfile(savedUser)

        return { user: userProfile, token }
    }

    async loginUser(loginData: IUserLogin): Promise<{ user: IUserProfile; token: string }> {
        const userRepository = this.appDataSource.getRepository(User)

        // Buscar usuario por email o username
        const user = await userRepository.findOne({
            where: [
                { email: loginData.emailOrUsername },
                { username: loginData.emailOrUsername }
            ]
        })

        if (!user) {
            throw new Error('Usuario o contraseña incorrectos')
        }

        if (!user.isActive) {
            throw new Error('La cuenta está desactivada')
        }

        // Verificar contraseña
        const isPasswordValid = await bcrypt.compare(loginData.password, user.password)
        if (!isPasswordValid) {
            throw new Error('Usuario o contraseña incorrectos')
        }

        // Actualizar datos de login
        user.lastLogin = new Date()
        user.loginCount += 1
        await userRepository.save(user)

        // Generar JWT token
        const token = this.generateJWT(user)

        // Retornar perfil de usuario
        const userProfile = this.getUserProfile(user)

        return { user: userProfile, token }
    }

    async getUserById(userId: string): Promise<IUserProfile | null> {
        const userRepository = this.appDataSource.getRepository(User)
        
        const user = await userRepository.findOne({
            where: { id: userId, isActive: true }
        })

        if (!user) {
            return null
        }

        return this.getUserProfile(user)
    }

    async verifyToken(token: string): Promise<IUserProfile | null> {
        try {
            const jwtSecret = process.env.JWT_SECRET || 'your-secret-key'
            const decoded = jwt.verify(token, jwtSecret) as any

            if (decoded && decoded.userId) {
                return await this.getUserById(decoded.userId)
            }

            return null
        } catch (error) {
            return null
        }
    }

    async updateUserProfile(userId: string, updateData: Partial<IUserProfile>): Promise<IUserProfile> {
        const userRepository = this.appDataSource.getRepository(User)
        
        const user = await userRepository.findOne({
            where: { id: userId, isActive: true }
        })

        if (!user) {
            throw new Error('Usuario no encontrado')
        }

        // Actualizar solo campos permitidos
        const allowedFields = ['firstName', 'lastName', 'preferences', 'avatar', 'language', 'timezone']
        
        Object.keys(updateData).forEach(key => {
            if (allowedFields.includes(key) && updateData[key as keyof IUserProfile] !== undefined) {
                (user as any)[key] = updateData[key as keyof IUserProfile]
            }
        })

        const updatedUser = await userRepository.save(user)
        return this.getUserProfile(updatedUser)
    }

    private validateUserData(userData: IUserRegistration): void {
        if (!userData.username || userData.username.length < 3) {
            throw new Error('El nombre de usuario debe tener al menos 3 caracteres')
        }

        if (!/^[a-zA-Z0-9_]+$/.test(userData.username)) {
            throw new Error('El nombre de usuario solo puede contener letras, números y guiones bajos')
        }

        if (!userData.email || !this.isValidEmail(userData.email)) {
            throw new Error('Debe proporcionar un email válido')
        }

        if (!userData.password || userData.password.length < 6) {
            throw new Error('La contraseña debe tener al menos 6 caracteres')
        }

        if (userData.firstName && userData.firstName.length > 100) {
            throw new Error('El nombre es demasiado largo')
        }

        if (userData.lastName && userData.lastName.length > 100) {
            throw new Error('El apellido es demasiado largo')
        }
    }

    private isValidEmail(email: string): boolean {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
        return emailRegex.test(email)
    }

    private generateJWT(user: User): string {
        const jwtSecret = process.env.JWT_SECRET || 'your-secret-key'
        
        return jwt.sign(
            {
                userId: user.id,
                username: user.username,
                email: user.email,
                role: user.role
            },
            jwtSecret,
            {
                expiresIn: '7d',
                issuer: 'nubemgenesis',
                audience: 'nubemgenesis-users'
            }
        )
    }

    private getUserProfile(user: User): IUserProfile {
        return {
            id: user.id,
            username: user.username,
            email: user.email,
            firstName: user.firstName,
            lastName: user.lastName,
            role: user.role,
            isActive: user.isActive,
            isEmailVerified: user.isEmailVerified,
            lastLogin: user.lastLogin,
            preferences: user.preferences,
            avatar: user.avatar,
            language: user.language,
            timezone: user.timezone,
            createdDate: user.createdDate
        }
    }
}