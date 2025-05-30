// NubemGenesis Test Agent MVP
// This agent tests all major functionalities of the orchestration system

const axios = require('axios');
const colors = require('colors');

class NubemGenesisTestAgent {
    constructor() {
        this.baseURL = 'https://nubemgenesis-orchestrator-7ut3uy4xcq-uc.a.run.app';
        this.apiKey = 'test-api-key-123';
        this.testResults = {
            passed: 0,
            failed: 0,
            tests: []
        };
    }

    // Helper method for API calls
    async makeRequest(method, endpoint, data = null) {
        try {
            const config = {
                method,
                url: `${this.baseURL}${endpoint}`,
                headers: {
                    'Content-Type': 'application/json',
                    'x-api-key': this.apiKey
                }
            };

            if (data) {
                config.data = data;
            }

            const response = await axios(config);
            return { success: true, data: response.data, status: response.status };
        } catch (error) {
            return { 
                success: false, 
                error: error.response?.data || error.message,
                status: error.response?.status 
            };
        }
    }

    // Test 1: Health Check
    async testHealthCheck() {
        console.log('\n🏥 Testing Health Check...');
        const result = await this.makeRequest('GET', '/api/v1/orchestrate/health');
        
        const test = {
            name: 'Health Check',
            endpoint: '/api/v1/orchestrate/health',
            passed: false,
            details: {}
        };

        if (result.success && result.data.status === 'healthy') {
            test.passed = true;
            test.details = result.data;
            console.log('✅ Health check passed'.green);
            console.log(`   Version: ${result.data.version}`);
            console.log(`   Features: ${Object.keys(result.data.features).join(', ')}`);
        } else {
            console.log('❌ Health check failed'.red);
            test.error = result.error;
        }

        this.recordTest(test);
        return test.passed;
    }

    // Test 2: Basic Orchestration
    async testBasicOrchestration() {
        console.log('\n🎯 Testing Basic Orchestration...');
        
        const testCases = [
            {
                name: 'Simple Chatbot',
                request: 'Create a simple chatbot',
                config: { maxCost: 0.01, maxLatency: 2000, minQuality: 0.7 }
            },
            {
                name: 'RAG System',
                request: 'Build a RAG system for document analysis',
                config: { maxCost: 0.05, maxLatency: 3000, minQuality: 0.85 }
            },
            {
                name: 'High Quality Request',
                request: 'Create a legal document analyzer with high accuracy',
                config: { maxCost: 0.1, maxLatency: 5000, minQuality: 0.95 }
            }
        ];

        for (const testCase of testCases) {
            console.log(`\n  📝 Testing: ${testCase.name}`);
            const result = await this.makeRequest('POST', '/api/v1/orchestrate', testCase);
            
            const test = {
                name: `Orchestration - ${testCase.name}`,
                endpoint: '/api/v1/orchestrate',
                input: testCase,
                passed: false,
                details: {}
            };

            if (result.success && result.data.status === 'success') {
                test.passed = true;
                test.details = {
                    model: result.data.model,
                    flowType: result.data.analysis?.type,
                    nodeCount: result.data.flow?.nodes?.length || 0
                };
                console.log(`  ✅ Generated flow with ${test.details.nodeCount} nodes using ${test.details.model}`.green);
            } else {
                console.log(`  ❌ Failed to generate flow`.red);
                test.error = result.error;
            }

            this.recordTest(test);
        }
    }

