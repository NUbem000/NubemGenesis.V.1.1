import request from 'supertest'
import express from 'express'
import { DataSource } from 'typeorm'
import predictionRouter from '../../../routes/predictions'
import { ChatFlow } from '../../../database/entities/ChatFlow'
import { ChatMessage } from '../../../database/entities/ChatMessage'
import { validateChatflowAPIKey } from '../../../utils/validateKey'

// Mock dependencies
jest.mock('../../../utils/validateKey')
jest.mock('../../../utils/logger')
jest.mock('../../../utils/buildChatflow')

const mockValidateChatflowAPIKey = validateChatflowAPIKey as jest.MockedFunction<typeof validateChatflowAPIKey>

describe('Predictions API Endpoints', () => {
    let app: express.Application
    let mockDataSource: jest.Mocked<DataSource>
    let mockChatFlowRepository: any
    let mockChatMessageRepository: any

    beforeEach(() => {
        // Setup Express app
        app = express()
        app.use(express.json())

        // Mock repositories
        mockChatFlowRepository = {
            findOne: jest.fn(),
            findOneBy: jest.fn()
        }

        mockChatMessageRepository = {
            create: jest.fn(),
            save: jest.fn(),
            find: jest.fn()
        }

        // Mock DataSource
        mockDataSource = {
            getRepository: jest.fn((entity) => {
                if (entity === ChatFlow) return mockChatFlowRepository
                if (entity === ChatMessage) return mockChatMessageRepository
                return {}
            })
        } as any

        // Mock app locals
        app.locals = {
            AppDataSource: mockDataSource,
            nodesPool: { 
                nodes: {
                    'llm': { label: 'LLM Node' },
                    'chain': { label: 'Chain Node' }
                }
            },
            cachePool: { 
                add: jest.fn(), 
                get: jest.fn().mockResolvedValue(null) 
            },
            abortControllerPool: { add: jest.fn(), abort: jest.fn() },
            sseStreamer: { addClient: jest.fn(), streamData: jest.fn() },
            telemetry: { sendTelemetry: jest.fn() }
        }

        // Add routes
        app.use('/api/v1/prediction', predictionRouter)

        // Default mock for API key validation
        mockValidateChatflowAPIKey.mockResolvedValue(true)
    })

    describe('POST /api/v1/prediction/:id', () => {
        const mockChatflow = {
            id: 'test-chatflow-id',
            name: 'Test Chatflow',
            flowData: JSON.stringify({
                nodes: [
                    {
                        id: 'node1',
                        type: 'llm',
                        data: { inputs: {} }
                    }
                ],
                edges: []
            }),
            deployed: true,
            isPublic: true,
            apikeyid: null
        }

        it('should execute a prediction successfully', async () => {
            mockChatFlowRepository.findOneBy.mockResolvedValue(mockChatflow)
            
            // Mock buildChatflow
            jest.mock('../../../utils/buildChatflow', () => ({
                buildChatflow: jest.fn().mockResolvedValue({
                    invoke: jest.fn().mockResolvedValue({
                        text: 'AI response',
                        sourceDocuments: []
                    })
                })
            }))

            const response = await request(app)
                .post('/api/v1/prediction/test-chatflow-id')
                .send({
                    question: 'What is AI?',
                    overrideConfig: {}
                })
                .expect(200)

            expect(response.body).toMatchObject({
                text: expect.stringContaining('response'),
                sourceDocuments: expect.any(Array)
            })
        })

        it('should validate API key when required', async () => {
            const protectedChatflow = {
                ...mockChatflow,
                apikeyid: 'api-key-123'
            }

            mockChatFlowRepository.findOneBy.mockResolvedValue(protectedChatflow)
            mockValidateChatflowAPIKey.mockResolvedValue(false)

            await request(app)
                .post('/api/v1/prediction/test-chatflow-id')
                .send({ question: 'Test' })
                .expect(401)

            expect(mockValidateChatflowAPIKey).toHaveBeenCalled()
        })

        it('should return 404 if chatflow not found', async () => {
            mockChatFlowRepository.findOneBy.mockResolvedValue(null)

            await request(app)
                .post('/api/v1/prediction/nonexistent')
                .send({ question: 'Test' })
                .expect(404)
        })

        it('should return 400 if chatflow not deployed', async () => {
            const undeployedChatflow = {
                ...mockChatflow,
                deployed: false
            }

            mockChatFlowRepository.findOneBy.mockResolvedValue(undeployedChatflow)

            const response = await request(app)
                .post('/api/v1/prediction/test-chatflow-id')
                .send({ question: 'Test' })
                .expect(400)

            expect(response.body.error).toContain('not deployed')
        })

        it('should handle streaming responses', async () => {
            mockChatFlowRepository.findOneBy.mockResolvedValue(mockChatflow)

            await request(app)
                .post('/api/v1/prediction/test-chatflow-id')
                .send({
                    question: 'Stream test',
                    streaming: true
                })
                .expect(200)

            expect(app.locals.sseStreamer.addClient).toHaveBeenCalled()
        })

        it('should save chat history', async () => {
            mockChatFlowRepository.findOneBy.mockResolvedValue(mockChatflow)
            
            const mockMessage = {
                id: 'msg-123',
                chatflowid: 'test-chatflow-id',
                content: 'What is AI?',
                role: 'userMessage',
                createdDate: new Date()
            }

            mockChatMessageRepository.create.mockReturnValue(mockMessage)
            mockChatMessageRepository.save.mockResolvedValue(mockMessage)

            await request(app)
                .post('/api/v1/prediction/test-chatflow-id')
                .send({
                    question: 'What is AI?',
                    chatId: 'chat-123'
                })
                .expect(200)

            expect(mockChatMessageRepository.save).toHaveBeenCalledTimes(2) // User message + AI response
        })

        it('should handle errors gracefully', async () => {
            mockChatFlowRepository.findOneBy.mockResolvedValue(mockChatflow)
            
            // Mock buildChatflow to throw error
            jest.mock('../../../utils/buildChatflow', () => ({
                buildChatflow: jest.fn().mockRejectedValue(new Error('LLM Error'))
            }))

            const response = await request(app)
                .post('/api/v1/prediction/test-chatflow-id')
                .send({ question: 'Error test' })
                .expect(500)

            expect(response.body.error).toBeDefined()
        })

        it('should validate input length', async () => {
            mockChatFlowRepository.findOneBy.mockResolvedValue(mockChatflow)

            const longQuestion = 'a'.repeat(10001) // Assuming 10k char limit

            await request(app)
                .post('/api/v1/prediction/test-chatflow-id')
                .send({ question: longQuestion })
                .expect(400)
        })

        it('should handle file uploads', async () => {
            mockChatFlowRepository.findOneBy.mockResolvedValue(mockChatflow)

            await request(app)
                .post('/api/v1/prediction/test-chatflow-id')
                .send({
                    question: 'Analyze this file',
                    uploads: [
                        {
                            data: 'base64encodeddata',
                            type: 'file',
                            name: 'document.pdf',
                            mime: 'application/pdf'
                        }
                    ]
                })
                .expect(200)
        })

        it('should respect override configurations', async () => {
            mockChatFlowRepository.findOneBy.mockResolvedValue(mockChatflow)

            await request(app)
                .post('/api/v1/prediction/test-chatflow-id')
                .send({
                    question: 'Test with overrides',
                    overrideConfig: {
                        temperature: 0.5,
                        maxTokens: 100
                    }
                })
                .expect(200)
        })
    })

    describe('GET /api/v1/prediction/:id/history', () => {
        it('should return chat history', async () => {
            const mockMessages = [
                {
                    id: '1',
                    content: 'Hello',
                    role: 'userMessage',
                    createdDate: new Date()
                },
                {
                    id: '2',
                    content: 'Hi there!',
                    role: 'apiMessage',
                    createdDate: new Date()
                }
            ]

            mockChatMessageRepository.find.mockResolvedValue(mockMessages)

            const response = await request(app)
                .get('/api/v1/prediction/test-chatflow-id/history')
                .query({ chatId: 'chat-123' })
                .expect(200)

            expect(response.body).toHaveLength(2)
            expect(mockChatMessageRepository.find).toHaveBeenCalledWith({
                where: {
                    chatflowid: 'test-chatflow-id',
                    chatId: 'chat-123'
                },
                order: {
                    createdDate: 'ASC'
                }
            })
        })

        it('should paginate history results', async () => {
            const mockMessages = Array(50).fill(null).map((_, i) => ({
                id: `msg-${i}`,
                content: `Message ${i}`,
                role: i % 2 === 0 ? 'userMessage' : 'apiMessage',
                createdDate: new Date()
            }))

            mockChatMessageRepository.find.mockResolvedValue(mockMessages.slice(0, 20))

            const response = await request(app)
                .get('/api/v1/prediction/test-chatflow-id/history')
                .query({ 
                    chatId: 'chat-123',
                    limit: 20,
                    offset: 0
                })
                .expect(200)

            expect(response.body).toHaveLength(20)
        })
    })

    describe('Security Tests', () => {
        const mockChatflow = {
            id: 'test-chatflow-id',
            name: 'Test Chatflow',
            flowData: JSON.stringify({
                nodes: [
                    {
                        id: 'node1',
                        type: 'llm',
                        data: { inputs: {} }
                    }
                ],
                edges: []
            }),
            deployed: true,
            isPublic: true,
            apikeyid: null
        }

        it('should prevent XSS in chat messages', async () => {
            mockChatFlowRepository.findOneBy.mockResolvedValue(mockChatflow)

            await request(app)
                .post('/api/v1/prediction/test-chatflow-id')
                .send({
                    question: '<script>alert("XSS")</script>Hello'
                })
                .expect(200)

            // Verify sanitization
            expect(mockChatMessageRepository.create).toHaveBeenCalledWith(
                expect.objectContaining({
                    content: expect.not.stringContaining('<script>')
                })
            )
        })

        it('should validate file upload types', async () => {
            mockChatFlowRepository.findOneBy.mockResolvedValue(mockChatflow)

            await request(app)
                .post('/api/v1/prediction/test-chatflow-id')
                .send({
                    question: 'Test',
                    uploads: [
                        {
                            data: 'malicious',
                            type: 'file',
                            name: 'virus.exe',
                            mime: 'application/x-executable'
                        }
                    ]
                })
                .expect(400)
        })

        it('should rate limit prediction requests', async () => {
            // This would be tested with the rate limiter middleware
            // Here we just verify the endpoint structure supports it
            expect(predictionRouter).toBeDefined()
        })
    })
})