$ErrorActionPreference = 'Stop'

& (Join-Path $PSScriptRoot 'invoke-common-apphost-script.ps1') 'apphost-prelaunch-backend-debug.ps1' @args
exit $LASTEXITCODE
