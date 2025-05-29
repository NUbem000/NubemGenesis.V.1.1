/**
 * Security Sandbox for NubemGenesis
 * Provides isolated execution environments for agents with code execution capabilities
 */

import { ICommonObject } from '../../../components/src/Interface'
import { spawn, ChildProcess } from 'child_process'
import * as crypto from 'crypto'
import * as fs from 'fs/promises'
import * as path from 'path'
import * as vm from 'vm'

export type SandboxType = 'vm' | 'docker' | 'wasm' | 'gvisor'
export type SecurityLevel = 'low' | 'medium' | 'high'

export interface SandboxConfig {
    type: SandboxType
    securityLevel: SecurityLevel
    timeout: number // milliseconds
    memoryLimit: number // MB
    cpuLimit: number // percentage (0-100)
    networkAccess: boolean
    fileSystemAccess: 'none' | 'readonly' | 'restricted' | 'full'
    allowedPaths?: string[]
    env?: Record<string, string>
}

export interface ExecutionRequest {
    code: string
    language: 'javascript' | 'python' | 'bash' | 'powershell'
    args?: string[]
    stdin?: string
    env?: Record<string, string>
    workingDir?: string
}

export interface ExecutionResult {
    success: boolean
    stdout: string
    stderr: string
    exitCode: number
    executionTime: number
    memoryUsed?: number
    sandboxId: string
    securityViolations?: string[]
}

export interface SandboxPermissions {
    canExecuteCode: boolean
    canAccessNetwork: boolean
    canAccessFileSystem: boolean
    canSpawnProcesses: boolean
    maxExecutionTime: number
    maxMemoryUsage: number
    allowedCommands?: string[]
    blockedCommands?: string[]
}

export class SecuritySandbox {
    private sandboxes: Map<string, SandboxInstance>
    private auditLog: AuditEntry[]
    private signingKey: Buffer

    constructor() {
        this.sandboxes = new Map()
        this.auditLog = []
        this.signingKey = this.loadOrGenerateSigningKey()
    }

    /**
     * Create a new sandbox instance
     */
    async createSandbox(config: SandboxConfig): Promise<string> {
        const sandboxId = this.generateSandboxId()
        const sandbox = new SandboxInstance(sandboxId, config)
        
        await sandbox.initialize()
        this.sandboxes.set(sandboxId, sandbox)
        
        this.logAudit({
            action: 'sandbox_created',
            sandboxId,
            config,
            timestamp: new Date()
        })

        return sandboxId
    }

    /**
     * Execute code in a sandbox
     */
    async execute(
        sandboxId: string, 
        request: ExecutionRequest,
        permissions: SandboxPermissions
    ): Promise<ExecutionResult> {
        const sandbox = this.sandboxes.get(sandboxId)
        if (!sandbox) {
            throw new Error(`Sandbox ${sandboxId} not found`)
        }

        // Validate permissions
        this.validatePermissions(request, permissions)

        // Sign the code for audit trail
        const signature = this.signCode(request.code)

        // Log execution attempt
        this.logAudit({
            action: 'code_execution_attempted',
            sandboxId,
            language: request.language,
            codeHash: crypto.createHash('sha256').update(request.code).digest('hex'),
            signature,
            timestamp: new Date()
        })

        try {
            // Execute based on sandbox type
            const result = await sandbox.execute(request, permissions)
            
            // Check for security violations
            const violations = this.checkSecurityViolations(request.code, result)
            if (violations.length > 0) {
                result.securityViolations = violations
                this.handleSecurityViolation(sandboxId, violations)
            }

            // Log successful execution
            this.logAudit({
                action: 'code_execution_completed',
                sandboxId,
                success: result.success,
                executionTime: result.executionTime,
                violations: violations.length,
                timestamp: new Date()
            })

            return result

        } catch (error) {
            // Log execution error
            this.logAudit({
                action: 'code_execution_failed',
                sandboxId,
                error: error.message,
                timestamp: new Date()
            })

            throw error
        }
    }

