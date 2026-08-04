$ErrorActionPreference = 'Stop'

& (Join-Path $PSScriptRoot 'invoke-common-apphost-script.ps1') 'kill-local-dev-target.ps1' @args
exit $LASTEXITCODE
