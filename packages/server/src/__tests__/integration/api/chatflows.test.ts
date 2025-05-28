import request from 'supertest'
import express from 'express'
import { DataSource } from 'typeorm'
import { ChatFlow } from '../../../database/entities/ChatFlow'
import chatflowsRouter from '../../../routes/chatflows'
import { getDataSource } from '../../../DataSource'
import { NodesPool } from '../../../NodesPool'

// Mock dependencies
jest.mock('../../../DataSource')
jest.mock('../../../NodesPool')
jest.mock('../../../utils/logger')

describe('Chatflows API Endpoints', () => {
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
            getRepository: jest.fn().mockReturnValue(mockRepository),
            transaction: jest.fn()
        } as any

        // Mock app locals
        app.locals = {
            AppDataSource: mockDataSource,
            nodesPool: new NodesPool(),
            cachePool: { add: jest.fn(), get: jest.fn() },
            abortControllerPool: { add: jest.fn(), abort: jest.fn() },
            telemetry: { sendTelemetry: jest.fn() }
        }

        // Add routes
        app.use('/api/v1/chatflows', chatflowsRouter)
    })

    describe('GET /api/v1/chatflows', () => {
        it('should return all chatflows', async () => {
            const mockChatflows = [
                {
                    id: '1',
                    name: 'Test Flow 1',
                    deployed: true,
                    isPublic: false,
                    apikeyid: null,
                    createdDate: new Date(),
                    updatedDate: new Date()
                },
                {
                    id: '2',
                    name: 'Test Flow 2',
                    deployed: false,
                    isPublic: true,
                    apikeyid: 'key-123',
                    createdDate: new Date(),
                    updatedDate: new Date()
                }
            ]

            mockRepository.find.mockResolvedValue(mockChatflows)

            const response = await request(app)
                .get('/api/v1/chatflows')
                .expect(200)

            expect(response.body).toHaveLength(2)
            expect(response.body[0]).toMatchObject({
                id: '1',
                name: 'Test Flow 1',
                deployed: true
            })
            expect(mockRepository.find).toHaveBeenCalledWith()
        })

        it('should handle database errors', async () => {
            mockRepository.find.mockRejectedValue(new Error('Database error'))

            const response = await request(app)
                .get('/api/v1/chatflows')
                .expect(500)

            expect(response.body).toMatchObject({
                error: expect.stringContaining('error')
            })
        })
    })

    describe('GET /api/v1/chatflows/:id', () => {
        it('should return a specific chatflow', async () => {
            const mockChatflow = {
                id: '123',
                name: 'Test Flow',
                flowData: JSON.stringify({
                    nodes: [],
                    edges: []
                }),
                deployed: true,
                isPublic: false
            }

            mockRepository.findOneBy.mockResolvedValue(mockChatflow)

            const response = await request(app)
                .get('/api/v1/chatflows/123')
                .expect(200)

            expect(response.body).toMatchObject({
                id: '123',
                name: 'Test Flow'
            })
            expect(mockRepository.findOneBy).toHaveBeenCalledWith({ id: '123' })
        })

        it('should return 404 if chatflow not found', async () => {
            mockRepository.findOneBy.mockResolvedValue(null)

            await request(app)
                .get('/api/v1/chatflows/nonexistent')
                .expect(404)
        })
    })

    describe('POST /api/v1/chatflows', () => {
        it('should create a new chatflow', async () => {
            const newChatflow = {
                name: 'New Flow',
                flowData: JSON.stringify({
                    nodes: [{ id: 'node1', type: 'llm' }],
                    edges: []
                }),
                deployed: false
            }

            const savedChatflow = {
                id: 'new-id',
                ...newChatflow,
                createdDate: new Date(),
                updatedDate: new Date()
            }

            mockRepository.create.mockReturnValue(savedChatflow)
            mockRepository.save.mockResolvedValue(savedChatflow)

            const response = await request(app)
                .post('/api/v1/chatflows')
                .send(newChatflow)
                .expect(201)

            expect(response.body).toMatchObject({
                id: 'new-id',
                name: 'New Flow'
            })
            expect(mockRepository.create).toHaveBeenCalledWith(newChatflow)
            expect(mockRepository.save).toHaveBeenCalled()
        })

        it('should validate required fields', async () => {
            const invalidChatflow = {
                // Missing name
                flowData: '{}'
            }

            await request(app)
                .post('/api/v1/chatflows')
                .send(invalidChatflow)
                .expect(400)
        })

        it('should validate flowData JSON', async () => {
            const invalidChatflow = {
                name: 'Test',
                flowData: 'invalid json'
            }

            await request(app)
                .post('/api/v1/chatflows')
                .send(invalidChatflow)
                .expect(400)
        })
    })

    describe('PUT /api/v1/chatflows/:id', () => {
        it('should update an existing chatflow', async () => {
            const existingChatflow = {
                id: '123',
                name: 'Old Name',
                flowData: '{"nodes":[],"edges":[]}',
                deployed: false
            }

            const updateData = {
                name: 'Updated Name',
                deployed: true
            }

            const updatedChatflow = {
                ...existingChatflow,
                ...updateData,
                updatedDate: new Date()
            }

            mockRepository.findOne.mockResolvedValue(existingChatflow)
            mockRepository.save.mockResolvedValue(updatedChatflow)

            const response = await request(app)
                .put('/api/v1/chatflows/123')
                .send(updateData)
                .expect(200)

            expect(response.body).toMatchObject({
                id: '123',
                name: 'Updated Name',
                deployed: true
            })
        })

        it('should return 404 if chatflow not found', async () => {
            mockRepository.findOne.mockResolvedValue(null)

            await request(app)
                .put('/api/v1/chatflows/nonexistent')
                .send({ name: 'Updated' })
                .expect(404)
        })

        it('should handle deployment state changes', async () => {
            const chatflow = {
                id: '123',
                name: 'Test Flow',
                deployed: false
            }

            mockRepository.findOne.mockResolvedValue(chatflow)
            mockRepository.save.mockImplementation((entity: any) => Promise.resolve(entity))

            // Deploy
            await request(app)
                .put('/api/v1/chatflows/123')
                .send({ deployed: true })
                .expect(200)

            // Verify telemetry was called
            expect(app.locals.telemetry.sendTelemetry).toHaveBeenCalledWith(
                'chatflow_deployed',
                expect.any(Object)
            )
        })
    })

    describe('DELETE /api/v1/chatflows/:id', () => {
        it('should delete a chatflow', async () => {
            const chatflow = {
                id: '123',
                name: 'To Delete'
            }

            mockRepository.findOne.mockResolvedValue(chatflow)
            mockRepository.delete.mockResolvedValue({ affected: 1 })

            await request(app)
                .delete('/api/v1/chatflows/123')
                .expect(200)

            expect(mockRepository.delete).toHaveBeenCalledWith({ id: '123' })
        })

        it('should clear cache when deleting', async () => {
            const chatflow = {
                id: '123',
                name: 'Cached Flow'
            }

            mockRepository.findOne.mockResolvedValue(chatflow)
            mockRepository.delete.mockResolvedValue({ affected: 1 })

            await request(app)
                .delete('/api/v1/chatflows/123')
                .expect(200)

            // Verify cache operations
            expect(app.locals.abortControllerPool.abort).toHaveBeenCalledWith('123')
        })

        it('should return 404 if chatflow not found', async () => {
            mockRepository.findOne.mockResolvedValue(null)

            await request(app)
                .delete('/api/v1/chatflows/nonexistent')
                .expect(404)
        })
    })

    describe('Security Tests', () => {
        it('should sanitize user input in chatflow name', async () => {
            const maliciousChatflow = {
                name: '<script>alert("XSS")</script>Test',
                flowData: '{}'
            }

            mockRepository.create.mockImplementation((data: any) => ({
                id: 'new-id',
                ...data
            }))
            mockRepository.save.mockImplementation((data: any) => Promise.resolve(data))

            const response = await request(app)
                .post('/api/v1/chatflows')
                .send(maliciousChatflow)
                .expect(201)

            // Should sanitize the script tag
            expect(response.body.name).not.toContain('<script>')
        })

        it('should validate JSON injection in flowData', async () => {
            const chatflow = {
                name: 'Test',
                flowData: '{"nodes": [], "__proto__": {"isAdmin": true}}'
            }

            await request(app)
                .post('/api/v1/chatflows')
                .send(chatflow)
                .expect(400)
        })
    })
})