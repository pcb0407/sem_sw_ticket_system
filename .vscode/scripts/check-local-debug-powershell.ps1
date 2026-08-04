param(
  [ValidateSet('apphost', 'frontend', 'backend-debug')]
  [string]$Target = 'apphost',

  [switch]$Json,
  [switch]$Quiet
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

$workspace = Resolve-WorkspaceRoot
$logDir = Join-Path $workspace '.vscode\.logs'
$vscodeScriptsDir = Join-Path $workspace '.vscode\scripts'

$backendConsoleScript = Join-Path $logDir 'backend-console.ps1'
$backendDebugConsoleScript = Join-Path $logDir 'backend-debug-console.ps1'
$frontendConsoleScript = Join-Path $logDir 'frontend-console.ps1'

$startApphostServiceScript = Join-Path $vscodeScriptsDir 'start-apphost-service.ps1'
$prelaunchBackendDebugScript = Join-Path $vscodeScriptsDir 'apphost-prelaunch-backend-debug.ps1'
$prelaunchFullstackDebugScript = Join-Path $vscodeScriptsDir 'apphost-prelaunch-fullstack-debug.ps1'
$prelaunchEdgeScript = Join-Path $vscodeScriptsDir 'apphost-prelaunch-edge.ps1'
$waitFullstackDebugReadyScript = Join-Path $vscodeScriptsDir 'wait-fullstack-debug-ready.ps1'
$openFullstackAllBrowsersScript = Join-Path $vscodeScriptsDir 'open-fullstack-all-browsers.ps1'

$scriptPathsByTarget = @{
  'apphost' = @($backendConsoleScript, $backendDebugConsoleScript, $frontendConsoleScript)
  'frontend' = @($frontendConsoleScript)
  'backend-debug' = @($backendDebugConsoleScript)
}

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
$tokenSets = @($tokenSetsByTarget[$Target])

$matches = New-Object System.Collections.Generic.List[object]

$processes = Get-CimInstance Win32_Process -ErrorAction SilentlyContinue | Where-Object {
  $_.ProcessId -ne $PID -and
  $_.Name -in @('powershell.exe', 'pwsh.exe') -and
  -not [string]::IsNullOrWhiteSpace($_.CommandLine)
}

foreach ($process in $processes) {
  $isScriptPathMatch = @($scriptPaths | Where-Object { Test-CommandLineContainsPath $process.CommandLine $_ }).Count -gt 0

  $isTokenMatch = $false
  foreach ($tokenSet in $tokenSets) {
    if (Test-CommandLineContainsAllTokens $process.CommandLine $tokenSet) {
      $isTokenMatch = $true
      break
    }
  }

  if ($isScriptPathMatch -or $isTokenMatch) {
    $matches.Add([pscustomobject]@{
      ProcessId = [int]$process.ProcessId
      Name = [string]$process.Name
      CommandLine = [string]$process.CommandLine
    })
  }
}

$sortedMatches = @($matches | Sort-Object ProcessId -Unique)

if ($Json) {
  $sortedMatches | ConvertTo-Json -Depth 4
} elseif (-not $Quiet) {
  if ($sortedMatches.Count -eq 0) {
    Write-Host "No leftover PowerShell debug processes found for target '$Target'."
  } else {
    Write-Host "Leftover PowerShell debug processes found for target '$Target':"
    $sortedMatches | Format-Table -AutoSize ProcessId, Name, CommandLine
  }
}

if ($sortedMatches.Count -gt 0) {
  exit 1
}

exit 0