    /**
     * Destroy a sandbox
     */
    async destroySandbox(sandboxId: string): Promise<void> {
        const sandbox = this.sandboxes.get(sandboxId)
        if (!sandbox) return

        await sandbox.cleanup()
        this.sandboxes.delete(sandboxId)

        this.logAudit({
            action: 'sandbox_destroyed',
            sandboxId,
            timestamp: new Date()
        })
    }

    /**
     * Validate execution permissions
     */
    private validatePermissions(request: ExecutionRequest, permissions: SandboxPermissions): void {
        if (!permissions.canExecuteCode) {
            throw new Error('Code execution not permitted')
        }

        // Check for blocked commands
        if (permissions.blockedCommands) {
            for (const cmd of permissions.blockedCommands) {
                if (request.code.includes(cmd)) {
                    throw new Error(`Blocked command detected: ${cmd}`)
                }
            }
        }

        // Validate allowed commands
        if (permissions.allowedCommands && request.language === 'bash') {
            const commands = this.extractBashCommands(request.code)
            for (const cmd of commands) {
                if (!permissions.allowedCommands.includes(cmd)) {
                    throw new Error(`Command not allowed: ${cmd}`)
                }
            }
        }
    }

    /**
     * Check for security violations in execution
     */
    private checkSecurityViolations(code: string, result: ExecutionResult): string[] {
        const violations: string[] = []

        // Check for suspicious patterns
        const suspiciousPatterns = [
            { pattern: /rm\s+-rf\s+\//, message: 'Attempted to delete root directory' },
            { pattern: /:(){ :|:& };:/, message: 'Fork bomb detected' },
            { pattern: /nc\s+-l|-e\s+\/bin\/(bash|sh)/, message: 'Reverse shell attempt detected' },
            { pattern: /wget|curl.*\|\s*(bash|sh)/, message: 'Remote code execution attempt' },
            { pattern: /\/etc\/passwd|\/etc\/shadow/, message: 'Attempted to access sensitive files' },
            { pattern: /sudo\s+/, message: 'Privilege escalation attempt' },
            { pattern: /iptables|firewall/, message: 'Firewall manipulation attempt' }
        ]

        for (const { pattern, message } of suspiciousPatterns) {
            if (pattern.test(code) || pattern.test(result.stdout) || pattern.test(result.stderr)) {
                violations.push(message)
            }
        }

        return violations
    }

    /**
     * Handle security violation
     */
    private handleSecurityViolation(sandboxId: string, violations: string[]): void {
        console.error(`🚨 Security violations in sandbox ${sandboxId}:`, violations)
        
        // Immediately terminate the sandbox
        this.destroySandbox(sandboxId).catch(console.error)

        // TODO: Send alert to administrators
        // TODO: Block the user/agent that triggered the violation
    }

    /**
     * Extract bash commands from code
     */
    private extractBashCommands(code: string): string[] {
        const commands: string[] = []
        const lines = code.split('\n')
        
        for (const line of lines) {
            const trimmed = line.trim()
            if (trimmed && !trimmed.startsWith('#')) {
                const cmd = trimmed.split(/\s+/)[0]
                if (cmd) commands.push(cmd)
            }
        }
        
        return commands
    }

    /**
     * Sign code for audit trail
     */
    private signCode(code: string): string {
        const hmac = crypto.createHmac('sha256', this.signingKey)
        hmac.update(code)
        return hmac.digest('hex')
    }

    /**
     * Generate sandbox ID
     */
    private generateSandboxId(): string {
        return `sandbox_${Date.now()}_${crypto.randomBytes(8).toString('hex')}`
    }

    /**
     * Load or generate signing key
     */
    private loadOrGenerateSigningKey(): Buffer {
        const keyPath = process.env.SANDBOX_SIGNING_KEY_PATH || '.sandbox-key'
        
        try {
            // Try to load existing key
            const key = fs.readFileSync(keyPath)
            return key
        } catch {
            // Generate new key
            const key = crypto.randomBytes(32)
            fs.writeFileSync(keyPath, key)
            return key
        }
    }

    /**
     * Log audit entry
     */
    private logAudit(entry: AuditEntry): void {
        this.auditLog.push(entry)
        
        // Also log to console in development
        if (process.env.NODE_ENV === 'development') {
            console.log('🔍 Sandbox Audit:', entry)
        }

        // TODO: Send to centralized logging system
    }

    /**
     * Get audit log
     */
    getAuditLog(sandboxId?: string): AuditEntry[] {
        if (sandboxId) {
            return this.auditLog.filter(entry => entry.sandboxId === sandboxId)
        }
        return [...this.auditLog]
    }
}

/**
 * Individual sandbox instance
 */
class SandboxInstance {
    private id: string
    private config: SandboxConfig
    private container?: ChildProcess
    private vmContext?: vm.Context

