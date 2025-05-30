# Agent Interaction Guide - NubemGenesis

This guide provides comprehensive instructions on how to interact with AI agents created in NubemGenesis after deployment.

## Table of Contents

1. [Quick Start](#quick-start)
2. [Authentication](#authentication)
3. [API Endpoints](#api-endpoints)
4. [Integration Methods](#integration-methods)
5. [SDK Examples](#sdk-examples)
6. [Webhook Integration](#webhook-integration)
7. [Testing Your Agent](#testing-your-agent)
8. [Advanced Features](#advanced-features)
9. [Troubleshooting](#troubleshooting)

## Quick Start

After creating an agent, you'll receive:
- **API Endpoint**: `https://api.nubemgenesis.com/agents/{agent-id}`
- **API Key**: A secure key for authentication
- **Agent ID**: Unique identifier for your agent

### Your First API Call

```bash
curl -X POST https://api.nubemgenesis.com/agents/{agent-id}/chat \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "message": "Hello, I need help!",
    "sessionId": "user-123"
  }'
```

## Authentication

All API requests require authentication using your API key:

```http
Authorization: Bearer YOUR_API_KEY
```

**Security Best Practices:**
- Never expose your API key in client-side code
- Use environment variables to store keys
- Regenerate keys periodically
- Implement IP whitelisting for production

## API Endpoints

### 1. Chat Endpoint

**POST** `/agents/{agent-id}/chat`

Send a message and receive a response.

```json
{
  "message": "How do I reset my Windows password?",
  "sessionId": "user-123",
  "metadata": {
    "language": "en",
    "platform": "web"
  }
}
```

**Response:**
```json
{
  "message": "Here's how to reset your Windows password...",
  "sessionId": "user-123",
  "confidence": 0.95,
  "sources": ["knowledge-base-1", "knowledge-base-2"],
  "metadata": {
    "processingTime": 234,
    "tokensUsed": 150
  }
}
```

### 2. Streaming Chat Endpoint

**POST** `/agents/{agent-id}/chat/stream`

Receive responses in real-time using Server-Sent Events.

```javascript
const eventSource = new EventSource(
  'https://api.nubemgenesis.com/agents/{agent-id}/chat/stream',
  {
    headers: {
      'Authorization': 'Bearer YOUR_API_KEY'
    }
  }
);

eventSource.onmessage = (event) => {
  const data = JSON.parse(event.data);
  console.log(data.content); // Streaming content
};
```

### 3. Session Management

**GET** `/agents/{agent-id}/sessions/{session-id}/history`

Retrieve conversation history.

**DELETE** `/agents/{agent-id}/sessions/{session-id}`

Clear session data.

### 4. Health Check

**GET** `/agents/{agent-id}/health`

Check agent status and availability.

## Integration Methods

### 1. Direct API Integration

Use HTTP clients in any programming language:

#### Python Example
```python
import requests

class AgentClient:
    def __init__(self, agent_id, api_key):
        self.agent_id = agent_id
        self.api_key = api_key
        self.base_url = f"https://api.nubemgenesis.com/agents/{agent_id}"
        self.headers = {
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json"
        }
    
    def chat(self, message, session_id):
        response = requests.post(
            f"{self.base_url}/chat",
            json={"message": message, "sessionId": session_id},
            headers=self.headers
        )
        return response.json()

# Usage
client = AgentClient("agent-123", "your-api-key")
response = client.chat("Hello!", "session-456")
print(response["message"])
```

#### Node.js Example
```javascript
const axios = require('axios');

class AgentClient {
  constructor(agentId, apiKey) {
    this.agentId = agentId;
    this.apiKey = apiKey;
    this.baseUrl = `https://api.nubemgenesis.com/agents/${agentId}`;
  }

  async chat(message, sessionId) {
    const response = await axios.post(
      `${this.baseUrl}/chat`,
      { message, sessionId },
      {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json'
        }
      }
    );
    return response.data;
  }
}

// Usage
const client = new AgentClient('agent-123', 'your-api-key');
const response = await client.chat('Hello!', 'session-456');
console.log(response.message);
```

### 2. React Integration

Custom React hook for agent interaction:

```jsx
import { useState, useCallback } from 'react';
import axios from 'axios';

const useAgent = (agentId, apiKey) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const sendMessage = useCallback(async (message, sessionId) => {
    setLoading(true);
    setError(null);

    try {
      const response = await axios.post(
        `https://api.nubemgenesis.com/agents/${agentId}/chat`,
        { message, sessionId },
        {
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json'
          }
        }
      );
      return response.data;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [agentId, apiKey]);

  return { sendMessage, loading, error };
};

// Component usage
function ChatComponent() {
  const { sendMessage, loading, error } = useAgent('agent-123', 'your-api-key');
  const [messages, setMessages] = useState([]);

  const handleSend = async (message) => {
    const response = await sendMessage(message, 'session-456');
    setMessages([...messages, 
      { role: 'user', content: message },
      { role: 'assistant', content: response.message }
    ]);
  };

  return (
    <div>
      {/* Chat UI */}
    </div>
  );
}
```

### 3. WebSocket Integration (Coming Soon)

For real-time bidirectional communication:

```javascript
const ws = new WebSocket('wss://api.nubemgenesis.com/agents/{agent-id}/ws');

ws.onopen = () => {
  ws.send(JSON.stringify({
    type: 'auth',
    apiKey: 'YOUR_API_KEY'
  }));
};

ws.onmessage = (event) => {
  const data = JSON.parse(event.data);
  console.log('Agent response:', data);
};
```

## SDK Examples

### TypeScript SDK

```typescript
import { NubemGenesisAgent } from '@nubemgenesis/sdk';

interface ChatOptions {
  temperature?: number;
  maxTokens?: number;
  language?: string;
}

class AgentSDK {
  private agent: NubemGenesisAgent;

  constructor(agentId: string, apiKey: string) {
    this.agent = new NubemGenesisAgent({
      agentId,
      apiKey,
      baseUrl: 'https://api.nubemgenesis.com'
    });
  }

  async chat(message: string, sessionId: string, options?: ChatOptions) {
    return await this.agent.chat({
      message,
      sessionId,
      ...options
    });
  }

  async streamChat(
    message: string, 
    sessionId: string, 
    onChunk: (chunk: string) => void
  ) {
    return await this.agent.streamChat({
      message,
      sessionId,
      onChunk
    });
  }
}
```

## Webhook Integration

### Setting Up Webhooks

1. Register your webhook endpoint:

```bash
curl -X POST https://api.nubemgenesis.com/agents/{agent-id}/webhooks \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://your-app.com/webhook",
    "events": ["message.received", "session.started"],
    "secret": "your-webhook-secret"
  }'
```

2. Handle webhook events:

```javascript
app.post('/webhook', (req, res) => {
  // Verify signature
  const signature = req.headers['x-nubemgenesis-signature'];
  const expectedSignature = crypto
    .createHmac('sha256', 'your-webhook-secret')
    .update(JSON.stringify(req.body))
    .digest('hex');
  
  if (signature !== expectedSignature) {
    return res.status(401).send('Invalid signature');
  }

  // Process event
  const { event, data } = req.body;
  
  switch (event) {
    case 'message.received':
      console.log('New message:', data.message);
      break;
    case 'session.started':
      console.log('New session:', data.sessionId);
      break;
  }
  
  res.status(200).send('OK');
});
```

### Available Webhook Events

- `message.received` - User sends a message
- `message.sent` - Agent responds
- `session.started` - New conversation begins
- `session.ended` - Conversation ends
- `error.occurred` - Processing error
- `feedback.received` - User provides feedback

## Testing Your Agent

### Using the Built-in Test Interface

1. Navigate to your agent dashboard
2. Click "Test Agent" button
3. Start chatting with your agent
4. Monitor response times and confidence scores

### Automated Testing

```javascript
const { expect } = require('chai');
const AgentClient = require('./agent-client');

describe('Agent Tests', () => {
  const client = new AgentClient('agent-123', process.env.API_KEY);
  
  it('should respond to greetings', async () => {
    const response = await client.chat('Hello!', 'test-session');
    expect(response.message).to.include('Hello');
    expect(response.confidence).to.be.above(0.8);
  });
  
  it('should handle complex queries', async () => {
    const response = await client.chat(
      'How do I fix Windows update error 0x80070005?',
      'test-session'
    );
    expect(response.message).to.include('permission');
    expect(response.sources).to.have.lengthOf.above(0);
  });
});
```

## Advanced Features

### 1. Custom Parameters

```json
{
  "message": "Explain quantum computing",
  "sessionId": "user-123",
  "options": {
    "temperature": 0.7,
    "maxTokens": 500,
    "language": "es",
    "tone": "professional",
    "includeSources": true
  }
}
```

### 2. Context Management

```json
{
  "message": "Continue from where we left off",
  "sessionId": "user-123",
  "context": {
    "previousMessages": 5,
    "userProfile": {
      "expertise": "beginner",
      "preferences": ["visual_examples"]
    }
  }
}
```

### 3. Multi-Modal Support (Beta)

```json
{
  "message": "What's in this screenshot?",
  "sessionId": "user-123",
  "attachments": [{
    "type": "image",
    "url": "https://example.com/screenshot.png"
  }]
}
```

## Rate Limiting and Quotas

- **Default Rate Limit**: 100 requests per minute
- **Monthly Quota**: Based on your subscription plan
- **Concurrent Sessions**: Up to 50 simultaneous conversations

### Handling Rate Limits

```javascript
const rateLimitedClient = {
  async chat(message, sessionId, retries = 3) {
    for (let i = 0; i < retries; i++) {
      try {
        return await client.chat(message, sessionId);
      } catch (error) {
        if (error.response?.status === 429) {
          const retryAfter = error.response.headers['retry-after'] || 60;
          console.log(`Rate limited. Retrying after ${retryAfter}s`);
          await new Promise(resolve => setTimeout(resolve, retryAfter * 1000));
        } else {
          throw error;
        }
      }
    }
  }
};
```

## Error Handling

### Common Error Codes

- `400` - Bad Request (invalid parameters)
- `401` - Unauthorized (invalid API key)
- `403` - Forbidden (quota exceeded)
- `404` - Agent not found
- `429` - Too Many Requests (rate limited)
- `500` - Internal Server Error
- `503` - Service Unavailable

### Error Response Format

```json
{
  "error": {
    "code": "RATE_LIMIT_EXCEEDED",
    "message": "Too many requests. Please retry after 60 seconds.",
    "retryAfter": 60
  }
}
```

## Platform Integrations

### Slack Integration

```javascript
const { App } = require('@slack/bolt');
const AgentClient = require('./agent-client');

const app = new App({
  token: process.env.SLACK_BOT_TOKEN,
  signingSecret: process.env.SLACK_SIGNING_SECRET
});

const agent = new AgentClient('agent-123', process.env.AGENT_API_KEY);

app.message(async ({ message, say }) => {
  const response = await agent.chat(message.text, message.user);
  await say(response.message);
});
```

### Discord Bot

```javascript
const Discord = require('discord.js');
const AgentClient = require('./agent-client');

const client = new Discord.Client();
const agent = new AgentClient('agent-123', process.env.AGENT_API_KEY);

client.on('message', async (message) => {
  if (message.author.bot) return;
  
  const response = await agent.chat(
    message.content, 
    message.author.id
  );
  
  message.reply(response.message);
});
```

### WordPress Plugin

```php
<?php
class NubemGenesisAgent {
    private $agentId;
    private $apiKey;
    
    public function __construct($agentId, $apiKey) {
        $this->agentId = $agentId;
        $this->apiKey = $apiKey;
    }
    
    public function chat($message, $sessionId) {
        $url = "https://api.nubemgenesis.com/agents/{$this->agentId}/chat";
        
        $response = wp_remote_post($url, array(
            'headers' => array(
                'Authorization' => 'Bearer ' . $this->apiKey,
                'Content-Type' => 'application/json'
            ),
            'body' => json_encode(array(
                'message' => $message,
                'sessionId' => $sessionId
            ))
        ));
        
        return json_decode(wp_remote_retrieve_body($response), true);
    }
}
?>
```

## Troubleshooting

### Common Issues

1. **Authentication Errors**
   - Verify API key is correct
   - Check key hasn't expired
   - Ensure proper header format

2. **Empty Responses**
   - Check agent is deployed
   - Verify endpoint URL
   - Review agent configuration

3. **Slow Response Times**
   - Monitor rate limits
   - Check network latency
   - Consider using streaming API

4. **Session Issues**
   - Use consistent session IDs
   - Clear old sessions periodically
   - Handle session timeouts

### Debug Mode

Enable debug mode for detailed information:

```json
{
  "message": "Debug this issue",
  "sessionId": "user-123",
  "debug": true
}
```

## Best Practices

1. **Session Management**
   - Use meaningful session IDs
   - Implement session timeout handling
   - Clear sessions after conversations

2. **Error Handling**
   - Implement retry logic
   - Log errors for debugging
   - Provide fallback responses

3. **Performance**
   - Cache frequently used responses
   - Use streaming for long responses
   - Implement request batching

4. **Security**
   - Store API keys securely
   - Implement request signing
   - Use HTTPS always
   - Validate webhook signatures

## Support and Resources

- **Documentation**: https://docs.nubemgenesis.com
- **API Reference**: https://api.nubemgenesis.com/docs
- **Community Forum**: https://community.nubemgenesis.com
- **Support Email**: support@nubemgenesis.com
- **Status Page**: https://status.nubemgenesis.com

## Example Projects

1. **Customer Support Bot**: Full implementation with Slack integration
2. **WordPress Chatbot**: Plugin for WordPress sites
3. **React Chat Widget**: Embeddable chat component
4. **Python CLI Tool**: Command-line agent interface
5. **Mobile SDK**: iOS and Android integration examples

Visit our [GitHub repository](https://github.com/nubemgenesis/examples) for complete code examples and starter templates.