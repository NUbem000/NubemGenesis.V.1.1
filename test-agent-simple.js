// Simple test agent without external dependencies
const https = require('https');

class SimpleTestAgent {
    constructor() {
        this.baseURL = 'nubemgenesis-orchestrator-7ut3uy4xcq-uc.a.run.app';
        this.apiKey = 'test-api-key-123';
        this.results = { passed: 0, failed: 0, tests: [] };
    }

    makeRequest(method, path, data = null) {
        return new Promise((resolve, reject) => {
            const options = {
                hostname: this.baseURL,
                path: path,
                method: method,
                headers: {
                    'Content-Type': 'application/json',
                    'x-api-key': this.apiKey
                }
            };

            if (data) {
                options.headers['Content-Length'] = Buffer.byteLength(JSON.stringify(data));
            }

            const req = https.request(options, (res) => {
                let body = '';
                res.on('data', chunk => body += chunk);
                res.on('end', () => {
                    try {
                        const response = JSON.parse(body);
                        resolve({ success: res.statusCode < 400, data: response, status: res.statusCode });
                    } catch (e) {
                        resolve({ success: false, error: body, status: res.statusCode });
                    }
                });
            });

            req.on('error', (e) => {
                reject({ success: false, error: e.message });
            });

            if (data) {
                req.write(JSON.stringify(data));
            }
            req.end();
        });
    }

    async testHealthCheck() {
        console.log('\n🏥 Testing Health Check...');
        try {
            const result = await this.makeRequest('GET', '/api/v1/orchestrate/health');
            const passed = result.success && result.data.status === 'healthy';
            
            this.recordTest('Health Check', passed, result);
            
            if (passed) {
                console.log('✅ Health check passed');
                console.log(`   Version: ${result.data.version}`);
            } else {
                console.log('❌ Health check failed');
            }
            return passed;
        } catch (error) {
            console.log('❌ Health check error:', error.error);
            this.recordTest('Health Check', false, error);
            return false;
        }
    }

    async testOrchestration() {
        console.log('\n🎯 Testing Orchestration...');
        
        const testCases = [
            {
                name: 'Simple Chatbot',
                data: {
                    request: 'Create a simple chatbot',
                    config: { maxCost: 0.01, maxLatency: 2000, minQuality: 0.7 }
                }
            },
            {
                name: 'High Quality RAG',
                data: {
                    request: 'Build a legal document analyzer',
                    config: { maxCost: 0.1, maxLatency: 5000, minQuality: 0.95 }
                }
            }
        ];

        for (const test of testCases) {
            console.log(`\n  Testing: ${test.name}`);
            try {
                const result = await this.makeRequest('POST', '/api/v1/orchestrate', test.data);
                const passed = result.success && result.data.status === 'success';
                
                this.recordTest(`Orchestration - ${test.name}`, passed, result);
                
                if (passed) {
                    console.log(`  ✅ Success - Model: ${result.data.model}`);
                } else {
                    console.log(`  ❌ Failed`);
                }
            } catch (error) {
                console.log(`  ❌ Error:`, error.error);
                this.recordTest(`Orchestration - ${test.name}`, false, error);
            }
        }
    }

    async testEndpoints() {
        console.log('\n🔌 Testing API Endpoints...');
        
        const endpoints = [
            { path: '/api/v1/orchestrate/models', name: 'Models' },
            { path: '/api/v1/orchestrate/leaderboard', name: 'Leaderboard' },
            { path: '/api/v1/orchestrate/capabilities', name: 'Capabilities' },
            { path: '/api/v1/orchestrate/metrics', name: 'Metrics' }
        ];

        for (const endpoint of endpoints) {
            console.log(`\n  Testing: ${endpoint.name}`);
            try {
                const result = await this.makeRequest('GET', endpoint.path);
                const passed = result.success;
                
                this.recordTest(`Endpoint - ${endpoint.name}`, passed, result);
                
                if (passed) {
                    console.log(`  ✅ ${endpoint.name} accessible`);
                } else {
                    console.log(`  ❌ ${endpoint.name} failed`);
                }
            } catch (error) {
                console.log(`  ❌ Error:`, error.error);
                this.recordTest(`Endpoint - ${endpoint.name}`, false, error);
            }
        }
    }

    recordTest(name, passed, details) {
        this.results.tests.push({ name, passed, details });
        if (passed) {
            this.results.passed++;
        } else {
            this.results.failed++;
        }
    }

    generateReport() {
        console.log('\n' + '='.repeat(60));
        console.log('📊 TEST REPORT');
        console.log('='.repeat(60));
        
        const total = this.results.passed + this.results.failed;
        const passRate = total > 0 ? ((this.results.passed / total) * 100).toFixed(1) : 0;
        
        console.log(`\nTotal Tests: ${total}`);
        console.log(`Passed: ${this.results.passed}`);
        console.log(`Failed: ${this.results.failed}`);
        console.log(`Pass Rate: ${passRate}%`);
        
        console.log('\nDetailed Results:');
        console.log('-'.repeat(60));
        
        this.results.tests.forEach((test, index) => {
            const status = test.passed ? '✅' : '❌';
            console.log(`\n${index + 1}. ${status} ${test.name}`);
            if (!test.passed && test.details) {
                console.log(`   Status: ${test.details.status || 'N/A'}`);
                if (test.details.error) {
                    console.log(`   Error: ${test.details.error}`);
                }
            }
        });
        
        console.log('\n' + '='.repeat(60));
        
        // Save report
        require('fs').writeFileSync(
            'test-report-simple.json',
            JSON.stringify({
                timestamp: new Date().toISOString(),
                summary: {
                    total,
                    passed: this.results.passed,
                    failed: this.results.failed,
                    passRate: `${passRate}%`
                },
                tests: this.results.tests
            }, null, 2)
        );
        
        console.log('\n📄 Report saved to test-report-simple.json');
        
        if (passRate >= 80) {
            console.log('\n✅ TEST SUITE PASSED!');
        } else {
            console.log('\n❌ TEST SUITE FAILED!');
        }
    }

    async runAllTests() {
        console.log('\n🚀 Starting NubemGenesis Test Suite (Simple Version)...\n');
        console.log(`Base URL: https://${this.baseURL}`);
        console.log('='.repeat(60));
        
        await this.testHealthCheck();
        await this.testOrchestration();
        await this.testEndpoints();
        
        this.generateReport();
    }
}

// Run tests
const agent = new SimpleTestAgent();
agent.runAllTests().catch(console.error);