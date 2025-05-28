import request from 'supertest'
import express from 'express'
import { DataSource } from 'typeorm'
import apikeyRouter from '../../../routes/apikey'
import { SecureApiKeyService } from '../../../utils/apiKeySecure'
import { validateAPIKey } from '../../../utils/validateKey'
import { createTestApp, getMockDataSource } from '../../helpers/testApp'

// Mock dependencies
jest.mock('../../../utils/apiKeySecure')
jest.mock('../../../utils/validateKey')
jest.mock('../../../utils/logger')

const mockValidateAPIKey = validateAPIKey as jest.MockedFunction<typeof validateAPIKey>

describe('API Keys Endpoints', () => {
    let app: express.Application
    let mockApiKeyService: jest.Mocked<SecureApiKeyService>
    let mockDataSource: jest.Mocked<DataSource>

    beforeEach(() => {
        // Setup Express app with proper mocks
        app = createTestApp()
        mockDataSource = getMockDataSource(app)

        // Mock API Key Service
        mockApiKeyService = {
            getAPIKeys: jest.fn(),
            addAPIKey: jest.fn(),
            updateAPIKey: jest.fn(),
            deleteAPIKey: jest.fn(),
            validateAPIKey: jest.fn(),
            rotateAPIKey: jest.fn(),
            getAPIKeyStats: jest.fn()
        } as any

        // Mock the service constructor
        ;(SecureApiKeyService as jest.MockedClass<typeof SecureApiKeyService>).mockImplementation(() => mockApiKeyService)

        // Add authentication middleware mock
        app.use((req, res, next) => {
            if (req.headers.authorization) {
                mockValidateAPIKey.mockResolvedValue(true)
            }
            next()
        })

        // Add routes
        app.use('/api/v1/apikey', apikeyRouter)
    })

    describe('GET /api/v1/apikey', () => {
        it('should return all API keys', async () => {
            const mockKeys = [
                {
                    id: '1',
                    keyName: 'Production Key',
                    apiKey: 'ngs_prod123',
                    createdAt: '01-Jan-24',
                    expiresAt: '01-Jan-25',
                    lastUsed: 'Never',
                    usageCount: 0
                },
                {
                    id: '2',
                    keyName: 'Development Key',
                    apiKey: 'ngs_dev456',
                    createdAt: '15-Jan-24',
                    expiresAt: null,
                    lastUsed: '20-Jan-24 14:30',
                    usageCount: 150
                }
            ]

            mockApiKeyService.getAPIKeys.mockResolvedValue(mockKeys)

            const response = await request(app)
                .get('/api/v1/apikey')
                .set('Authorization', 'Bearer test-key')
                .expect(200)

            expect(response.body).toHaveLength(2)
            expect(response.body[0]).toMatchObject({
                keyName: 'Production Key',
                usageCount: 0
            })
            expect(mockApiKeyService.getAPIKeys).toHaveBeenCalled()
        })

        it('should require authentication', async () => {
            mockValidateAPIKey.mockResolvedValue(false)

            await request(app)
                .get('/api/v1/apikey')
                .expect(401)
        })
    })

    describe('POST /api/v1/apikey', () => {
        it('should create a new API key', async () => {
            const newKey = {
                id: 'new-id',
                keyName: 'New API Key',
                apiKey: 'ngs_new789',
                apiSecret: 'hashed-secret',
                createdAt: '25-Jan-24',
                expiresAt: '25-Jan-25'
            }

            mockApiKeyService.addAPIKey.mockResolvedValue(newKey)

            const response = await request(app)
                .post('/api/v1/apikey')
                .set('Authorization', 'Bearer test-key')
                .send({
                    keyName: 'New API Key',
                    expiresInDays: 365
                })
                .expect(201)

            expect(response.body).toMatchObject({
                keyName: 'New API Key',
                apiKey: expect.stringMatching(/^ngs_/)
            })
            expect(mockApiKeyService.addAPIKey).toHaveBeenCalledWith('New API Key', 365)
        })

        it('should validate key name', async () => {
            await request(app)
                .post('/api/v1/apikey')
                .set('Authorization', 'Bearer test-key')
                .send({
                    keyName: '' // Empty name
                })
                .expect(400)

            await request(app)
                .post('/api/v1/apikey')
                .set('Authorization', 'Bearer test-key')
                .send({
                    keyName: 'a'.repeat(101) // Too long
                })
                .expect(400)
        })

        it('should handle duplicate key names', async () => {
            mockApiKeyService.addAPIKey.mockRejectedValue(
                new Error('API key with name "Duplicate" already exists')
            )

            const response = await request(app)
                .post('/api/v1/apikey')
                .set('Authorization', 'Bearer test-key')
                .send({
                    keyName: 'Duplicate'
                })
                .expect(400)

            expect(response.body.error).toContain('already exists')
        })

        it('should create key without expiration', async () => {
            const permanentKey = {
                id: 'perm-id',
                keyName: 'Permanent Key',
                apiKey: 'ngs_perm123',
                createdAt: '25-Jan-24',
                expiresAt: null
            }

            mockApiKeyService.addAPIKey.mockResolvedValue(permanentKey)

            const response = await request(app)
                .post('/api/v1/apikey')
                .set('Authorization', 'Bearer test-key')
                .send({
                    keyName: 'Permanent Key'
                    // No expiresInDays
                })
                .expect(201)

            expect(response.body.expiresAt).toBeNull()
            expect(mockApiKeyService.addAPIKey).toHaveBeenCalledWith('Permanent Key', undefined)
        })
    })

    describe('PUT /api/v1/apikey/:id', () => {
        it('should update API key name', async () => {
            mockApiKeyService.updateAPIKey.mockResolvedValue(true)

            await request(app)
                .put('/api/v1/apikey/key-123')
                .set('Authorization', 'Bearer test-key')
                .send({
                    keyName: 'Updated Name'
                })
                .expect(200)

            expect(mockApiKeyService.updateAPIKey).toHaveBeenCalledWith(
                'key-123',
                { keyName: 'Updated Name' }
            )
        })

        it('should deactivate API key', async () => {
            mockApiKeyService.updateAPIKey.mockResolvedValue(true)

            await request(app)
                .put('/api/v1/apikey/key-123')
                .set('Authorization', 'Bearer test-key')
                .send({
                    isActive: false
                })
                .expect(200)

            expect(mockApiKeyService.updateAPIKey).toHaveBeenCalledWith(
                'key-123',
                { isActive: false }
            )
        })

        it('should return 404 if key not found', async () => {
            mockApiKeyService.updateAPIKey.mockResolvedValue(false)

            await request(app)
                .put('/api/v1/apikey/nonexistent')
                .set('Authorization', 'Bearer test-key')
                .send({
                    keyName: 'New Name'
                })
                .expect(404)
        })
    })

    describe('DELETE /api/v1/apikey/:id', () => {
        it('should delete API key', async () => {
            mockApiKeyService.deleteAPIKey.mockResolvedValue(true)

            await request(app)
                .delete('/api/v1/apikey/key-123')
                .set('Authorization', 'Bearer test-key')
                .expect(200)

            expect(mockApiKeyService.deleteAPIKey).toHaveBeenCalledWith('key-123')
        })

        it('should return 404 if key not found', async () => {
            mockApiKeyService.deleteAPIKey.mockResolvedValue(false)

            await request(app)
                .delete('/api/v1/apikey/nonexistent')
                .set('Authorization', 'Bearer test-key')
                .expect(404)
        })
    })

    describe('POST /api/v1/apikey/:id/rotate', () => {
        it('should rotate API key', async () => {
            const rotatedKey = {
                id: 'new-key-id',
                keyName: 'Production Key (Rotated)',
                apiKey: 'ngs_rotated123',
                createdAt: '26-Jan-24',
                expiresAt: '26-Jan-25'
            }

            mockApiKeyService.rotateAPIKey.mockResolvedValue(rotatedKey)

            const response = await request(app)
                .post('/api/v1/apikey/old-key-id/rotate')
                .set('Authorization', 'Bearer test-key')
                .expect(200)

            expect(response.body).toMatchObject({
                keyName: 'Production Key (Rotated)',
                apiKey: expect.stringMatching(/^ngs_/)
            })
            expect(mockApiKeyService.rotateAPIKey).toHaveBeenCalledWith('old-key-id')
        })

        it('should return 404 if key not found', async () => {
            mockApiKeyService.rotateAPIKey.mockResolvedValue(null)

            await request(app)
                .post('/api/v1/apikey/nonexistent/rotate')
                .set('Authorization', 'Bearer test-key')
                .expect(404)
        })
    })

    describe('GET /api/v1/apikey/stats', () => {
        it('should return API key statistics', async () => {
            const stats = {
                totalKeys: 10,
                expiredKeys: 2,
                recentlyUsed: 7,
                unusedKeys: 3
            }

            mockApiKeyService.getAPIKeyStats.mockResolvedValue(stats)

            const response = await request(app)
                .get('/api/v1/apikey/stats')
                .set('Authorization', 'Bearer test-key')
                .expect(200)

            expect(response.body).toMatchObject(stats)
        })
    })

    describe('POST /api/v1/apikey/validate', () => {
        it('should validate a valid API key', async () => {
            mockApiKeyService.validateAPIKey.mockResolvedValue({
                valid: true,
                keyData: {
                    id: '123',
                    keyName: 'Test Key',
                    usageCount: 5
                }
            })

            const response = await request(app)
                .post('/api/v1/apikey/validate')
                .send({
                    apiKey: 'ngs_test123'
                })
                .expect(200)

            expect(response.body).toMatchObject({
                valid: true,
                keyName: 'Test Key'
            })
        })

        it('should reject invalid API key', async () => {
            mockApiKeyService.validateAPIKey.mockResolvedValue({
                valid: false
            })

            const response = await request(app)
                .post('/api/v1/apikey/validate')
                .send({
                    apiKey: 'invalid-key'
                })
                .expect(200)

            expect(response.body).toMatchObject({
                valid: false
            })
        })

        it('should require API key in request', async () => {
            await request(app)
                .post('/api/v1/apikey/validate')
                .send({})
                .expect(400)
        })
    })

    describe('Security Tests', () => {
        it('should not expose API secrets', async () => {
            const keysWithSecrets = [
                {
                    id: '1',
                    keyName: 'Test Key',
                    apiKey: 'ngs_test123',
                    apiSecret: 'THIS_SHOULD_NOT_BE_EXPOSED',
                    createdAt: '01-Jan-24'
                }
            ]

            mockApiKeyService.getAPIKeys.mockResolvedValue(keysWithSecrets)

            const response = await request(app)
                .get('/api/v1/apikey')
                .set('Authorization', 'Bearer test-key')
                .expect(200)

            expect(response.body[0]).not.toHaveProperty('apiSecret')
        })

        it('should sanitize key names', async () => {
            const maliciousKey = {
                id: 'new-id',
                keyName: 'Safe Name', // Sanitized
                apiKey: 'ngs_new789',
                createdAt: '25-Jan-24'
            }

            mockApiKeyService.addAPIKey.mockResolvedValue(maliciousKey)

            await request(app)
                .post('/api/v1/apikey')
                .set('Authorization', 'Bearer test-key')
                .send({
                    keyName: '<script>alert("XSS")</script>Test Key'
                })
                .expect(201)

            expect(mockApiKeyService.addAPIKey).toHaveBeenCalledWith(
                expect.not.stringContaining('<script>'),
                undefined
            )
        })
    })
})