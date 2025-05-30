const express = require('express');
const { v4: uuidv4 } = require('uuid');
const crypto = require('crypto');
const { SecretManagerServiceClient } = require('@google-cloud/secret-manager');
const { ErrorReporting } = require('@google-cloud/error-reporting');
const { CloudTasksClient } = require('@google-cloud/tasks');

const app = express();
app.use(express.json());

// Production configuration
const PROJECT_ID = process.env.GCP_PROJECT || 'nubemgenesis';
const LOCATION = process.env.GCP_LOCATION || 'us-central1';
const errorReporting = new ErrorReporting({ projectId: PROJECT_ID });
const secretClient = new SecretManagerServiceClient();
const tasksClient = new CloudTasksClient();

// Rate limiting configuration
class RateLimiter {
    constructor() {
        this.requests = new Map();
        this.quotas = {
            perMinute: 60,
            perHour: 1000,
            perDay: 10000
        };
    }

    checkLimit(userId) {
        const now = Date.now();
        const userRequests = this.requests.get(userId) || [];
        
        // Clean old requests
        const filtered = userRequests.filter(time => 
            now - time < 24 * 60 * 60 * 1000
        );
        
        // Check limits
        const lastMinute = filtered.filter(time => now - time < 60 * 1000).length;
        const lastHour = filtered.filter(time => now - time < 60 * 60 * 1000).length;
        const lastDay = filtered.length;
        
        if (lastMinute >= this.quotas.perMinute ||
            lastHour >= this.quotas.perHour ||
            lastDay >= this.quotas.perDay) {
            return false;
        }
        
        filtered.push(now);
        this.requests.set(userId, filtered);
        return true;
    }
}

// API Key Manager
class APIKeyManager {
    constructor() {
        this.cache = new Map();
        this.cacheExpiry = 5 * 60 * 1000; // 5 minutes
    }

    async getSecret(secretName) {
        // Check cache
        const cached = this.cache.get(secretName);
        if (cached && Date.now() - cached.timestamp < this.cacheExpiry) {
            return cached.value;
        }

        try {
            const name = `projects/${PROJECT_ID}/secrets/${secretName}/versions/latest`;
            const [version] = await secretClient.accessSecretVersion({ name });
            const value = version.payload.data.toString('utf8');
            
            // Cache the result
            this.cache.set(secretName, {
                value,
                timestamp: Date.now()
            });
            
            return value;
        } catch (error) {
            console.error(`Failed to access secret ${secretName}:`, error);
            return null;
        }
    }

    async getAPIKeys() {
        const keys = {};
        const secretNames = [
            'openai-api-key',
            'anthropic-api-key',
            'google-api-key',
            'cohere-api-key',
            'huggingface-api-key'
        ];

        for (const name of secretNames) {
            const key = await this.getSecret(name);
            if (key) {
                keys[name.replace('-api-key', '')] = key;
            }
        }

        return keys;
    }
}

// Enhanced LiteLLM Router with API keys
class LiteLLMRouter {
    constructor() {
        this.models = {
            'gpt-4': { cost: 0.03, latency: 2000, quality: 0.95, provider: 'openai' },
            'gpt-3.5-turbo': { cost: 0.002, latency: 1000, quality: 0.85, provider: 'openai' },
            'claude-3-opus': { cost: 0.015, latency: 2500, quality: 0.96, provider: 'anthropic' },
            'claude-3-sonnet': { cost: 0.003, latency: 1500, quality: 0.90, provider: 'anthropic' },
            'gemini-pro': { cost: 0.001, latency: 1200, quality: 0.88, provider: 'google' },
            'command': { cost: 0.0015, latency: 1100, quality: 0.84, provider: 'cohere' },
            'mixtral-8x7b': { cost: 0.0007, latency: 1800, quality: 0.82, provider: 'huggingface' }
        };
        this.healthStatus = {};
        this.apiKeyManager = new APIKeyManager();
        this.initializeHealthChecks();
    }

    async initializeHealthChecks() {
        setInterval(() => this.healthCheck(), 60000); // Every minute
        await this.healthCheck();
    }

    async healthCheck() {
        const apiKeys = await this.apiKeyManager.getAPIKeys();
        
        for (const [model, config] of Object.entries(this.models)) {
            const provider = config.provider;
            const hasKey = apiKeys[provider] ? true : false;
            
            this.healthStatus[model] = {
                healthy: hasKey,
                lastCheck: new Date().toISOString(),
                hasAPIKey: hasKey
            };
        }
    }

    async selectModel(requirements = {}) {
        const {
            maxCost = Infinity,
            maxLatency = 5000,
            minQuality = 0.8,
            preferredProvider = null
        } = requirements;

        const eligibleModels = Object.entries(this.models)
            .filter(([name, config]) => 
                config.cost <= maxCost && 
                config.latency <= maxLatency && 
                config.quality >= minQuality &&
                this.healthStatus[name]?.healthy &&
                (!preferredProvider || config.provider === preferredProvider)
            )
            .sort((a, b) => {
                // Optimize for quality/cost ratio
                const ratioA = a[1].quality / a[1].cost;
                const ratioB = b[1].quality / b[1].cost;
                return ratioB - ratioA;
            });

        if (eligibleModels.length === 0) {
            throw new Error('No suitable model found for requirements');
        }

        return {
            model: eligibleModels[0][0],
            config: eligibleModels[0][1],
            apiKey: await this.apiKeyManager.getSecret(`${eligibleModels[0][1].provider}-api-key`)
        };
    }
}

// Production Health Monitor
class HealthMonitor {
    constructor() {
        this.metrics = {
            requests: 0,
            errors: 0,
            latencies: [],
            modelUsage: {},
            startTime: Date.now()
        };
    }

