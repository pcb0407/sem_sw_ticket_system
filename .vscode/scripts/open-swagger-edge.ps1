$ErrorActionPreference = 'Stop'

& (Join-Path $PSScriptRoot 'invoke-common-apphost-script.ps1') 'open-swagger-edge.ps1' @args
exit $LASTEXITCODE
