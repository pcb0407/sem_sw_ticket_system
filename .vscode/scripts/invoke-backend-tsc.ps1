$ErrorActionPreference = 'Stop'

& (Join-Path $PSScriptRoot 'invoke-common-apphost-script.ps1') 'invoke-backend-tsc.ps1' @args
exit $LASTEXITCODE
