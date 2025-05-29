# 🚀 Plan de Mejoras: Sistema de Orquestación

## Mejoras Críticas Identificadas

### 1. Integración Real con LiteLLM

**Problema**: Actualmente simula LiteLLM con axios directo
**Solución**: Integrar LiteLLM proxy server real

```typescript
// Implementación actual (simulada)
const response = await axios.post(`${this.litellmEndpoint}/chat/completions`, ...)

// Implementación necesaria
import { LiteLLM } from 'litellm-node' // O usar OpenAI SDK compatible

class LiteLLMRouter {
    private litellm: LiteLLM
    
    async initialize() {
        this.litellm = new LiteLLM({
            apiBase: process.env.LITELLM_PROXY_URL || 'http://localhost:4000',
            apiKey: process.env.LITELLM_MASTER_KEY,
            // Configurar callbacks para telemetría
            callbacks: {
                onSuccess: this.trackSuccess.bind(this),
                onError: this.trackError.bind(this),
                onStream: this.handleStream.bind(this)
            }
        })
    }
    
    async route(request: RoutingRequest): Promise<RoutingResponse> {
        // Usar cliente real con retry automático
        const completion = await this.litellm.completion({
            model: selectedModel,
            messages: request.messages,
            stream: request.stream || false,
            // LiteLLM maneja automáticamente el routing
            metadata: {
                user: request.userId,
                tags: ['orchestration', request.intent]
            }
        })
    }
}
```

**Docker Compose para LiteLLM**:
```yaml
version: '3.8'
services:
  litellm:
    image: ghcr.io/berriai/litellm:latest
    ports:
      - "4000:4000"
    environment:
      - LITELLM_MASTER_KEY=${LITELLM_MASTER_KEY}
      - OPENAI_API_KEY=${OPENAI_API_KEY}
      - ANTHROPIC_API_KEY=${ANTHROPIC_API_KEY}
      - GOOGLE_API_KEY=${GOOGLE_API_KEY}
    volumes:
      - ./litellm-config.yaml:/app/config.yaml
    command: --config /app/config.yaml
```

### 2. Sistema de Auto-Actualización de Capacidades

**Problema**: No detecta cambios en componentes automáticamente
**Solución**: Implementar file watcher con debouncing

```typescript
// capability-watcher.ts
import { watch } from 'chokidar'
import { debounce } from 'lodash'

export class CapabilityWatcher {
    private watcher: FSWatcher
    private analyzer: CapabilityAnalyzer
    
    constructor(analyzer: CapabilityAnalyzer) {
        this.analyzer = analyzer
        this.handleChange = debounce(this.handleChange.bind(this), 5000)
    }
    
    start() {
        const componentsPath = path.join(__dirname, '../../../components/nodes')
        
        this.watcher = watch(componentsPath, {
            ignored: /(^|[\/\\])\../, // ignore dotfiles
            persistent: true,
            depth: 3,
            awaitWriteFinish: {
                stabilityThreshold: 2000,
                pollInterval: 100
            }
        })
        
        this.watcher
            .on('add', path => this.handleChange('add', path))
            .on('change', path => this.handleChange('change', path))
            .on('unlink', path => this.handleChange('remove', path))
            
        console.log('👀 Watching for component changes...')
    }
    
    private async handleChange(event: string, filePath: string) {
        console.log(`📝 Component ${event}: ${filePath}`)
        
        // Re-analyze capabilities
        const catalog = await this.analyzer.analyzeCapabilities()
        
        // Notify orchestrator of changes
        this.notifyOrchestrator(event, filePath, catalog)
        
        // Update cache
        await this.updateCache(catalog)
    }
    
    private notifyOrchestrator(event: string, path: string, catalog: CapabilityCatalog) {
        // Emit event for real-time updates
        getRunningExpressApp().emit('capabilities:updated', {
            event,
            path,
            catalog,
            timestamp: new Date()
        })
    }
}
```

### 3. Pipeline de Evaluación Continua

**Problema**: No ejecuta evaluaciones automáticamente
**Solución**: Implementar scheduler con node-cron

