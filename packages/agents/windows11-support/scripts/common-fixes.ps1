# Windows 11 Common Fixes Script Collection
# Version: 1.0.0
# Author: NubemGenesis Team

<#
.SYNOPSIS
    Collection of common Windows 11 fixes that can be executed safely
.PARAMETER FixType
    The type of fix to apply
.PARAMETER CreateRestorePoint
    Whether to create a system restore point before applying fixes
#>

param(
    [Parameter(Mandatory=$true)]
    [ValidateSet("NetworkReset", "WindowsUpdateReset", "PerformanceOptimization", 
                 "DiskCleanup", "DriverRefresh", "SecurityReset", "AppReset")]
    [string]$FixType,
    
    [Parameter(Mandatory=$false)]
    [bool]$CreateRestorePoint = $true
)

# Check for administrator privileges
if (-not ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole] "Administrator")) {
    Write-Host "This script requires Administrator privileges!" -ForegroundColor Red
    exit 1
}

# Create restore point if requested
if ($CreateRestorePoint) {
    Write-Host "Creating System Restore Point..." -ForegroundColor Yellow
    try {
        Enable-ComputerRestore -Drive "C:\" -ErrorAction SilentlyContinue
        Checkpoint-Computer -Description "NubemGenesis Fix: $FixType" -RestorePointType "MODIFY_SETTINGS" -ErrorAction Stop
        Write-Host "Restore point created successfully" -ForegroundColor Green
    } catch {
        Write-Host "Warning: Could not create restore point: $_" -ForegroundColor Yellow
        $continue = Read-Host "Continue without restore point? (Y/N)"
        if ($continue -ne 'Y') { exit }
    }
}

# Function to log actions
function Write-FixLog {
    param([string]$Message, [string]$Level = "Info")
    $logPath = "$env:TEMP\NubemGenesis_Fixes.log"
    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    "$timestamp [$Level] $Message" | Add-Content -Path $logPath
    
    switch ($Level) {
        "Error" { Write-Host $Message -ForegroundColor Red }
        "Warning" { Write-Host $Message -ForegroundColor Yellow }
        "Success" { Write-Host $Message -ForegroundColor Green }
        default { Write-Host $Message -ForegroundColor White }
    }
}

# Execute fix based on type
Write-FixLog "Starting $FixType fix..." "Info"