    recordRequest(model, latency, success) {
        this.metrics.requests++;
        if (!success) this.metrics.errors++;
        this.metrics.latencies.push(latency);
        
        if (!this.metrics.modelUsage[model]) {
            this.metrics.modelUsage[model] = { count: 0, totalLatency: 0 };
        }
        this.metrics.modelUsage[model].count++;
        this.metrics.modelUsage[model].totalLatency += latency;
        
        // Keep only last 1000 latencies
        if (this.metrics.latencies.length > 1000) {
            this.metrics.latencies = this.metrics.latencies.slice(-1000);
        }
    }

    getHealth() {
        const uptime = Date.now() - this.metrics.startTime;
        const avgLatency = this.metrics.latencies.length > 0 
            ? this.metrics.latencies.reduce((a, b) => a + b, 0) / this.metrics.latencies.length 
            : 0;
        
        return {
            status: this.metrics.errors / this.metrics.requests < 0.05 ? 'healthy' : 'degraded',
            uptime: Math.floor(uptime / 1000),
            totalRequests: this.metrics.requests,
            errorRate: this.metrics.errors / this.metrics.requests,
            averageLatency: Math.round(avgLatency),
            modelUsage: this.metrics.modelUsage
        };
    }
}

// Initialize production components
const rateLimiter = new RateLimiter();
const litellmRouter = new LiteLLMRouter();
const healthMonitor = new HealthMonitor();

// Middleware
const authenticate = (req, res, next) => {
    const apiKey = req.headers['x-api-key'];
    if (!apiKey) {
        return res.status(401).json({ error: 'API key required' });
    }
    
    // Extract user ID from API key
    const userId = crypto.createHash('sha256').update(apiKey).digest('hex').substring(0, 16);
    req.userId = userId;
    
    // Check rate limits
    if (!rateLimiter.checkLimit(userId)) {
        return res.status(429).json({ error: 'Rate limit exceeded' });
    }
    
    next();
};

const errorHandler = (err, req, res, next) => {
    errorReporting.report(err);
    console.error('Error:', err);
    res.status(500).json({ error: 'Internal server error' });
};

// Health check endpoints
app.get('/health', (req, res) => {
    const health = healthMonitor.getHealth();
    res.status(health.status === 'healthy' ? 200 : 503).json(health);
});

app.get('/health/detailed', authenticate, (req, res) => {
    const health = healthMonitor.getHealth();
    const models = Object.entries(litellmRouter.healthStatus).map(([name, status]) => ({
        name,
        ...status,
        config: litellmRouter.models[name]
    }));
    
    res.json({
        ...health,
        models,
        rateLimits: rateLimiter.quotas,
        environment: {
            project: PROJECT_ID,
            location: LOCATION,
            version: '3.0.0'
        }
    });
});

// Main orchestration endpoint
app.post('/orchestrate', authenticate, async (req, res, next) => {
    const startTime = Date.now();
    const requestId = uuidv4();
    
    try {
        const { query, requirements = {} } = req.body;
        
        if (!query) {
            return res.status(400).json({ error: 'Query is required' });
        }
        
        // Select model based on requirements
        const { model, config, apiKey } = await litellmRouter.selectModel(requirements);
        
        // Simulate processing (in production, this would call the actual model)
        const processingTime = Math.random() * config.latency;
        await new Promise(resolve => setTimeout(resolve, processingTime));
        
        const response = {
            requestId,
            model,
            usage: {
                promptTokens: Math.floor(query.length / 4),
                completionTokens: Math.floor(Math.random() * 500 + 100),
                totalCost: config.cost * (query.length / 4000)
            },
            metadata: {
                processingTime,
                modelConfig: config
            },
            result: {
                // In production, this would be the actual model response
                flow: `Generated flow for: ${query}`,
                confidence: 0.95
            }
        };
        
        // Record metrics
        const latency = Date.now() - startTime;
        healthMonitor.recordRequest(model, latency, true);
        
        res.json(response);
    } catch (error) {
        const latency = Date.now() - startTime;
        healthMonitor.recordRequest('unknown', latency, false);
        next(error);
    }
});

// Model evaluation endpoint
app.post('/evaluate', authenticate, async (req, res, next) => {
    try {
        const { models = ['all'], benchmark = 'default' } = req.body;
        
        // Create evaluation task
        const queuePath = tasksClient.queuePath(PROJECT_ID, LOCATION, 'evaluation-queue');
        const task = {
            httpRequest: {
                httpMethod: 'POST',
                url: `https://${req.get('host')}/internal/evaluate`,
                headers: {
                    'Content-Type': 'application/json',
                },
                body: Buffer.from(JSON.stringify({
                    models,
                    benchmark,
                    requestId: uuidv4()
                })).toString('base64'),
            },
        };
        
        const [response] = await tasksClient.createTask({ parent: queuePath, task });
        
        res.json({
            message: 'Evaluation scheduled',
            taskName: response.name,
            estimatedTime: '5-10 minutes'
        });
    } catch (error) {
        next(error);
    }
});

// Internal evaluation handler
app.post('/internal/evaluate', async (req, res) => {
    // This would run the actual evaluation
    const { models, benchmark, requestId } = req.body;
    console.log(`Running evaluation ${requestId} for models:`, models);
    
    // Simulate evaluation
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    res.json({ status: 'completed' });
});

// Error handling
app.use(errorHandler);

const port = process.env.PORT || 8080;
app.listen(port, () => {
    console.log(`Production orchestrator v3.0.0 running on port ${port}`);
    console.log(`Project: ${PROJECT_ID}, Location: ${LOCATION}`);
});