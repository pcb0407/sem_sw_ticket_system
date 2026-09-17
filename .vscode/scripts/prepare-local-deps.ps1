$ErrorActionPreference = 'Stop'

& (Join-Path $PSScriptRoot 'invoke-common-apphost-script.ps1') 'prepare-local-deps.ps1' @args
exit $LASTEXITCODE
