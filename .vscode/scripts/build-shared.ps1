$ErrorActionPreference = 'Stop'

& (Join-Path $PSScriptRoot 'invoke-common-apphost-script.ps1') 'build-shared.ps1' @args
exit $LASTEXITCODE
