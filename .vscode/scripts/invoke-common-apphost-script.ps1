param(
  [Parameter(Mandatory = $true, Position = 0)]
  [string]$ScriptName,

  [Parameter()]
  [hashtable]$NamedArguments = @{},

  [Parameter(Position = 1, ValueFromRemainingArguments = $true)]
  [string[]]$Arguments
)

$ErrorActionPreference = 'Stop'

$workspaceRoot = $env:SEM_APP_WORKSPACE_ROOT
if ([string]::IsNullOrWhiteSpace($workspaceRoot)) {
  $workspaceRoot = $env:TICKET_SYSTEM_WORKSPACE_ROOT
}
if ([string]::IsNullOrWhiteSpace($workspaceRoot)) {
  $workspaceRoot = [System.IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..\..'))
} else {
  $workspaceRoot = [System.IO.Path]::GetFullPath($workspaceRoot)
}
. (Join-Path $PSScriptRoot 'ensure-common-apphost-script.ps1')
$commonScriptPath = Resolve-CommonApphostScript -WorkspaceRoot $workspaceRoot -ScriptName 'invoke-common-apphost-script.ps1'

$global:LASTEXITCODE = 0
& $commonScriptPath -ScriptName $ScriptName -WorkspaceRoot $workspaceRoot -NamedArguments $NamedArguments @Arguments
if (-not $?) {
  if ($LASTEXITCODE -ne 0) {
    exit $LASTEXITCODE
  }

  exit 1
}

exit 0
