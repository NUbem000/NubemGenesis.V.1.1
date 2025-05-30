/**
 * Use Case Knowledge Base with RAG capabilities
 * Stores and retrieves successful flow patterns for intelligent suggestions
 */

import { VectorStore } from 'langchain/vectorstores/base'
import { Pinecone } from '@pinecone-database/pinecone'
import { PineconeStore } from 'langchain/vectorstores/pinecone'
import { OpenAIEmbeddings } from 'langchain/embeddings/openai'
import { Document } from 'langchain/document'
import { getRunningExpressApp } from '../utils/getRunningExpressApp'
import { DataSource } from 'typeorm'

export interface UseCase {
    id?: string
    title: string
    description: string
    userQuery: string
    components: string[]
    flow: any
    metrics: {
        satisfaction?: number
        avgResponseTime?: number
        accuracy?: number
        usage?: number
    }
    tags: string[]
    createdAt?: Date
    updatedAt?: Date
}

export interface SimilarCase {
    useCase: UseCase
    score: number
}

export class UseCaseKnowledgeBase {
    private vectorStore: VectorStore | null = null
    private embeddings: OpenAIEmbeddings
    private pinecone: Pinecone | null = null
    private indexName: string = 'nubemgenesis-usecases'
    private initialized: boolean = false

    constructor() {
        this.embeddings = new OpenAIEmbeddings({
            openAIApiKey: process.env.OPENAI_API_KEY,
            modelName: 'text-embedding-ada-002'
        })
    }

    /**
     * Initialize the knowledge base
     */
    async initialize(): Promise<void> {
        if (this.initialized) return

        try {
            // Initialize Pinecone if API key is available
            if (process.env.PINECONE_API_KEY) {
                this.pinecone = new Pinecone({
                    apiKey: process.env.PINECONE_API_KEY
                })

                const indexes = await this.pinecone.listIndexes()
                const indexExists = indexes.indexes?.some(index => index.name === this.indexName)

                if (!indexExists) {
                    await this.pinecone.createIndex({
                        name: this.indexName,
                        dimension: 1536, // OpenAI embeddings dimension
                        metric: 'cosine',
                        spec: {
                            serverless: {
                                cloud: 'aws',
                                region: 'us-west-2'
                            }
                        }
                    })
                }

                const index = this.pinecone.Index(this.indexName)
                this.vectorStore = await PineconeStore.fromExistingIndex(
                    this.embeddings,
                    { pineconeIndex: index }
                )
            } else {
                // Fallback to in-memory vector store for development
                console.log('⚠️  Pinecone API key not found, using in-memory vector store')
                const { MemoryVectorStore } = await import('langchain/vectorstores/memory')
                this.vectorStore = new MemoryVectorStore(this.embeddings)
            }

            // Load default use cases
            await this.loadDefaultUseCases()
            
            this.initialized = true
            console.log('✅ Use Case Knowledge Base initialized')
        } catch (error) {
            console.error('Failed to initialize Use Case Knowledge Base:', error)
            throw error
        }
    }

