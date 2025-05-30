const express = require('express');
const cors = require('cors');
const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Puerto desde variable de entorno
const PORT = process.env.PORT || 8080;

// Datos de ejemplo para los endpoints V2
const templates = [
  {
    id: 'customer-support',
    name: 'Customer Support Chatbot',
    description: '24/7 automated customer support with FAQ handling',
    category: 'Support',
    popularity: 95,
    avgRating: 4.8,
    usage: 15000
  },
  {
    id: 'document-analyzer',
    name: 'PDF Document Analyzer',
    description: 'Extract and analyze information from PDF documents',
    category: 'Analysis',
    popularity: 88,
    avgRating: 4.6,
    usage: 8500
  },
  {
    id: 'web-researcher',
    name: 'Web Research Assistant',
    description: 'Search the web and summarize findings on any topic',
    category: 'Research',
    popularity: 85,
    avgRating: 4.5,
    usage: 12000
  }
];

// Endpoints V2
app.get('/api/v2/orchestrate/templates', (req, res) => {
  const { category, limit = 10 } = req.query;
  let filtered = category ? templates.filter(t => t.category === category) : templates;
  res.json({ templates: filtered.slice(0, parseInt(limit)) });
});

app.post('/api/v2/orchestrate/orchestrate', (req, res) => {
  const { query, clarifications } = req.body;
  
  if (!query) {
    return res.status(400).json({ error: 'Query is required' });
  }
  
  // Detectar si necesita clarificación
  const needsClarification = !clarifications && 
    (query.toLowerCase().includes('analyze') || 
     query.toLowerCase().includes('documents') ||
     query.toLowerCase().includes('process'));
  
  if (needsClarification) {
    res.json({
      needsClarification: true,
      questions: [
        {
          id: 'data_source',
          question: '¿De dónde vendrán los datos que necesitas procesar?',
          options: [
            { value: 'pdf', label: 'Archivos PDF', popular: true },
            { value: 'web', label: 'Páginas web', popular: false },
            { value: 'database', label: 'Base de datos SQL', popular: false },
            { value: 'api', label: 'APIs externas', popular: false },
            { value: 'csv', label: 'Archivos Excel/CSV', popular: true }
          ],
          multiSelect: true,
          required: true
        }
      ],
      suggestions: [
        {
          id: 'doc-analyzer',
          title: 'PDF Document Analyzer',
          description: 'Extract and analyze information from PDF documents',
          similarity: 85
        }
      ],
      metadata: {
        generationTime: Date.now(),
        similarCasesFound: 1
      }
    });
  } else {
    // Generar flujo simulado
    res.json({
      flowId: `flow_${Date.now()}`,
      flow: {
        nodes: [
          { id: '1', type: 'pdfLoader', data: { label: 'PDF Loader' } },
          { id: '2', type: 'textSplitter', data: { label: 'Text Splitter' } },
          { id: '3', type: 'chatModel', data: { label: 'GPT-4' } }
        ],
        edges: [
          { source: '1', target: '2' },
          { source: '2', target: '3' }
        ]
      },
      explanation: 'Generated a document analysis flow with PDF loading and AI processing',
      estimatedCost: 0.05,
      estimatedLatency: 3000,
      confidence: 0.85,
      metadata: {
        generationTime: Date.now(),
        componentsUsed: ['pdfLoader', 'textSplitter', 'chatModel'],
        modelsSelected: ['gpt-4'],
        similarCasesFound: 1
      }
    });
  }
});

app.get('/api/v2/orchestrate/suggestions', (req, res) => {
  const { query } = req.query;
  
  if (!query) {
    return res.status(400).json({ error: 'Query parameter is required' });
  }
  
  res.json({
    suggestions: [
      {
        title: 'Customer Support Chatbot',
        description: '24/7 automated customer support',
        query: 'Create a chatbot for customer support',
        confidence: 92,
        tags: ['support', 'chatbot', 'faq']
      }
    ]
  });
});

app.post('/api/v2/orchestrate/feedback', (req, res) => {
  const { flowId, rating } = req.body;
  
  if (!flowId || !rating) {
    return res.status(400).json({ error: 'Flow ID and rating are required' });
  }
  
  res.json({ message: 'Feedback received successfully' });
});

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', version: 'v2', endpoints: [
    '/api/v2/orchestrate/templates',
    '/api/v2/orchestrate/orchestrate',
    '/api/v2/orchestrate/suggestions',
    '/api/v2/orchestrate/feedback'
  ]});
});

// Root endpoint
app.get('/', (req, res) => {
  res.json({ 
    message: 'NubemGenesis V2 Orchestrator',
    version: '2.0.0',
    features: ['RAG', 'Clarification', 'Templates', 'Feedback']
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`NubemGenesis V2 server running on port ${PORT}`);
  console.log(`Health check: http://localhost:${PORT}/health`);
});