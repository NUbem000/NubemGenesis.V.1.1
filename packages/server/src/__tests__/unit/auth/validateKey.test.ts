import { Request } from 'express'
import { validateChatflowAPIKey, validateAPIKey } from '../../../utils/validateKey'
import { ChatFlow } from '../../../database/entities/ChatFlow'
import * as apiKeyUtils from '../../../utils/apiKey'
import apikeyService from '../../../services/apikey'

// Mock dependencies
jest.mock('../../../utils/apiKey')
jest.mock('../../../services/apikey')

describe('Authentication - API Key Validation', () => {
    const mockCompareKeys = apiKeyUtils.compareKeys as jest.MockedFunction<typeof apiKeyUtils.compareKeys>
    const mockGetAllApiKeys = jest.fn()

    beforeEach(() => {
        jest.clearAllMocks()
        ;(apikeyService.getAllApiKeys as jest.Mock) = mockGetAllApiKeys
    })

    describe('validateChatflowAPIKey', () => {
        it('should return true if chatflow has no API key configured', async () => {
            const req = { headers: {} } as unknown as Request
            const chatflow = { apikeyid: null } as unknown as ChatFlow

            const result = await validateChatflowAPIKey(req, chatflow)

            expect(result).toBe(true)
            expect(mockGetAllApiKeys).not.toHaveBeenCalled()
        })

        it('should return false if chatflow requires API key but none provided', async () => {
            const req = { headers: {} } as unknown as Request
            const chatflow = { apikeyid: 'test-key-id' } as unknown as ChatFlow

            const result = await validateChatflowAPIKey(req, chatflow)

            expect(result).toBe(false)
            expect(mockGetAllApiKeys).not.toHaveBeenCalled()
        })

        it('should validate API key with Bearer token', async () => {
            const apiKey = 'test-api-key'
            const apiSecret = 'hashed-secret'
            const req = {
                headers: {
                    'Authorization': `Bearer ${apiKey}`
                }
            } as unknown as Request
            const chatflow = { apikeyid: 'test-key-id' } as unknown as ChatFlow

            mockGetAllApiKeys.mockResolvedValue([
                { id: 'test-key-id', apiKey, apiSecret }
            ])
            mockCompareKeys.mockReturnValue(true)

            const result = await validateChatflowAPIKey(req, chatflow)

            expect(result).toBe(true)
            expect(mockGetAllApiKeys).toHaveBeenCalled()
            expect(mockCompareKeys).toHaveBeenCalledWith(apiSecret, apiKey)
        })

        it('should handle lowercase authorization header', async () => {
            const apiKey = 'test-api-key'
            const apiSecret = 'hashed-secret'
            const req = {
                headers: {
                    'authorization': `Bearer ${apiKey}`
                }
            } as unknown as Request
            const chatflow = { apikeyid: 'test-key-id' } as unknown as ChatFlow

            mockGetAllApiKeys.mockResolvedValue([
                { id: 'test-key-id', apiKey, apiSecret }
            ])
            mockCompareKeys.mockReturnValue(true)

            const result = await validateChatflowAPIKey(req, chatflow)

            expect(result).toBe(true)
        })

        it('should return false for invalid API key', async () => {
            const apiKey = 'invalid-key'
            const apiSecret = 'hashed-secret'
            const req = {
                headers: {
                    'Authorization': `Bearer ${apiKey}`
                }
            } as unknown as Request
            const chatflow = { apikeyid: 'test-key-id' } as unknown as ChatFlow

            mockGetAllApiKeys.mockResolvedValue([
                { id: 'test-key-id', apiKey: 'different-key', apiSecret }
            ])
            mockCompareKeys.mockReturnValue(false)

            const result = await validateChatflowAPIKey(req, chatflow)

            expect(result).toBe(false)
        })

        it('should return false if API key not found in database', async () => {
            const apiKey = 'test-api-key'
            const req = {
                headers: {
                    'Authorization': `Bearer ${apiKey}`
                }
            } as unknown as Request
            const chatflow = { apikeyid: 'test-key-id' } as unknown as ChatFlow

            mockGetAllApiKeys.mockResolvedValue([
                { id: 'different-id', apiKey: 'different-key', apiSecret: 'secret' }
            ])

            const result = await validateChatflowAPIKey(req, chatflow)

            expect(result).toBe(false)
            expect(mockCompareKeys).not.toHaveBeenCalled()
        })
    })

    describe('validateAPIKey', () => {
        it('should return false if no authorization header provided', async () => {
            const req = { headers: {} } as unknown as Request

            const result = await validateAPIKey(req)

            expect(result).toBe(false)
            expect(mockGetAllApiKeys).not.toHaveBeenCalled()
        })

        it('should validate API key successfully', async () => {
            const apiKey = 'test-api-key'
            const apiSecret = 'hashed-secret'
            const req = {
                headers: {
                    'Authorization': `Bearer ${apiKey}`
                }
            } as unknown as Request

            mockGetAllApiKeys.mockResolvedValue([
                { apiKey, apiSecret }
            ])
            mockCompareKeys.mockReturnValue(true)

            const result = await validateAPIKey(req)

            expect(result).toBe(true)
            expect(mockGetAllApiKeys).toHaveBeenCalled()
            expect(mockCompareKeys).toHaveBeenCalledWith(apiSecret, apiKey)
        })

        it('should return false if API key not found', async () => {
            const apiKey = 'non-existent-key'
            const req = {
                headers: {
                    'Authorization': `Bearer ${apiKey}`
                }
            } as unknown as Request

            mockGetAllApiKeys.mockResolvedValue([])

            const result = await validateAPIKey(req)

            expect(result).toBe(false)
        })

        it('should return false if API key comparison fails', async () => {
            const apiKey = 'test-api-key'
            const apiSecret = 'hashed-secret'
            const req = {
                headers: {
                    'Authorization': `Bearer ${apiKey}`
                }
            } as unknown as Request

            mockGetAllApiKeys.mockResolvedValue([
                { apiKey, apiSecret }
            ])
            mockCompareKeys.mockReturnValue(false)

            const result = await validateAPIKey(req)

            expect(result).toBe(false)
        })

        it('should handle malformed authorization header', async () => {
            const req = {
                headers: {
                    'Authorization': 'InvalidFormat'
                }
            } as unknown as Request

            mockGetAllApiKeys.mockResolvedValue([
                { apiKey: 'test-key', apiSecret: 'secret' }
            ])

            const result = await validateAPIKey(req)

            expect(result).toBe(false)
        })

        it('should handle empty bearer token', async () => {
            const req = {
                headers: {
                    'Authorization': 'Bearer '
                }
            } as unknown as Request

            const result = await validateAPIKey(req)

            expect(result).toBe(false)
        })
    })

    describe('Edge Cases', () => {
        it('should handle database errors gracefully', async () => {
            const req = {
                headers: {
                    'Authorization': 'Bearer test-key'
                }
            } as unknown as Request

            mockGetAllApiKeys.mockRejectedValue(new Error('Database error'))

            await expect(validateAPIKey(req)).rejects.toThrow('Database error')
        })

        it('should handle null/undefined in API keys list', async () => {
            const apiKey = 'test-api-key'
            const req = {
                headers: {
                    'Authorization': `Bearer ${apiKey}`
                }
            } as unknown as Request

            mockGetAllApiKeys.mockResolvedValue([
                null,
                undefined,
                { apiKey, apiSecret: 'secret' }
            ])
            mockCompareKeys.mockReturnValue(true)

            const result = await validateAPIKey(req)

            expect(result).toBe(true)
        })
    })
})