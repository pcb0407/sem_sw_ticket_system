$ErrorActionPreference = 'Stop'

& (Join-Path $PSScriptRoot 'invoke-common-apphost-script.ps1') 'apphost-prelaunch-fullstack-debug.ps1' @args
if (-not $?) {
  if ($LASTEXITCODE -ne 0) {
    exit $LASTEXITCODE
  }

  exit 1
}

exit 0
