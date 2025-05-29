import express from 'express'
import { Request, Response } from 'express'
import path from 'path'
import cors from 'cors'
import http from 'http'
import basicAuth from 'express-basic-auth'
import { DataSource } from 'typeorm'
import { MODE } from './Interface'
import { getNodeModulesPackagePath, getEncryptionKey } from './utils'
import { getUIBuildPath } from './utils/serveUI'
import logger, { expressRequestLogger } from './utils/logger'
import { getDataSource } from './DataSource'
import { NodesPool } from './NodesPool'
import { ChatFlow } from './database/entities/ChatFlow'
import { CachePool } from './CachePool'
import { AbortControllerPool } from './AbortControllerPool'
import { RateLimiterManager } from './utils/rateLimit'
import { getAPIKeys } from './utils/apiKey'
import { sanitizeMiddleware, getCorsOptions, getAllowedIframeOrigins } from './utils/XSS'
import { Telemetry } from './utils/telemetry'
import flowiseApiV1Router from './routes'
import errorHandlerMiddleware from './middlewares/errors'
import { SSEStreamer } from './utils/SSEStreamer'
import { validateAPIKey } from './utils/validateKey'
import { IMetricsProvider } from './Interface.Metrics'
import { Prometheus } from './metrics/Prometheus'
import { OpenTelemetry } from './metrics/OpenTelemetry'
import { QueueManager } from './queue/QueueManager'
import { RedisEventSubscriber } from './queue/RedisEventSubscriber'
import { WHITELIST_URLS } from './utils/constants'
import 'global-agent/bootstrap'

// NEW SECURITY IMPORTS
import { validateEnv } from './config/envValidation'
import { setupSecurityMiddleware } from './middlewares/securityHeaders'
import { globalRateLimiter, ipBlockingMiddleware, authRateLimiter } from './middlewares/rateLimiter'

// Validate environment variables on startup
try {
    validateEnv()
} catch (error) {
    logger.error('Environment validation failed:', error)
    process.exit(1)
}

declare global {
    namespace Express {
        namespace Multer {
            interface File {
                bucket: string
                key: string
                acl: string
                contentType: string
                contentDisposition: null
                storageClass: string
                serverSideEncryption: null
                metadata: any
                location: string
                etag: string
            }
        }
    }
}

export class App {
    app: express.Application
    nodesPool: NodesPool
    abortControllerPool: AbortControllerPool
    cachePool: CachePool
    telemetry: Telemetry
    rateLimiterManager: RateLimiterManager
    AppDataSource: DataSource = getDataSource()
    sseStreamer: SSEStreamer
    metricsProvider: IMetricsProvider
    queueManager: QueueManager
    redisSubscriber: RedisEventSubscriber

    constructor() {
        this.app = express()
    }

    async initDatabase() {
        // Initialize database
        try {
            await this.AppDataSource.initialize()
            logger.info('📦 [server]: Data Source is initializing...')

            // Run Migrations Scripts
            await this.AppDataSource.runMigrations({ transaction: 'each' })

            // Initialize nodes pool
            this.nodesPool = new NodesPool()
            await this.nodesPool.initialize()

            // Initialize metrics provider
            this.metricsProvider = process.env.METRICS_PROVIDER === 'prometheus' ? new Prometheus() : new OpenTelemetry()

            // Initialize cache pool
            this.cachePool = new CachePool()

            // Initialize abort controller pool
            this.abortControllerPool = new AbortControllerPool()

            // Initialize sse streamer
            this.sseStreamer = new SSEStreamer()

            // Initialize rate limiter manager
            this.rateLimiterManager = new RateLimiterManager()

            // Initialize queue manager
            this.queueManager = new QueueManager(this.AppDataSource)
            await this.queueManager.initialize()

            // Initialize redis event subscriber
            this.redisSubscriber = new RedisEventSubscriber(this.queueManager.getQueues())

            // Initialize encryption key
            await getEncryptionKey()

            // Initialize telemetry
            this.telemetry = new Telemetry()
            logger.info('📦 [server]: Data Source has been initialized!')
        } catch (error) {
            logger.error('❌ [server]: Error during Data Source initialization:', error)
            throw error
        }
    }

