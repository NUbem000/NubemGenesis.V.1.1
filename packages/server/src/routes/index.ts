import express from 'express'
import { 
    apiRateLimiter, 
    chatflowRateLimiter, 
    uploadRateLimiter,
    authRateLimiter 
} from '../middlewares/rateLimiter'
import { healthCheck, ping } from './health'

// Import all routers
import apikeyRouter from './apikey'
import assistantsRouter from './assistants'
import attachmentsRouter from './attachments'
import chatMessageRouter from './chat-messages'
import chatflowsRouter from './chatflows'
import chatflowsStreamingRouter from './chatflows-streaming'
import chatflowsUploadsRouter from './chatflows-uploads'
import componentsCredentialsRouter from './components-credentials'
import componentsCredentialsIconRouter from './components-credentials-icon'
import credentialsRouter from './credentials'
import documentStoreRouter from './documentstore'
import exportImportRouter from './export-import'
import feedbackRouter from './feedback'
import fetchLinksRouter from './fetch-links'
import flowConfigRouter from './flow-config'
import getUploadFileRouter from './get-upload-file'
import getUploadPathRouter from './get-upload-path'
import internalChatmessagesRouter from './internal-chat-messages'
import internalPredictionRouter from './internal-predictions'
import leadsRouter from './leads'
import loadPromptRouter from './load-prompts'
import marketplacesRouter from './marketplaces'
import nodeConfigRouter from './node-configs'
import nodeCustomFunctionRouter from './node-custom-functions'
import nodeIconRouter from './node-icons'
import nodeLoadMethodRouter from './node-load-methods'
import nodesRouter from './nodes'
import openaiAssistantsRouter from './openai-assistants'
import openaiAssistantsFileRouter from './openai-assistants-files'
import openaiAssistantsVectorStoreRouter from './openai-assistants-vector-store'
import openaiRealtimeRouter from './openai-realtime'
import pingRouter from './ping'
import predictionRouter from './predictions'
import promptListsRouter from './prompts-lists'
import publicChatbotRouter from './public-chatbots'
import publicChatflowsRouter from './public-chatflows'
import publicExecutionsRouter from './public-executions'
import statsRouter from './stats'
import toolsRouter from './tools'
import upsertHistoryRouter from './upsert-history'
import variablesRouter from './variables'
import vectorRouter from './vectors'
import verifyRouter from './verify'
import versionRouter from './versions'
import nvidiaNimRouter from './nvidia-nim'
import executionsRouter from './executions'
import validationRouter from './validation'
import agentflowv2GeneratorRouter from './agentflowv2-generator'
import orchestratorRouter from './orchestrator'

const router = express.Router()

// === HEALTH CHECK ENDPOINTS (No rate limiting for monitoring) ===
router.get('/health', healthCheck)
router.get('/ping', ping)

// === PUBLIC ENDPOINTS (No additional rate limiting) ===
router.use('/verify', verifyRouter)
router.use('/version', versionRouter)

// === AUTHENTICATION ENDPOINTS (Strict rate limiting) ===
router.use('/apikey', authRateLimiter, apikeyRouter)

// === FILE UPLOAD ENDPOINTS (Upload rate limiting) ===
router.use('/attachments', uploadRateLimiter, attachmentsRouter)
router.use('/chatflows-uploads', uploadRateLimiter, chatflowsUploadsRouter)
router.use('/get-upload-file', uploadRateLimiter, getUploadFileRouter)
router.use('/get-upload-path', uploadRateLimiter, getUploadPathRouter)

// === CHATFLOW EXECUTION ENDPOINTS (Chatflow rate limiting) ===
router.use('/prediction', chatflowRateLimiter, predictionRouter)
router.use('/internal-prediction', chatflowRateLimiter, internalPredictionRouter)
router.use('/chatflows-streaming', chatflowRateLimiter, chatflowsStreamingRouter)
router.use('/public-chatflows', chatflowRateLimiter, publicChatflowsRouter)
router.use('/public-executions', chatflowRateLimiter, publicExecutionsRouter)

// === AI ASSISTANT ENDPOINTS (Chatflow rate limiting) ===
router.use('/openai-assistants', chatflowRateLimiter, openaiAssistantsRouter)
router.use('/openai-assistants-file', chatflowRateLimiter, openaiAssistantsFileRouter)
router.use('/openai-assistants-vector-store', chatflowRateLimiter, openaiAssistantsVectorStoreRouter)
router.use('/openai-realtime', chatflowRateLimiter, openaiRealtimeRouter)
router.use('/nvidia-nim', chatflowRateLimiter, nvidiaNimRouter)
router.use('/agentflowv2-generator', chatflowRateLimiter, agentflowv2GeneratorRouter)

// === ORCHESTRATION ENDPOINTS (Specialized rate limiting) ===
router.use('/orchestrate', orchestratorRouter)

// === STANDARD API ENDPOINTS (API rate limiting) ===
router.use('/assistants', apiRateLimiter, assistantsRouter)
router.use('/chatflows', apiRateLimiter, chatflowsRouter)
router.use('/chatmessage', apiRateLimiter, chatMessageRouter)
router.use('/components-credentials', apiRateLimiter, componentsCredentialsRouter)
router.use('/components-credentials-icon', apiRateLimiter, componentsCredentialsIconRouter)
router.use('/credentials', apiRateLimiter, credentialsRouter)
router.use('/document-store', apiRateLimiter, documentStoreRouter)
router.use('/export-import', apiRateLimiter, exportImportRouter)
router.use('/feedback', apiRateLimiter, feedbackRouter)
router.use('/fetch-links', apiRateLimiter, fetchLinksRouter)
router.use('/flow-config', apiRateLimiter, flowConfigRouter)
router.use('/internal-chatmessage', apiRateLimiter, internalChatmessagesRouter)
router.use('/leads', apiRateLimiter, leadsRouter)
router.use('/load-prompt', apiRateLimiter, loadPromptRouter)
router.use('/marketplaces', apiRateLimiter, marketplacesRouter)
router.use('/node-config', apiRateLimiter, nodeConfigRouter)
router.use('/node-custom-function', apiRateLimiter, nodeCustomFunctionRouter)
router.use('/node-icon', apiRateLimiter, nodeIconRouter)
router.use('/node-load-method', apiRateLimiter, nodeLoadMethodRouter)
router.use('/nodes', apiRateLimiter, nodesRouter)
router.use('/prompts-list', apiRateLimiter, promptListsRouter)
router.use('/public-chatbotConfig', apiRateLimiter, publicChatbotRouter)
router.use('/stats', apiRateLimiter, statsRouter)
router.use('/tools', apiRateLimiter, toolsRouter)
router.use('/variables', apiRateLimiter, variablesRouter)
router.use('/vector', apiRateLimiter, vectorRouter)
router.use('/upsert-history', apiRateLimiter, upsertHistoryRouter)
router.use('/executions', apiRateLimiter, executionsRouter)
router.use('/validation', apiRateLimiter, validationRouter)

export default router