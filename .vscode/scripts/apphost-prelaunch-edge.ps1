$ErrorActionPreference = 'Stop'

& (Join-Path $PSScriptRoot 'invoke-common-apphost-script.ps1') 'apphost-prelaunch-edge.ps1' @args
exit $LASTEXITCODE