    async config() {
        // === SECURITY FIRST: Apply security middlewares before anything else ===
        
        // 1. IP blocking middleware (must be first)
        this.app.use(ipBlockingMiddleware)
        
        // 2. Global rate limiter
        this.app.use(globalRateLimiter)
        
        // 3. Security headers (Helmet)
        setupSecurityMiddleware(this.app)
        
        // 4. Trust proxy settings
        if (process.env.NUMBER_OF_PROXIES && parseInt(process.env.NUMBER_OF_PROXIES) > 0) {
            this.app.set('trust proxy', parseInt(process.env.NUMBER_OF_PROXIES))
        }

        // === BODY PARSING & LIMITS ===
        const flowise_file_size_limit = process.env.FLOWISE_FILE_SIZE_LIMIT || '50mb'
        this.app.use(express.json({ limit: flowise_file_size_limit }))
        this.app.use(express.urlencoded({ limit: flowise_file_size_limit, extended: true }))

        // === CORS Configuration ===
        this.app.use(cors(getCorsOptions()))

        // === CSP for iframes (if not already set by Helmet) ===
        this.app.use((req, res, next) => {
            const allowedOrigins = getAllowedIframeOrigins()
            if (allowedOrigins !== '*') {
                const existingCSP = res.getHeader('Content-Security-Policy')
                if (!existingCSP || !existingCSP.toString().includes('frame-ancestors')) {
                    const csp = `frame-ancestors ${allowedOrigins}`
                    res.setHeader('Content-Security-Policy', csp)
                }
            }
            next()
        })

        // === LOGGING ===
        this.app.use(expressRequestLogger)

        // === XSS Protection ===
        this.app.use(sanitizeMiddleware)

        // === AUTHENTICATION ===
        const whitelistURLs = WHITELIST_URLS
        const URL_CASE_INSENSITIVE_REGEX: RegExp = /\/api\/v1\//i
        const URL_CASE_SENSITIVE_REGEX: RegExp = /\/api\/v1\//

        if (process.env.FLOWISE_USERNAME && process.env.FLOWISE_PASSWORD) {
            const username = process.env.FLOWISE_USERNAME
            const password = process.env.FLOWISE_PASSWORD
            const basicAuthMiddleware = basicAuth({
                users: { [username]: password }
            })
            
            this.app.use(async (req, res, next) => {
                // Apply auth rate limiter for login attempts
                if (req.path === '/api/v1/auth/login') {
                    return authRateLimiter(req, res, () => {
                        basicAuthMiddleware(req, res, next)
                    })
                }

                // Step 1: Check if the req path contains /api/v1 regardless of case
                if (URL_CASE_INSENSITIVE_REGEX.test(req.path)) {
                    // Step 2: Check if the req path is case sensitive
                    if (URL_CASE_SENSITIVE_REGEX.test(req.path)) {
                        // Step 3: Check if the req path is in the whitelist
                        const isWhitelisted = whitelistURLs.some((url) => req.path.startsWith(url))
                        if (isWhitelisted) {
                            next()
                        } else if (req.headers['x-request-from'] === 'internal') {
                            basicAuthMiddleware(req, res, next)
                        } else {
                            const isKeyValidated = await validateAPIKey(req)
                            if (!isKeyValidated) {
                                return res.status(401).json({ error: 'Unauthorized Access' })
                            }
                            next()
                        }
                    } else {
                        return res.status(401).json({ error: 'Unauthorized Access' })
                    }
                } else {
                    // If the req path does not contain /api/v1, then allow the request to pass through, example: /assets, /canvas
                    next()
                }
            })
        } else {
            this.app.use(async (req, res, next) => {
                // Step 1: Check if the req path contains /api/v1 regardless of case
                if (URL_CASE_INSENSITIVE_REGEX.test(req.path)) {
                    // Step 2: Check if the req path is case sensitive
                    if (URL_CASE_SENSITIVE_REGEX.test(req.path)) {
                        // Step 3: Check if the req path is in the whitelist
                        const isWhitelisted = whitelistURLs.some((url) => req.path.startsWith(url))
                        if (isWhitelisted) {
                            next()
                        } else if (req.headers['x-request-from'] === 'internal') {
                            next()
                        } else {
                            const isKeyValidated = await validateAPIKey(req)
                            if (!isKeyValidated) {
                                return res.status(401).json({ error: 'Unauthorized Access' })
                            }
                            next()
                        }
                    } else {
                        return res.status(401).json({ error: 'Unauthorized Access' })
                    }
                } else {
                    // If the req path does not contain /api/v1, then allow the request to pass through, example: /assets, /canvas
                    next()
                }
            })
        }

        // === API ROUTES ===
        this.app.use('/api/v1', flowiseApiV1Router)

        // === STATIC FILES ===
        // Use the new getUIBuildPath function to find the UI build
        const uiPath = getUIBuildPath()
        logger.info(`📁 [server]: Serving UI from ${uiPath}`)
        this.app.use('/', express.static(uiPath))

        // All other non-api routes should return the UI
        this.app.use((req: Request, res: Response) => {
            // Any other routes not found
            res.sendFile(path.join(uiPath, 'index.html'))
        })

        // === ERROR HANDLING (must be last) ===
        this.app.use(errorHandlerMiddleware)

        // Log security configuration
        logger.info('🔒 [server]: Security middlewares configured:')
        logger.info('  ✓ Environment validation')
        logger.info('  ✓ IP blocking')
        logger.info('  ✓ Rate limiting')
        logger.info('  ✓ Security headers (Helmet)')
        logger.info('  ✓ CORS protection')
        logger.info('  ✓ XSS sanitization')
    }

