$ErrorActionPreference = 'Stop'

& (Join-Path $PSScriptRoot 'invoke-common-apphost-script.ps1') 'open-frontend-edge.ps1' @args
exit $LASTEXITCODE
