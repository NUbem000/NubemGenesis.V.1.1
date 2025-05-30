# 🧪 Metodología de Testing para NubemGenesis

## 📋 Resumen Ejecutivo

Esta guía proporciona una metodología completa para testear el sistema de orquestación inteligente de NubemGenesis, asegurando su correcto funcionamiento en producción.

## 🎯 Objetivos del Testing

1. **Funcionalidad**: Verificar que todas las características funcionan según lo diseñado
2. **Rendimiento**: Asegurar tiempos de respuesta aceptables bajo carga
3. **Seguridad**: Validar que el sandbox y rate limiting funcionan correctamente
4. **Integración**: Confirmar que frontend y backend se comunican sin problemas
5. **Fiabilidad**: Garantizar alta disponibilidad y recuperación de errores

## 🔧 Herramientas de Testing

### 1. **Agente de Prueba Automatizado** (test-agent-mvp.js)
```bash
# Instalar dependencias
npm install axios colors

# Ejecutar suite completa
node test-agent-mvp.js
```

### 2. **Testing Manual con cURL**
```bash
# Health check
curl https://nubemgenesis-orchestrator-7ut3uy4xcq-uc.a.run.app/api/v1/orchestrate/health

# Orchestration test
curl -X POST https://nubemgenesis-orchestrator-7ut3uy4xcq-uc.a.run.app/api/v1/orchestrate \
  -H "Content-Type: application/json" \
  -H "x-api-key: test-key" \
  -d '{"request": "Create a chatbot", "config": {"maxCost": 0.01}}'
```

### 3. **Postman Collection**
```json
{
  "info": {
    "name": "NubemGenesis API Tests",
    "schema": "https://schema.getpostman.com/json/collection/v2.1.0/collection.json"
  },
  "item": [
    {
      "name": "Health Check",
      "request": {
        "method": "GET",
        "url": "{{baseUrl}}/api/v1/orchestrate/health"
      }
    },
    {
      "name": "Create Flow",
      "request": {
        "method": "POST",
        "url": "{{baseUrl}}/api/v1/orchestrate",
        "body": {
          "mode": "raw",
          "raw": "{\"request\": \"Create RAG system\", \"config\": {\"minQuality\": 0.9}}"
        }
      }
    }
  ]
}
```

## 📊 Escenarios de Prueba

### 1. **Pruebas Funcionales**

#### a) Generación de Flujos
- ✅ Chatbot simple
- ✅ Sistema RAG complejo
- ✅ Pipeline de procesamiento
- ✅ Integración con APIs externas

#### b) Selección de Modelos
- ✅ Optimización por costo (selecciona Mixtral/Gemini)
- ✅ Optimización por calidad (selecciona Claude-3-Opus/GPT-4)
- ✅ Balance costo/calidad (selecciona Gemini-Pro)

#### c) Características Especiales
- ✅ Sandbox ejecuta código seguro
- ✅ Sandbox bloquea código peligroso
- ✅ Rate limiting funciona (60/min)
- ✅ Métricas se actualizan correctamente

### 2. **Pruebas de Rendimiento**

```javascript
// Prueba de carga
async function loadTest() {
    const promises = [];
    for (let i = 0; i < 100; i++) {
        promises.push(makeRequest('/api/v1/orchestrate', {
            request: `Test ${i}`,
            config: { maxLatency: 3000 }
        }));
    }
    
    const start = Date.now();
    const results = await Promise.all(promises);
    const duration = Date.now() - start;
    
    console.log(`100 requests completed in ${duration}ms`);
    console.log(`Average: ${duration/100}ms per request`);
}
```

### 3. **Pruebas de Integración**

#### Frontend → Backend
1. Abrir https://nubemgenesis-frontend-1045270359433.us-central1.run.app
2. Ingresar API key: `demo-key-123`
3. Crear flujo con diferentes requisitos
4. Verificar respuesta y visualización

