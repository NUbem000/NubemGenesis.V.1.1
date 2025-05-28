import { DataSource } from 'typeorm'
import { 
    encryptApiKey, 
    decryptApiKey, 
    generateSecureAPIKey,
    generateSecureSecretHash,
    compareSecureKeys,
    SecureApiKeyService 
} from '../../../utils/apiKeySecure'
import { ApiKey } from '../../../database/entities/ApiKey'
import moment from 'moment'

// Mock typeorm
jest.mock('typeorm', () => {
    const actual = jest.requireActual('typeorm')
    return {
        ...actual,
        DataSource: jest.fn()
    }
})

describe('Secure API Key Utils', () => {
    const masterKey = 'test-master-key-32-characters-long'

    describe('encryptApiKey & decryptApiKey', () => {
        it('should encrypt and decrypt API key successfully', () => {
            const apiKey = 'test-api-key-12345'
            
            const { encrypted, salt } = encryptApiKey(apiKey, masterKey)
            
            expect(encrypted).toBeDefined()
            expect(salt).toBeDefined()
            expect(encrypted).not.toBe(apiKey)
            
            const decrypted = decryptApiKey(encrypted, masterKey)
            expect(decrypted).toBe(apiKey)
        })

        it('should fail decryption with wrong master key', () => {
            const apiKey = 'test-api-key-12345'
            const { encrypted } = encryptApiKey(apiKey, masterKey)
            
            expect(() => {
                decryptApiKey(encrypted, 'wrong-master-key-32-chars-long!!')
            }).toThrow()
        })

        it('should generate different ciphertext for same plaintext', () => {
            const apiKey = 'test-api-key-12345'
            
            const result1 = encryptApiKey(apiKey, masterKey)
            const result2 = encryptApiKey(apiKey, masterKey)
            
            expect(result1.encrypted).not.toBe(result2.encrypted)
            expect(result1.salt).not.toBe(result2.salt)
        })
    })

    describe('generateSecureAPIKey', () => {
        it('should generate API key with correct prefix', () => {
            const key = generateSecureAPIKey()
            
            expect(key).toMatch(/^ngs_[A-Za-z0-9_-]+$/)
            expect(key.length).toBeGreaterThan(40)
        })

        it('should generate unique keys', () => {
            const keys = new Set()
            for (let i = 0; i < 10; i++) {
                keys.add(generateSecureAPIKey())
            }
            expect(keys.size).toBe(10)
        })
    })

    describe('generateSecureSecretHash', () => {
        it('should generate hash with iterations and salt', () => {
            const apiKey = 'test-api-key'
            const hash = generateSecureSecretHash(apiKey)
            
            const parts = hash.split('.')
            expect(parts).toHaveLength(3)
            expect(parts[0]).toBe('100000') // iterations
            expect(parts[1]).toHaveLength(32) // salt (16 bytes in hex)
            expect(parts[2]).toHaveLength(128) // hash (64 bytes in hex)
        })
    })

    describe('compareSecureKeys', () => {
        it('should validate correct key', () => {
            const apiKey = 'test-api-key'
            const hash = generateSecureSecretHash(apiKey)
            
            const result = compareSecureKeys(hash, apiKey)
            expect(result).toBe(true)
        })

        it('should reject incorrect key', () => {
            const apiKey = 'test-api-key'
            const hash = generateSecureSecretHash(apiKey)
            
            const result = compareSecureKeys(hash, 'wrong-key')
            expect(result).toBe(false)
        })
    })
})

