$ErrorActionPreference = 'Stop'

& (Join-Path $PSScriptRoot 'invoke-common-apphost-script.ps1') 'ensure-local-deps-ready.ps1' @args
exit $LASTEXITCODE
