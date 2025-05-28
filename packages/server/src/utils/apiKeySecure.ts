import { randomBytes, createCipheriv, createDecipheriv, scryptSync, timingSafeEqual } from 'crypto'
import { ICommonObject } from 'nubemgenesis-components'
import { DataSource } from 'typeorm'
import { ApiKey } from '../database/entities/ApiKey'
import moment from 'moment'
import logger from './logger'

// Encryption configuration
const ALGORITHM = 'aes-256-gcm'
const SALT_LENGTH = 32
const TAG_LENGTH = 16
const IV_LENGTH = 16
const KEY_LENGTH = 32

/**
 * Derive encryption key from master key
 */
const deriveKey = (masterKey: string, salt: Buffer): Buffer => {
    return scryptSync(masterKey, salt, KEY_LENGTH)
}

/**
 * Encrypt API key for storage
 */
export const encryptApiKey = (apiKey: string, masterKey: string): { encrypted: string; salt: string } => {
    const salt = randomBytes(SALT_LENGTH)
    const key = deriveKey(masterKey, salt)
    const iv = randomBytes(IV_LENGTH)
    
    const cipher = createCipheriv(ALGORITHM, key, iv)
    
    const encrypted = Buffer.concat([
        cipher.update(apiKey, 'utf8'),
        cipher.final()
    ])
    
    const tag = cipher.getAuthTag()
    
    // Combine salt, iv, tag, and encrypted data
    const combined = Buffer.concat([salt, iv, tag, encrypted])
    
    return {
        encrypted: combined.toString('base64'),
        salt: salt.toString('hex')
    }
}

/**
 * Decrypt API key from storage
 */
export const decryptApiKey = (encryptedData: string, masterKey: string): string => {
    const combined = Buffer.from(encryptedData, 'base64')
    
    const salt = combined.slice(0, SALT_LENGTH)
    const iv = combined.slice(SALT_LENGTH, SALT_LENGTH + IV_LENGTH)
    const tag = combined.slice(SALT_LENGTH + IV_LENGTH, SALT_LENGTH + IV_LENGTH + TAG_LENGTH)
    const encrypted = combined.slice(SALT_LENGTH + IV_LENGTH + TAG_LENGTH)
    
    const key = deriveKey(masterKey, salt)
    
    const decipher = createDecipheriv(ALGORITHM, key, iv)
    decipher.setAuthTag(tag)
    
    const decrypted = Buffer.concat([
        decipher.update(encrypted),
        decipher.final()
    ])
    
    return decrypted.toString('utf8')
}

/**
 * Generate secure API key
 */
export const generateSecureAPIKey = (): string => {
    // Generate a 256-bit key with prefix for identification
    const buffer = randomBytes(32)
    return `ngs_${buffer.toString('base64url')}`
}

/**
 * Generate secret hash with stronger algorithm
 */
export const generateSecureSecretHash = (apiKey: string): string => {
    const salt = randomBytes(16).toString('hex')
    const iterations = 100000 // Increased iterations for better security
    const buffer = scryptSync(apiKey, salt, 64, { N: 16384, r: 8, p: 1 }) as Buffer
    return `${iterations}.${salt}.${buffer.toString('hex')}`
}

/**
 * Verify API key with timing-safe comparison
 */
export const compareSecureKeys = (storedKey: string, suppliedKey: string): boolean => {
    const [iterations, salt, hashedPassword] = storedKey.split('.')
    const buffer = scryptSync(suppliedKey, salt, 64, { N: 16384, r: 8, p: 1 }) as Buffer
    return timingSafeEqual(Buffer.from(hashedPassword, 'hex'), buffer)
}

/**
 * API Key database operations
 */
export class SecureApiKeyService {
    private dataSource: DataSource
    private masterKey: string

    constructor(dataSource: DataSource) {
        this.dataSource = dataSource
        // Master key should be from environment variable or key management service
        this.masterKey = process.env.API_KEY_MASTER_KEY || ''
        
        if (!this.masterKey) {
            logger.warn('API_KEY_MASTER_KEY not set, generating temporary key (not recommended for production)')
            this.masterKey = randomBytes(32).toString('hex')
        }
    }

    /**
     * Get all API keys (decrypted)
     */
    async getAPIKeys(): Promise<ICommonObject[]> {
        const repository = this.dataSource.getRepository(ApiKey)
        const keys = await repository.find({
            where: { isActive: true },
            order: { createdDate: 'DESC' }
        })

        return keys.map(key => ({
            id: key.id,
            keyName: key.keyName,
            apiKey: key.apiKey ? decryptApiKey(key.apiKey, this.masterKey) : '',
            apiSecret: key.apiSecret,
            createdAt: moment(key.createdDate).format('DD-MMM-YY'),
            expiresAt: key.expiresAt ? moment(key.expiresAt).format('DD-MMM-YY') : null,
            lastUsed: key.lastUsed ? moment(key.lastUsed).format('DD-MMM-YY HH:mm') : 'Never',
            usageCount: key.usageCount || 0
        }))
    }

