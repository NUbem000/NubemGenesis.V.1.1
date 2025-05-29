/**
 * Evaluation Pipeline for NubemGenesis
 * Automated testing and benchmarking of models and tools
 */

import { ICommonObject } from '../../../components/src/Interface'
import { LiteLLMRouter } from './LiteLLMRouter'
import axios from 'axios'
import * as fs from 'fs/promises'
import * as path from 'path'

export interface BenchmarkTask {
    id: string
    name: string
    category: 'reasoning' | 'coding' | 'creativity' | 'factuality' | 'instruction-following'
    prompt: string
    expectedCapabilities: string[]
    evaluationCriteria: {
        metric: string
        weight: number
        scoringFunction: (response: string) => number
    }[]
}

export interface BenchmarkResult {
    taskId: string
    model: string
    scores: Record<string, number>
    latency: number
    cost: number
    timestamp: Date
    metadata?: ICommonObject
}

export interface EvaluationReport {
    model: string
    overallScore: number
    categoryScores: Record<string, number>
    performanceMetrics: {
        avgLatency: number
        p95Latency: number
        throughput: number
        errorRate: number
    }
    costAnalysis: {
        avgCostPerRequest: number
        costPer1kTokens: number
        costEfficiencyScore: number
    }
    recommendations: string[]
}

export class EvaluationPipeline {
    private benchmarkTasks: Map<string, BenchmarkTask>
    private results: BenchmarkResult[]
    private litellmRouter: LiteLLMRouter
    private webhookUrl?: string

    constructor(webhookUrl?: string) {
        this.benchmarkTasks = new Map()
        this.results = []
        this.litellmRouter = new LiteLLMRouter()
        this.webhookUrl = webhookUrl || process.env.EVAL_WEBHOOK_URL
        this.initializeBenchmarks()
    }

