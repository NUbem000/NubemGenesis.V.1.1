import { randomBytes } from 'crypto'
import * as apiKeyUtils from '../../../utils/apiKey'
import fs from 'fs'
import path from 'path'

jest.mock('fs')
jest.mock('../../../utils/logger')

// Mock ICommonObject since we can't import from nubemgenesis-components in tests
interface ICommonObject {
    [key: string]: any
}

describe('API Key Utils', () => {
    const mockFs = fs as jest.Mocked<typeof fs>
    
    beforeEach(() => {
        jest.clearAllMocks()
        // Reset environment variables
        delete process.env.APIKEY_PATH
    })

    describe('getAPIKeyPath', () => {
        it('should return custom path when APIKEY_PATH is set', () => {
            process.env.APIKEY_PATH = '/custom/path'
            const result = apiKeyUtils.getAPIKeyPath()
            expect(result).toBe('/custom/path/api.json')
        })

        it('should return default path when APIKEY_PATH is not set', () => {
            const result = apiKeyUtils.getAPIKeyPath()
            expect(result).toContain('api.json')
            expect(result).toContain(path.sep)
        })
    })

    describe('generateAPIKey', () => {
        it('should generate a base64url encoded key', () => {
            const key = apiKeyUtils.generateAPIKey()
            expect(key).toMatch(/^[A-Za-z0-9_-]+$/)
            expect(key.length).toBeGreaterThan(40)
        })

        it('should generate unique keys', () => {
            const keys = new Set()
            for (let i = 0; i < 100; i++) {
                keys.add(apiKeyUtils.generateAPIKey())
            }
            expect(keys.size).toBe(100)
        })
    })

    describe('generateSecretHash', () => {
        it('should generate a hash with salt', () => {
            const apiKey = 'test-api-key'
            const hash = apiKeyUtils.generateSecretHash(apiKey)
            
            expect(hash).toContain('.')
            const [hashedPart, salt] = hash.split('.')
            expect(hashedPart).toHaveLength(128) // 64 bytes in hex
            expect(salt).toHaveLength(16) // 8 bytes in hex
        })

        it('should generate different hashes for same key', () => {
            const apiKey = 'test-api-key'
            const hash1 = apiKeyUtils.generateSecretHash(apiKey)
            const hash2 = apiKeyUtils.generateSecretHash(apiKey)
            
            expect(hash1).not.toBe(hash2)
        })
    })

    describe('compareKeys', () => {
        it('should return true for matching keys', () => {
            const apiKey = 'test-api-key'
            const hash = apiKeyUtils.generateSecretHash(apiKey)
            
            const result = apiKeyUtils.compareKeys(hash, apiKey)
            expect(result).toBe(true)
        })

        it('should return false for non-matching keys', () => {
            const apiKey = 'test-api-key'
            const hash = apiKeyUtils.generateSecretHash(apiKey)
            
            const result = apiKeyUtils.compareKeys(hash, 'wrong-key')
            expect(result).toBe(false)
        })

        it('should be timing-safe', () => {
            const apiKey = 'test-api-key'
            const hash = apiKeyUtils.generateSecretHash(apiKey)
            
            // Test with similar keys
            const times: number[] = []
            for (let i = 0; i < 100; i++) {
                const start = process.hrtime.bigint()
                apiKeyUtils.compareKeys(hash, apiKey + i)
                const end = process.hrtime.bigint()
                times.push(Number(end - start))
            }
            
            // Timing should be relatively consistent
            const avg = times.reduce((a, b) => a + b, 0) / times.length
            const variance = times.reduce((sum, time) => sum + Math.pow(time - avg, 2), 0) / times.length
            const stdDev = Math.sqrt(variance)
            
            expect(stdDev / avg).toBeLessThan(0.5) // Standard deviation should be less than 50% of average
        })
    })

    describe('getAPIKeys', () => {
        it('should read existing API keys from file', async () => {
            const mockKeys = [
                {
                    keyName: 'Test Key',
                    apiKey: 'test-key',
                    apiSecret: 'test-secret',
                    createdAt: '01-Jan-24',
                    id: 'test-id'
                }
            ]
            
            mockFs.promises = {
                readFile: jest.fn().mockResolvedValue(JSON.stringify(mockKeys))
            } as any

            const result = await apiKeyUtils.getAPIKeys()
            
            expect(result).toEqual(mockKeys)
            expect(mockFs.promises.readFile).toHaveBeenCalledWith(
                expect.stringContaining('api.json'),
                'utf8'
            )
        })

        it('should create default key if file does not exist', async () => {
            mockFs.promises = {
                readFile: jest.fn().mockRejectedValue(new Error('ENOENT')),
                writeFile: jest.fn().mockResolvedValue(undefined)
            } as any

            const result = await apiKeyUtils.getAPIKeys()
            
            expect(result).toHaveLength(1)
            expect(result[0].keyName).toBe('DefaultKey')
            expect(result[0].apiKey).toBeDefined()
            expect(result[0].apiSecret).toBeDefined()
            expect(mockFs.promises.writeFile).toHaveBeenCalled()
        })

        it('should handle JSON parse errors', async () => {
            mockFs.promises = {
                readFile: jest.fn().mockResolvedValue('invalid json'),
                writeFile: jest.fn().mockResolvedValue(undefined)
            } as any

            const result = await apiKeyUtils.getAPIKeys()
            
            expect(result).toHaveLength(1)
            expect(result[0].keyName).toBe('DefaultKey')
        })
    })

    describe('addAPIKey', () => {
        it('should add new API key to existing keys', async () => {
            const existingKeys = [
                {
                    keyName: 'Existing Key',
                    apiKey: 'existing-key',
                    apiSecret: 'existing-secret',
                    createdAt: '01-Jan-24',
                    id: 'existing-id'
                }
            ]
            
            mockFs.promises = {
                readFile: jest.fn().mockResolvedValue(JSON.stringify(existingKeys)),
                writeFile: jest.fn().mockResolvedValue(undefined)
            } as any

            jest.spyOn(apiKeyUtils, 'getAPIKeys').mockResolvedValue(existingKeys)

            const result = await apiKeyUtils.addAPIKey('New Key')
            
            expect(result).toHaveLength(2)
            expect(result[1].keyName).toBe('New Key')
            expect(result[1].apiKey).toBeDefined()
            expect(result[1].apiSecret).toBeDefined()
            expect(mockFs.promises.writeFile).toHaveBeenCalledWith(
                expect.stringContaining('api.json'),
                expect.stringContaining('New Key'),
                'utf8'
            )
        })
    })

    describe('updateAPIKey', () => {
        it('should update existing API key name', async () => {
            const existingKeys = [
                {
                    keyName: 'Old Name',
                    apiKey: 'test-key',
                    apiSecret: 'test-secret',
                    createdAt: '01-Jan-24',
                    id: 'test-id'
                }
            ]
            
            jest.spyOn(apiKeyUtils, 'getAPIKeys').mockResolvedValue(existingKeys)
            mockFs.promises = {
                writeFile: jest.fn().mockResolvedValue(undefined)
            } as any

            const result = await apiKeyUtils.updateAPIKey('test-id', 'New Name')
            
            expect(result[0].keyName).toBe('New Name')
            expect(mockFs.promises.writeFile).toHaveBeenCalledWith(
                expect.stringContaining('api.json'),
                expect.stringContaining('New Name'),
                'utf8'
            )
        })

        it('should return empty array if key not found', async () => {
            jest.spyOn(apiKeyUtils, 'getAPIKeys').mockResolvedValue([])
            
            const result = await apiKeyUtils.updateAPIKey('non-existent', 'New Name')
            
            expect(result).toEqual([])
        })
    })

    describe('deleteAPIKey', () => {
        it('should delete API key by id', async () => {
            const existingKeys = [
                {
                    keyName: 'Key 1',
                    apiKey: 'key-1',
                    apiSecret: 'secret-1',
                    createdAt: '01-Jan-24',
                    id: 'id-1'
                },
                {
                    keyName: 'Key 2',
                    apiKey: 'key-2',
                    apiSecret: 'secret-2',
                    createdAt: '01-Jan-24',
                    id: 'id-2'
                }
            ]
            
            jest.spyOn(apiKeyUtils, 'getAPIKeys').mockResolvedValue(existingKeys)
            mockFs.promises = {
                writeFile: jest.fn().mockResolvedValue(undefined)
            } as any

            const result = await apiKeyUtils.deleteAPIKey('id-1')
            
            expect(result).toHaveLength(1)
            expect(result[0].id).toBe('id-2')
            expect(mockFs.promises.writeFile).toHaveBeenCalled()
        })
    })

    describe('getApiKey', () => {
        it('should find API key by value', async () => {
            const existingKeys = [
                {
                    keyName: 'Test Key',
                    apiKey: 'test-api-key',
                    apiSecret: 'test-secret',
                    createdAt: '01-Jan-24',
                    id: 'test-id'
                }
            ]
            
            jest.spyOn(apiKeyUtils, 'getAPIKeys').mockResolvedValue(existingKeys)

            const result = await apiKeyUtils.getApiKey('test-api-key')
            
            expect(result).toEqual(existingKeys[0])
        })

        it('should return undefined if key not found', async () => {
            jest.spyOn(apiKeyUtils, 'getAPIKeys').mockResolvedValue([])
            
            const result = await apiKeyUtils.getApiKey('non-existent')
            
            expect(result).toBeUndefined()
        })
    })
})