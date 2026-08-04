param(
	[ValidateSet('apphost', 'frontend', 'backend-debug')]
	[string]$Target = 'apphost',

	[switch]$DryRun
)

$ErrorActionPreference = 'Stop'

$powerShellExe = (Get-Process -Id $PID -ErrorAction SilentlyContinue).Path
if ([string]::IsNullOrWhiteSpace($powerShellExe)) {
	$powerShellExe = Join-Path $PSHOME 'powershell.exe'
}

$commonExitCode = 0
if (-not $DryRun) {
	# The common invoker exits its host process, so run it out-of-process before the local cleanup pass.
	& $powerShellExe -NoProfile -ExecutionPolicy Bypass -File (Join-Path $PSScriptRoot 'invoke-common-apphost-script.ps1') 'cleanup-local-debug.ps1' -Target $Target
	if ($LASTEXITCODE -ne 0) {
		$commonExitCode = $LASTEXITCODE
	}
}

try {
	& (Join-Path $PSScriptRoot 'stop-local-debug-surfaces.ps1') -Target $Target -DryRun:$DryRun
	if ($LASTEXITCODE -ne 0 -and $commonExitCode -eq 0) {
		$commonExitCode = $LASTEXITCODE
	}
} catch {
	Write-Warning $_.Exception.Message
	if ($commonExitCode -eq 0) {
		$commonExitCode = 1
	}
}

exit $commonExitCode