    async loadChatFlow() {
        const allChatFlows: ChatFlow[] = await this.AppDataSource.getRepository(ChatFlow).find()

        for (const chatFlow of allChatFlows) {
            const flowObj = JSON.parse(chatFlow.flowData)
            const reactFlowNodes = flowObj.nodes
            const reactFlowEdges = flowObj.edges
            if (MODE === 'QUEUE') {
                await this.queueManager.addJob(`loadChatflow-${chatFlow.id}`, { chatFlow, reactFlowNodes, reactFlowEdges })
            } else {
                const res = await this.telemetry.checkRegistration({ chatflowId: chatFlow.id, nodes: reactFlowNodes })
                if (!res.registered) await this.telemetry.sendTelemetry('chatflow_created', res.data)
            }
        }
    }

    async build() {
        await this.setupNodeModulesPackages()
        await this.initDatabase()
        await this.config()

        const validateKeys = async () => {
            // Get API keys at the start
            await getAPIKeys()
        }

        // Initialize API keys
        await validateKeys()

        // Initialize telemetry
        this.telemetry.sendTelemetry('server_started')

        await this.loadChatFlow()

        const PORT = parseInt(process.env.PORT || '', 10) || 3000
        const server = http.createServer(this.app)

        server.listen(PORT, () => {
            logger.info(`⚡️ [server]: Server is running at http://localhost:${PORT}`)
        })
    }

    async setupNodeModulesPackages() {
        const packagePath = getNodeModulesPackagePath('flowise-components')
        logger.info(`🤖 [server]: Start setting up node packages from ${packagePath}...`)
        const spinner = {
            start: () => {},
            stop: () => {}
        }
        try {
            spinner.start()
            const nodeModulesPackagePaths = await this.nodesPool.getNodeModulesPackagePath(packagePath)
            for (const nodeModulesPackagePath of nodeModulesPackagePaths) {
                await this.nodesPool.initializeNodeModulesPackage(nodeModulesPackagePath)
            }
            spinner.stop()
            logger.info('✅ [server]: Node packages setup successfully!')
        } catch (error) {
            spinner.stop()
            logger.error(`❌ [server]: Error setting up node packages: ${error}`)
        }
    }
}

// Export the updated server
export default App