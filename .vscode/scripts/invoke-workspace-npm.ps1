$ErrorActionPreference = 'Stop'

& (Join-Path $PSScriptRoot 'invoke-common-apphost-script.ps1') 'invoke-workspace-npm.ps1' @args
exit $LASTEXITCODE
