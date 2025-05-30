import client from './client'

const getAllChatflows = () => client.get('/chatflows?type=CHATFLOW')

const getAllAgentflows = (type) => client.get(`/chatflows?type=${type}`)

const getSpecificChatflow = (id) => client.get(`/chatflows/${id}`)

const getSpecificChatflowFromPublicEndpoint = (id) => client.get(`/public-chatflows/${id}`)

const createNewChatflow = (body) => client.post(`/chatflows`, body)

const importChatflows = (body) => client.post(`/chatflows/importchatflows`, body)

const updateChatflow = (id, body) => client.put(`/chatflows/${id}`, body)

const deleteChatflow = (id) => client.delete(`/chatflows/${id}`)

const getIsChatflowStreaming = (id) => client.get(`/chatflows-streaming/${id}`)

const getAllowChatflowUploads = (id) => client.get(`/chatflows-uploads/${id}`)

const generateAgentflow = (body) => client.post(`/agentflowv2-generator/generate`, body)

// V2 Orchestration endpoints
const analyzeAgentRequest = (body) => client.post(`/v2/orchestrate/analyze`, body)
const generateAgentConfig = (body) => client.post(`/v2/orchestrate/generate`, body)
const deployAgent = (id, body) => client.post(`/v2/orchestrate/deploy/${id}`, body)
const getAgentSuggestions = (query) => client.get(`/v2/orchestrate/suggestions?query=${encodeURIComponent(query)}`)

export default {
    getAllChatflows,
    getAllAgentflows,
    getSpecificChatflow,
    getSpecificChatflowFromPublicEndpoint,
    createNewChatflow,
    importChatflows,
    updateChatflow,
    deleteChatflow,
    getIsChatflowStreaming,
    getAllowChatflowUploads,
    generateAgentflow,
    analyzeAgentRequest,
    generateAgentConfig,
    deployAgent,
    getAgentSuggestions
}
