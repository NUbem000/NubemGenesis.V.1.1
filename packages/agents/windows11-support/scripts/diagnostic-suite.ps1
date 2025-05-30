# Windows 11 Diagnostic Suite for NubemGenesis Support Agent
# Version: 1.0.0
# Author: NubemGenesis Team

<#
.SYNOPSIS
    Comprehensive Windows 11 diagnostic script for troubleshooting common issues
.DESCRIPTION
    This script performs various diagnostic checks and generates reports for the AI agent
.PARAMETER DiagnosticType
    Type of diagnostic to run: Full, Quick, Network, Performance, Security
#>

param(
    [Parameter(Mandatory=$false)]
    [ValidateSet("Full", "Quick", "Network", "Performance", "Security")]
    [string]$DiagnosticType = "Quick",
    
    [Parameter(Mandatory=$false)]
    [string]$OutputPath = "$env:TEMP\NubemGenesis_Diagnostics"
)

# Create output directory
if (!(Test-Path $OutputPath)) {
    New-Item -ItemType Directory -Path $OutputPath -Force | Out-Null
}

$timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
$reportFile = Join-Path $OutputPath "diagnostic_report_$timestamp.json"

# Initialize report object
$report = @{
    timestamp = $timestamp
    computerName = $env:COMPUTERNAME
    diagnosticType = $DiagnosticType
    results = @{}
}

Write-Host "Starting Windows 11 Diagnostics..." -ForegroundColor Cyan
Write-Host "Type: $DiagnosticType" -ForegroundColor Yellow

# Function to safely execute commands and capture results
function Safe-Execute {
    param(
        [string]$CommandName,
        [scriptblock]$Command
    )
    
    try {
        Write-Host "Running: $CommandName" -ForegroundColor Gray
        $result = & $Command
        return @{
            success = $true
            data = $result
            error = $null
        }
    }
    catch {
        return @{
            success = $false
            data = $null
            error = $_.Exception.Message
        }
    }
}

# System Information
if ($DiagnosticType -in @("Full", "Quick")) {
    $report.results.systemInfo = Safe-Execute "System Information" {
        Get-CimInstance Win32_OperatingSystem | Select-Object @{
            Name='OS'; Expression={$_.Caption}
        }, Version, BuildNumber, OSArchitecture, 
        @{Name='InstallDate'; Expression={$_.InstallDate}},
        @{Name='LastBootTime'; Expression={$_.LastBootUpTime}},
        @{Name='TotalMemoryGB'; Expression={[math]::Round($_.TotalVisibleMemorySize/1MB, 2)}},
        @{Name='FreeMemoryGB'; Expression={[math]::Round($_.FreePhysicalMemory/1MB, 2)}}
    }
}

# Hardware Information
if ($DiagnosticType -in @("Full", "Quick")) {
    $report.results.hardware = Safe-Execute "Hardware Information" {
        @{
            CPU = Get-CimInstance Win32_Processor | Select-Object Name, NumberOfCores, NumberOfLogicalProcessors, MaxClockSpeed
            GPU = Get-CimInstance Win32_VideoController | Select-Object Name, DriverVersion, DriverDate, VideoModeDescription
            Disks = Get-PhysicalDisk | Select-Object FriendlyName, MediaType, Size, HealthStatus, OperationalStatus
        }
    }
}

# Recent Errors
if ($DiagnosticType -in @("Full", "Quick")) {
    $report.results.recentErrors = Safe-Execute "Recent System Errors" {
        Get-WinEvent -FilterHashtable @{
            LogName = 'System', 'Application'
            Level = 1, 2  # Critical and Error
            StartTime = (Get-Date).AddDays(-7)
        } -MaxEvents 20 | Select-Object TimeCreated, Id, LevelDisplayName, Message, ProviderName
    }
}

# Network Diagnostics
if ($DiagnosticType -in @("Full", "Network")) {
    $report.results.network = Safe-Execute "Network Configuration" {
        @{
            Adapters = Get-NetAdapter | Select-Object Name, Status, LinkSpeed, MacAddress
            IPConfig = Get-NetIPConfiguration | Select-Object InterfaceAlias, IPv4Address, IPv6Address, DNSServer
            ConnectionTest = Test-NetConnection -ComputerName "8.8.8.8" -InformationLevel Detailed
            DNSTest = Resolve-DnsName "www.microsoft.com" -ErrorAction SilentlyContinue
        }
    }
}

