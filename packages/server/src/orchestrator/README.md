# 🤖 NubemGenesis Intelligent Orchestration System

## Overview

The NubemGenesis Orchestration System is an advanced AI layer that automatically interprets user requests in natural language and generates optimized agent flows. It acts as a meta-orchestrator that understands all available capabilities in the system and creates the most suitable AI workflows.

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     User Request (Natural Language)          │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│                      Meta-Orchestrator                       │
│  ┌─────────────┐  ┌──────────────┐  ┌─────────────────┐   │
│  │   Intent    │  │  Capability  │  │   LiteLLM       │   │
│  │ Interpreter │──│   Analyzer   │──│    Router       │   │
│  └─────────────┘  └──────────────┘  └─────────────────┘   │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│                      Flow Generator                          │
│  ┌─────────────┐  ┌──────────────┐  ┌─────────────────┐   │
│  │   Simple    │  │    Agent     │  │  Multi-Agent    │   │
│  │   Flows     │  │    Flows     │  │     Flows       │   │
│  └─────────────┘  └──────────────┘  └─────────────────┘   │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│                   Security & Execution                       │
│  ┌─────────────┐  ┌──────────────┐  ┌─────────────────┐   │
│  │  Sandbox    │  │  Evaluation  │  │   Monitoring    │   │
│  │  (VM/Docker)│  │   Pipeline   │  │   & Logging     │   │
│  └─────────────┘  └──────────────┘  └─────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

## Components

### 1. **Meta-Orchestrator** (`MetaOrchestrator.ts`)
The central intelligence that processes user requests and coordinates the entire flow generation process.

**Key Features:**
- Natural language understanding
- Intent interpretation
- Component selection
- Model routing
- Flow optimization

### 2. **Capability Analyzer** (`CapabilityAnalyzer.ts`)
Dynamically scans and catalogs all available components in the system.

**Features:**
- Auto-discovery of nodes
- Semantic search
- Feature indexing
- Performance tracking

### 3. **Flow Generator** (`FlowGenerator.ts`)
Converts orchestration requirements into executable Flowise flows.

**Supports:**
- Simple conversational flows
- Chain-based workflows
- Single agent flows
- Multi-agent systems

### 4. **LiteLLM Router** (`LiteLLMRouter.ts`)
Unified interface for routing requests across multiple LLM providers.

**Capabilities:**
- Multi-model support (OpenAI, Anthropic, Google, Mistral, etc.)
- Intelligent model selection
- Cost optimization
- Fallback handling
- Performance tracking

### 5. **Evaluation Pipeline** (`EvaluationPipeline.ts`)
Automated testing and benchmarking system for models and tools.

**Features:**
- Standardized benchmarks
- Performance metrics
- Cost analysis
- Comparison reports

### 6. **Security Sandbox** (`SecuritySandbox.ts`)
Provides isolated execution environments for code-executing agents.

**Security Levels:**
- VM isolation (JavaScript)
- Docker containers
- WebAssembly (planned)
- gVisor (planned)

## API Endpoints

### Core Orchestration

#### `POST /api/v1/orchestrate`
Generate an optimized flow from natural language request.

```typescript
// Request
{
  "query": "I need an agent that can search the web and summarize articles",
  "constraints": {
    "maxCost": 0.10,
    "maxLatency": 5000,
    "securityLevel": "medium"
  }
}

// Response
{
  "flowId": "flow_123456",
  "flow": { /* Generated flow object */ },
  "explanation": "Generated an agent flow with web search and summarization capabilities",
  "estimatedCost": 0.05,
  "estimatedLatency": 3000,
  "confidence": 0.85
}
```

#### `GET /api/v1/orchestrate/capabilities`
List all available capabilities in the system.

```typescript
// Response
{
  "components": [
    {
      "id": "tools/WebBrowser",
      "name": "Web Browser",
      "category": "tools",
      "features": ["web-search", "web-scraping"],
      "description": "Browse and extract content from websites"
    }
    // ... more components
  ],
  "categories": {
    "chatmodels": ["chatOpenAI", "chatAnthropic", ...],
    "tools": ["WebBrowser", "Calculator", ...]
  }
}
```

#### `GET /api/v1/orchestrate/models`
List available models with performance metrics.

```typescript
// Response
{
  "models": [
    {
      "modelId": "gpt-4-turbo-preview",
      "provider": "openai",
      "available": true,
      "capabilities": {
        "contextLength": 128000,
        "supportsFunctionCalling": true,
        "costPer1kTokens": { "input": 0.01, "output": 0.03 }
      },
      "performance": {
        "avgLatency": 1200,
        "requestCount": 150
      }
    }
    // ... more models
  ]
}
```

### Evaluation & Testing

#### `POST /api/v1/orchestrate/evaluate`
Trigger evaluation of a model or tool.

```typescript
// Request
{
  "type": "model",
  "target": "gpt-4-turbo-preview",
  "config": {
    "benchmarks": ["reasoning", "coding", "creativity"]
  }
}

// Response
{
  "evaluationId": "eval_789012",
  "status": "pending",
  "estimatedTime": "5-10 minutes"
}
```

