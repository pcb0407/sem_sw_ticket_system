$ErrorActionPreference = 'Stop'
try { $host.UI.RawUI.WindowTitle = 'sem sw ticket system Frontend Dev' } catch {}
function Write-ApphostConsoleStateFile([string]$path, [string]$json) {
  $attempt = 0
  while ($true) {
    try {
      $json | Set-Content -LiteralPath $path -Encoding UTF8
      return
    } catch [System.IO.IOException] {
      if ($attempt -ge 10) { throw }
      Start-Sleep -Milliseconds (50 * ($attempt + 1))
      $attempt++
    }
  }
}
function Write-ApphostConsoleState([string]$status, [int]$exitCode = 0, [string]$message = '') {
  $json = @{ status = $status; exitCode = $exitCode; message = $message; command = 'start-apphost-service.ps1 -Target frontend'; pid = $PID; updatedAt = (Get-Date).ToString('o') } | ConvertTo-Json -Compress
  Write-ApphostConsoleStateFile 'D:\sem_sw_portal\sem_sw_ticket_system\.vscode\.logs\frontend-dev.state.json' $json
}
Write-ApphostConsoleState 'starting' 0 ''
try { Start-Transcript -Path 'D:\sem_sw_portal\sem_sw_ticket_system\.vscode\.logs\frontend-dev.log' -Force | Out-Null } catch { Write-Warning $_.Exception.Message }
$apphostCleanupTarget = 'apphost'
$apphostWorkspace = 'D:\sem_sw_portal\sem_sw_ticket_system'
try {
  Set-Location -LiteralPath 'D:\sem_sw_portal\sem_sw_ticket_system'
  & 'D:\sem_sw_portal\sem_sw_ticket_system/.vscode/scripts/start-apphost-service.ps1' -Target frontend
  Write-ApphostConsoleState 'exited' $LASTEXITCODE ''
} catch {
  Write-ApphostConsoleState 'failed' $LASTEXITCODE $_.Exception.Message
  Write-Host 'Console command failed.' -ForegroundColor Red
  Write-Host $_.Exception.Message -ForegroundColor Red
  Write-Host ($_ | Format-List * -Force | Out-String) -ForegroundColor DarkRed
} finally {
  try { Stop-Transcript | Out-Null } catch {}
  if (-not [string]::IsNullOrWhiteSpace($apphostCleanupTarget)) {
    try {
      $cleanupScript = Join-Path $apphostWorkspace '.vscode/scripts/cleanup-local-debug.ps1'
      if (Test-Path -LiteralPath $cleanupScript) {
        & $cleanupScript -Target $apphostCleanupTarget
      }
    } catch {
      Write-Warning $_.Exception.Message
    }
  }
}