```typescript
// evaluation-scheduler.ts
import * as cron from 'node-cron'
import { evaluationPipeline } from './EvaluationPipeline'

export class EvaluationScheduler {
    private jobs: Map<string, cron.ScheduledTask> = new Map()
    
    initialize() {
        // Evaluación diaria de modelos principales
        this.scheduleJob('daily-eval', '0 2 * * *', async () => {
            console.log('🔄 Starting daily model evaluation...')
            
            const primaryModels = [
                'gpt-4-turbo-preview',
                'claude-3-opus-20240229',
                'gemini-pro'
            ]
            
            const results = await evaluationPipeline.compareModels(primaryModels)
            await this.processResults(results)
        })
        
        // Evaluación semanal completa
        this.scheduleJob('weekly-eval', '0 3 * * 0', async () => {
            console.log('🔄 Starting weekly comprehensive evaluation...')
            
            const allModels = liteLLMRouter.listAvailableModels()
                .filter(m => m.available)
                .map(m => m.modelId)
            
            const results = await evaluationPipeline.compareModels(allModels)
            await this.processResults(results)
        })
        
        // Monitoreo de nuevos modelos
        this.scheduleJob('new-model-check', '0 */6 * * *', async () => {
            await this.checkForNewModels()
        })
    }
    
    private async checkForNewModels() {
        // Consultar APIs de providers para nuevos modelos
        const providers = ['openai', 'anthropic', 'google']
        
        for (const provider of providers) {
            try {
                const models = await this.fetchProviderModels(provider)
                const newModels = await this.identifyNewModels(models)
                
                if (newModels.length > 0) {
                    console.log(`🆕 Found ${newModels.length} new models from ${provider}`)
                    
                    for (const model of newModels) {
                        await this.evaluateNewModel(model)
                    }
                }
            } catch (error) {
                console.error(`Error checking ${provider}:`, error)
            }
        }
    }
    
    private async processResults(results: Map<string, EvaluationReport>) {
        // Actualizar router con nuevas métricas
        for (const [modelId, report] of results) {
            liteLLMRouter.updateModelMetrics(modelId, {
                quality: report.categoryScores,
                performance: report.performanceMetrics,
                cost: report.costAnalysis
            })
        }
        
        // Generar alerta si hay cambios significativos
        this.checkForSignificantChanges(results)
        
        // Guardar en base de datos
        await this.persistResults(results)
    }
}
```

### 4. Optimización Real de Flujos

**Problema**: Método `optimizeFlow` está vacío
**Solución**: Implementar optimizaciones reales

```typescript
// flow-optimizer.ts
export class FlowOptimizer {
    async optimizeFlow(
        flow: ICommonObject, 
        constraints?: OrchestrationRequest['constraints']
    ): Promise<ICommonObject> {
        const optimizations: string[] = []
        let optimizedFlow = JSON.parse(JSON.stringify(flow)) // Deep clone
        
        // 1. Eliminar nodos redundantes
        optimizedFlow = this.removeRedundantNodes(optimizedFlow)
        if (optimizedFlow !== flow) optimizations.push('removed-redundant-nodes')
        
        // 2. Optimizar rutas de conexión
        optimizedFlow = this.optimizeConnectionPaths(optimizedFlow)
        if (optimizedFlow !== flow) optimizations.push('optimized-connections')
        
        // 3. Añadir caching donde sea beneficioso
        if (this.shouldAddCaching(optimizedFlow, constraints)) {
            optimizedFlow = this.addCachingNodes(optimizedFlow)
            optimizations.push('added-caching')
        }
        
        // 4. Configurar retry logic
        optimizedFlow = this.configureRetryLogic(optimizedFlow, constraints)
        optimizations.push('configured-retry')
        
        // 5. Optimizar por costo si hay constraint
        if (constraints?.maxCost) {
            optimizedFlow = this.optimizeForCost(optimizedFlow, constraints.maxCost)
            optimizations.push('cost-optimized')
        }
        
        // 6. Optimizar por latencia si hay constraint  
        if (constraints?.maxLatency) {
            optimizedFlow = this.optimizeForLatency(optimizedFlow, constraints.maxLatency)
            optimizations.push('latency-optimized')
        }
        
        // 7. Paralelizar donde sea posible
        optimizedFlow = this.addParallelization(optimizedFlow)
        if (this.hasParallelPaths(optimizedFlow)) {
            optimizations.push('added-parallelization')
        }
        
        console.log(`🔧 Flow optimized with: ${optimizations.join(', ')}`)
        return optimizedFlow
    }
    
    private removeRedundantNodes(flow: ICommonObject): ICommonObject {
        const { nodes, edges } = JSON.parse(flow.flowData)
        const usedNodes = new Set<string>()
        
        // Identificar nodos utilizados
        edges.forEach(edge => {
            usedNodes.add(edge.source)
            usedNodes.add(edge.target)
        })
        
        // Filtrar nodos no conectados
        const filteredNodes = nodes.filter(node => 
            usedNodes.has(node.id) || 
            node.type === 'start' || 
            node.type === 'end'
        )
        
        if (filteredNodes.length < nodes.length) {
            flow.flowData = JSON.stringify({ 
                nodes: filteredNodes, 
                edges 
            })
        }
        
        return flow
    }
    
    private addCachingNodes(flow: ICommonObject): ICommonObject {
        const { nodes, edges } = JSON.parse(flow.flowData)
        const cacheCandidates = nodes.filter(node => 
            node.data.type === 'ChatModel' || 
            node.data.type === 'VectorStore'
        )
        
        cacheCandidates.forEach(node => {
            // Crear nodo de cache
            const cacheNode = {
                id: `cache_${node.id}`,
                type: 'redisCache',
                position: { 
                    x: node.position.x - 150, 
                    y: node.position.y 
                },
                data: {
                    id: `cache_${node.id}`,
                    label: 'Redis Cache',
                    name: 'redisCache',
                    type: 'Cache',
                    inputs: {
                        ttl: 3600,
                        maxSize: 1000
                    }
                }
            }
            
            // Insertar cache en el flujo
            nodes.push(cacheNode)
            
            // Redirigir conexiones a través del cache
            edges.forEach(edge => {
                if (edge.target === node.id) {
                    edge.target = cacheNode.id
                }
            })
            
            // Conectar cache al nodo original
            edges.push({
                id: `${cacheNode.id}_${node.id}`,
                source: cacheNode.id,
                target: node.id,
                type: 'buttonedge'
            })
        })
        
        flow.flowData = JSON.stringify({ nodes, edges })
        return flow
    }
}
```

