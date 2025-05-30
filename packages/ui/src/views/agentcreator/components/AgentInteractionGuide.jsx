import React, { useState } from 'react'
import {
    Box,
    Typography,
    Card,
    CardContent,
    Stack,
    Tabs,
    Tab,
    Button,
    Paper,
    Chip,
    Alert,
    AlertTitle,
    List,
    ListItem,
    ListItemIcon,
    ListItemText,
    Divider,
    IconButton,
    Tooltip,
    Grid,
    TextField,
    Select,
    MenuItem,
    FormControl,
    InputLabel,
    Badge,
    Accordion,
    AccordionSummary,
    AccordionDetails
} from '@mui/material'
import {
    IconApi,
    IconBrandPython,
    IconBrandJavascript,
    IconTerminal2,
    IconWebhook,
    IconMessageCircle,
    IconCode,
    IconPlugConnected,
    IconChevronDown,
    IconCopy,
    IconCheck,
    IconInfoCircle,
    IconBrandTypescript,
    IconBrandReact,
    IconBrandNodejs,
    IconCloud,
    IconShieldCheck,
    IconRefresh,
    IconSettings,
    IconDatabase,
    IconBolt,
    IconTestPipe
} from '@tabler/icons-react'

// Components
import CodeBlock from '@/ui-component/markdown/CodeBlock'
import TestAgentInterface from './TestAgentInterface'

const TabPanel = ({ children, value, index, ...other }) => {
    return (
        <Box
            role="tabpanel"
            hidden={value !== index}
            id={`interaction-tabpanel-${index}`}
            aria-labelledby={`interaction-tab-${index}`}
            {...other}
        >
            {value === index && <Box sx={{ pt: 3 }}>{children}</Box>}
        </Box>
    )
}

const AgentInteractionGuide = ({ agent, showTestInterface = true }) => {
    const [activeTab, setActiveTab] = useState(0)
    const [selectedLanguage, setSelectedLanguage] = useState('curl')
    const [copied, setCopied] = useState({})
    const [showAdvanced, setShowAdvanced] = useState(false)

    const handleCopy = (text, field) => {
        navigator.clipboard.writeText(text)
        setCopied({ ...copied, [field]: true })
        setTimeout(() => setCopied({ ...copied, [field]: false }), 2000)
    }

    // Generate code examples based on agent configuration
    const generateCodeExample = (language) => {
        const baseUrl = agent.endpoint || `https://api.nubemgenesis.com/agents/${agent.id}`
        const apiKey = agent.apiKey || 'YOUR_API_KEY'

        const examples = {
            curl: `# Basic chat request
curl -X POST ${baseUrl}/chat \\
  -H "Authorization: Bearer ${apiKey}" \\
  -H "Content-Type: application/json" \\
  -d '{
    "message": "Hello, I need help with Windows 11",
    "sessionId": "user-123",
    "metadata": {
      "language": "en",
      "platform": "web"
    }
  }'

# Stream response
curl -X POST ${baseUrl}/chat/stream \\
  -H "Authorization: Bearer ${apiKey}" \\
  -H "Content-Type: application/json" \\
  -H "Accept: text/event-stream" \\
  -d '{
    "message": "How do I fix Error 0x80070005?",
    "sessionId": "user-123",
    "stream": true
  }'`,

            python: `import requests
import json
from typing import Dict, Any

class ${agent.name?.replace(/\s+/g, '')}Client:
    def __init__(self, api_key: str):
        self.api_key = api_key
        self.base_url = "${baseUrl}"
        self.headers = {
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json"
        }
    
    def chat(self, message: str, session_id: str, metadata: Dict[str, Any] = None) -> Dict:
        """Send a message to the agent and get a response"""
        data = {
            "message": message,
            "sessionId": session_id,
            "metadata": metadata or {}
        }
        
        response = requests.post(
            f"{self.base_url}/chat",
            json=data,
            headers=self.headers
        )
        response.raise_for_status()
        return response.json()
    
    def stream_chat(self, message: str, session_id: str):
        """Stream responses from the agent"""
        data = {
            "message": message,
            "sessionId": session_id,
            "stream": True
        }
        
        response = requests.post(
            f"{self.base_url}/chat/stream",
            json=data,
            headers=self.headers,
            stream=True
        )
        
        for line in response.iter_lines():
            if line:
                yield json.loads(line.decode('utf-8'))

# Usage example
client = ${agent.name?.replace(/\s+/g, '')}Client("${apiKey}")

# Simple chat
response = client.chat(
    "I'm having issues with Windows Update",
    "user-123",
    {"language": "en", "urgency": "high"}
)
print(response["message"])

# Streaming chat
for chunk in client.stream_chat("How to fix blue screen?", "user-123"):
    print(chunk["content"], end="", flush=True)`,

            javascript: `// Using Fetch API
class ${agent.name?.replace(/\s+/g, '')}Client {
  constructor(apiKey) {
    this.apiKey = apiKey;
    this.baseUrl = '${baseUrl}';
  }

  async chat(message, sessionId, metadata = {}) {
    const response = await fetch(`\${this.baseUrl}/chat`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer \${this.apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        message,
        sessionId,
        metadata
      })
    });

    if (!response.ok) {
      throw new Error(`API error: \${response.status}`);
    }

    return response.json();
  }

  async streamChat(message, sessionId, onChunk) {
    const response = await fetch(`\${this.baseUrl}/chat/stream`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer \${this.apiKey}`,
        'Content-Type': 'application/json',
        'Accept': 'text/event-stream'
      },
      body: JSON.stringify({
        message,
        sessionId,
        stream: true
      })
    });

    const reader = response.body.getReader();
    const decoder = new TextDecoder();

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      
      const chunk = decoder.decode(value);
      const lines = chunk.split('\\n');
      
      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const data = JSON.parse(line.slice(6));
          onChunk(data);
        }
      }
    }
  }
}

