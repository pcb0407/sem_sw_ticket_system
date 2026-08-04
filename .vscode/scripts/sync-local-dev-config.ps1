$ErrorActionPreference = 'Stop'

& (Join-Path $PSScriptRoot 'invoke-common-apphost-script.ps1') 'sync-local-dev-config.ps1' @args
exit $LASTEXITCODE
