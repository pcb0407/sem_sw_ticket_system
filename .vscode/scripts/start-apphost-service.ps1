$ErrorActionPreference = 'Stop'

& (Join-Path $PSScriptRoot 'invoke-common-apphost-script.ps1') 'start-apphost-service.ps1' @args
exit $LASTEXITCODE