// Usage example
const client = new ${agent.name?.replace(/\s+/g, '')}Client('${apiKey}');

// Simple chat
const response = await client.chat(
  'My PC is running slow',
  'user-123',
  { language: 'en', platform: 'web' }
);
console.log(response.message);

// Streaming chat
await client.streamChat(
  'How to optimize Windows 11?',
  'user-123',
  (chunk) => {
    console.log(chunk.content);
  }
);`,

            typescript: `import axios, { AxiosInstance } from 'axios';

interface ChatRequest {
  message: string;
  sessionId: string;
  metadata?: Record<string, any>;
  stream?: boolean;
}

interface ChatResponse {
  message: string;
  sessionId: string;
  confidence: number;
  sources?: string[];
  metadata?: Record<string, any>;
}

class ${agent.name?.replace(/\s+/g, '')}Client {
  private api: AxiosInstance;

  constructor(apiKey: string) {
    this.api = axios.create({
      baseURL: '${baseUrl}',
      headers: {
        'Authorization': `Bearer \${apiKey}`,
        'Content-Type': 'application/json'
      }
    });
  }

  async chat(request: ChatRequest): Promise<ChatResponse> {
    const { data } = await this.api.post<ChatResponse>('/chat', request);
    return data;
  }

  async *streamChat(request: ChatRequest): AsyncGenerator<string> {
    const response = await this.api.post('/chat/stream', {
      ...request,
      stream: true
    }, {
      responseType: 'stream'
    });

    for await (const chunk of response.data) {
      const lines = chunk.toString().split('\\n');
      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const data = JSON.parse(line.slice(6));
          yield data.content;
        }
      }
    }
  }

  async getHistory(sessionId: string): Promise<any[]> {
    const { data } = await this.api.get(`/sessions/\${sessionId}/history`);
    return data;
  }

  async clearSession(sessionId: string): Promise<void> {
    await this.api.delete(`/sessions/\${sessionId}`);
  }
}