    // Test 3: Model Selection Logic
    async testModelSelection() {
        console.log('\n🤖 Testing Model Selection Logic...');
        
        const scenarios = [
            {
                name: 'Cost Optimized',
                config: { maxCost: 0.001, maxLatency: 5000, minQuality: 0.5 },
                expectedModels: ['mixtral-8x7b', 'gemini-pro']
            },
            {
                name: 'Quality Optimized',
                config: { maxCost: 1, maxLatency: 10000, minQuality: 0.95 },
                expectedModels: ['claude-3-opus', 'gpt-4']
            },
            {
                name: 'Balanced',
                config: { maxCost: 0.01, maxLatency: 2000, minQuality: 0.8 },
                expectedModels: ['gemini-pro', 'claude-3-sonnet', 'gpt-3.5-turbo']
            }
        ];

        for (const scenario of scenarios) {
            console.log(`\n  🎯 Testing: ${scenario.name}`);
            const result = await this.makeRequest('POST', '/api/v1/orchestrate', {
                request: 'Test query for model selection',
                config: scenario.config
            });

            const test = {
                name: `Model Selection - ${scenario.name}`,
                endpoint: '/api/v1/orchestrate',
                input: scenario.config,
                passed: false,
                details: {}
            };

            if (result.success) {
                const selectedModel = result.data.model;
                test.passed = scenario.expectedModels.includes(selectedModel);
                test.details = {
                    selectedModel,
                    expectedModels: scenario.expectedModels,
                    requirements: scenario.config
                };
                
                if (test.passed) {
                    console.log(`  ✅ Correctly selected ${selectedModel}`.green);
                } else {
                    console.log(`  ⚠️  Selected ${selectedModel}, expected one of: ${scenario.expectedModels.join(', ')}`.yellow);
                }
            } else {
                console.log(`  ❌ Model selection failed`.red);
                test.error = result.error;
            }

            this.recordTest(test);
        }
    }

    // Test 4: API Endpoints
    async testAPIEndpoints() {
        console.log('\n🔌 Testing API Endpoints...');
        
        const endpoints = [
            { method: 'GET', path: '/api/v1/orchestrate/models', name: 'List Models' },
            { method: 'GET', path: '/api/v1/orchestrate/leaderboard', name: 'Model Leaderboard' },
            { method: 'GET', path: '/api/v1/orchestrate/capabilities', name: 'List Capabilities' },
            { method: 'GET', path: '/api/v1/orchestrate/metrics', name: 'Get Metrics' },
            { method: 'GET', path: '/api/v1/orchestrate/schedule/status', name: 'Schedule Status' }
        ];

        for (const endpoint of endpoints) {
            console.log(`\n  🔗 Testing: ${endpoint.name}`);
            const result = await this.makeRequest(endpoint.method, endpoint.path);
            
            const test = {
                name: `API - ${endpoint.name}`,
                endpoint: endpoint.path,
                method: endpoint.method,
                passed: false,
                details: {}
            };

            if (result.success) {
                test.passed = true;
                test.details = {
                    status: result.status,
                    hasData: !!result.data
                };
                console.log(`  ✅ ${endpoint.name} responded successfully`.green);
            } else {
                console.log(`  ❌ ${endpoint.name} failed`.red);
                test.error = result.error;
            }

            this.recordTest(test);
        }
    }

    // Test 5: Security Sandbox
    async testSecuritySandbox() {
        console.log('\n🔒 Testing Security Sandbox...');
        
        const testCases = [
            {
                name: 'Safe Code',
                code: 'const result = 2 + 2; return result;',
                shouldPass: true
            },
            {
                name: 'File System Access',
                code: 'const fs = require("fs"); fs.readFileSync("/etc/passwd");',
                shouldPass: false
            },
            {
                name: 'Network Request',
                code: 'require("http").get("http://malicious.com");',
                shouldPass: false
            }
        ];

        for (const testCase of testCases) {
            console.log(`\n  🛡️  Testing: ${testCase.name}`);
            const result = await this.makeRequest('POST', '/api/v1/orchestrate/sandbox/execute', {
                code: testCase.code,
                level: 'strict'
            });

            const test = {
                name: `Security - ${testCase.name}`,
                endpoint: '/api/v1/orchestrate/sandbox/execute',
                input: { code: testCase.code },
                passed: false,
                details: {}
            };

            if (testCase.shouldPass) {
                test.passed = result.success;
                if (test.passed) {
                    console.log(`  ✅ Safe code executed successfully`.green);
                } else {
                    console.log(`  ❌ Safe code was blocked incorrectly`.red);
                }
            } else {
                test.passed = !result.success || result.data?.blocked;
                if (test.passed) {
                    console.log(`  ✅ Dangerous code was blocked correctly`.green);
                } else {
                    console.log(`  ❌ Dangerous code was not blocked!`.red);
                }
            }

            this.recordTest(test);
        }
    }

