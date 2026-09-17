$ErrorActionPreference = 'Stop'

if ($args.Count -eq 0) {
  & (Join-Path $PSScriptRoot 'invoke-common-apphost-script.ps1') 'wait-fullstack-debug-ready.ps1' -TimeoutSeconds 300
} else {
  & (Join-Path $PSScriptRoot 'invoke-common-apphost-script.ps1') 'wait-fullstack-debug-ready.ps1' @args
}
if (-not $?) {
  if ($LASTEXITCODE -ne 0) {
    exit $LASTEXITCODE
  }

  exit 1
}

exit 0