# Performance Metrics
if ($DiagnosticType -in @("Full", "Performance")) {
    $report.results.performance = Safe-Execute "Performance Metrics" {
        @{
            TopProcessesCPU = Get-Process | Sort-Object CPU -Descending | Select-Object -First 10 Name, 
                @{Name='CPU'; Expression={$_.CPU}}, 
                @{Name='MemoryMB'; Expression={[math]::Round($_.WorkingSet64/1MB, 2)}}
            
            TopProcessesMemory = Get-Process | Sort-Object WorkingSet64 -Descending | Select-Object -First 10 Name,
                @{Name='MemoryMB'; Expression={[math]::Round($_.WorkingSet64/1MB, 2)}},
                @{Name='CPU'; Expression={$_.CPU}}
            
            DiskUsage = Get-PSDrive -PSProvider FileSystem | Where-Object {$_.Used -ne $null} | Select-Object Name,
                @{Name='UsedGB'; Expression={[math]::Round($_.Used/1GB, 2)}},
                @{Name='FreeGB'; Expression={[math]::Round($_.Free/1GB, 2)}},
                @{Name='PercentUsed'; Expression={[math]::Round(($_.Used/($_.Used+$_.Free))*100, 2)}}
        }
    }
}

# Security Status
if ($DiagnosticType -in @("Full", "Security")) {
    $report.results.security = Safe-Execute "Security Status" {
        @{
            WindowsDefender = Get-MpComputerStatus | Select-Object AntivirusEnabled, AntispywareEnabled, 
                RealTimeProtectionEnabled, IoavProtectionEnabled, OnAccessProtectionEnabled,
                AntivirusSignatureLastUpdated
            
            Firewall = Get-NetFirewallProfile | Select-Object Name, Enabled, DefaultInboundAction, DefaultOutboundAction
            
            WindowsUpdate = Get-HotFix | Sort-Object InstalledOn -Descending | Select-Object -First 10 HotFixID, 
                Description, InstalledOn, InstalledBy
        }
    }
}

# Startup Programs
if ($DiagnosticType -eq "Full") {
    $report.results.startup = Safe-Execute "Startup Programs" {
        Get-CimInstance Win32_StartupCommand | Select-Object Name, Command, Location, User
    }
}

# Device Manager Issues
if ($DiagnosticType -in @("Full", "Quick")) {
    $report.results.deviceIssues = Safe-Execute "Device Manager Issues" {
        Get-PnpDevice | Where-Object {$_.Status -ne 'OK'} | Select-Object FriendlyName, Status, Class, InstanceId
    }
}

# Windows Update Status
if ($DiagnosticType -in @("Full", "Quick")) {
    $report.results.windowsUpdate = Safe-Execute "Windows Update Status" {
        $updateSession = New-Object -ComObject Microsoft.Update.Session
        $updateSearcher = $updateSession.CreateUpdateSearcher()
        
        try {
            $pendingUpdates = $updateSearcher.Search("IsInstalled=0 and Type='Software'").Updates
            
            if ($pendingUpdates.Count -gt 0) {
                $pendingUpdates | ForEach-Object {
                    @{
                        Title = $_.Title
                        Severity = $_.MsrcSeverity
                        Size = [math]::Round($_.MaxDownloadSize/1MB, 2)
                    }
                }
            } else {
                "No pending updates"
            }
        } catch {
            "Unable to check for updates: $_"
        }
    }
}

# Save report
$report | ConvertTo-Json -Depth 10 | Out-File -FilePath $reportFile -Encoding UTF8

Write-Host "`nDiagnostic Complete!" -ForegroundColor Green
Write-Host "Report saved to: $reportFile" -ForegroundColor Yellow

# Display summary
Write-Host "`n=== SUMMARY ===" -ForegroundColor Cyan

if ($report.results.systemInfo.success) {
    $sysInfo = $report.results.systemInfo.data
    Write-Host "OS: $($sysInfo.OS) - Build $($sysInfo.BuildNumber)" -ForegroundColor White
    Write-Host "Memory: $($sysInfo.FreeMemoryGB)GB free of $($sysInfo.TotalMemoryGB)GB" -ForegroundColor White
}

if ($report.results.deviceIssues.success -and $report.results.deviceIssues.data) {
    Write-Host "`nDevice Issues Found: $($report.results.deviceIssues.data.Count)" -ForegroundColor Red
}

if ($report.results.recentErrors.success -and $report.results.recentErrors.data) {
    Write-Host "Recent Errors: $($report.results.recentErrors.data.Count)" -ForegroundColor Yellow
}

# Return report path for the AI agent
return $reportFile