    constructor(id: string, config: SandboxConfig) {
        this.id = id
        this.config = config
    }

    async initialize(): Promise<void> {
        switch (this.config.type) {
            case 'vm':
                await this.initializeVM()
                break
            case 'docker':
                await this.initializeDocker()
                break
            case 'wasm':
                await this.initializeWASM()
                break
            case 'gvisor':
                await this.initializeGVisor()
                break
        }
    }

    async execute(request: ExecutionRequest, permissions: SandboxPermissions): Promise<ExecutionResult> {
        const startTime = Date.now()
        
        switch (this.config.type) {
            case 'vm':
                return this.executeInVM(request, permissions, startTime)
            case 'docker':
                return this.executeInDocker(request, permissions, startTime)
            default:
                throw new Error(`Sandbox type ${this.config.type} not implemented`)
        }
    }

    /**
     * Initialize VM sandbox
     */
    private async initializeVM(): Promise<void> {
        // Create isolated context with limited globals
        this.vmContext = vm.createContext({
            console: {
                log: (...args: any[]) => console.log('[SANDBOX]', ...args),
                error: (...args: any[]) => console.error('[SANDBOX]', ...args)
            },
            setTimeout: undefined,
            setInterval: undefined,
            process: undefined,
            require: undefined,
            __dirname: undefined,
            __filename: undefined,
            global: undefined
        })
    }

    /**
     * Execute in VM sandbox
     */
    private async executeInVM(
        request: ExecutionRequest, 
        permissions: SandboxPermissions,
        startTime: number
    ): Promise<ExecutionResult> {
        if (request.language !== 'javascript') {
            throw new Error('VM sandbox only supports JavaScript')
        }

        if (!this.vmContext) {
            throw new Error('VM context not initialized')
        }

        const stdout: string[] = []
        const stderr: string[] = []

        // Override console methods to capture output
        const originalLog = console.log
        const originalError = console.error

        ;(this.vmContext as any).console.log = (...args: any[]) => {
            stdout.push(args.map(a => String(a)).join(' '))
        }
        ;(this.vmContext as any).console.error = (...args: any[]) => {
            stderr.push(args.map(a => String(a)).join(' '))
        }

        try {
            // Create script with timeout
            const script = new vm.Script(request.code, {
                timeout: permissions.maxExecutionTime || this.config.timeout,
                filename: 'sandbox-script.js'
            })

            // Run in context
            script.runInContext(this.vmContext)

            return {
                success: true,
                stdout: stdout.join('\n'),
                stderr: stderr.join('\n'),
                exitCode: 0,
                executionTime: Date.now() - startTime,
                sandboxId: this.id
            }

        } catch (error) {
            return {
                success: false,
                stdout: stdout.join('\n'),
                stderr: stderr.join('\n') + '\n' + error.message,
                exitCode: 1,
                executionTime: Date.now() - startTime,
                sandboxId: this.id
            }
        } finally {
            // Restore console methods
            console.log = originalLog
            console.error = originalError
        }
    }

    /**
     * Initialize Docker sandbox
     */
    private async initializeDocker(): Promise<void> {
        // Pull sandbox image if not exists
        await this.pullSandboxImage()
        
        // Create container with resource limits
        const args = [
            'run',
            '-d',
            '--rm',
            `--name=${this.id}`,
            `--memory=${this.config.memoryLimit}m`,
            `--cpus=${this.config.cpuLimit / 100}`,
            '--network=none', // No network by default
            '--read-only', // Read-only root filesystem
            '--security-opt=no-new-privileges',
            'nubemgenesis/sandbox:latest',
            'sleep', '3600' // Keep alive for 1 hour
        ]

        if (this.config.networkAccess) {
            // Remove network isolation if permitted
            const networkIndex = args.indexOf('--network=none')
            args.splice(networkIndex, 1)
        }

        this.container = spawn('docker', args)
    }

