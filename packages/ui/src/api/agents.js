import axios from 'axios'
import { baseURL, getHeaders } from './client'

const AGENT_API = {
    // Get all agents
    getAllAgents: () => axios.get(`${baseURL}/api/v1/agents`, getHeaders()),
    
    // Get single agent
    getAgent: (id) => axios.get(`${baseURL}/api/v1/agents/${id}`, getHeaders()),
    
    // Create new agent
    createAgent: (agentData) => axios.post(`${baseURL}/api/v1/agents`, agentData, getHeaders()),
    
    // Update agent
    updateAgent: (id, agentData) => axios.put(`${baseURL}/api/v1/agents/${id}`, agentData, getHeaders()),
    
    // Delete agent
    deleteAgent: (id) => axios.delete(`${baseURL}/api/v1/agents/${id}`, getHeaders()),
    
    // Get agent stats
    getAgentStats: (id) => axios.get(`${baseURL}/api/v1/agents/${id}/stats`, getHeaders()),
    
    // Regenerate API key
    regenerateApiKey: (id) => axios.post(`${baseURL}/api/v1/agents/${id}/regenerate-key`, {}, getHeaders()),
    
    // Test agent
    testAgent: (id, message, sessionId) => axios.post(
        `${baseURL}/api/v1/agents/${id}/test`,
        { message, sessionId },
        getHeaders()
    ),
    
    // Get agent sessions
    getAgentSessions: (id, params = {}) => axios.get(
        `${baseURL}/api/v1/agents/${id}/sessions`,
        { ...getHeaders(), params }
    ),
    
    // Get session history
    getSessionHistory: (agentId, sessionId) => axios.get(
        `${baseURL}/api/v1/agents/${agentId}/sessions/${sessionId}/history`,
        getHeaders()
    ),
    
    // Clear session
    clearSession: (agentId, sessionId) => axios.delete(
        `${baseURL}/api/v1/agents/${agentId}/sessions/${sessionId}`,
        getHeaders()
    ),
    
    // Export agent configuration
    exportAgent: (id) => axios.get(
        `${baseURL}/api/v1/agents/${id}/export`,
        { ...getHeaders(), responseType: 'blob' }
    ),
    
    // Import agent configuration
    importAgent: (configFile) => {
        const formData = new FormData()
        formData.append('config', configFile)
        return axios.post(
            `${baseURL}/api/v1/agents/import`,
            formData,
            {
                ...getHeaders(),
                headers: {
                    ...getHeaders().headers,
                    'Content-Type': 'multipart/form-data'
                }
            }
        )
    },
    
    // Get agent templates
    getAgentTemplates: () => axios.get(`${baseURL}/api/v1/agents/templates`, getHeaders()),
    
    // Deploy agent
    deployAgent: (id) => axios.post(`${baseURL}/api/v1/agents/${id}/deploy`, {}, getHeaders()),
    
    // Undeploy agent
    undeployAgent: (id) => axios.post(`${baseURL}/api/v1/agents/${id}/undeploy`, {}, getHeaders()),
    
    // Get agent logs
    getAgentLogs: (id, params = {}) => axios.get(
        `${baseURL}/api/v1/agents/${id}/logs`,
        { ...getHeaders(), params }
    ),
    
    // Update agent settings
    updateAgentSettings: (id, settings) => axios.patch(
        `${baseURL}/api/v1/agents/${id}/settings`,
        settings,
        getHeaders()
    ),
    
    // Get agent webhooks
    getAgentWebhooks: (id) => axios.get(
        `${baseURL}/api/v1/agents/${id}/webhooks`,
        getHeaders()
    ),
    
    // Create webhook
    createWebhook: (agentId, webhookData) => axios.post(
        `${baseURL}/api/v1/agents/${agentId}/webhooks`,
        webhookData,
        getHeaders()
    ),
    
    // Delete webhook
    deleteWebhook: (agentId, webhookId) => axios.delete(
        `${baseURL}/api/v1/agents/${agentId}/webhooks/${webhookId}`,
        getHeaders()
    ),
    
    // Test webhook
    testWebhook: (agentId, webhookId) => axios.post(
        `${baseURL}/api/v1/agents/${agentId}/webhooks/${webhookId}/test`,
        {},
        getHeaders()
    )
}

export default AGENT_API