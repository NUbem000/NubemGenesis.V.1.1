/** @type {import('jest').Config} */
module.exports = {
    preset: 'ts-jest',
    testEnvironment: 'node',
    roots: ['<rootDir>/src'],
    testMatch: [
        '**/__tests__/**/*.+(ts|tsx|js)',
        '**/?(*.)+(spec|test).+(ts|tsx|js)'
    ],
    transform: {
        '^.+\\.(ts|tsx)$': ['ts-jest', {
            tsconfig: 'tsconfig.test.json'
        }]
    },
    collectCoverageFrom: [
        'src/**/*.{js,ts}',
        '!src/**/*.d.ts',
        '!src/**/*.interface.ts',
        '!src/database/migrations/**',
        '!src/**/__tests__/**',
        '!src/**/__mocks__/**',
        '!src/index.ts'
    ],
    coverageThreshold: {
        global: {
            branches: 60,
            functions: 60,
            lines: 60,
            statements: 60
        }
    },
    moduleNameMapper: {
        '^@/(.*)$': '<rootDir>/src/$1',
        '^@utils/(.*)$': '<rootDir>/src/utils/$1',
        '^@middlewares/(.*)$': '<rootDir>/src/middlewares/$1',
        '^@database/(.*)$': '<rootDir>/src/database/$1',
        '^@config/(.*)$': '<rootDir>/src/config/$1'
    },
    setupFilesAfterEnv: ['<rootDir>/src/__tests__/setup.ts'],
    testTimeout: 30000,
    verbose: true,
    forceExit: true,
    clearMocks: true,
    resetMocks: true,
    restoreMocks: true,
    coverageDirectory: '<rootDir>/coverage',
    coverageReporters: ['text', 'lcov', 'html', 'json-summary'],
    testPathIgnorePatterns: ['/node_modules/', '/dist/', '/build/'],
    moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node']
}