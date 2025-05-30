import { Tool } from 'langchain/tools'
import { exec } from 'child_process'
import { promisify } from 'util'
import { readFile } from 'fs/promises'
import path from 'path'

const execAsync = promisify(exec)

export interface DiagnosticResult {
    success: boolean
    timestamp: string
    diagnosticType: string
    results: any
    error?: string
}

export class WindowsDiagnosticsTool extends Tool {
    name = 'windows-diagnostics'
    description = 'Executes Windows diagnostic commands and analyzes system logs for troubleshooting'
    
    private scriptsPath: string
    
    constructor() {
        super()
        this.scriptsPath = path.join(__dirname, '../scripts')
    }
    
    async _call(input: string): Promise<string> {
        try {
            // Parse input to determine diagnostic type
            const diagnosticType = this.parseDiagnosticType(input)
            
            // Execute PowerShell diagnostic script
            const scriptPath = path.join(this.scriptsPath, 'diagnostic-suite.ps1')
            const command = `powershell -ExecutionPolicy Bypass -File "${scriptPath}" -DiagnosticType ${diagnosticType}`
            
            const { stdout, stderr } = await execAsync(command, {
                timeout: 120000 // 2 minute timeout
            })
            
            if (stderr && !stderr.includes('WARNING')) {
                throw new Error(`Diagnostic error: ${stderr}`)
            }
            
            // Read the generated report
            const reportPath = stdout.trim().split('\n').pop() || ''
            if (reportPath && reportPath.includes('.json')) {
                const reportContent = await readFile(reportPath, 'utf-8')
                const report = JSON.parse(reportContent) as DiagnosticResult
                
                // Format the results for the AI
                return this.formatDiagnosticResults(report)
            }
            
            return `Diagnostic completed but no report was generated. Output: ${stdout}`
            
        } catch (error) {
            return `Failed to run diagnostics: ${error.message}`
        }
    }
    
    private parseDiagnosticType(input: string): string {
        const lowerInput = input.toLowerCase()
        
        if (lowerInput.includes('network')) return 'Network'
        if (lowerInput.includes('performance') || lowerInput.includes('slow')) return 'Performance'
        if (lowerInput.includes('security') || lowerInput.includes('virus')) return 'Security'
        if (lowerInput.includes('full') || lowerInput.includes('complete')) return 'Full'
        
        return 'Quick'
    }
    
    private formatDiagnosticResults(report: DiagnosticResult): string {
        let formatted = `Windows 11 Diagnostic Report\n`
        formatted += `========================\n`
        formatted += `Timestamp: ${report.timestamp}\n`
        formatted += `Computer: ${report.results.systemInfo?.data?.computerName || 'Unknown'}\n\n`
        
        // System Info
        if (report.results.systemInfo?.success) {
            const sys = report.results.systemInfo.data
            formatted += `System Information:\n`
            formatted += `- OS: ${sys.OS} (Build ${sys.BuildNumber})\n`
            formatted += `- Architecture: ${sys.OSArchitecture}\n`
            formatted += `- Memory: ${sys.FreeMemoryGB}GB free of ${sys.TotalMemoryGB}GB\n`
            formatted += `- Last Boot: ${sys.LastBootTime}\n\n`
        }
        
        // Device Issues
        if (report.results.deviceIssues?.success && report.results.deviceIssues.data?.length > 0) {
            formatted += `⚠️ Device Issues Found:\n`
            report.results.deviceIssues.data.forEach((device: any) => {
                formatted += `- ${device.FriendlyName}: ${device.Status} (${device.Class})\n`
            })
            formatted += '\n'
        }
        
        // Recent Errors
        if (report.results.recentErrors?.success && report.results.recentErrors.data?.length > 0) {
            formatted += `Recent System Errors:\n`
            const errors = report.results.recentErrors.data.slice(0, 5)
            errors.forEach((error: any) => {
                formatted += `- [${error.TimeCreated}] ${error.ProviderName}: ${error.Message?.substring(0, 100)}...\n`
            })
            formatted += '\n'
        }
        
        // Network Status
        if (report.results.network?.success) {
            const net = report.results.network.data
            formatted += `Network Status:\n`
            if (net.Adapters) {
                net.Adapters.forEach((adapter: any) => {
                    formatted += `- ${adapter.Name}: ${adapter.Status} (${adapter.LinkSpeed || 'N/A'})\n`
                })
            }
            if (net.ConnectionTest) {
                formatted += `- Internet Connectivity: ${net.ConnectionTest.PingSucceeded ? 'OK' : 'Failed'}\n`
            }
            formatted += '\n'
        }
        
        // Performance Metrics
        if (report.results.performance?.success) {
            const perf = report.results.performance.data
            formatted += `Performance Metrics:\n`
            formatted += `Top CPU Consumers:\n`
            perf.TopProcessesCPU?.slice(0, 3).forEach((proc: any) => {
                formatted += `- ${proc.Name}: CPU ${proc.CPU || 0}, Memory ${proc.MemoryMB}MB\n`
            })
            formatted += '\n'
        }
        
        // Security Status
        if (report.results.security?.success) {
            const sec = report.results.security.data
            if (sec.WindowsDefender) {
                formatted += `Security Status:\n`
                formatted += `- Antivirus: ${sec.WindowsDefender.AntivirusEnabled ? 'Enabled' : 'Disabled'}\n`
                formatted += `- Real-time Protection: ${sec.WindowsDefender.RealTimeProtectionEnabled ? 'Enabled' : 'Disabled'}\n`
                formatted += `- Last Update: ${sec.WindowsDefender.AntivirusSignatureLastUpdated}\n\n`
            }
        }
        
        return formatted
    }
}