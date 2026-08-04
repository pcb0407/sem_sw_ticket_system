$ErrorActionPreference = 'Stop'

& (Join-Path $PSScriptRoot 'invoke-common-apphost-script.ps1') 'invoke-backend-ts-node.ps1' @args
exit $LASTEXITCODE
