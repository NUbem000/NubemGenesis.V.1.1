import request from 'supertest'
import express from 'express'
import { DataSource } from 'typeorm'
import credentialsRouter from '../../../routes/credentials'
import { Credential } from '../../../database/entities/Credential'
import { getEncryptionKey } from '../../../utils'

// Mock dependencies
jest.mock('../../../utils')
jest.mock('../../../utils/logger')

const mockGetEncryptionKey = getEncryptionKey as jest.MockedFunction<typeof getEncryptionKey>

describe('Credentials API Endpoints', () => {
    let app: express.Application
    let mockDataSource: jest.Mocked<DataSource>
    let mockRepository: any

    beforeEach(() => {
        // Setup Express app
        app = express()
        app.use(express.json())

        // Mock repository
        mockRepository = {
            find: jest.fn(),
            findOne: jest.fn(),
            findOneBy: jest.fn(),
            create: jest.fn(),
            save: jest.fn(),
            delete: jest.fn()
        }

        // Mock DataSource
        mockDataSource = {
            getRepository: jest.fn().mockReturnValue(mockRepository)
        } as any

        // Mock encryption key
        mockGetEncryptionKey.mockReturnValue('test-encryption-key-32-characters' as any)

        // Mock app locals
        app.locals = {
            AppDataSource: mockDataSource,
            nodesPool: {
                componentCredentials: {
                    'openaiApi': {
                        label: 'OpenAI API',
                        inputs: [
                            { label: 'API Key', name: 'apiKey', type: 'password' }
                        ]
                    },
                    'postgresApi': {
                        label: 'PostgreSQL',
                        inputs: [
                            { label: 'Host', name: 'host', type: 'string' },
                            { label: 'Password', name: 'password', type: 'password' }
                        ]
                    }
                }
            }
        }

        // Add routes
        app.use('/api/v1/credentials', credentialsRouter)
    })

    describe('GET /api/v1/credentials', () => {
        it('should return all credentials without sensitive data', async () => {
            const mockCredentials = [
                {
                    id: '1',
                    name: 'OpenAI Production',
                    credentialName: 'openaiApi',
                    encryptedData: 'encrypted-api-key',
                    createdDate: new Date(),
                    updatedDate: new Date()
                },
                {
                    id: '2',
                    name: 'Database Connection',
                    credentialName: 'postgresApi',
                    encryptedData: 'encrypted-connection-string',
                    createdDate: new Date(),
                    updatedDate: new Date()
                }
            ]

            mockRepository.find.mockResolvedValue(mockCredentials)

            const response = await request(app)
                .get('/api/v1/credentials')
                .expect(200)

            expect(response.body).toHaveLength(2)
            expect(response.body[0]).not.toHaveProperty('encryptedData')
            expect(response.body[0]).toMatchObject({
                id: '1',
                name: 'OpenAI Production',
                credentialName: 'openaiApi'
            })
        })

        it('should filter by credential type', async () => {
            const openAICredentials = [
                {
                    id: '1',
                    name: 'OpenAI Key',
                    credentialName: 'openaiApi'
                }
            ]

            mockRepository.find.mockResolvedValue(openAICredentials)

            const response = await request(app)
                .get('/api/v1/credentials')
                .query({ credentialName: 'openaiApi' })
                .expect(200)

            expect(response.body).toHaveLength(1)
            expect(mockRepository.find).toHaveBeenCalledWith({
                where: { credentialName: 'openaiApi' }
            })
        })
    })

    describe('GET /api/v1/credentials/:id', () => {
        it('should return credential details with decrypted data', async () => {
            const mockCredential = {
                id: '123',
                name: 'Test API Key',
                credentialName: 'openaiApi',
                encryptedData: JSON.stringify({
                    apiKey: 'sk-test123'
                })
            }

            mockRepository.findOneBy.mockResolvedValue(mockCredential)

            const response = await request(app)
                .get('/api/v1/credentials/123')
                .expect(200)

            expect(response.body).toMatchObject({
                id: '123',
                name: 'Test API Key',
                plainDataObj: {
                    apiKey: expect.any(String)
                }
            })
            expect(response.body).not.toHaveProperty('encryptedData')
        })

        it('should return 404 if credential not found', async () => {
            mockRepository.findOneBy.mockResolvedValue(null)

            await request(app)
                .get('/api/v1/credentials/nonexistent')
                .expect(404)
        })
    })

    describe('POST /api/v1/credentials', () => {
        it('should create a new credential with encryption', async () => {
            const newCredential = {
                name: 'New OpenAI Key',
                credentialName: 'openaiApi',
                plainDataObj: {
                    apiKey: 'sk-new-test-key'
                }
            }

            const savedCredential = {
                id: 'new-id',
                ...newCredential,
                encryptedData: 'encrypted-data',
                createdDate: new Date(),
                updatedDate: new Date()
            }

            mockRepository.create.mockReturnValue(savedCredential)
            mockRepository.save.mockResolvedValue(savedCredential)

            const response = await request(app)
                .post('/api/v1/credentials')
                .send(newCredential)
                .expect(201)

            expect(response.body).toMatchObject({
                id: 'new-id',
                name: 'New OpenAI Key'
            })
            expect(response.body).not.toHaveProperty('encryptedData')
            expect(response.body).not.toHaveProperty('plainDataObj')
        })

        it('should validate required fields', async () => {
            const invalidCredential = {
                name: 'Missing Type'
                // Missing credentialName and plainDataObj
            }

            await request(app)
                .post('/api/v1/credentials')
                .send(invalidCredential)
                .expect(400)
        })

        it('should validate credential type exists', async () => {
            const invalidCredential = {
                name: 'Invalid Type',
                credentialName: 'nonexistentApi',
                plainDataObj: { key: 'value' }
            }

            const response = await request(app)
                .post('/api/v1/credentials')
                .send(invalidCredential)
                .expect(400)

            expect(response.body.error).toContain('Invalid credential type')
        })

        it('should validate required credential fields', async () => {
            const incompleteCredential = {
                name: 'Incomplete OpenAI',
                credentialName: 'openaiApi',
                plainDataObj: {} // Missing required apiKey
            }

            await request(app)
                .post('/api/v1/credentials')
                .send(incompleteCredential)
                .expect(400)
        })
    })

    describe('PUT /api/v1/credentials/:id', () => {
        it('should update credential with re-encryption', async () => {
            const existingCredential = {
                id: '123',
                name: 'Old Name',
                credentialName: 'openaiApi',
                encryptedData: 'old-encrypted-data'
            }

            const updateData = {
                name: 'Updated Name',
                plainDataObj: {
                    apiKey: 'sk-updated-key'
                }
            }

            const updatedCredential = {
                ...existingCredential,
                ...updateData,
                encryptedData: 'new-encrypted-data',
                updatedDate: new Date()
            }

            mockRepository.findOne.mockResolvedValue(existingCredential)
            mockRepository.save.mockResolvedValue(updatedCredential)

            const response = await request(app)
                .put('/api/v1/credentials/123')
                .send(updateData)
                .expect(200)

            expect(response.body).toMatchObject({
                id: '123',
                name: 'Updated Name'
            })
        })

        it('should allow partial updates', async () => {
            const existingCredential = {
                id: '123',
                name: 'Current Name',
                credentialName: 'postgresApi',
                encryptedData: JSON.stringify({
                    host: 'localhost',
                    password: 'secret'
                })
            }

            mockRepository.findOne.mockResolvedValue(existingCredential)
            mockRepository.save.mockImplementation((cred: any) => Promise.resolve(cred))

            await request(app)
                .put('/api/v1/credentials/123')
                .send({
                    name: 'New Name Only'
                    // No plainDataObj - should keep existing encrypted data
                })
                .expect(200)

            expect(mockRepository.save).toHaveBeenCalledWith(
                expect.objectContaining({
                    name: 'New Name Only',
                    encryptedData: existingCredential.encryptedData
                })
            )
        })

        it('should return 404 if credential not found', async () => {
            mockRepository.findOne.mockResolvedValue(null)

            await request(app)
                .put('/api/v1/credentials/nonexistent')
                .send({ name: 'Updated' })
                .expect(404)
        })
    })

    describe('DELETE /api/v1/credentials/:id', () => {
        it('should delete credential', async () => {
            const credential = {
                id: '123',
                name: 'To Delete',
                credentialName: 'openaiApi'
            }

            mockRepository.findOne.mockResolvedValue(credential)
            mockRepository.delete.mockResolvedValue({ affected: 1 })

            await request(app)
                .delete('/api/v1/credentials/123')
                .expect(200)

            expect(mockRepository.delete).toHaveBeenCalledWith({ id: '123' })
        })

        it('should check for usage before deletion', async () => {
            // This would check if credential is used in any chatflows
            const credential = {
                id: '123',
                name: 'In Use',
                credentialName: 'openaiApi'
            }

            mockRepository.findOne.mockResolvedValue(credential)
            
            // Mock checking usage in chatflows
            const chatflowRepo = {
                find: jest.fn().mockResolvedValue([{ id: 'flow1', name: 'Using credential' }])
            }
            mockDataSource.getRepository.mockImplementation((entity: any) => {
                if (entity.name === 'ChatFlow') return chatflowRepo
                return mockRepository
            })

            const response = await request(app)
                .delete('/api/v1/credentials/123')
                .expect(400)

            expect(response.body.error).toContain('in use')
        })

        it('should return 404 if credential not found', async () => {
            mockRepository.findOne.mockResolvedValue(null)

            await request(app)
                .delete('/api/v1/credentials/nonexistent')
                .expect(404)
        })
    })

    describe('Security Tests', () => {
        it('should never expose encrypted data in list endpoint', async () => {
            const credentialsWithSecrets = [
                {
                    id: '1',
                    name: 'Secret Key',
                    credentialName: 'openaiApi',
                    encryptedData: 'THIS_SHOULD_NEVER_BE_EXPOSED',
                    plainDataObj: { apiKey: 'ALSO_SHOULD_NOT_BE_EXPOSED' }
                }
            ]

            mockRepository.find.mockResolvedValue(credentialsWithSecrets)

            const response = await request(app)
                .get('/api/v1/credentials')
                .expect(200)

            expect(response.body[0]).not.toHaveProperty('encryptedData')
            expect(response.body[0]).not.toHaveProperty('plainDataObj')
        })

        it('should sanitize credential names', async () => {
            const maliciousCredential = {
                name: '<script>alert("XSS")</script>API Key',
                credentialName: 'openaiApi',
                plainDataObj: { apiKey: 'test' }
            }

            mockRepository.create.mockImplementation((data: any) => ({
                id: 'new-id',
                ...data
            }))
            mockRepository.save.mockImplementation((data: any) => Promise.resolve(data))

            const response = await request(app)
                .post('/api/v1/credentials')
                .send(maliciousCredential)
                .expect(201)

            expect(response.body.name).not.toContain('<script>')
        })

        it('should handle encryption errors gracefully', async () => {
            mockGetEncryptionKey.mockImplementation(() => {
                throw new Error('Encryption key not available')
            })

            const newCredential = {
                name: 'Test',
                credentialName: 'openaiApi',
                plainDataObj: { apiKey: 'test' }
            }

            const response = await request(app)
                .post('/api/v1/credentials')
                .send(newCredential)
                .expect(500)

            expect(response.body.error).toContain('encryption')
        })

        it('should validate credential data types', async () => {
            const invalidCredential = {
                name: 'Invalid Data',
                credentialName: 'openaiApi',
                plainDataObj: {
                    apiKey: { nested: 'object' } // Should be string
                }
            }

            await request(app)
                .post('/api/v1/credentials')
                .send(invalidCredential)
                .expect(400)
        })
    })
})