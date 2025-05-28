import { Request } from 'express'

// Global instance store for the running app
let runningInstance: any = null

export const setRunningExpressApp = function (app: any) {
    runningInstance = app
}

export const getRunningExpressApp = function () {
    // In test environment, return a mock instance
    if (process.env.NODE_ENV === 'test') {
        return {
            nodesPool: {},
            telemetry: { sendTelemetry: () => {} },
            cachePool: {},
            AppDataSource: {}
        }
    }
    
    if (!runningInstance) {
        throw new Error(`Error: getRunningExpressApp failed - no running instance!`)
    }
    
    if (
        typeof runningInstance === 'undefined' ||
        typeof runningInstance.nodesPool === 'undefined' ||
        typeof runningInstance.telemetry === 'undefined'
    ) {
        throw new Error(`Error: getRunningExpressApp failed - incomplete instance!`)
    }
    return runningInstance
}
