$ErrorActionPreference = 'Stop'

& (Join-Path $PSScriptRoot 'invoke-common-apphost-script.ps1') 'invoke-shadow-package-node.ps1' @args
exit $LASTEXITCODE