// Usage with error handling
const client = new ${agent.name?.replace(/\s+/g, '')}Client('${apiKey}');

try {
  const response = await client.chat({
    message: 'Windows 11 activation error',
    sessionId: 'user-123',
    metadata: {
      errorCode: '0xC004C003',
      systemInfo: {
        os: 'Windows 11 Pro',
        version: '22H2'
      }
    }
  });
  
  console.log('Agent response:', response.message);
  console.log('Confidence:', response.confidence);
} catch (error) {
  console.error('Error:', error.response?.data || error.message);
}`,

            react: `import React, { useState, useCallback } from 'react';
import axios from 'axios';

// Custom hook for agent interaction
const use${agent.name?.replace(/\s+/g, '')}Agent = (apiKey) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [messages, setMessages] = useState([]);

  const sendMessage = useCallback(async (message, sessionId) => {
    setLoading(true);
    setError(null);

    try {
      const response = await axios.post(
        '${baseUrl}/chat',
        {
          message,
          sessionId,
          metadata: { source: 'react-app' }
        },
        {
          headers: {
            'Authorization': `Bearer \${apiKey}`,
            'Content-Type': 'application/json'
          }
        }
      );

      const agentMessage = response.data;
      setMessages(prev => [...prev, 
        { role: 'user', content: message },
        { role: 'assistant', content: agentMessage.message }
      ]);

      return agentMessage;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [apiKey]);

  const clearChat = useCallback(() => {
    setMessages([]);
    setError(null);
  }, []);

  return { messages, loading, error, sendMessage, clearChat };
};

// React component example
const ${agent.name?.replace(/\s+/g, '')}Chat = ({ apiKey }) => {
  const [input, setInput] = useState('');
  const { messages, loading, error, sendMessage } = use${agent.name?.replace(/\s+/g, '')}Agent(apiKey);
  const sessionId = React.useMemo(() => `session-\${Date.now()}`, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!input.trim()) return;

    try {
      await sendMessage(input, sessionId);
      setInput('');
    } catch (error) {
      console.error('Failed to send message:', error);
    }
  };

  return (
    <div className="chat-container">
      <div className="messages">
        {messages.map((msg, idx) => (
          <div key={idx} className={`message \${msg.role}`}>
            <strong>{msg.role === 'user' ? 'You' : 'Agent'}:</strong>
            <p>{msg.content}</p>
          </div>
        ))}
        {loading && <div className="loading">Agent is typing...</div>}
        {error && <div className="error">Error: {error}</div>}
      </div>
      
      <form onSubmit={handleSubmit}>
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask your question..."
          disabled={loading}
        />
        <button type="submit" disabled={loading || !input.trim()}>
          Send
        </button>
      </form>
    </div>
  );
};

export default ${agent.name?.replace(/\s+/g, '')}Chat;`,

            webhook: `# Webhook Integration
# Configure your agent to send notifications to your webhook endpoint

# 1. Register your webhook
curl -X POST ${baseUrl}/webhooks \\
  -H "Authorization: Bearer ${apiKey}" \\
  -H "Content-Type: application/json" \\
  -d '{
    "url": "https://your-app.com/webhook/agent-events",
    "events": ["message.received", "session.started", "error.occurred"],
    "secret": "your-webhook-secret"
  }'

# 2. Your webhook endpoint (Node.js example)
const express = require('express');
const crypto = require('crypto');

app.post('/webhook/agent-events', (req, res) => {
  // Verify webhook signature
  const signature = req.headers['x-agent-signature'];
  const body = JSON.stringify(req.body);
  const expectedSignature = crypto
    .createHmac('sha256', 'your-webhook-secret')
    .update(body)
    .digest('hex');
  
  if (signature !== expectedSignature) {
    return res.status(401).send('Invalid signature');
  }

  // Process the event
  const { event, data } = req.body;
  
  switch (event) {
    case 'message.received':
      console.log('New message:', data.message);
      // Process user message
      break;
    
    case 'session.started':
      console.log('New session:', data.sessionId);
      // Initialize user session
      break;
    
    case 'error.occurred':
      console.error('Agent error:', data.error);
      // Handle error
      break;
  }
  
  res.status(200).send('OK');
});

