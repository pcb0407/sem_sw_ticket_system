$ErrorActionPreference = 'Stop'

& (Join-Path $PSScriptRoot 'invoke-common-apphost-script.ps1') 'kill-edge-debug-profile.ps1' @args
exit $LASTEXITCODE
