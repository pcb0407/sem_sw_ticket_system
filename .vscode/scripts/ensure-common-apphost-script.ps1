$ErrorActionPreference = 'Stop'

function Resolve-CommonApphostScript {
  param(
    [Parameter(Mandatory = $true)]
    [string]$WorkspaceRoot,

    [Parameter(Mandatory = $true)]
    [string]$ScriptName
  )

  $resolvedWorkspaceRoot = [System.IO.Path]::GetFullPath($WorkspaceRoot)
  $commonScriptPath = Join-Path $resolvedWorkspaceRoot (Join-Path 'common-platform\scripts\apphost' $ScriptName)
  if (Test-Path -LiteralPath $commonScriptPath) {
    return $commonScriptPath
  }

  $ensurePlatformRootScript = Join-Path $resolvedWorkspaceRoot 'scripts\ensure-platform-root.cjs'
  if (-not (Test-Path -LiteralPath $ensurePlatformRootScript)) {
    throw "Missing platform bootstrap script: $ensurePlatformRootScript"
  }

  $nodeRuntime = & (Join-Path $PSScriptRoot 'get-workspace-node.ps1') -InstallIfMissing
  $platformBootstrapOutput = & $nodeRuntime.NodeExe $ensurePlatformRootScript 2>&1
  $platformBootstrapExitCode = $LASTEXITCODE
  $platformBootstrapOutput | ForEach-Object { Write-Host $_ }
  if ($platformBootstrapExitCode -ne 0) {
    throw "Unable to prepare common-platform. Run npm run platform:link, or set SEM_PLATFORM_SOURCE_ROOT to a valid sem_sw_common_web_platform checkout."
  }

  if (Test-Path -LiteralPath $commonScriptPath) {
    return $commonScriptPath
  }

  throw "Missing common apphost script after platform bootstrap: $commonScriptPath. Run npm run platform:link, or set SEM_PLATFORM_SOURCE_ROOT to a valid sem_sw_common_web_platform checkout."
}
