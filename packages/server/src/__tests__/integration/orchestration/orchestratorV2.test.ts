/**
 * Integration tests for Orchestrator V2 with RAG capabilities
 */

import request from 'supertest'
import { StatusCodes } from 'http-status-codes'
import { getTestApp, closeTestApp } from '../../helpers/testApp'
import { Express } from 'express'

describe('Orchestrator V2 API', () => {
    let app: Express

    beforeAll(async () => {
        app = await getTestApp()
    })

    afterAll(async () => {
        await closeTestApp()
    })

    describe('POST /api/v2/orchestrate/orchestrate', () => {
        it('should handle simple query without clarification', async () => {
            const response = await request(app)
                .post('/api/v2/orchestrate/orchestrate')
                .send({
                    query: 'Create a customer support chatbot with FAQ handling'
                })
                .expect(StatusCodes.OK)

            expect(response.body).toHaveProperty('flow')
            expect(response.body).toHaveProperty('explanation')
            expect(response.body).toHaveProperty('confidence')
            expect(response.body.confidence).toBeGreaterThan(0.7)
            expect(response.body.metadata.componentsUsed).toContain('chatOpenAI')
        })

        it('should request clarification for ambiguous queries', async () => {
            const response = await request(app)
                .post('/api/v2/orchestrate/orchestrate')
                .send({
                    query: 'I need to analyze documents'
                })
                .expect(StatusCodes.OK)

            expect(response.body.needsClarification).toBe(true)
            expect(response.body.questions).toBeDefined()
            expect(response.body.questions.length).toBeGreaterThan(0)
            expect(response.body.suggestions).toBeDefined()
            
            // Check for data source question
            const dataSourceQuestion = response.body.questions.find(
                (q: any) => q.id === 'data_source'
            )
            expect(dataSourceQuestion).toBeDefined()
            expect(dataSourceQuestion.options.length).toBeGreaterThan(0)
        })

        it('should generate flow after clarifications provided', async () => {
            const response = await request(app)
                .post('/api/v2/orchestrate/orchestrate')
                .send({
                    query: 'I need to analyze documents',
                    clarifications: [
                        {
                            questionId: 'data_source',
                            values: ['pdf']
                        },
                        {
                            questionId: 'output_format',
                            values: ['text']
                        }
                    ]
                })
                .expect(StatusCodes.OK)

            expect(response.body.needsClarification).toBeFalsy()
            expect(response.body).toHaveProperty('flow')
            expect(response.body.metadata.componentsUsed).toContain('pdfLoader')
        })

        it('should return similar use cases with query', async () => {
            const response = await request(app)
                .post('/api/v2/orchestrate/orchestrate')
                .send({
                    query: 'Create a chatbot for customer support'
                })
                .expect(StatusCodes.OK)

            if (response.body.metadata) {
                expect(response.body.metadata.similarCasesFound).toBeGreaterThan(0)
            }
        })

        it('should handle constraints properly', async () => {
            const response = await request(app)
                .post('/api/v2/orchestrate/orchestrate')
                .send({
                    query: 'Create a simple Q&A bot',
                    constraints: {
                        maxCost: 0.01,
                        preferredModels: ['gpt-3.5-turbo'],
                        securityLevel: 'low'
                    }
                })
                .expect(StatusCodes.OK)

            expect(response.body).toHaveProperty('estimatedCost')
            expect(response.body.estimatedCost).toBeLessThanOrEqual(0.01)
            expect(response.body.metadata.modelsSelected).toContain('gpt-3.5-turbo')
        })

        it('should reject invalid requests', async () => {
            const response = await request(app)
                .post('/api/v2/orchestrate/orchestrate')
                .send({})
                .expect(StatusCodes.BAD_REQUEST)

            expect(response.body.error).toContain('Query is required')
        })
    })

    describe('GET /api/v2/orchestrate/suggestions', () => {
        it('should return suggestions for partial queries', async () => {
            const response = await request(app)
                .get('/api/v2/orchestrate/suggestions')
                .query({ query: 'customer support' })
                .expect(StatusCodes.OK)

            expect(response.body.suggestions).toBeDefined()
            expect(Array.isArray(response.body.suggestions)).toBe(true)
            
            if (response.body.suggestions.length > 0) {
                const suggestion = response.body.suggestions[0]
                expect(suggestion).toHaveProperty('title')
                expect(suggestion).toHaveProperty('description')
                expect(suggestion).toHaveProperty('confidence')
                expect(suggestion).toHaveProperty('tags')
            }
        })

        it('should handle empty query', async () => {
            const response = await request(app)
                .get('/api/v2/orchestrate/suggestions')
                .expect(StatusCodes.BAD_REQUEST)

            expect(response.body.error).toContain('Query parameter is required')
        })
    })

    describe('POST /api/v2/orchestrate/feedback', () => {
        it('should accept feedback for generated flows', async () => {
            const response = await request(app)
                .post('/api/v2/orchestrate/feedback')
                .send({
                    flowId: 'test-flow-123',
                    rating: 5,
                    feedback: 'Great flow, worked perfectly!',
                    performance: {
                        componentsUsed: ['chatOpenAI', 'bufferMemory'],
                        avgResponseTime: 2.5,
                        accuracy: 0.92
                    }
                })
                .expect(StatusCodes.OK)

            expect(response.body.message).toContain('Feedback received successfully')
        })

        it('should reject feedback without required fields', async () => {
            const response = await request(app)
                .post('/api/v2/orchestrate/feedback')
                .send({
                    feedback: 'Missing required fields'
                })
                .expect(StatusCodes.BAD_REQUEST)

            expect(response.body.error).toContain('Flow ID and rating are required')
        })
    })

    describe('GET /api/v2/orchestrate/templates', () => {
        it('should return popular templates', async () => {
            const response = await request(app)
                .get('/api/v2/orchestrate/templates')
                .expect(StatusCodes.OK)

            expect(response.body.templates).toBeDefined()
            expect(Array.isArray(response.body.templates)).toBe(true)
            
            if (response.body.templates.length > 0) {
                const template = response.body.templates[0]
                expect(template).toHaveProperty('id')
                expect(template).toHaveProperty('name')
                expect(template).toHaveProperty('description')
                expect(template).toHaveProperty('category')
                expect(template).toHaveProperty('popularity')
            }
        })

        it('should filter templates by category', async () => {
            const response = await request(app)
                .get('/api/v2/orchestrate/templates')
                .query({ category: 'Support' })
                .expect(StatusCodes.OK)

            expect(response.body.templates).toBeDefined()
            response.body.templates.forEach((template: any) => {
                expect(template.category).toBe('Support')
            })
        })

        it('should respect limit parameter', async () => {
            const response = await request(app)
                .get('/api/v2/orchestrate/templates')
                .query({ limit: 2 })
                .expect(StatusCodes.OK)

            expect(response.body.templates.length).toBeLessThanOrEqual(2)
        })
    })
})