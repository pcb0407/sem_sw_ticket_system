$ErrorActionPreference = 'Stop'

& (Join-Path $PSScriptRoot 'invoke-common-apphost-script.ps1') 'install-local-node-modules.ps1' @args
exit $LASTEXITCODE