    /**
     * Load default use cases into the knowledge base
     */
    private async loadDefaultUseCases(): Promise<void> {
        const defaultUseCases: UseCase[] = [
            {
                title: "Customer Support Chatbot",
                description: "24/7 automated customer support with FAQ handling",
                userQuery: "I need a chatbot for customer support that can answer FAQs",
                components: ["chatOpenAI", "conversationChain", "bufferMemory", "pinecone"],
                flow: {
                    nodes: ["chatModel", "memory", "vectorStore", "conversationChain"],
                    template: "customer-support"
                },
                metrics: { satisfaction: 0.92, avgResponseTime: 2.3, usage: 15000 },
                tags: ["customer-service", "chatbot", "faq", "support"]
            },
            {
                title: "PDF Document Analyzer",
                description: "Extract and analyze information from PDF documents",
                userQuery: "Analyze PDF documents and extract key information",
                components: ["pdfLoader", "recursiveTextSplitter", "openAIEmbeddings", "pinecone", "conversationalRetrievalQA"],
                flow: {
                    nodes: ["documentLoader", "textSplitter", "embeddings", "vectorStore", "retrievalChain"],
                    template: "document-analysis"
                },
                metrics: { accuracy: 0.88, avgResponseTime: 4.5, usage: 8500 },
                tags: ["pdf", "document-analysis", "extraction", "rag"]
            },
            {
                title: "Web Research Assistant",
                description: "Search the web and summarize findings on any topic",
                userQuery: "Create an agent that can search the web and summarize articles",
                components: ["webBrowser", "searchAPI", "chatOpenAI", "summarizationChain", "bufferMemory"],
                flow: {
                    nodes: ["webTools", "chatModel", "summarizer", "memory"],
                    template: "web-research"
                },
                metrics: { accuracy: 0.85, avgResponseTime: 6.2, usage: 12000 },
                tags: ["web-search", "research", "summarization", "browser"]
            },
            {
                title: "Code Review Assistant",
                description: "Analyze code and provide improvement suggestions",
                userQuery: "I need an AI that can review my code and suggest improvements",
                components: ["githubLoader", "codeSplitter", "chatGPT4", "codeAnalysisChain"],
                flow: {
                    nodes: ["codeLoader", "analyzer", "suggestionGenerator"],
                    template: "code-review"
                },
                metrics: { satisfaction: 0.89, avgResponseTime: 3.8, usage: 6500 },
                tags: ["code-review", "programming", "github", "development"]
            },
            {
                title: "Data Analysis Pipeline",
                description: "Analyze CSV/Excel data and generate insights",
                userQuery: "Analyze spreadsheet data and create visualizations",
                components: ["csvLoader", "pandasDataFrame", "chatOpenAI", "pythonREPL", "chartGenerator"],
                flow: {
                    nodes: ["dataLoader", "dataProcessor", "analyzer", "visualizer"],
                    template: "data-analysis"
                },
                metrics: { accuracy: 0.91, avgResponseTime: 5.5, usage: 9000 },
                tags: ["data-analysis", "csv", "excel", "visualization", "insights"]
            }
        ]

        // Store use cases in vector store
        const documents = defaultUseCases.map(useCase => 
            new Document({
                pageContent: `${useCase.title} ${useCase.description} ${useCase.userQuery} ${useCase.tags.join(' ')}`,
                metadata: useCase
            })
        )

        if (this.vectorStore) {
            await this.vectorStore.addDocuments(documents)
            console.log(`✅ Loaded ${defaultUseCases.length} default use cases`)
        }

        // Also store in database for persistence
        await this.storeUseCasesInDB(defaultUseCases)
    }

    /**
     * Find similar use cases based on user query
     */
    async findSimilarCases(query: string, k: number = 5): Promise<SimilarCase[]> {
        if (!this.vectorStore) {
            await this.initialize()
        }

        try {
            const results = await this.vectorStore!.similaritySearchWithScore(query, k)
            
            return results.map(([doc, score]) => ({
                useCase: doc.metadata as UseCase,
                score
            })).filter(result => result.score > 0.7) // Only return relevant matches
        } catch (error) {
            console.error('Error finding similar cases:', error)
            return []
        }
    }

    /**
     * Learn from a new successful flow
     */
    async learnFromNewFlow(
        userQuery: string,
        flow: any,
        components: string[],
        performance: any
    ): Promise<void> {
        // Only learn from successful flows
        if (performance.userSatisfaction < 0.8 || performance.errorRate > 0.1) {
            return
        }

        const newUseCase: UseCase = {
            title: this.generateTitle(userQuery),
            description: this.generateDescription(flow),
            userQuery,
            components,
            flow: {
                nodes: flow.nodes.map((n: any) => n.data.name),
                template: 'custom'
            },
            metrics: {
                satisfaction: performance.userSatisfaction,
                avgResponseTime: performance.avgResponseTime,
                accuracy: performance.accuracy,
                usage: 1
            },
            tags: this.extractTags(userQuery, components),
            createdAt: new Date()
        }

        // Add to vector store
        const document = new Document({
            pageContent: `${newUseCase.title} ${newUseCase.description} ${newUseCase.userQuery} ${newUseCase.tags.join(' ')}`,
            metadata: newUseCase
        })

        if (this.vectorStore) {
            await this.vectorStore.addDocuments([document])
        }

        // Store in database
        await this.storeUseCasesInDB([newUseCase])
        
        console.log('✅ Learned from new successful flow:', newUseCase.title)
    }

