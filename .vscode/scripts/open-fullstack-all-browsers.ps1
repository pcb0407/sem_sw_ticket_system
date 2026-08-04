$ErrorActionPreference = 'Stop'

& (Join-Path $PSScriptRoot 'invoke-common-apphost-script.ps1') 'open-fullstack-all-browsers.ps1' @args
exit $LASTEXITCODE