describe('SecureApiKeyService', () => {
    let mockDataSource: jest.Mocked<DataSource>
    let mockRepository: any
    let service: SecureApiKeyService

    beforeEach(() => {
        // Setup mocks
        mockRepository = {
            find: jest.fn(),
            findOne: jest.fn(),
            create: jest.fn(),
            save: jest.fn(),
            count: jest.fn(),
            createQueryBuilder: jest.fn()
        }

        mockDataSource = {
            getRepository: jest.fn().mockReturnValue(mockRepository)
        } as any

        // Set master key for tests
        process.env.API_KEY_MASTER_KEY = 'test-master-key-for-testing-32ch'
        
        service = new SecureApiKeyService(mockDataSource)
    })

    afterEach(() => {
        delete process.env.API_KEY_MASTER_KEY
    })

    describe('getAPIKeys', () => {
        it('should return decrypted API keys', async () => {
            const encryptedKey = encryptApiKey('test-key', process.env.API_KEY_MASTER_KEY!)
            const mockKeys = [
                {
                    id: '1',
                    keyName: 'Test Key',
                    apiKey: encryptedKey.encrypted,
                    apiSecret: 'hashed-secret',
                    createdDate: new Date('2024-01-01'),
                    expiresAt: null,
                    lastUsed: null,
                    usageCount: 0
                }
            ]

            mockRepository.find.mockResolvedValue(mockKeys)

            const result = await service.getAPIKeys()

            expect(result).toHaveLength(1)
            expect(result[0].apiKey).toBe('test-key')
            expect(result[0].keyName).toBe('Test Key')
            expect(mockRepository.find).toHaveBeenCalledWith({
                where: { isActive: true },
                order: { createdDate: 'DESC' }
            })
        })
    })

    describe('addAPIKey', () => {
        it('should create new encrypted API key', async () => {
            mockRepository.findOne.mockResolvedValue(null)
            mockRepository.create.mockImplementation((data: any) => ({
                ...data,
                id: 'new-id',
                createdDate: new Date()
            }))
            mockRepository.save.mockImplementation((entity: any) => Promise.resolve(entity))

            const result = await service.addAPIKey('New Key', 30)

            expect(result.keyName).toBe('New Key')
            expect(result.apiKey).toMatch(/^ngs_/)
            expect(result.expiresAt).toBeTruthy()
            expect(mockRepository.create).toHaveBeenCalledWith(
                expect.objectContaining({
                    keyName: 'New Key',
                    isActive: true,
                    usageCount: 0
                })
            )
        })

        it('should throw error if key name already exists', async () => {
            mockRepository.findOne.mockResolvedValue({ id: 'existing' })

            await expect(service.addAPIKey('Existing Key')).rejects.toThrow(
                'API key with name "Existing Key" already exists'
            )
        })
    })

    describe('validateAPIKey', () => {
        it('should validate correct API key', async () => {
            const apiKey = 'test-api-key'
            const { encrypted } = encryptApiKey(apiKey, process.env.API_KEY_MASTER_KEY!)
            
            const mockKey = {
                id: '1',
                apiKey: encrypted,
                keyName: 'Test Key',
                expiresAt: null,
                lastUsed: null,
                usageCount: 5
            }

            mockRepository.find.mockResolvedValue([mockKey])
            mockRepository.save.mockResolvedValue(mockKey)

            const result = await service.validateAPIKey(apiKey)

            expect(result.valid).toBe(true)
            expect(result.keyData).toEqual({
                id: '1',
                keyName: 'Test Key',
                usageCount: 6
            })
            expect(mockRepository.save).toHaveBeenCalledWith(
                expect.objectContaining({
                    usageCount: 6,
                    lastUsed: expect.any(Date)
                })
            )
        })

        it('should reject expired API key', async () => {
            const apiKey = 'test-api-key'
            const { encrypted } = encryptApiKey(apiKey, process.env.API_KEY_MASTER_KEY!)
            
            const mockKey = {
                id: '1',
                apiKey: encrypted,
                expiresAt: moment().subtract(1, 'day').toDate()
            }

            mockRepository.find.mockResolvedValue([mockKey])

            const result = await service.validateAPIKey(apiKey)

            expect(result.valid).toBe(false)
            expect(result.keyData).toBeUndefined()
        })

        it('should reject non-existent API key', async () => {
            mockRepository.find.mockResolvedValue([])

            const result = await service.validateAPIKey('non-existent-key')

            expect(result.valid).toBe(false)
        })
    })

    describe('updateAPIKey', () => {
        it('should update API key properties', async () => {
            const mockKey = {
                id: '1',
                keyName: 'Old Name',
                isActive: true
            }

            mockRepository.findOne.mockResolvedValue(mockKey)
            mockRepository.save.mockResolvedValue(mockKey)

            const result = await service.updateAPIKey('1', {
                keyName: 'New Name',
                isActive: false
            })

            expect(result).toBe(true)
            expect(mockRepository.save).toHaveBeenCalledWith(
                expect.objectContaining({
                    keyName: 'New Name',
                    isActive: false
                })
            )
        })

        it('should return false if key not found', async () => {
            mockRepository.findOne.mockResolvedValue(null)

            const result = await service.updateAPIKey('non-existent', {
                keyName: 'New Name'
            })

            expect(result).toBe(false)
        })
    })

    describe('deleteAPIKey', () => {
        it('should soft delete API key', async () => {
            const mockKey = {
                id: '1',
                isActive: true
            }

            mockRepository.findOne.mockResolvedValue(mockKey)
            mockRepository.save.mockResolvedValue(mockKey)

            const result = await service.deleteAPIKey('1')

            expect(result).toBe(true)
            expect(mockRepository.save).toHaveBeenCalledWith(
                expect.objectContaining({
                    isActive: false
                })
            )
        })
    })

    describe('rotateAPIKey', () => {
        it('should deactivate old key and create new one', async () => {
            const oldKey = {
                id: 'old-id',
                keyName: 'Test Key',
                isActive: true,
                expiresAt: moment().add(30, 'days').toDate()
            }

            mockRepository.findOne.mockResolvedValue(oldKey)
            mockRepository.save.mockResolvedValue(oldKey)
            
            // Mock for addAPIKey
            mockRepository.findOne.mockResolvedValueOnce(oldKey)
            mockRepository.findOne.mockResolvedValueOnce(null) // For duplicate check
            mockRepository.create.mockImplementation((data: any) => ({
                ...data,
                id: 'new-id',
                createdDate: new Date()
            }))

            const result = await service.rotateAPIKey('old-id')

            expect(result).toBeTruthy()
            expect(result?.keyName).toBe('Test Key (Rotated)')
            expect(oldKey.isActive).toBe(false)
        })
    })

    describe('getAPIKeyStats', () => {
        it('should return API key statistics', async () => {
            const mockQueryBuilder = {
                where: jest.fn().mockReturnThis(),
                andWhere: jest.fn().mockReturnThis(),
                getCount: jest.fn()
            }

            mockRepository.count.mockResolvedValue(10)
            mockRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder)
            mockQueryBuilder.getCount.mockResolvedValueOnce(2) // expired
            mockQueryBuilder.getCount.mockResolvedValueOnce(7) // recently used

            const result = await service.getAPIKeyStats()

            expect(result).toEqual({
                totalKeys: 10,
                expiredKeys: 2,
                recentlyUsed: 7,
                unusedKeys: 3
            })
        })
    })
})