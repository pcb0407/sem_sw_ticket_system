param(
  [ValidateSet('apphost', 'frontend', 'backend-debug')]
  [string]$Target = 'apphost',

  [switch]$DryRun
)

$ErrorActionPreference = 'Stop'

function Resolve-WorkspaceRoot {
  foreach ($environmentName in @('SEM_APP_WORKSPACE_ROOT', 'PUMP_WORKSPACE_ROOT', 'TICKET_SYSTEM_WORKSPACE_ROOT', 'BUNDLE_WORKSPACE_ROOT', 'SEM_SW_PLATFORM_WORKSPACE_ROOT')) {
    $workspaceRoot = [Environment]::GetEnvironmentVariable($environmentName)
    if (-not [string]::IsNullOrWhiteSpace($workspaceRoot)) {
      return [System.IO.Path]::GetFullPath($workspaceRoot)
    }
  }

  return [System.IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..\..'))
}

function Test-CommandLineContainsPath([string]$CommandLine, [string]$Path) {
  if ([string]::IsNullOrWhiteSpace($CommandLine) -or [string]::IsNullOrWhiteSpace($Path)) {
    return $false
  }

  $fullPath = [System.IO.Path]::GetFullPath($Path)
  $pathPattern = (($fullPath -split '[\\/]') | ForEach-Object { [regex]::Escape($_) }) -join '[\\/]'
  return $CommandLine -match $pathPattern
}

function Test-CommandLineContainsAllTokens([string]$CommandLine, [string[]]$Tokens) {
  if ([string]::IsNullOrWhiteSpace($CommandLine)) {
    return $false
  }

  foreach ($token in $Tokens | Where-Object { -not [string]::IsNullOrWhiteSpace($_) }) {
    if ($CommandLine -notmatch [regex]::Escape($token)) {
      return $false
    }
  }

  return $true
}

function Stop-ProcessTree([int]$ProcessId) {
  if ($ProcessId -le 0 -or $ProcessId -eq $PID) {
    return
  }

  if ($DryRun) {
    return
  }

  Get-CimInstance Win32_Process -Filter ("ParentProcessId = {0}" -f $ProcessId) -ErrorAction SilentlyContinue |
    ForEach-Object { Stop-ProcessTree ([int]$_.ProcessId) }

  Stop-Process -Id $ProcessId -Force -ErrorAction SilentlyContinue
}

function Stop-EdgeProfiles([string[]]$ProfilePaths) {
  $fullPaths = @($ProfilePaths | Where-Object { $_ } | ForEach-Object { [System.IO.Path]::GetFullPath($_) })
  if ($fullPaths.Count -eq 0) {
    return
  }

  Get-CimInstance Win32_Process -Filter "Name = 'msedge.exe'" -ErrorAction SilentlyContinue | Where-Object {
    $commandLine = $_.CommandLine
    @($fullPaths | Where-Object { Test-CommandLineContainsPath $commandLine $_ }).Count -gt 0
  } | ForEach-Object {
    Stop-ProcessTree ([int]$_.ProcessId)
  }
}

function Stop-ProcessesByScriptPaths([string[]]$ScriptPaths) {
  $fullPaths = @($ScriptPaths | Where-Object { $_ } | ForEach-Object { [System.IO.Path]::GetFullPath($_) })
  if ($fullPaths.Count -eq 0) {
    return
  }

  Get-CimInstance Win32_Process -ErrorAction SilentlyContinue | Where-Object {
    $process = $_
    if ($process.ProcessId -eq $PID -or [string]::IsNullOrWhiteSpace($process.CommandLine)) {
      return $false
    }

    if (@('powershell.exe', 'pwsh.exe') -notcontains $process.Name) {
      return $false
    }

    return @($fullPaths | Where-Object { Test-CommandLineContainsPath $process.CommandLine $_ }).Count -gt 0
  } | ForEach-Object {
    Stop-ProcessTree ([int]$_.ProcessId)
  }
}

function Stop-ProcessesByTokenSets([string[][]]$TokenSets) {
  foreach ($tokens in $TokenSets) {
    $requiredTokens = @($tokens | Where-Object { -not [string]::IsNullOrWhiteSpace($_) })
    if ($requiredTokens.Count -eq 0) {
      continue
    }

    Get-CimInstance Win32_Process -ErrorAction SilentlyContinue | Where-Object {
      $process = $_
      if ($process.ProcessId -eq $PID -or [string]::IsNullOrWhiteSpace($process.CommandLine)) {
        return $false
      }

      if (@('powershell.exe', 'pwsh.exe') -notcontains $process.Name) {
        return $false
      }

      return Test-CommandLineContainsAllTokens $process.CommandLine $requiredTokens
    } | ForEach-Object {
      Stop-ProcessTree ([int]$_.ProcessId)
    }
  }
}

function Stop-TrackedConsoleStates([string[]]$StatePaths, [string[]]$ScriptPaths) {
  foreach ($statePath in $StatePaths | Where-Object { $_ }) {
    if (-not (Test-Path -LiteralPath $statePath)) {
      continue
    }

    try {
      $state = Get-Content -LiteralPath $statePath -Raw | ConvertFrom-Json
      $processId = [int]$state.pid
      if ($processId -le 0 -or $processId -eq $PID) {
        continue
      }

      $process = Get-CimInstance Win32_Process -Filter ("ProcessId = {0}" -f $processId) -ErrorAction SilentlyContinue
      if (-not $process -or [string]::IsNullOrWhiteSpace($process.CommandLine)) {
        continue
      }

      if (@($ScriptPaths | Where-Object { Test-CommandLineContainsPath $process.CommandLine $_ }).Count -gt 0) {
        Stop-ProcessTree $processId
      }
    } catch {
    }
  }
}

function Remove-WorkspacePaths([string]$WorkspaceRoot, [string[]]$Paths) {
  $workspaceFullPath = [System.IO.Path]::GetFullPath($WorkspaceRoot).TrimEnd('\', '/')
  foreach ($path in $Paths | Where-Object { $_ }) {
    $fullPath = [System.IO.Path]::GetFullPath($path)
    $isInsideWorkspace = $fullPath.Equals($workspaceFullPath, [System.StringComparison]::OrdinalIgnoreCase) -or
      $fullPath.StartsWith($workspaceFullPath + [System.IO.Path]::DirectorySeparatorChar, [System.StringComparison]::OrdinalIgnoreCase) -or
      $fullPath.StartsWith($workspaceFullPath + [System.IO.Path]::AltDirectorySeparatorChar, [System.StringComparison]::OrdinalIgnoreCase)
    if (-not $isInsideWorkspace) {
      continue
    }

    if (-not $DryRun -and (Test-Path -LiteralPath $fullPath)) {
      Remove-Item -LiteralPath $fullPath -Recurse -Force -ErrorAction SilentlyContinue
    }
  }
}

$workspace = Resolve-WorkspaceRoot
$logDir = Join-Path $workspace '.vscode\.logs'
$vscodeScriptsDir = Join-Path $workspace '.vscode\scripts'

$backendConsoleScript = Join-Path $logDir 'backend-console.ps1'
$backendDebugConsoleScript = Join-Path $logDir 'backend-debug-console.ps1'
$frontendConsoleScript = Join-Path $logDir 'frontend-console.ps1'
$backendLog = Join-Path $logDir 'backend-dev.log'
$frontendLog = Join-Path $logDir 'frontend-dev.log'
$backendState = Join-Path $logDir 'backend-dev.state.json'
$backendDebugState = Join-Path $logDir 'backend-debug-dev.state.json'
$frontendState = Join-Path $logDir 'frontend-dev.state.json'

$edgeProfilePaths = @(
  (Join-Path $workspace '.vscode\.edge-debug-profile'),
  (Join-Path $workspace '.vscode\.edge-desktop-profile'),
  (Join-Path $workspace '.vscode\.edge-swagger-profile'),
  (Join-Path $workspace '.vscode\.edge-swagger-http-profile'),
  (Join-Path $workspace '.vscode\.edge-frontend-profile'),
  (Join-Path $workspace '.vscode\.edge-tablet-profile')
)

$scriptPathsByTarget = @{
  'apphost' = @($backendConsoleScript, $backendDebugConsoleScript, $frontendConsoleScript)
  'frontend' = @($frontendConsoleScript)
  'backend-debug' = @($backendDebugConsoleScript)
}

$statePathsByTarget = @{
  'apphost' = @($backendState, $backendDebugState, $frontendState)
  'frontend' = @($frontendState)
  'backend-debug' = @($backendState, $backendDebugState)
}

$artifactPathsByTarget = @{
  'apphost' = @($backendConsoleScript, $backendDebugConsoleScript, $frontendConsoleScript, $backendLog, $frontendLog, $backendState, $backendDebugState, $frontendState)
  'frontend' = @($frontendConsoleScript, $frontendLog, $frontendState)
  'backend-debug' = @($backendDebugConsoleScript, $backendLog, $backendState, $backendDebugState)
}

$startApphostServiceScript = Join-Path $vscodeScriptsDir 'start-apphost-service.ps1'
$prelaunchBackendDebugScript = Join-Path $vscodeScriptsDir 'apphost-prelaunch-backend-debug.ps1'
$prelaunchFullstackDebugScript = Join-Path $vscodeScriptsDir 'apphost-prelaunch-fullstack-debug.ps1'
$prelaunchEdgeScript = Join-Path $vscodeScriptsDir 'apphost-prelaunch-edge.ps1'
$waitFullstackDebugReadyScript = Join-Path $vscodeScriptsDir 'wait-fullstack-debug-ready.ps1'
$openFullstackAllBrowsersScript = Join-Path $vscodeScriptsDir 'open-fullstack-all-browsers.ps1'

$tokenSetsByTarget = @{
  'apphost' = @(
    @($startApphostServiceScript, '-Target backend'),
    @($startApphostServiceScript, '-Target frontend'),
    @($startApphostServiceScript, '-Target backend-debug'),
    @($prelaunchFullstackDebugScript),
    @($prelaunchBackendDebugScript),
    @($prelaunchEdgeScript),
    @($waitFullstackDebugReadyScript),
    @($openFullstackAllBrowsersScript)
  )
  'frontend' = @(
    @($startApphostServiceScript, '-Target frontend'),
    @($prelaunchEdgeScript)
  )
  'backend-debug' = @(
    @($startApphostServiceScript, '-Target backend-debug'),
    @($prelaunchBackendDebugScript)
  )
}

$scriptPaths = @($scriptPathsByTarget[$Target])
$statePaths = @($statePathsByTarget[$Target])
$artifactPaths = @($artifactPathsByTarget[$Target])
$tokenSets = @($tokenSetsByTarget[$Target])

Stop-EdgeProfiles $edgeProfilePaths
Stop-TrackedConsoleStates $statePaths $scriptPaths
Stop-ProcessesByScriptPaths $scriptPaths
Stop-ProcessesByTokenSets $tokenSets
Remove-WorkspacePaths $workspace ($edgeProfilePaths + $artifactPaths)

exit 0
