param(
  [string]$WorkspaceRoot,
  [string]$BasePath
)

$ErrorActionPreference = 'Stop'

. (Join-Path $PSScriptRoot 'ensure-common-apphost-script.ps1')
$workspaceRootForScript = [System.IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..\..'))
$commonScriptPath = Resolve-CommonApphostScript -WorkspaceRoot $workspaceRootForScript -ScriptName 'finalize-local-node-modules.ps1'

$previousSemWorkspaceRoot = $env:SEM_APP_WORKSPACE_ROOT
$previousTICKETSYSTEMWorkspaceRoot = $env:TICKET_SYSTEM_WORKSPACE_ROOT
$env:SEM_APP_WORKSPACE_ROOT = $workspaceRootForScript
$env:TICKET_SYSTEM_WORKSPACE_ROOT = $workspaceRootForScript
try {
  & $commonScriptPath -WorkspaceRoot $WorkspaceRoot -BasePath $BasePath
} finally {
  if ($null -eq $previousSemWorkspaceRoot) {
    Remove-Item Env:SEM_APP_WORKSPACE_ROOT -ErrorAction SilentlyContinue
  } else {
    $env:SEM_APP_WORKSPACE_ROOT = $previousSemWorkspaceRoot
  }

  if ($null -eq $previousTICKETSYSTEMWorkspaceRoot) {
    Remove-Item Env:TICKET_SYSTEM_WORKSPACE_ROOT -ErrorAction SilentlyContinue
  } else {
    $env:TICKET_SYSTEM_WORKSPACE_ROOT = $previousTICKETSYSTEMWorkspaceRoot
  }
}
exit $LASTEXITCODE
