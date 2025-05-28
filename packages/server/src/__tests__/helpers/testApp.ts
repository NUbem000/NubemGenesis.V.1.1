import express from 'express'
import { DataSource } from 'typeorm'
import { CachePool } from '../../CachePool'
import { NodesPool } from '../../NodesPool'
import { ToolsPool } from '../../ToolsPool'
import { Telemetry } from '../../utils/telemetry'
import logger from '../../utils/logger'

export function createTestApp(): express.Application {
    const app = express()
    
    // Add basic middleware
    app.use(express.json())
    app.use(express.urlencoded({ extended: true }))
    
    // Mock DataSource
    const mockDataSource = {
        getRepository: jest.fn(),
        manager: {
            transaction: jest.fn()
        }
    } as any
    
    // Mock CachePool
    const mockCachePool = {
        get: jest.fn(),
        set: jest.fn(),
        del: jest.fn()
    } as any
    
    // Mock NodesPool
    const mockNodesPool = {
        getNodes: jest.fn().mockReturnValue([]),
        getNodeByName: jest.fn()
    } as any
    
    // Mock ToolsPool
    const mockToolsPool = {
        getTools: jest.fn().mockReturnValue([]),
        getToolByName: jest.fn()
    } as any
    
    // Mock Telemetry
    const mockTelemetry = {
        sendTelemetry: jest.fn()
    } as any
    
    // Set up app locals
    app.locals = {
        AppDataSource: mockDataSource,
        cachePool: mockCachePool,
        nodesPool: mockNodesPool,
        toolsPool: mockToolsPool,
        telemetry: mockTelemetry,
        logger
    }
    
    return app
}

export function getMockDataSource(app: express.Application): jest.Mocked<DataSource> {
    return app.locals.AppDataSource
}

export function getMockCachePool(app: express.Application): any {
    return app.locals.cachePool
}

export function getMockNodesPool(app: express.Application): any {
    return app.locals.nodesPool
}