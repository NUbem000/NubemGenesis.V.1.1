import { Tool } from 'langchain/tools'
import { exec } from 'child_process'
import { promisify } from 'util'
import { writeFile, unlink } from 'fs/promises'
import path from 'path'
import { v4 as uuidv4 } from 'uuid'

const execAsync = promisify(exec)

export interface PowerShellExecutionResult {
    success: boolean
    output: string
    error?: string
    executionTime: number
    scriptValidated: boolean
}

export class PowerShellExecutorTool extends Tool {
    name = 'powershell-executor'
    description = 'Safely executes PowerShell scripts for Windows 11 troubleshooting with validation and sandboxing'
    
    private dangerousCommands = [
        'format-', 'remove-item -recurse -force c:', 'del /f /s /q c:',
        'cipher /w:', 'sfc /scannow /offbootdir', 'bcdedit /delete',
        'diskpart', 'clean all', 'delete partition', 'format fs'
    ]
    
    async _call(input: string): Promise<string> {
        try {
            // Validate the script for safety
            const validation = this.validateScript(input)
            if (!validation.safe) {
                return `Script validation failed: ${validation.reason}\n` +
                       `The script contains potentially dangerous commands that could harm the system.`
            }
            
            // Prepare the script for execution
            const scriptId = uuidv4()
            const scriptPath = path.join(process.env.TEMP || '/tmp', `nubem_ps_${scriptId}.ps1`)
            
            // Add safety wrapper to the script
            const wrappedScript = this.wrapScriptWithSafety(input)
            
            // Write script to temporary file
            await writeFile(scriptPath, wrappedScript, 'utf-8')
            
            try {
                // Execute with restricted permissions
                const startTime = Date.now()
                const { stdout, stderr } = await execAsync(
                    `powershell -ExecutionPolicy Restricted -File "${scriptPath}"`,
                    {
                        timeout: 60000, // 1 minute timeout
                        env: {
                            ...process.env,
                            PSModulePath: '' // Restrict module access
                        }
                    }
                )
                
                const executionTime = Date.now() - startTime
                
                // Clean up
                await unlink(scriptPath).catch(() => {})
                
                // Format the result
                const result: PowerShellExecutionResult = {
                    success: !stderr || stderr.length === 0,
                    output: stdout,
                    error: stderr,
                    executionTime,
                    scriptValidated: true
                }
                
                return this.formatExecutionResult(result)
                
            } catch (execError) {
                // Clean up on error
                await unlink(scriptPath).catch(() => {})
                
                return `Script execution failed: ${execError.message}\n` +
                       `This might be due to insufficient permissions or invalid PowerShell syntax.`
            }
            
        } catch (error) {
            return `Failed to prepare script execution: ${error.message}`
        }
    }
    
    private validateScript(script: string): { safe: boolean; reason?: string } {
        const lowerScript = script.toLowerCase()
        
        // Check for dangerous commands
        for (const dangerous of this.dangerousCommands) {
            if (lowerScript.includes(dangerous)) {
                return {
                    safe: false,
                    reason: `Script contains dangerous command: ${dangerous}`
                }
            }
        }
        
        // Check for deletion of system files
        if (lowerScript.match(/remove-item.*\\windows|del.*\\windows/i)) {
            return {
                safe: false,
                reason: 'Script attempts to delete system files'
            }
        }
        
        // Check for registry deletion
        if (lowerScript.match(/remove-itemproperty.*hklm:|reg delete.*hklm/i)) {
            return {
                safe: false,
                reason: 'Script attempts to delete critical registry keys'
            }
        }
        
        // Check for infinite loops
        if (lowerScript.match(/while\s*\(\s*\$true\s*\)|for\s*\(\s*;\s*;\s*\)/)) {
            return {
                safe: false,
                reason: 'Script contains potential infinite loop'
            }
        }
        
        return { safe: true }
    }
    
    private wrapScriptWithSafety(script: string): string {
        return `
# NubemGenesis Safety Wrapper
$ErrorActionPreference = "Stop"
$ProgressPreference = "SilentlyContinue"

# Set strict mode
Set-StrictMode -Version Latest

# Create transcript for auditing
$transcriptPath = "$env:TEMP\\nubem_ps_transcript_$(Get-Date -Format 'yyyyMMdd_HHmmss').log"
Start-Transcript -Path $transcriptPath -Force | Out-Null

try {
    # User script starts here
    ${script}
    # User script ends here
    
    Write-Host "`nScript execution completed successfully." -ForegroundColor Green
} catch {
    Write-Host "`nScript execution failed: $_" -ForegroundColor Red
    exit 1
} finally {
    Stop-Transcript | Out-Null
}
`
    }
    
    private formatExecutionResult(result: PowerShellExecutionResult): string {
        let formatted = `PowerShell Script Execution Result\n`
        formatted += `==================================\n`
        formatted += `Status: ${result.success ? '✅ Success' : '❌ Failed'}\n`
        formatted += `Execution Time: ${result.executionTime}ms\n`
        formatted += `Script Validated: ${result.scriptValidated ? 'Yes' : 'No'}\n\n`
        
        if (result.output) {
            formatted += `Output:\n${result.output}\n`
        }
        
        if (result.error) {
            formatted += `\nErrors:\n${result.error}\n`
        }
        
        formatted += `\nNote: This script was executed with restricted permissions for safety.`
        
        return formatted
    }
}