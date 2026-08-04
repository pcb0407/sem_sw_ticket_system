$ErrorActionPreference = 'Stop'

& (Join-Path $PSScriptRoot 'invoke-common-apphost-script.ps1') 'wait-local-dev-endpoint.ps1' @args
exit $LASTEXITCODE
