$ErrorActionPreference = 'Stop'

& (Join-Path $PSScriptRoot 'invoke-common-apphost-script.ps1') 'cleanup-docker-apphost.ps1' @args
exit $LASTEXITCODE