# 3. Webhook payload examples
# Message received event:
{
  "event": "message.received",
  "timestamp": "2024-01-15T10:30:00Z",
  "data": {
    "sessionId": "user-123",
    "message": "How do I reset Windows password?",
    "metadata": {
      "language": "en",
      "platform": "web"
    }
  }
}

# Error event:
{
  "event": "error.occurred",
  "timestamp": "2024-01-15T10:31:00Z",
  "data": {
    "sessionId": "user-123",
    "error": "Rate limit exceeded",
    "code": "RATE_LIMIT_ERROR"
  }
}`,

            chatflow: `# Integration with NubemGenesis Chatflows

# 1. Create a custom node for your agent
const { INode, INodeData, INodeParams } = require('flowise-components');

class ${agent.name?.replace(/\s+/g, '')}Node implements INode {
  label = '${agent.name}';
  name = '${agent.name?.toLowerCase().replace(/\s+/g, '')}';
  type = 'Agent';
  icon = 'agent.svg';
  category = 'Agents';
  description = '${agent.description || "Custom AI Agent"}';
  baseClasses = ['Agent'];
  
  inputs = [
    {
      label: 'API Key',
      name: 'apiKey',
      type: 'password',
      placeholder: 'Enter your agent API key'
    },
    {
      label: 'Session ID',
      name: 'sessionId',
      type: 'string',
      placeholder: 'user-123',
      optional: true
    }
  ];
  
  async init(nodeData: INodeData): Promise<any> {
    const apiKey = nodeData.inputs?.apiKey;
    const sessionId = nodeData.inputs?.sessionId || \`session-\${Date.now()}\`;
    
    return {
      invoke: async (input: string) => {
        const response = await fetch('${baseUrl}/chat', {
          method: 'POST',
          headers: {
            'Authorization': \`Bearer \${apiKey}\`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            message: input,
            sessionId
          })
        });
        
        const data = await response.json();
        return data.message;
      }
    };
  }
}

# 2. Use in a chatflow
{
  "nodes": [
    {
      "id": "agent_1",
      "type": "${agent.name?.toLowerCase().replace(/\s+/g, '')}",
      "data": {
        "apiKey": "${apiKey}",
        "sessionId": "{{flow.sessionId}}"
      }
    },
    {
      "id": "chain_1",
      "type": "conversationChain",
      "data": {
        "agent": "{{agent_1.output}}"
      }
    }
  ]
}`
        };