## Usage Examples

### 1. Simple Q&A Bot
```javascript
const response = await fetch('/api/v1/orchestrate', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    query: "Create a simple Q&A bot with memory"
  })
})

const { flow } = await response.json()
// Deploy the generated flow
```

### 2. Complex Research Agent
```javascript
const response = await fetch('/api/v1/orchestrate', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    query: "I need an AI researcher that can search academic papers, analyze them, and write summaries",
    constraints: {
      maxCost: 0.50,
      preferredModels: ["claude-3-opus-20240229"],
      capabilities: ["web-search", "document-analysis", "text-generation"]
    }
  })
})
```

### 3. Code Execution Agent with Sandboxing
```javascript
const response = await fetch('/api/v1/orchestrate', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    query: "Create a Python code assistant that can write and test code safely",
    constraints: {
      securityLevel: "high",
      requireLocal: true
    }
  })
})
```

## Configuration

### Environment Variables

```bash
# LLM Router Configuration
LITELLM_ENDPOINT=http://localhost:4000
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-ant-...
GOOGLE_API_KEY=...
MISTRAL_API_KEY=...

# Evaluation System
EVAL_WEBHOOK_URL=https://your-webhook.com/evaluations
BENCHMARK_SCHEDULE="0 */6 * * *"

# Security Sandbox
SANDBOX_TYPE=docker  # vm|docker|wasm|gvisor
SANDBOX_SIGNING_KEY_PATH=/secure/path/to/key
LOCAL_AGENT_SIGNING_KEY=your-32-char-key

# Performance
ORCHESTRATOR_CACHE_TTL=3600
MAX_CONCURRENT_SANDBOXES=10
```

### Security Configuration

```typescript
// High Security Configuration
{
  securityLevel: 'high',
  sandbox: {
    type: 'docker',
    networkAccess: false,
    fileSystemAccess: 'none',
    timeout: 30000,
    memoryLimit: 512,
    cpuLimit: 25
  },
  permissions: {
    canExecuteCode: true,
    canAccessNetwork: false,
    canAccessFileSystem: false,
    canSpawnProcesses: false,
    blockedCommands: ['rm', 'curl', 'wget', 'nc']
  }
}
```

## Model Selection Algorithm

The system uses a multi-factor scoring algorithm for model selection:

```
Score = (QualityScore × 0.5) + (CostEfficiency × 0.3) + (LatencyScore × 0.2)

Where:
- QualityScore = Average of (reasoning, creativity, factuality, instruction-following)
- CostEfficiency = 1 / (costPer1kTokens × estimatedTokens)
- LatencyScore = 1 / (avgLatency / 1000)
```

## Performance Optimization

### 1. **Caching**
- Flow templates are cached for common requests
- Model performance metrics cached for 5 minutes
- Capability catalog refreshed every hour

### 2. **Parallel Processing**
- Multiple models evaluated concurrently
- Batch processing for multiple flow generations
- Async component analysis

### 3. **Resource Management**
- Connection pooling for LLM providers
- Sandbox recycling for repeated executions
- Memory-efficient flow generation

## Monitoring & Observability

### Metrics Tracked
- **Orchestration Metrics**: Request count, generation time, success rate
- **Model Performance**: Latency, cost, quality scores
- **Security Events**: Sandbox violations, blocked executions
- **System Health**: Memory usage, active sandboxes, queue length

### Logging
All orchestration events are logged with structured data:
```json
{
  "timestamp": "2024-01-20T10:30:00Z",
  "event": "orchestration_completed",
  "flowId": "flow_123456",
  "generationTime": 2500,
  "modelUsed": "gpt-4-turbo-preview",
  "confidence": 0.85
}
```

## Best Practices

1. **Request Clarity**: Provide clear, specific descriptions of what you want the agent to do
2. **Constraints**: Always specify constraints (cost, latency, security) for optimal results
3. **Testing**: Use the evaluation pipeline before deploying to production
4. **Security**: Always use appropriate security levels for code-executing agents
5. **Monitoring**: Set up alerts for failed orchestrations and security violations

## Troubleshooting

### Common Issues

1. **"No suitable model found"**
   - Check if API keys are configured
   - Verify model availability
   - Review constraints (may be too restrictive)

2. **"Sandbox creation failed"**
   - Ensure Docker is installed and running
   - Check sandbox permissions
   - Verify resource limits

3. **"Flow generation timeout"**
   - Simplify the request
   - Increase timeout limits
   - Check model latency

## Future Enhancements

- [ ] Visual flow editor integration
- [ ] A/B testing for generated flows
- [ ] Automatic flow optimization based on usage
- [ ] Plugin system for custom components
- [ ] Real-time collaboration on flow generation
- [ ] Advanced caching with Redis
- [ ] Distributed sandbox execution
- [ ] Custom evaluation benchmarks

## Contributing

See [CONTRIBUTING.md](../../../../../CONTRIBUTING.md) for guidelines on contributing to the orchestration system.

## License

This system is part of NubemGenesis and follows the same license terms.