### 5. Integración con Observabilidad

**Problema**: Falta tracing y métricas detalladas
**Solución**: Integrar LangSmith/Langfuse y Prometheus

```typescript
// observability.ts
import { LangSmithClient } from '@langchain/langsmith'
import { PrometheusClient } from 'prom-client'

export class OrchestrationObservability {
    private langsmith: LangSmithClient
    private metrics: {
        orchestrationDuration: Histogram
        modelSelections: Counter
        flowGenerations: Counter
        errors: Counter
    }
    
    constructor() {
        // LangSmith para tracing
        this.langsmith = new LangSmithClient({
            apiKey: process.env.LANGSMITH_API_KEY,
            projectName: 'nubemgenesis-orchestration'
        })
        
        // Prometheus metrics
        this.metrics = {
            orchestrationDuration: new Histogram({
                name: 'orchestration_duration_seconds',
                help: 'Duration of orchestration requests',
                labelNames: ['workflow_type', 'status']
            }),
            modelSelections: new Counter({
                name: 'model_selections_total',
                help: 'Total model selections by model',
                labelNames: ['model', 'provider']
            }),
            flowGenerations: new Counter({
                name: 'flow_generations_total',
                help: 'Total flows generated',
                labelNames: ['type', 'complexity']
            }),
            errors: new Counter({
                name: 'orchestration_errors_total',
                help: 'Total orchestration errors',
                labelNames: ['type', 'component']
            })
        }
    }
    
    async traceOrchestration(request: OrchestrationRequest, fn: () => Promise<OrchestrationResponse>) {
        const trace = await this.langsmith.traceAsRun({
            name: 'orchestration',
            runType: 'chain',
            inputs: { request },
            tags: ['orchestration', request.constraints?.securityLevel || 'low']
        }, async () => {
            const timer = this.metrics.orchestrationDuration.startTimer()
            
            try {
                const response = await fn()
                
                timer({ 
                    workflow_type: response.flow.type, 
                    status: 'success' 
                })
                
                // Track metrics
                this.metrics.flowGenerations.inc({ 
                    type: response.flow.type,
                    complexity: this.getComplexity(response)
                })
                
                response.metadata.modelsSelected.forEach(model => {
                    this.metrics.modelSelections.inc({ 
                        model,
                        provider: this.getProvider(model)
                    })
                })
                
                return response
            } catch (error) {
                timer({ workflow_type: 'unknown', status: 'error' })
                this.metrics.errors.inc({ 
                    type: error.name,
                    component: 'orchestrator'
                })
                throw error
            }
        })
    }
}
```

## Timeline de Implementación

### Semana 1
- [ ] Configurar LiteLLM proxy server
- [ ] Implementar file watcher para capacidades
- [ ] Completar FlowOptimizer

### Semana 2  
- [ ] Implementar EvaluationScheduler
- [ ] Integrar observabilidad (LangSmith + Prometheus)
- [ ] Añadir tests de integración

### Semana 3
- [ ] Implementar sandboxes WASM/gVisor
- [ ] Mejorar seguridad y rate limiting
- [ ] Optimizar performance

### Semana 4
- [ ] Testing end-to-end
- [ ] Documentación actualizada
- [ ] Deployment a producción

## Métricas de Éxito

- ✅ 95%+ tests passing
- ✅ <2s latencia promedio en generación de flows
- ✅ <0.1% error rate en producción
- ✅ 100% de modelos evaluados semanalmente
- ✅ Auto-actualización funcionando en <5s

---
*Plan creado: 2024-01-XX*
*Estimación: 4 semanas para implementación completa*