        return examples[language] || examples.curl;
    };

    return (
        <Box sx={{ width: '100%' }}>
            <Typography variant="h5" gutterBottom sx={{ mb: 3 }}>
                How to Use Your Agent
            </Typography>

            {/* Quick Overview */}
            <Alert severity="info" sx={{ mb: 3 }}>
                <AlertTitle>Quick Start</AlertTitle>
                Your agent is ready to use via REST API, webhooks, or direct integration. 
                {agent.name && `The ${agent.name} agent `}
                can be accessed using the endpoint and API key provided.
            </Alert>

            {/* Test Interface */}
            {showTestInterface && (
                <Card sx={{ mb: 3 }}>
                    <CardContent>
                        <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 2 }}>
                            <IconTestPipe />
                            <Typography variant="h6">Test Your Agent</Typography>
                            <Chip label="Live" color="success" size="small" />
                        </Stack>
                        <TestAgentInterface agent={agent} />
                    </CardContent>
                </Card>
            )}

            {/* Integration Methods */}
            <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
                <Tabs value={activeTab} onChange={(e, v) => setActiveTab(v)} variant="scrollable" scrollButtons="auto">
                    <Tab icon={<IconApi />} label="REST API" />
                    <Tab icon={<IconCode />} label="SDK Examples" />
                    <Tab icon={<IconWebhook />} label="Webhooks" />
                    <Tab icon={<IconPlugConnected />} label="Integrations" />
                    <Tab icon={<IconSettings />} label="Advanced" />
                </Tabs>
            </Box>

            {/* REST API Tab */}
            <TabPanel value={activeTab} index={0}>
                <Grid container spacing={3}>
                    <Grid item xs={12}>
                        <Typography variant="h6" gutterBottom>
                            REST API Documentation
                        </Typography>
                        <Typography variant="body2" color="text.secondary" paragraph>
                            Use HTTP requests to interact with your agent from any platform or programming language.
                        </Typography>
                    </Grid>

                    {/* API Endpoints */}
                    <Grid item xs={12}>
                        <Paper variant="outlined" sx={{ p: 2 }}>
                            <Typography variant="subtitle1" gutterBottom>
                                Available Endpoints
                            </Typography>
                            <List dense>
                                <ListItem>
                                    <ListItemIcon><IconMessageCircle size={20} /></ListItemIcon>
                                    <ListItemText 
                                        primary="POST /chat" 
                                        secondary="Send a message and receive a response"
                                    />
                                </ListItem>
                                <ListItem>
                                    <ListItemIcon><IconBolt size={20} /></ListItemIcon>
                                    <ListItemText 
                                        primary="POST /chat/stream" 
                                        secondary="Stream responses in real-time"
                                    />
                                </ListItem>
                                <ListItem>
                                    <ListItemIcon><IconDatabase size={20} /></ListItemIcon>
                                    <ListItemText 
                                        primary="GET /sessions/{id}/history" 
                                        secondary="Retrieve conversation history"
                                    />
                                </ListItem>
                                <ListItem>
                                    <ListItemIcon><IconRefresh size={20} /></ListItemIcon>
                                    <ListItemText 
                                        primary="DELETE /sessions/{id}" 
                                        secondary="Clear session data"
                                    />
                                </ListItem>
                            </List>
                        </Paper>
                    </Grid>

                    {/* Code Example */}
                    <Grid item xs={12}>
                        <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 1 }}>
                            <FormControl size="small" sx={{ minWidth: 120 }}>
                                <InputLabel>Language</InputLabel>
                                <Select
                                    value={selectedLanguage}
                                    label="Language"
                                    onChange={(e) => setSelectedLanguage(e.target.value)}
                                >
                                    <MenuItem value="curl">cURL</MenuItem>
                                    <MenuItem value="python">Python</MenuItem>
                                    <MenuItem value="javascript">JavaScript</MenuItem>
                                    <MenuItem value="typescript">TypeScript</MenuItem>
                                </Select>
                            </FormControl>
                            <Tooltip title={copied.apiExample ? "Copied!" : "Copy code"}>
                                <IconButton 
                                    size="small"
                                    onClick={() => handleCopy(generateCodeExample(selectedLanguage), 'apiExample')}
                                >
                                    {copied.apiExample ? <IconCheck /> : <IconCopy />}
                                </IconButton>
                            </Tooltip>
                        </Stack>
                        <CodeBlock language={selectedLanguage === 'curl' ? 'bash' : selectedLanguage}>
                            {generateCodeExample(selectedLanguage)}
                        </CodeBlock>
                    </Grid>

                    {/* Authentication */}
                    <Grid item xs={12}>
                        <Accordion>
                            <AccordionSummary expandIcon={<IconChevronDown />}>
                                <Stack direction="row" spacing={1} alignItems="center">
                                    <IconShieldCheck />
                                    <Typography>Authentication</Typography>
                                </Stack>
                            </AccordionSummary>
                            <AccordionDetails>
                                <Typography variant="body2" paragraph>
                                    All API requests must include your API key in the Authorization header:
                                </Typography>
                                <CodeBlock language="http">
                                    {`Authorization: Bearer ${agent.apiKey || 'YOUR_API_KEY'}`}
                                </CodeBlock>
                                <Alert severity="warning" sx={{ mt: 2 }}>
                                    Keep your API key secure and never expose it in client-side code.
                                </Alert>
                            </AccordionDetails>
                        </Accordion>
                    </Grid>
                </Grid>
            </TabPanel>

            {/* SDK Examples Tab */}
            <TabPanel value={activeTab} index={1}>
                <Grid container spacing={3}>
                    <Grid item xs={12}>
                        <Typography variant="h6" gutterBottom>
                            SDK Integration Examples
                        </Typography>
                        <Typography variant="body2" color="text.secondary" paragraph>
                            Ready-to-use code examples for popular frameworks and languages.
                        </Typography>
                    </Grid>

                    {/* Framework Examples */}
                    <Grid item xs={12} md={6}>
                        <Card>
                            <CardContent>
                                <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 2 }}>
                                    <IconBrandReact />
                                    <Typography variant="h6">React Integration</Typography>
                                </Stack>
                                <Typography variant="body2" color="text.secondary" paragraph>
                                    Custom React hook and component for seamless integration.
                                </Typography>
                                <Button 
                                    variant="outlined" 
                                    size="small"
                                    onClick={() => {
                                        setSelectedLanguage('react');
                                        setActiveTab(0);
                                    }}
                                >
                                    View Code
                                </Button>
                            </CardContent>
                        </Card>
                    </Grid>

                    <Grid item xs={12} md={6}>
                        <Card>
                            <CardContent>
                                <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 2 }}>
                                    <IconBrandNodejs />
                                    <Typography variant="h6">Node.js Client</Typography>
                                </Stack>
                                <Typography variant="body2" color="text.secondary" paragraph>
                                    Full-featured Node.js client with TypeScript support.
                                </Typography>
                                <Button 
                                    variant="outlined" 
                                    size="small"
                                    onClick={() => {
                                        setSelectedLanguage('typescript');
                                        setActiveTab(0);
                                    }}
                                >
                                    View Code
                                </Button>
                            </CardContent>
                        </Card>
                    </Grid>

                    <Grid item xs={12} md={6}>
                        <Card>
                            <CardContent>
                                <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 2 }}>
                                    <IconBrandPython />
                                    <Typography variant="h6">Python SDK</Typography>
                                </Stack>
                                <Typography variant="body2" color="text.secondary" paragraph>
                                    Python client with async support and error handling.
                                </Typography>
                                <Button 
                                    variant="outlined" 
                                    size="small"
                                    onClick={() => {
                                        setSelectedLanguage('python');
                                        setActiveTab(0);
                                    }}
                                >
                                    View Code
                                </Button>
                            </CardContent>
                        </Card>
                    </Grid>

                    <Grid item xs={12} md={6}>
                        <Card>
                            <CardContent>
                                <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 2 }}>
                                    <IconPlugConnected />
                                    <Typography variant="h6">Chatflow Integration</Typography>
                                </Stack>
                                <Typography variant="body2" color="text.secondary" paragraph>
                                    Use your agent as a node in NubemGenesis chatflows.
                                </Typography>
                                <Button 
                                    variant="outlined" 
                                    size="small"
                                    onClick={() => {
                                        setSelectedLanguage('chatflow');
                                        setActiveTab(0);
                                    }}
                                >
                                    View Code
                                </Button>
                            </CardContent>
                        </Card>
                    </Grid>
                </Grid>
            </TabPanel>

            {/* Webhooks Tab */}
            <TabPanel value={activeTab} index={2}>
                <Grid container spacing={3}>
                    <Grid item xs={12}>
                        <Typography variant="h6" gutterBottom>
                            Webhook Integration
                        </Typography>
                        <Typography variant="body2" color="text.secondary" paragraph>
                            Receive real-time notifications when events occur in your agent.
                        </Typography>
                    </Grid>

                    <Grid item xs={12}>
                        <CodeBlock language="bash">
                            {generateCodeExample('webhook')}
                        </CodeBlock>
                    </Grid>

                    <Grid item xs={12}>
                        <Paper variant="outlined" sx={{ p: 2 }}>
                            <Typography variant="subtitle1" gutterBottom>
                                Available Events
                            </Typography>
                            <Grid container spacing={2}>
                                <Grid item xs={12} sm={6} md={4}>
                                    <Chip label="message.received" size="small" />
                                    <Typography variant="caption" display="block">
                                        When a user sends a message
                                    </Typography>
                                </Grid>
                                <Grid item xs={12} sm={6} md={4}>
                                    <Chip label="message.sent" size="small" />
                                    <Typography variant="caption" display="block">
                                        When agent responds
                                    </Typography>
                                </Grid>
                                <Grid item xs={12} sm={6} md={4}>
                                    <Chip label="session.started" size="small" />
                                    <Typography variant="caption" display="block">
                                        New conversation begins
                                    </Typography>
                                </Grid>
                                <Grid item xs={12} sm={6} md={4}>
                                    <Chip label="session.ended" size="small" />
                                    <Typography variant="caption" display="block">
                                        Conversation ends
                                    </Typography>
                                </Grid>
                                <Grid item xs={12} sm={6} md={4}>
                                    <Chip label="error.occurred" size="small" />
                                    <Typography variant="caption" display="block">
                                        Processing error
                                    </Typography>
                                </Grid>
                                <Grid item xs={12} sm={6} md={4}>
                                    <Chip label="feedback.received" size="small" />
                                    <Typography variant="caption" display="block">
                                        User provides feedback
                                    </Typography>
                                </Grid>
                            </Grid>
                        </Paper>
                    </Grid>
                </Grid>
            </TabPanel>

            {/* Integrations Tab */}
            <TabPanel value={activeTab} index={3}>
                <Grid container spacing={3}>
                    <Grid item xs={12}>
                        <Typography variant="h6" gutterBottom>
                            Platform Integrations
                        </Typography>
                        <Typography variant="body2" color="text.secondary" paragraph>
                            Connect your agent to popular platforms and services.
                        </Typography>
                    </Grid>

                    {/* Integration Options */}
                    <Grid item xs={12} md={6}>
                        <List>
                            <ListItem>
                                <ListItemIcon><IconMessageCircle /></ListItemIcon>
                                <ListItemText 
                                    primary="Slack Integration"
                                    secondary="Add your agent as a Slack bot"
                                />
                                <Button size="small">Setup</Button>
                            </ListItem>
                            <Divider />
                            <ListItem>
                                <ListItemIcon><IconMessageCircle /></ListItemIcon>
                                <ListItemText 
                                    primary="Discord Bot"
                                    secondary="Deploy as a Discord bot"
                                />
                                <Button size="small">Setup</Button>
                            </ListItem>
                            <Divider />
                            <ListItem>
                                <ListItemIcon><IconMessageCircle /></ListItemIcon>
                                <ListItemText 
                                    primary="WhatsApp Business"
                                    secondary="Connect to WhatsApp Business API"
                                />
                                <Button size="small">Setup</Button>
                            </ListItem>
                        </List>
                    </Grid>

                    <Grid item xs={12} md={6}>
                        <List>
                            <ListItem>
                                <ListItemIcon><IconCloud /></ListItemIcon>
                                <ListItemText 
                                    primary="Zapier Integration"
                                    secondary="Connect to 5000+ apps via Zapier"
                                />
                                <Button size="small">Setup</Button>
                            </ListItem>
                            <Divider />
                            <ListItem>
                                <ListItemIcon><IconPlugConnected /></ListItemIcon>
                                <ListItemText 
                                    primary="WordPress Plugin"
                                    secondary="Add chat widget to WordPress sites"
                                />
                                <Button size="small">Download</Button>
                            </ListItem>
                            <Divider />
                            <ListItem>
                                <ListItemIcon><IconCode /></ListItemIcon>
                                <ListItemText 
                                    primary="Custom Widget"
                                    secondary="Embed chat widget on any website"
                                />
                                <Button size="small">Get Code</Button>
                            </ListItem>
                        </List>
                    </Grid>
                </Grid>
            </TabPanel>

            {/* Advanced Tab */}
            <TabPanel value={activeTab} index={4}>
                <Grid container spacing={3}>
                    <Grid item xs={12}>
                        <Typography variant="h6" gutterBottom>
                            Advanced Configuration
                        </Typography>
                    </Grid>

                    {/* Rate Limiting */}
                    <Grid item xs={12}>
                        <Accordion>
                            <AccordionSummary expandIcon={<IconChevronDown />}>
                                <Typography>Rate Limiting & Quotas</Typography>
                            </AccordionSummary>
                            <AccordionDetails>
                                <List dense>
                                    <ListItem>
                                        <ListItemText 
                                            primary="API Rate Limit"
                                            secondary={`${agent.rateLimit || '100'} requests per minute`}
                                        />
                                    </ListItem>
                                    <ListItem>
                                        <ListItemText 
                                            primary="Monthly Quota"
                                            secondary={`${agent.monthlyQuota || '10,000'} messages per month`}
                                        />
                                    </ListItem>
                                    <ListItem>
                                        <ListItemText 
                                            primary="Concurrent Sessions"
                                            secondary={`Up to ${agent.maxSessions || '50'} concurrent sessions`}
                                        />
                                    </ListItem>
                                </List>
                            </AccordionDetails>
                        </Accordion>
                    </Grid>

                    {/* Error Handling */}
                    <Grid item xs={12}>
                        <Accordion>
                            <AccordionSummary expandIcon={<IconChevronDown />}>
                                <Typography>Error Handling</Typography>
                            </AccordionSummary>
                            <AccordionDetails>
                                <Typography variant="body2" paragraph>
                                    Common error codes and how to handle them:
                                </Typography>
                                <CodeBlock language="javascript">
{`// Error response format
{
  "error": {
    "code": "RATE_LIMIT_EXCEEDED",
    "message": "Too many requests. Please retry after 60 seconds.",
    "retryAfter": 60
  }
}

// Error codes:
// 400 - Bad Request (invalid parameters)
// 401 - Unauthorized (invalid API key)
// 403 - Forbidden (quota exceeded)
// 429 - Too Many Requests (rate limited)
// 500 - Internal Server Error
// 503 - Service Unavailable`}
                                </CodeBlock>
                            </AccordionDetails>
                        </Accordion>
                    </Grid>

                    {/* Custom Configuration */}
                    <Grid item xs={12}>
                        <Accordion>
                            <AccordionSummary expandIcon={<IconChevronDown />}>
                                <Typography>Custom Parameters</Typography>
                            </AccordionSummary>
                            <AccordionDetails>
                                <Typography variant="body2" paragraph>
                                    You can customize agent behavior with these parameters:
                                </Typography>
                                <CodeBlock language="json">
{`{
  "message": "Your question here",
  "sessionId": "unique-session-id",
  "options": {
    "temperature": 0.7,        // Response creativity (0-1)
    "maxTokens": 500,          // Maximum response length
    "language": "en",          // Response language
    "tone": "professional",    // Response tone
    "streaming": true,         // Enable streaming
    "includeSourcess": true,    // Include source references
    "timeout": 30000           // Request timeout (ms)
  },
  "context": {
    "previousMessages": 5,     // Number of previous messages to include
    "userProfile": {           // Optional user context
      "expertise": "beginner",
      "preferences": ["detailed_explanations"]
    }
  }
}`}
                                </CodeBlock>
                            </AccordionDetails>
                        </Accordion>
                    </Grid>
                </Grid>
            </TabPanel>
        </Box>
    )
}

export default AgentInteractionGuide