    /**
     * Initialize standard benchmark tasks
     */
    private initializeBenchmarks(): void {
        // Reasoning benchmark
        this.addBenchmark({
            id: 'reasoning-001',
            name: 'Multi-step Reasoning',
            category: 'reasoning',
            prompt: `A farmer has 17 sheep. All but 9 die. Then he buys 5 more sheep. 
                    Half of his current sheep have lambs, with each having 2 lambs. 
                    How many sheep does the farmer have now in total?`,
            expectedCapabilities: ['logical-reasoning', 'arithmetic'],
            evaluationCriteria: [
                {
                    metric: 'correctness',
                    weight: 0.8,
                    scoringFunction: (response: string) => {
                        const answer = this.extractNumber(response)
                        return answer === 26 ? 1.0 : 0.0
                    }
                },
                {
                    metric: 'explanation',
                    weight: 0.2,
                    scoringFunction: (response: string) => {
                        const hasSteps = response.includes('9') && response.includes('14') && response.includes('26')
                        return hasSteps ? 1.0 : 0.5
                    }
                }
            ]
        })

        // Coding benchmark
        this.addBenchmark({
            id: 'coding-001',
            name: 'Algorithm Implementation',
            category: 'coding',
            prompt: `Write a Python function that finds the longest palindromic substring in a given string. 
                    The function should be efficient and handle edge cases. Include comments explaining the approach.`,
            expectedCapabilities: ['code-generation', 'algorithm-design'],
            evaluationCriteria: [
                {
                    metric: 'syntax',
                    weight: 0.3,
                    scoringFunction: (response: string) => {
                        const hasFunction = response.includes('def ') && response.includes('return')
                        const hasPython = response.includes('python') || response.includes('```py')
                        return hasFunction && hasPython ? 1.0 : 0.0
                    }
                },
                {
                    metric: 'correctness',
                    weight: 0.5,
                    scoringFunction: (response: string) => {
                        const hasKeyAlgorithm = response.includes('for') || response.includes('while')
                        const checksPalindrome = response.includes('==') && (response.includes('reverse') || response.includes('[::-1]'))
                        return hasKeyAlgorithm && checksPalindrome ? 1.0 : 0.3
                    }
                },
                {
                    metric: 'comments',
                    weight: 0.2,
                    scoringFunction: (response: string) => {
                        const commentCount = (response.match(/#|\/\//g) || []).length
                        return Math.min(commentCount / 3, 1.0)
                    }
                }
            ]
        })

        // Creativity benchmark
        this.addBenchmark({
            id: 'creativity-001',
            name: 'Creative Writing',
            category: 'creativity',
            prompt: `Write a short story (100-150 words) about a time traveler who can only travel forward in time 
                    by exactly 24 hours each jump, and discovers something unexpected.`,
            expectedCapabilities: ['creative-writing', 'storytelling'],
            evaluationCriteria: [
                {
                    metric: 'length',
                    weight: 0.2,
                    scoringFunction: (response: string) => {
                        const wordCount = response.split(/\s+/).length
                        if (wordCount >= 100 && wordCount <= 150) return 1.0
                        if (wordCount >= 80 && wordCount <= 170) return 0.7
                        return 0.3
                    }
                },
                {
                    metric: 'creativity',
                    weight: 0.5,
                    scoringFunction: (response: string) => {
                        const hasTimeTravel = response.toLowerCase().includes('time') || response.toLowerCase().includes('future')
                        const has24Hours = response.includes('24') || response.toLowerCase().includes('day')
                        const hasUnexpected = response.toLowerCase().includes('unexpected') || response.toLowerCase().includes('surprise') || response.toLowerCase().includes('discover')
                        return (hasTimeTravel ? 0.3 : 0) + (has24Hours ? 0.3 : 0) + (hasUnexpected ? 0.4 : 0)
                    }
                },
                {
                    metric: 'coherence',
                    weight: 0.3,
                    scoringFunction: (response: string) => {
                        const sentences = response.split(/[.!?]+/).filter(s => s.trim().length > 0)
                        return sentences.length >= 5 ? 1.0 : sentences.length / 5
                    }
                }
            ]
        })

        // Instruction following benchmark
        this.addBenchmark({
            id: 'instruction-001',
            name: 'Complex Instructions',
            category: 'instruction-following',
            prompt: `Follow these instructions exactly:
                    1. Write the word "HELLO" in reverse
                    2. Count the number of vowels in "artificial intelligence" 
                    3. List exactly 3 prime numbers between 10 and 20
                    4. End your response with the emoji: 🎯`,
            expectedCapabilities: ['instruction-following', 'attention-to-detail'],
            evaluationCriteria: [
                {
                    metric: 'reverse',
                    weight: 0.25,
                    scoringFunction: (response: string) => {
                        return response.includes('OLLEH') ? 1.0 : 0.0
                    }
                },
                {
                    metric: 'vowel-count',
                    weight: 0.25,
                    scoringFunction: (response: string) => {
                        return response.includes('11') ? 1.0 : 0.0
                    }
                },
                {
                    metric: 'primes',
                    weight: 0.25,
                    scoringFunction: (response: string) => {
                        const primes = ['11', '13', '17', '19']
                        const foundPrimes = primes.filter(p => response.includes(p))
                        return foundPrimes.length >= 3 ? 1.0 : foundPrimes.length / 3
                    }
                },
                {
                    metric: 'emoji',
                    weight: 0.25,
                    scoringFunction: (response: string) => {
                        return response.includes('🎯') ? 1.0 : 0.0
                    }
                }
            ]
        })
    }

    /**
     * Add a custom benchmark task
     */
    addBenchmark(task: BenchmarkTask): void {
        this.benchmarkTasks.set(task.id, task)
    }

    /**
     * Run evaluation for a specific model
     */
    async evaluateModel(modelId: string, taskIds?: string[]): Promise<EvaluationReport> {
        console.log(`🧪 Starting evaluation for model: ${modelId}`)
        
        const tasksToRun = taskIds 
            ? Array.from(this.benchmarkTasks.values()).filter(t => taskIds.includes(t.id))
            : Array.from(this.benchmarkTasks.values())

        const results: BenchmarkResult[] = []
        
        for (const task of tasksToRun) {
            try {
                const result = await this.runBenchmarkTask(modelId, task)
                results.push(result)
                this.results.push(result)
                
                // Send intermediate results if webhook configured
                if (this.webhookUrl) {
                    await this.sendWebhook('task_complete', result)
                }
                
            } catch (error) {
                console.error(`Error running task ${task.id}:`, error)
            }
        }

        // Generate report
        const report = this.generateReport(modelId, results)
        
        // Save results
        await this.saveResults(modelId, results, report)
        
        // Send final report
        if (this.webhookUrl) {
            await this.sendWebhook('evaluation_complete', report)
        }

        return report
    }

    /**
     * Run a single benchmark task
     */
    private async runBenchmarkTask(modelId: string, task: BenchmarkTask): Promise<BenchmarkResult> {
        const startTime = Date.now()
        
        try {
            // Execute the task
            const response = await this.litellmRouter.route({
                prompt: task.prompt,
                preferredModels: [modelId],
                constraints: {
                    maxTokens: 1000,
                    temperature: 0.7
                }
            })

            // Score the response
            const scores: Record<string, number> = {}
            let totalScore = 0
            let totalWeight = 0

            for (const criterion of task.evaluationCriteria) {
                const score = criterion.scoringFunction(response.content)
                scores[criterion.metric] = score
                totalScore += score * criterion.weight
                totalWeight += criterion.weight
            }

            scores['overall'] = totalWeight > 0 ? totalScore / totalWeight : 0

            return {
                taskId: task.id,
                model: modelId,
                scores,
                latency: response.latency,
                cost: response.usage.cost,
                timestamp: new Date(),
                metadata: {
                    tokensUsed: response.usage.totalTokens,
                    finishReason: response.metadata?.finishReason
                }
            }

        } catch (error) {
            // Return zero scores on error
            const scores: Record<string, number> = {}
            for (const criterion of task.evaluationCriteria) {
                scores[criterion.metric] = 0
            }
            scores['overall'] = 0

            return {
                taskId: task.id,
                model: modelId,
                scores,
                latency: Date.now() - startTime,
                cost: 0,
                timestamp: new Date(),
                metadata: {
                    error: error.message
                }
            }
        }
    }

    /**
     * Generate evaluation report
     */
    private generateReport(modelId: string, results: BenchmarkResult[]): EvaluationReport {
        // Calculate category scores
        const categoryScores: Record<string, number> = {}
        const categoryMap: Record<string, BenchmarkResult[]> = {}

        for (const result of results) {
            const task = this.benchmarkTasks.get(result.taskId)
            if (!task) continue

            if (!categoryMap[task.category]) {
                categoryMap[task.category] = []
            }
            categoryMap[task.category].push(result)
        }

        for (const [category, catResults] of Object.entries(categoryMap)) {
            const avgScore = catResults.reduce((sum, r) => sum + r.scores.overall, 0) / catResults.length
            categoryScores[category] = avgScore
        }

        // Calculate overall score
        const overallScore = results.reduce((sum, r) => sum + r.scores.overall, 0) / results.length

        // Calculate performance metrics
        const latencies = results.map(r => r.latency).sort((a, b) => a - b)
        const costs = results.map(r => r.cost)
        const errors = results.filter(r => r.metadata?.error).length

        const performanceMetrics = {
            avgLatency: latencies.reduce((sum, l) => sum + l, 0) / latencies.length,
            p95Latency: latencies[Math.floor(latencies.length * 0.95)] || latencies[latencies.length - 1],
            throughput: 1000 / (latencies.reduce((sum, l) => sum + l, 0) / latencies.length), // requests per second
            errorRate: errors / results.length
        }

        const costAnalysis = {
            avgCostPerRequest: costs.reduce((sum, c) => sum + c, 0) / costs.length,
            costPer1kTokens: 0, // TODO: Calculate from token usage
            costEfficiencyScore: overallScore / (costs.reduce((sum, c) => sum + c, 0) / costs.length) // score per dollar
        }

        // Generate recommendations
        const recommendations = this.generateRecommendations(overallScore, categoryScores, performanceMetrics, costAnalysis)

        return {
            model: modelId,
            overallScore,
            categoryScores,
            performanceMetrics,
            costAnalysis,
            recommendations
        }
    }

    /**
     * Generate recommendations based on evaluation results
     */
    private generateRecommendations(
        overallScore: number,
        categoryScores: Record<string, number>,
        performanceMetrics: any,
        costAnalysis: any
    ): string[] {
        const recommendations: string[] = []

        // Overall performance
        if (overallScore >= 0.9) {
            recommendations.push('✅ Excellent overall performance. Suitable for production use.')
        } else if (overallScore >= 0.7) {
            recommendations.push('👍 Good performance. Consider for most use cases.')
        } else if (overallScore >= 0.5) {
            recommendations.push('⚠️ Moderate performance. Best for non-critical tasks.')
        } else {
            recommendations.push('❌ Poor performance. Not recommended for production.')
        }

        // Category-specific recommendations
        for (const [category, score] of Object.entries(categoryScores)) {
            if (score < 0.6) {
                recommendations.push(`📊 Weak in ${category}. Consider alternative models for ${category}-heavy tasks.`)
            } else if (score > 0.85) {
                recommendations.push(`🌟 Excellent at ${category}. Ideal for ${category}-focused applications.`)
            }
        }

        // Performance recommendations
        if (performanceMetrics.avgLatency > 2000) {
            recommendations.push('🐌 High latency detected. Consider caching or using faster models for time-sensitive applications.')
        }
        if (performanceMetrics.errorRate > 0.1) {
            recommendations.push('⚠️ High error rate. Check API limits and implement retry logic.')
        }

        // Cost recommendations
        if (costAnalysis.costEfficiencyScore < 10) {
            recommendations.push('💰 Low cost efficiency. Consider using this model only for high-value tasks.')
        } else if (costAnalysis.costEfficiencyScore > 100) {
            recommendations.push('💎 Excellent cost efficiency. Great choice for high-volume applications.')
        }

        return recommendations
    }

    /**
     * Extract number from response
     */
    private extractNumber(response: string): number | null {
        const numbers = response.match(/\d+/)
        return numbers ? parseInt(numbers[0]) : null
    }

    /**
     * Save evaluation results
     */
    private async saveResults(modelId: string, results: BenchmarkResult[], report: EvaluationReport): Promise<void> {
        const timestamp = new Date().toISOString().replace(/:/g, '-')
        const filename = `evaluation_${modelId}_${timestamp}.json`
        const filepath = path.join(process.cwd(), 'evaluations', filename)

        const data = {
            modelId,
            timestamp: new Date(),
            results,
            report
        }

        try {
            await fs.mkdir(path.dirname(filepath), { recursive: true })
            await fs.writeFile(filepath, JSON.stringify(data, null, 2))
            console.log(`💾 Evaluation results saved to: ${filepath}`)
        } catch (error) {
            console.error('Error saving results:', error)
        }
    }

    /**
     * Send webhook notification
     */
    private async sendWebhook(event: string, data: any): Promise<void> {
        if (!this.webhookUrl) return

        try {
            await axios.post(this.webhookUrl, {
                event,
                timestamp: new Date(),
                data
            })
        } catch (error) {
            console.error('Error sending webhook:', error)
        }
    }

    /**
     * Compare multiple models
     */
    async compareModels(modelIds: string[], taskIds?: string[]): Promise<Map<string, EvaluationReport>> {
        const reports = new Map<string, EvaluationReport>()

        for (const modelId of modelIds) {
            const report = await this.evaluateModel(modelId, taskIds)
            reports.set(modelId, report)
        }

        // Generate comparison summary
        await this.generateComparisonSummary(reports)

        return reports
    }

    /**
     * Generate comparison summary
     */
    private async generateComparisonSummary(reports: Map<string, EvaluationReport>): Promise<void> {
        console.log('\n📊 Model Comparison Summary:')
        console.log('═'.repeat(80))

        // Sort models by overall score
        const sorted = Array.from(reports.entries()).sort((a, b) => b[1].overallScore - a[1].overallScore)

        sorted.forEach(([modelId, report], index) => {
            console.log(`${index + 1}. ${modelId}:`)
            console.log(`   Overall Score: ${(report.overallScore * 100).toFixed(1)}%`)
            console.log(`   Avg Latency: ${report.performanceMetrics.avgLatency.toFixed(0)}ms`)
            console.log(`   Cost per Request: $${report.costAnalysis.avgCostPerRequest.toFixed(4)}`)
            console.log(`   Best Category: ${Object.entries(report.categoryScores).sort((a, b) => b[1] - a[1])[0][0]}`)
            console.log()
        })

        console.log('═'.repeat(80))
    }
}

// Export singleton instance
export const evaluationPipeline = new EvaluationPipeline()