    /**
     * Add new API key with encryption
     */
    async addAPIKey(keyName: string, expiresInDays?: number): Promise<ICommonObject> {
        const repository = this.dataSource.getRepository(ApiKey)
        
        // Check if key name already exists
        const existing = await repository.findOne({ where: { keyName } })
        if (existing) {
            throw new Error(`API key with name "${keyName}" already exists`)
        }

        const apiKey = generateSecureAPIKey()
        const { encrypted, salt } = encryptApiKey(apiKey, this.masterKey)
        const apiSecret = generateSecureSecretHash(apiKey)

        const newKey = repository.create({
            keyName,
            apiKey: encrypted,
            apiSecret,
            salt,
            isActive: true,
            usageCount: 0,
            expiresAt: expiresInDays 
                ? moment().add(expiresInDays, 'days').toDate() 
                : null
        })

        await repository.save(newKey)

        return {
            id: newKey.id,
            keyName: newKey.keyName,
            apiKey: apiKey, // Return unencrypted for display
            apiSecret: newKey.apiSecret,
            createdAt: moment(newKey.createdDate).format('DD-MMM-YY'),
            expiresAt: newKey.expiresAt ? moment(newKey.expiresAt).format('DD-MMM-YY') : null
        }
    }

    /**
     * Validate API key
     */
    async validateAPIKey(suppliedKey: string): Promise<{ valid: boolean; keyData?: any }> {
        const repository = this.dataSource.getRepository(ApiKey)
        const keys = await repository.find({ where: { isActive: true } })

        for (const key of keys) {
            try {
                const decryptedKey = decryptApiKey(key.apiKey, this.masterKey)
                if (decryptedKey === suppliedKey) {
                    // Check expiration
                    if (key.expiresAt && moment().isAfter(key.expiresAt)) {
                        return { valid: false }
                    }

                    // Update usage stats
                    key.lastUsed = new Date()
                    key.usageCount = (key.usageCount || 0) + 1
                    await repository.save(key)

                    return {
                        valid: true,
                        keyData: {
                            id: key.id,
                            keyName: key.keyName,
                            usageCount: key.usageCount
                        }
                    }
                }
            } catch (error) {
                logger.error(`Error validating API key: ${error}`)
                continue
            }
        }

        return { valid: false }
    }

    /**
     * Update API key
     */
    async updateAPIKey(keyId: string, updates: { keyName?: string; isActive?: boolean }): Promise<boolean> {
        const repository = this.dataSource.getRepository(ApiKey)
        const key = await repository.findOne({ where: { id: keyId } })
        
        if (!key) {
            return false
        }

        if (updates.keyName) key.keyName = updates.keyName
        if (updates.isActive !== undefined) key.isActive = updates.isActive

        await repository.save(key)
        return true
    }

    /**
     * Delete (soft delete) API key
     */
    async deleteAPIKey(keyId: string): Promise<boolean> {
        const repository = this.dataSource.getRepository(ApiKey)
        const key = await repository.findOne({ where: { id: keyId } })
        
        if (!key) {
            return false
        }

        key.isActive = false
        await repository.save(key)
        return true
    }

    /**
     * Rotate API key
     */
    async rotateAPIKey(keyId: string): Promise<ICommonObject | null> {
        const repository = this.dataSource.getRepository(ApiKey)
        const oldKey = await repository.findOne({ where: { id: keyId } })
        
        if (!oldKey) {
            return null
        }

        // Deactivate old key
        oldKey.isActive = false
        await repository.save(oldKey)

        // Create new key with same name
        const newApiKey = await this.addAPIKey(
            `${oldKey.keyName} (Rotated)`,
            oldKey.expiresAt ? moment(oldKey.expiresAt).diff(moment(), 'days') : undefined
        )

        return newApiKey
    }

    /**
     * Get API key statistics
     */
    async getAPIKeyStats(): Promise<any> {
        const repository = this.dataSource.getRepository(ApiKey)
        
        const totalKeys = await repository.count({ where: { isActive: true } })
        const expiredKeys = await repository
            .createQueryBuilder('apiKey')
            .where('apiKey.isActive = :isActive', { isActive: true })
            .andWhere('apiKey.expiresAt < :now', { now: new Date() })
            .getCount()

        const recentlyUsed = await repository
            .createQueryBuilder('apiKey')
            .where('apiKey.isActive = :isActive', { isActive: true })
            .andWhere('apiKey.lastUsed > :date', { date: moment().subtract(7, 'days').toDate() })
            .getCount()

        return {
            totalKeys,
            expiredKeys,
            recentlyUsed,
            unusedKeys: totalKeys - recentlyUsed
        }
    }
}