switch ($FixType) {
    "NetworkReset" {
        Write-FixLog "Resetting Network Configuration..." "Info"
        
        $commands = @(
            @{cmd = "netsh winsock reset"; desc = "Resetting Winsock Catalog"},
            @{cmd = "netsh int ip reset"; desc = "Resetting TCP/IP Stack"},
            @{cmd = "netsh advfirewall reset"; desc = "Resetting Windows Firewall"},
            @{cmd = "ipconfig /release"; desc = "Releasing IP Configuration"},
            @{cmd = "ipconfig /flushdns"; desc = "Flushing DNS Cache"},
            @{cmd = "ipconfig /renew"; desc = "Renewing IP Configuration"},
            @{cmd = "nbtstat -R"; desc = "Purging NetBIOS Cache"},
            @{cmd = "nbtstat -RR"; desc = "Releasing and Refreshing NetBIOS Names"}
        )
        
        foreach ($command in $commands) {
            Write-FixLog $command.desc "Info"
            try {
                Invoke-Expression $command.cmd 2>&1 | Out-Null
                Write-FixLog "$($command.desc) - Completed" "Success"
            } catch {
                Write-FixLog "$($command.desc) - Failed: $_" "Error"
            }
        }
        
        Write-FixLog "Network reset complete. Please restart your computer." "Success"
    }
    
    "WindowsUpdateReset" {
        Write-FixLog "Resetting Windows Update Components..." "Info"
        
        # Stop services
        $services = @("wuauserv", "cryptSvc", "bits", "msiserver")
        foreach ($service in $services) {
            Write-FixLog "Stopping $service service..." "Info"
            Stop-Service -Name $service -Force -ErrorAction SilentlyContinue
        }
        
        # Rename folders
        $folders = @(
            @{path = "C:\Windows\SoftwareDistribution"; newname = "SoftwareDistribution.old"},
            @{path = "C:\Windows\System32\catroot2"; newname = "catroot2.old"}
        )
        
        foreach ($folder in $folders) {
            if (Test-Path $folder.path) {
                Write-FixLog "Renaming $($folder.path)..." "Info"
                try {
                    Rename-Item -Path $folder.path -NewName $folder.newname -Force -ErrorAction Stop
                } catch {
                    Write-FixLog "Could not rename $($folder.path): $_" "Warning"
                }
            }
        }
        
        # Re-register DLLs
        $dlls = @("atl.dll", "urlmon.dll", "mshtml.dll", "shdocvw.dll", 
                  "browseui.dll", "jscript.dll", "vbscript.dll", "scrrun.dll",
                  "msxml.dll", "msxml3.dll", "msxml6.dll", "actxprxy.dll",
                  "softpub.dll", "wintrust.dll", "dssenh.dll", "rsaenh.dll",
                  "gpkcsp.dll", "sccbase.dll", "slbcsp.dll", "cryptdlg.dll",
                  "oleaut32.dll", "ole32.dll", "shell32.dll", "initpki.dll",
                  "wuapi.dll", "wuaueng.dll", "wuaueng1.dll", "wucltui.dll",
                  "wups.dll", "wups2.dll", "wuweb.dll", "qmgr.dll", "qmgrprxy.dll",
                  "wucltux.dll", "muweb.dll", "wuwebv.dll")
        
        foreach ($dll in $dlls) {
            regsvr32.exe /s $dll 2>&1 | Out-Null
        }
        
        # Reset Winsock
        netsh winsock reset 2>&1 | Out-Null
        netsh winhttp reset proxy 2>&1 | Out-Null
        
        # Start services
        foreach ($service in $services) {
            Write-FixLog "Starting $service service..." "Info"
            Start-Service -Name $service -ErrorAction SilentlyContinue
        }
        
        Write-FixLog "Windows Update reset complete. Please restart your computer." "Success"
    }
    
    "PerformanceOptimization" {
        Write-FixLog "Optimizing Windows 11 Performance..." "Info"
        
        # Disable unnecessary startup programs
        Write-FixLog "Analyzing startup programs..." "Info"
        $startupItems = Get-CimInstance Win32_StartupCommand | Where-Object { 
            $_.Name -notmatch "Windows|Microsoft|Security|Defender" 
        }
        Write-FixLog "Found $($startupItems.Count) third-party startup items" "Info"
        
        # Disable SysMain (Superfetch) if causing issues
        $sysmain = Get-Service -Name "SysMain" -ErrorAction SilentlyContinue
        if ($sysmain -and $sysmain.Status -eq "Running") {
            Write-FixLog "Disabling SysMain service..." "Info"
            Stop-Service -Name "SysMain" -Force
            Set-Service -Name "SysMain" -StartupType Disabled
        }
        
        # Clear temp files
        Write-FixLog "Clearing temporary files..." "Info"
        $tempFolders = @(
            $env:TEMP,
            "C:\Windows\Temp",
            "C:\Windows\Prefetch"
        )
        
        foreach ($folder in $tempFolders) {
            if (Test-Path $folder) {
                Get-ChildItem -Path $folder -Recurse -Force -ErrorAction SilentlyContinue | 
                    Where-Object { !$_.PSIsContainer -and $_.CreationTime -lt (Get-Date).AddDays(-7) } | 
                    Remove-Item -Force -ErrorAction SilentlyContinue
            }
        }
        
        # Optimize virtual memory
        Write-FixLog "Optimizing virtual memory settings..." "Info"
        $computerSystem = Get-CimInstance Win32_ComputerSystem
        $computerSystem.AutomaticManagedPagefile = $true
        $computerSystem.Put() | Out-Null
        
        Write-FixLog "Performance optimization complete." "Success"
    }
    
    "DiskCleanup" {
        Write-FixLog "Running Disk Cleanup..." "Info"
        
        # Run disk cleanup with all options
        $cleanupKeys = @(
            "Active Setup Temp Folders",
            "BranchCache",
            "Downloaded Program Files",
            "Internet Cache Files",
            "Memory Dump Files",
            "Old ChkDsk Files",
            "Previous Installations",
            "Recycle Bin",
            "Service Pack Cleanup",
            "Setup Log Files",
            "System error memory dump files",
            "System error minidump files",
            "Temporary Files",
            "Temporary Setup Files",
            "Thumbnail Cache",
            "Update Cleanup",
            "Upgrade Discarded Files",
            "User file versions",
            "Windows Defender",
            "Windows Error Reporting Archive Files",
            "Windows Error Reporting Queue Files",
            "Windows Error Reporting System Archive Files",
            "Windows Error Reporting System Queue Files",
            "Windows ESD installation files",
            "Windows Upgrade Log Files"
        )
        
        $volumeCaches = "HKLM:\SOFTWARE\Microsoft\Windows\CurrentVersion\Explorer\VolumeCaches"
        foreach ($key in $cleanupKeys) {
            $regPath = Join-Path $volumeCaches $key
            if (Test-Path $regPath) {
                Set-ItemProperty -Path $regPath -Name StateFlags0100 -Value 2 -ErrorAction SilentlyContinue
            }
        }
        
        Start-Process -FilePath cleanmgr.exe -ArgumentList "/sagerun:100" -Wait
        
        Write-FixLog "Disk cleanup complete." "Success"
    }
    
    "DriverRefresh" {
        Write-FixLog "Refreshing Device Drivers..." "Info"
        
        # Scan for hardware changes
        Write-FixLog "Scanning for hardware changes..." "Info"
        pnputil /scan-devices
        
        # Get problematic devices
        $problemDevices = Get-PnpDevice | Where-Object { $_.Status -ne 'OK' }
        
        if ($problemDevices) {
            Write-FixLog "Found $($problemDevices.Count) devices with issues" "Warning"
            foreach ($device in $problemDevices) {
                Write-FixLog "Attempting to fix: $($device.FriendlyName)" "Info"
                try {
                    # Disable and re-enable device
                    Disable-PnpDevice -InstanceId $device.InstanceId -Confirm:$false -ErrorAction Stop
                    Start-Sleep -Seconds 2
                    Enable-PnpDevice -InstanceId $device.InstanceId -Confirm:$false -ErrorAction Stop
                    Write-FixLog "Device reset: $($device.FriendlyName)" "Success"
                } catch {
                    Write-FixLog "Could not reset device: $($device.FriendlyName)" "Error"
                }
            }
        } else {
            Write-FixLog "No problematic devices found" "Success"
        }
        
        Write-FixLog "Driver refresh complete." "Success"
    }
    
    "SecurityReset" {
        Write-FixLog "Resetting Windows Security Settings..." "Info"
        
        # Reset Windows Defender settings
        Write-FixLog "Resetting Windows Defender..." "Info"
        Set-MpPreference -DisableRealtimeMonitoring $false
        Set-MpPreference -DisableBehaviorMonitoring $false
        Set-MpPreference -DisableBlockAtFirstSeen $false
        Set-MpPreference -DisableIOAVProtection $false
        Set-MpPreference -DisablePrivacyMode $false
        Set-MpPreference -DisableScriptScanning $false
        
        # Update definitions
        Write-FixLog "Updating security definitions..." "Info"
        Update-MpSignature -ErrorAction SilentlyContinue
        
        # Reset firewall
        Write-FixLog "Resetting Windows Firewall to defaults..." "Info"
        netsh advfirewall reset
        
        # Enable all firewall profiles
        Set-NetFirewallProfile -All -Enabled True
        
        Write-FixLog "Security reset complete." "Success"
    }
    
    "AppReset" {
        Write-FixLog "Resetting Windows Store Apps..." "Info"
        
        # Reset Windows Store cache
        Write-FixLog "Clearing Windows Store cache..." "Info"
        wsreset.exe
        
        # Re-register all apps
        Write-FixLog "Re-registering Windows Store apps..." "Info"
        Get-AppxPackage -AllUsers | ForEach-Object {
            try {
                Add-AppxPackage -DisableDevelopmentMode -Register "$($_.InstallLocation)\AppXManifest.xml" -ErrorAction Stop
            } catch {
                Write-FixLog "Could not re-register: $($_.Name)" "Warning"
            }
        }
        
        Write-FixLog "App reset complete." "Success"
    }
}

Write-FixLog "`nFix completed. Some changes may require a system restart." "Success"
Write-FixLog "Log saved to: $env:TEMP\NubemGenesis_Fixes.log" "Info"