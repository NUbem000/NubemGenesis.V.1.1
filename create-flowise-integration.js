const express = require('express');
const cors = require('cors');
const axios = require('axios');

const app = express();
app.use(cors());
app.use(express.json());

// This endpoint creates a flow directly in NubemGenesis/Flowise
app.post('/api/v1/export-to-flowise', async (req, res) => {
    try {
        const { flow } = req.body;
        
        // Get Flowise API URL from environment
        const FLOWISE_BASE_URL = process.env.FLOWISE_BASE_URL || 'http://localhost:3000';
        
        // Prepare the chatflow data
        const chatflowData = {
            name: flow.name || 'NubemGenesis Generated Flow',
            deployed: true,
            isPublic: true,
            flowData: JSON.stringify({
                nodes: flow.nodes || [],
                edges: flow.edges || [],
                viewport: {
                    x: 0,
                    y: 0,
                    zoom: 1
                }
            }),
            chatbotConfig: JSON.stringify({
                welcomeMessage: "¡Hola! Soy tu asistente generado por NubemGenesis.",
                botMessage: {
                    showAvatar: true,
                    avatarSrc: "https://raw.githubusercontent.com/FlowiseAI/Flowise/main/packages/ui/public/favicon.ico"
                },
                chatHistory: {
                    showChatHistory: true,
                    chatHistoryLimit: 10
                },
                dateTimeToggle: {
                    date: true,
                    time: true
                }
            }),
            category: "NubemGenesis",
            type: "CHATFLOW"
        };
        
        try {
            // Try to create the flow via Flowise API
            const response = await axios.post(
                `${FLOWISE_BASE_URL}/api/v1/chatflows`,
                chatflowData,
                {
                    headers: {
                        'Content-Type': 'application/json'
                    }
                }
            );
            
            const createdFlow = response.data;
            
            res.json({
                success: true,
                flowId: createdFlow.id,
                flowiseUrl: `${FLOWISE_BASE_URL}/canvas/${createdFlow.id}`,
                message: 'Flujo creado exitosamente en Flowise.'
            });
            
        } catch (apiError) {
            // If API fails, return the flow data for manual import
            console.log('Flowise API not available, returning flow data for manual import');
            
            res.json({
                success: true,
                flowId: `temp_${Date.now()}`,
                flowData: chatflowData,
                flowiseUrl: `${FLOWISE_BASE_URL}/canvas`,
                message: 'Flujo preparado. Importa el JSON en Flowise para activar el agente.',
                requiresManualImport: true
            });
        }
        
    } catch (error) {
        console.error('Export to Flowise error:', error);
        res.status(500).json({ 
            error: 'Error al exportar a Flowise',
            details: error.message 
        });
    }
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
    console.log(`Flowise Integration Service running on port ${PORT}`);
});