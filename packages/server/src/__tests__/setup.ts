import 'reflect-metadata'
import { config } from 'dotenv'
import path from 'path'

// Load test environment variables
config({ path: path.join(__dirname, '../../.env.test') })

// Set test environment
process.env.NODE_ENV = 'test'
process.env.LOG_LEVEL = 'error' // Reduce noise during tests
process.env.DISABLE_TELEMETRY = 'true'

// Mock winston logger to prevent console output during tests
jest.mock('../utils/logger', () => ({
    error: jest.fn(),
    warn: jest.fn(),
    info: jest.fn(),
    debug: jest.fn(),
    verbose: jest.fn()
}))

// Global test utilities
declare global {
    var testUtils: {
        generateMockApiKey: () => string
        generateMockUser: () => { username: string; password: string }
        wait: (ms: number) => Promise<void>
    }
}

global.testUtils = {
    generateMockApiKey: () => `test_${Math.random().toString(36).substring(7)}`,
    generateMockUser: () => ({
        username: `testuser_${Math.random().toString(36).substring(7)}`,
        password: 'Test@Password123'
    }),
    wait: (ms: number) => new Promise(resolve => setTimeout(resolve, ms))
}

// Clean up after all tests
afterAll(async () => {
    // Close any open handles
    await new Promise(resolve => setTimeout(resolve, 500))
})

// Add a basic test to ensure the setup works
describe('Test Setup', () => {
    it('should setup test environment', () => {
        expect(process.env.NODE_ENV).toBe('test')
        expect(global.testUtils).toBeDefined()
        expect(global.testUtils.generateMockApiKey).toBeDefined()
    })
})