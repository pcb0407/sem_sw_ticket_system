$ErrorActionPreference = 'Stop'

$workspace = [System.IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..'))

function Get-EdgeProfileProcessCount([string]$workspaceRoot) {
  $workspacePattern = [regex]::Escape((Join-Path $workspaceRoot '.vscode\.edge-'))
  $platformPattern = [regex]::Escape((Join-Path $workspaceRoot 'common-platform\.vscode\.edge-'))

  return @(Get-CimInstance Win32_Process -Filter "Name='msedge.exe'" | Where-Object {
    $commandLine = $_.CommandLine
    if ([string]::IsNullOrWhiteSpace($commandLine)) {
      return $false
    }

    return $commandLine -match $workspacePattern -or $commandLine -match $platformPattern
  }).Count
}

Push-Location $workspace
try {
  & (Join-Path $workspace '.vscode\scripts\open-frontend-edge.ps1') -ProfileName '.edge-desktop-profile' -WindowSize '1280,900' -HighDpiSupport 1 -DeviceScaleFactor 1 -UserAgent 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/136.0.0.0 Safari/537.36 Edg/136.0.0.0'
  & (Join-Path $workspace '.vscode\scripts\open-swagger-edge.ps1') -ProfileName '.edge-swagger-profile' -WindowSize '1280,900' -HighDpiSupport 1 -DeviceScaleFactor 1

  $before = Get-EdgeProfileProcessCount $workspace

  & (Join-Path $workspace '.vscode\scripts\kill-edge-debug-profile.ps1')
  if ($LASTEXITCODE -ne 0) {
    throw "kill-edge-debug-profile exited with code $LASTEXITCODE"
  }

  $after = Get-EdgeProfileProcessCount $workspace

  if ($after -ne 0) {
    throw "Browser cleanup failed. Remaining profile processes: $after (before=$before)"
  }

  if ($before -eq 0) {
    Write-Host 'Browser cleanup smoke passed (no profile process detected before cleanup; idempotent check only).'
  } else {
    Write-Host "Browser cleanup smoke passed (before=$before after=$after)."
  }
} finally {
  Pop-Location
}