    // Test 6: Performance & Load
    async testPerformance() {
        console.log('\n⚡ Testing Performance...');
        
        const concurrentRequests = 5;
        const requests = [];
        
        console.log(`  Sending ${concurrentRequests} concurrent requests...`);
        
        const startTime = Date.now();
        
        for (let i = 0; i < concurrentRequests; i++) {
            requests.push(this.makeRequest('POST', '/api/v1/orchestrate', {
                request: `Test request ${i}`,
                config: { maxCost: 0.01, maxLatency: 3000, minQuality: 0.8 }
            }));
        }
        
        const results = await Promise.all(requests);
        const endTime = Date.now();
        const totalTime = endTime - startTime;
        const avgTime = totalTime / concurrentRequests;
        
        const test = {
            name: 'Performance - Concurrent Requests',
            endpoint: '/api/v1/orchestrate',
            passed: false,
            details: {
                concurrentRequests,
                totalTime,
                averageTime: avgTime,
                successCount: results.filter(r => r.success).length
            }
        };
        
        test.passed = test.details.successCount === concurrentRequests && avgTime < 3000;
        
        if (test.passed) {
            console.log(`  ✅ All requests completed successfully`.green);
            console.log(`     Average time: ${avgTime.toFixed(0)}ms`);
        } else {
            console.log(`  ❌ Performance test failed`.red);
            console.log(`     Success rate: ${test.details.successCount}/${concurrentRequests}`);
        }
        
        this.recordTest(test);
    }

    // Helper method to record test results
    recordTest(test) {
        this.testResults.tests.push(test);
        if (test.passed) {
            this.testResults.passed++;
        } else {
            this.testResults.failed++;
        }
    }

    // Generate test report
    generateReport() {
        console.log('\n' + '='.repeat(60));
        console.log('📊 TEST REPORT'.bold);
        console.log('='.repeat(60));
        
        const total = this.testResults.passed + this.testResults.failed;
        const passRate = ((this.testResults.passed / total) * 100).toFixed(1);
        
        console.log(`\nTotal Tests: ${total}`);
        console.log(`Passed: ${this.testResults.passed}`.green);
        console.log(`Failed: ${this.testResults.failed}`.red);
        console.log(`Pass Rate: ${passRate}%\n`);
        
        // Detailed results
        console.log('Detailed Results:');
        console.log('-'.repeat(60));
        
        this.testResults.tests.forEach((test, index) => {
            const status = test.passed ? '✅' : '❌';
            console.log(`\n${index + 1}. ${status} ${test.name}`);
            if (test.endpoint) {
                console.log(`   Endpoint: ${test.endpoint}`);
            }
            if (!test.passed && test.error) {
                console.log(`   Error: ${JSON.stringify(test.error)}`.red);
            }
            if (test.details && Object.keys(test.details).length > 0) {
                console.log(`   Details: ${JSON.stringify(test.details, null, 2).gray}`);
            }
        });
        
        console.log('\n' + '='.repeat(60));
        
        // Save report to file
        const reportData = {
            timestamp: new Date().toISOString(),
            summary: {
                total,
                passed: this.testResults.passed,
                failed: this.testResults.failed,
                passRate: `${passRate}%`
            },
            tests: this.testResults.tests
        };
        
        require('fs').writeFileSync(
            'test-report.json',
            JSON.stringify(reportData, null, 2)
        );
        
        console.log('\n📄 Detailed report saved to test-report.json');
        
        return passRate >= 80; // Return true if pass rate is 80% or higher
    }

    // Main test runner
    async runAllTests() {
        console.log('\n🚀 Starting NubemGenesis Test Suite...\n');
        console.log(`Base URL: ${this.baseURL}`);
        console.log(`API Key: ${this.apiKey}`);
        console.log('='.repeat(60));
        
        // Run all tests
        await this.testHealthCheck();
        await this.testBasicOrchestration();
        await this.testModelSelection();
        await this.testAPIEndpoints();
        await this.testSecuritySandbox();
        await this.testPerformance();
        
        // Generate report
        const passed = this.generateReport();
        
        if (passed) {
            console.log('\n✅ TEST SUITE PASSED!'.green.bold);
        } else {
            console.log('\n❌ TEST SUITE FAILED!'.red.bold);
            process.exit(1);
        }
    }
}

// Run tests if called directly
if (require.main === module) {
    const agent = new NubemGenesisTestAgent();
    agent.runAllTests().catch(console.error);
}

module.exports = NubemGenesisTestAgent;