    /**
     * Execute in Docker sandbox
     */
    private async executeInDocker(
        request: ExecutionRequest,
        permissions: SandboxPermissions,
        startTime: number
    ): Promise<ExecutionResult> {
        const execArgs = [
            'exec',
            '-i',
            this.id
        ]

        // Map language to interpreter
        switch (request.language) {
            case 'python':
                execArgs.push('python3', '-c', request.code)
                break
            case 'javascript':
                execArgs.push('node', '-e', request.code)
                break
            case 'bash':
                execArgs.push('bash', '-c', request.code)
                break
            default:
                throw new Error(`Language ${request.language} not supported in Docker sandbox`)
        }

        return new Promise((resolve) => {
            const proc = spawn('docker', execArgs)
            const stdout: Buffer[] = []
            const stderr: Buffer[] = []

            proc.stdout.on('data', (data) => stdout.push(data))
            proc.stderr.on('data', (data) => stderr.push(data))

            // Set timeout
            const timeout = setTimeout(() => {
                proc.kill('SIGKILL')
            }, permissions.maxExecutionTime || this.config.timeout)

            proc.on('exit', (code) => {
                clearTimeout(timeout)
                
                resolve({
                    success: code === 0,
                    stdout: Buffer.concat(stdout).toString(),
                    stderr: Buffer.concat(stderr).toString(),
                    exitCode: code || 0,
                    executionTime: Date.now() - startTime,
                    sandboxId: this.id
                })
            })

            // Send stdin if provided
            if (request.stdin) {
                proc.stdin.write(request.stdin)
                proc.stdin.end()
            }
        })
    }

    /**
     * Initialize WASM sandbox
     */
    private async initializeWASM(): Promise<void> {
        // TODO: Implement WebAssembly sandbox
        throw new Error('WASM sandbox not yet implemented')
    }

    /**
     * Initialize gVisor sandbox
     */
    private async initializeGVisor(): Promise<void> {
        // TODO: Implement gVisor (runsc) sandbox
        throw new Error('gVisor sandbox not yet implemented')
    }

    /**
     * Pull Docker sandbox image
     */
    private async pullSandboxImage(): Promise<void> {
        return new Promise((resolve, reject) => {
            const proc = spawn('docker', ['pull', 'nubemgenesis/sandbox:latest'])
            
            proc.on('exit', (code) => {
                if (code === 0) {
                    resolve()
                } else {
                    // If pull fails, try to build locally
                    this.buildSandboxImage().then(resolve).catch(reject)
                }
            })
        })
    }

    /**
     * Build sandbox Docker image
     */
    private async buildSandboxImage(): Promise<void> {
        // Create minimal Dockerfile
        const dockerfile = `
FROM alpine:latest
RUN apk add --no-cache python3 nodejs npm bash
RUN adduser -D -s /bin/bash sandbox
USER sandbox
WORKDIR /sandbox
`
        const dockerfilePath = path.join('/tmp', `Dockerfile.${this.id}`)
        await fs.writeFile(dockerfilePath, dockerfile)

        return new Promise((resolve, reject) => {
            const proc = spawn('docker', [
                'build',
                '-t', 'nubemgenesis/sandbox:latest',
                '-f', dockerfilePath,
                '/tmp'
            ])

            proc.on('exit', async (code) => {
                // Clean up
                await fs.unlink(dockerfilePath).catch(() => {})
                
                if (code === 0) {
                    resolve()
                } else {
                    reject(new Error('Failed to build sandbox image'))
                }
            })
        })
    }

    async cleanup(): Promise<void> {
        switch (this.config.type) {
            case 'docker':
                if (this.container) {
                    spawn('docker', ['stop', this.id])
                }
                break
            case 'vm':
                this.vmContext = undefined
                break
        }
    }
}

interface AuditEntry {
    action: string
    sandboxId?: string
    timestamp: Date
    [key: string]: any
}

// Export singleton instance
export const securitySandbox = new SecuritySandbox()