    /**
     * Get suggested questions based on missing information
     */
    async getSuggestedQuestions(query: string, missingInfo: string[]): Promise<any[]> {
        const questions = []

        // Find similar cases to provide better context
        const similarCases = await this.findSimilarCases(query, 3)
        const commonComponents = this.extractCommonComponents(similarCases)

        if (missingInfo.includes('data_source')) {
            questions.push({
                id: 'data_source',
                question: '¿De dónde vendrán los datos que necesitas procesar?',
                options: [
                    { value: 'pdf', label: 'Archivos PDF', popular: commonComponents.includes('pdfLoader') },
                    { value: 'web', label: 'Páginas web', popular: commonComponents.includes('webBrowser') },
                    { value: 'database', label: 'Base de datos SQL', popular: commonComponents.includes('sqlDatabase') },
                    { value: 'api', label: 'APIs externas (REST/GraphQL)', popular: commonComponents.includes('apiChain') },
                    { value: 'csv', label: 'Archivos Excel/CSV', popular: commonComponents.includes('csvLoader') },
                    { value: 'other', label: 'Otro tipo de fuente' }
                ],
                multiSelect: true,
                required: true
            })
        }

        if (missingInfo.includes('output_format')) {
            questions.push({
                id: 'output_format',
                question: '¿En qué formato necesitas los resultados?',
                options: [
                    { value: 'text', label: 'Resumen de texto' },
                    { value: 'structured', label: 'Reporte estructurado (Markdown/HTML)' },
                    { value: 'json', label: 'Datos en formato JSON' },
                    { value: 'csv', label: 'Archivo CSV para Excel' },
                    { value: 'dashboard', label: 'Dashboard visual con gráficos' },
                    { value: 'chat', label: 'Respuesta conversacional' }
                ],
                multiSelect: false,
                required: true
            })
        }

        if (missingInfo.includes('volume')) {
            questions.push({
                id: 'volume',
                question: '¿Cuál es el volumen aproximado de datos?',
                options: [
                    { value: 'small', label: 'Pequeño (< 100 documentos/registros)' },
                    { value: 'medium', label: 'Mediano (100-1000 documentos/registros)' },
                    { value: 'large', label: 'Grande (1000-10000 documentos/registros)' },
                    { value: 'very_large', label: 'Muy grande (> 10000 documentos/registros)' }
                ],
                multiSelect: false,
                required: true
            })
        }

        return questions
    }

    /**
     * Store use cases in database
     */
    private async storeUseCasesInDB(useCases: UseCase[]): Promise<void> {
        try {
            const app = getRunningExpressApp()
            const datasource: DataSource = app.get('datasource')
            
            // Store in database for persistence
            const queryRunner = datasource.createQueryRunner()
            await queryRunner.connect()

            for (const useCase of useCases) {
                await queryRunner.query(
                    `INSERT INTO use_cases (title, description, user_query, components, flow, metrics, tags, created_at)
                     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
                     ON CONFLICT (user_query) DO UPDATE SET
                     metrics = $6, updated_at = CURRENT_TIMESTAMP`,
                    [
                        useCase.title,
                        useCase.description,
                        useCase.userQuery,
                        JSON.stringify(useCase.components),
                        JSON.stringify(useCase.flow),
                        JSON.stringify(useCase.metrics),
                        JSON.stringify(useCase.tags),
                        useCase.createdAt || new Date()
                    ]
                )
            }

            await queryRunner.release()
        } catch (error) {
            console.error('Error storing use cases in DB:', error)
        }
    }

    /**
     * Helper methods
     */
    private generateTitle(query: string): string {
        // Simple title generation from query
        const words = query.toLowerCase().split(' ')
        const keywords = words.filter(w => w.length > 3 && !['need', 'want', 'create', 'make'].includes(w))
        return keywords.slice(0, 3).map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ') + ' Agent'
    }

    private generateDescription(flow: any): string {
        const nodeTypes = flow.nodes.map((n: any) => n.data.type)
        return `Automated workflow using ${nodeTypes.slice(0, 3).join(', ')} and more`
    }

    private extractTags(query: string, components: string[]): string[] {
        const tags = []
        
        // Extract tags from query
        if (query.match(/customer|support|help/i)) tags.push('customer-service')
        if (query.match(/document|pdf|file/i)) tags.push('document-processing')
        if (query.match(/web|search|browse/i)) tags.push('web-research')
        if (query.match(/code|program|develop/i)) tags.push('development')
        if (query.match(/data|analyz|insight/i)) tags.push('data-analysis')
        
        // Add component-based tags
        if (components.some(c => c.includes('pdf'))) tags.push('pdf')
        if (components.some(c => c.includes('web'))) tags.push('web')
        if (components.some(c => c.includes('sql'))) tags.push('database')
        
        return [...new Set(tags)]
    }

    private extractCommonComponents(similarCases: SimilarCase[]): string[] {
        const componentCounts = new Map<string, number>()
        
        similarCases.forEach(sc => {
            sc.useCase.components.forEach(comp => {
                componentCounts.set(comp, (componentCounts.get(comp) || 0) + 1)
            })
        })
        
        // Return components that appear in at least 2 cases
        return Array.from(componentCounts.entries())
            .filter(([_, count]) => count >= 2)
            .map(([comp, _]) => comp)
    }
}

// Singleton instance
let knowledgeBaseInstance: UseCaseKnowledgeBase | null = null

export function getUseCaseKnowledgeBase(): UseCaseKnowledgeBase {
    if (!knowledgeBaseInstance) {
        knowledgeBaseInstance = new UseCaseKnowledgeBase()
    }
    return knowledgeBaseInstance
}