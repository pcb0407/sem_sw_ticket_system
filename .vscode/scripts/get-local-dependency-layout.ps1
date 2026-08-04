$ErrorActionPreference = 'Stop'

$workspaceRoot = [System.IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..\..'))
. (Join-Path $PSScriptRoot 'ensure-common-apphost-script.ps1')
$commonScriptPath = Resolve-CommonApphostScript -WorkspaceRoot $workspaceRoot -ScriptName 'get-local-dependency-layout.ps1'

$env:SEM_APP_WORKSPACE_ROOT = $workspaceRoot
$env:TICKET_SYSTEM_WORKSPACE_ROOT = $workspaceRoot
. $commonScriptPath @args