#### Evaluaciones Automáticas
```bash
# Trigger manual evaluation
gcloud scheduler jobs run daily-model-evaluation \
  --location=us-central1 \
  --project=nubemgenesis-deploy

# Check results
curl https://nubemgenesis-orchestrator-7ut3uy4xcq-uc.a.run.app/api/v1/orchestrate/leaderboard
```

### 4. **Pruebas de Seguridad**

```javascript
// Test SQL injection
const maliciousInputs = [
    "'; DROP TABLE users; --",
    "<script>alert('XSS')</script>",
    "../../../etc/passwd",
    "{{7*7}}"  // Template injection
];

for (const input of maliciousInputs) {
    const response = await testOrchestrate({
        request: input,
        config: {}
    });
    // Should handle gracefully without errors
}
```

## 📈 Métricas de Éxito

| Métrica | Objetivo | Crítico |
|---------|----------|---------|
| Disponibilidad | >99.9% | >99.5% |
| Latencia P95 | <2000ms | <3000ms |
| Tasa de Error | <1% | <5% |
| Precisión Modelo | >90% | >80% |
| Cobertura Tests | >80% | >70% |

## 🔄 Proceso de Testing Continuo

### 1. **Pre-Despliegue**
```bash
# Run local tests
npm test

# Run integration tests
npm run test:integration

# Check TypeScript
npm run typecheck
```

### 2. **Post-Despliegue**
```bash
# Run smoke tests
node test-agent-mvp.js

# Monitor logs
gcloud logging read "resource.type=cloud_run_revision" \
  --limit=50 --project=nubemgenesis
```

### 3. **Monitoreo Continuo**
- Dashboard: https://console.cloud.google.com/monitoring/dashboards/custom
- Alertas por email a: nubemgenesis@nubemsystems.es
- Evaluaciones automáticas diarias a las 2:00 AM

## 🚨 Troubleshooting

### Problema: Rate Limit Exceeded
```bash
# Verificar límites
curl -H "x-api-key: your-key" \
  https://nubemgenesis-orchestrator-7ut3uy4xcq-uc.a.run.app/api/v1/orchestrate/metrics
```

### Problema: Model Not Available
```bash
# Verificar salud de modelos
curl https://nubemgenesis-orchestrator-7ut3uy4xcq-uc.a.run.app/api/v1/orchestrate/models
```

### Problema: High Latency
1. Revisar Cloud Run logs
2. Verificar métricas en dashboard
3. Escalar instancias si es necesario

## 📝 Checklist de Testing

### Testing Inicial
- [ ] Health check responde
- [ ] Frontend carga correctamente
- [ ] Puede generar flujo simple
- [ ] Modelos se seleccionan correctamente
- [ ] Métricas se actualizan

### Testing Completo
- [ ] Todos los endpoints responden
- [ ] Rate limiting funciona
- [ ] Sandbox bloquea código malicioso
- [ ] Evaluaciones se ejecutan
- [ ] Alertas llegan por email
- [ ] Logs no muestran errores
- [ ] Performance es aceptable
- [ ] Frontend muestra datos correctos

### Testing de Producción
- [ ] Monitoreo activo 24/7
- [ ] Alertas configuradas
- [ ] Backups automáticos
- [ ] Plan de recuperación probado
- [ ] Documentación actualizada

## 🎯 Próximos Pasos

1. **Inmediato**: Ejecutar `test-agent-mvp.js`
2. **Diario**: Revisar dashboard de monitoreo
3. **Semanal**: Analizar tendencias de rendimiento
4. **Mensual**: Revisar y actualizar tests

## 📚 Referencias

- [Documentación API](https://nubemgenesis-orchestrator-7ut3uy4xcq-uc.a.run.app/docs)
- [Dashboard Monitoreo](https://console.cloud.google.com/monitoring)
- [Logs Cloud Run](https://console.cloud.google.com/logs)