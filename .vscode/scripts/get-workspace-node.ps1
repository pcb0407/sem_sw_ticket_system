param(
  [switch]$InstallIfMissing
)

$ErrorActionPreference = 'Stop'

$requiredVersion = '20.19.6'
$minimumVersion = [Version]'20.19.0'

function Convert-ArchitectureName([string]$architecture) {
  if ([string]::IsNullOrWhiteSpace($architecture)) {
    return ''
  }

  switch ($architecture.Trim().ToLowerInvariant()) {
    'amd64' { return 'x64' }
    'x64' { return 'x64' }
    'arm64' { return 'arm64' }
    'aarch64' { return 'arm64' }
    default { return $architecture.Trim().ToLowerInvariant() }
  }
}

function Get-RuntimeArchitectureValue([string]$propertyName) {
  try {
    $value = switch ($propertyName) {
      'OSArchitecture' { [System.Runtime.InteropServices.RuntimeInformation]::OSArchitecture }
      'ProcessArchitecture' { [System.Runtime.InteropServices.RuntimeInformation]::ProcessArchitecture }
      default { $null }
    }
    if ($null -ne $value) {
      return (Convert-ArchitectureName ([string]$value))
    }
  } catch {
  }

  return ''
}

function Get-CimProcessorArchitectureValue() {
  try {
    $processors = @(Get-CimInstance Win32_Processor -ErrorAction Stop)
    foreach ($processor in $processors) {
      switch ([int]$processor.Architecture) {
        0 { return 'x86' }
        5 { return 'arm' }
        9 { return 'x64' }
        12 { return 'arm64' }
      }
    }
  } catch {
  }

  return ''
}

function Get-NativeWindowsArchitectureValue() {
  $registryArchitecture = ''
  try {
    $registryArchitecture = (Get-ItemProperty -Path 'HKLM:\SYSTEM\CurrentControlSet\Control\Session Manager\Environment' -Name PROCESSOR_ARCHITECTURE -ErrorAction Stop).PROCESSOR_ARCHITECTURE
  } catch {
  }

  $candidates = @(
    (Convert-ArchitectureName $env:PROCESSOR_ARCHITEW6432),
    (Convert-ArchitectureName ([Environment]::GetEnvironmentVariable('PROCESSOR_ARCHITECTURE', 'Machine'))),
    (Convert-ArchitectureName $registryArchitecture),
    (Get-CimProcessorArchitectureValue)
  )

  foreach ($candidate in $candidates) {
    if (-not [string]::IsNullOrWhiteSpace($candidate)) {
      return $candidate
    }
  }

  return ''
}
function Get-HostArchitectureInfo() {
  $nativeArchitecture = Get-NativeWindowsArchitectureValue
  $runtimeOsArchitecture = Get-RuntimeArchitectureValue 'OSArchitecture'
  $processArchitecture = Get-RuntimeArchitectureValue 'ProcessArchitecture'

  if (-not $nativeArchitecture) {
    $nativeArchitecture = $runtimeOsArchitecture
  }

  if (-not $nativeArchitecture) {
    $nativeArchitecture = Convert-ArchitectureName $env:PROCESSOR_ARCHITECTURE
  }

  if (-not $processArchitecture) {
    $processArchitecture = Convert-ArchitectureName $env:PROCESSOR_ARCHITECTURE
  }

  switch ($nativeArchitecture) {
    'x64' { }
    'arm64' { }
    default {
      throw "Unsupported Windows OS architecture '$nativeArchitecture'. Use Windows x64 or Windows ARM64."
    }
  }

  return [pscustomobject]@{
    OSArchitecture = $nativeArchitecture
    ProcessArchitecture = $processArchitecture
    ExpectedNodeArchitecture = $nativeArchitecture
  }
}

function Get-WindowsExecutableArchitecture([string]$exePath) {
  $stream = $null
  $reader = $null

  try {
    $stream = [System.IO.File]::Open($exePath, [System.IO.FileMode]::Open, [System.IO.FileAccess]::Read, [System.IO.FileShare]::ReadWrite)
    if ($stream.Length -lt 64) {
      return ''
    }

    $reader = [System.IO.BinaryReader]::new($stream)
    if ($reader.ReadUInt16() -ne 0x5A4D) {
      return ''
    }

    $stream.Seek(0x3C, [System.IO.SeekOrigin]::Begin) | Out-Null
    $peOffset = $reader.ReadInt32()
    if ($peOffset -lt 0 -or $stream.Length -lt ($peOffset + 6)) {
      return ''
    }

    $stream.Seek($peOffset, [System.IO.SeekOrigin]::Begin) | Out-Null
    if ($reader.ReadUInt32() -ne 0x00004550) {
      return ''
    }

    switch ($reader.ReadUInt16()) {
      0x8664 { return 'x64' }
      0xAA64 { return 'arm64' }
      0x014C { return 'x86' }
      0x01C4 { return 'arm' }
      default { return '' }
    }
  } catch {
    return ''
  } finally {
    if ($null -ne $reader) {
      $reader.Dispose()
    } elseif ($null -ne $stream) {
      $stream.Dispose()
    }
  }
}

function Test-NodeExecutable([string]$nodeExe, [string]$source, [string]$expectedArchitecture) {
  if ([string]::IsNullOrWhiteSpace($nodeExe) -or -not (Test-Path -LiteralPath $nodeExe)) {
    return $null
  }

  $executableArchitecture = Get-WindowsExecutableArchitecture $nodeExe
  if (-not [string]::IsNullOrWhiteSpace($executableArchitecture) -and $executableArchitecture -ne $expectedArchitecture) {
    Write-Host "Ignoring $source Node.js at $nodeExe because the executable is $executableArchitecture but this Windows host requires $expectedArchitecture."
    return $null
  }

  try {
    $versionText = (& $nodeExe -p "process.versions.node").Trim()
  } catch {
    Write-Host "Ignoring $source Node.js at $nodeExe because it could not be started: $($_.Exception.Message)"
    return $null
  }

  if ([string]::IsNullOrWhiteSpace($versionText)) {
    return $null
  }

  $version = [Version]$versionText
  if ($version.Major -ne 20 -or $version.Minor -ne 19 -or $version -lt $minimumVersion) {
    return $null
  }

  $nodeHome = Split-Path -Parent $nodeExe
  $npmCmd = Join-Path $nodeHome 'npm.cmd'
  if (-not (Test-Path -LiteralPath $npmCmd)) {
    return $null
  }

  try {
    $runtimeArchitecture = (& $nodeExe -p "process.arch").Trim()
  } catch {
    Write-Host "Ignoring $source Node.js at $nodeExe because its architecture could not be read: $($_.Exception.Message)"
    return $null
  }

  if ($runtimeArchitecture -ne $expectedArchitecture) {
    Write-Host "Ignoring $source Node.js at $nodeExe because it is $runtimeArchitecture but this Windows host requires $expectedArchitecture."
    return $null
  }

  return [pscustomobject]@{
    Source = $source
    Version = $versionText
    NodeHome = $nodeHome
    NodeExe = $nodeExe
    NpmCmd = $npmCmd
    Architecture = $runtimeArchitecture
    OSArchitecture = $script:hostArchitecture.OSArchitecture
    ProcessArchitecture = $script:hostArchitecture.ProcessArchitecture
  }
}

function Install-PortableNode([string]$installRoot, [string]$architecture) {
  $portableFolderName = "node-v$requiredVersion-win-$architecture"
  $downloadUrl = "https://nodejs.org/dist/v$requiredVersion/$portableFolderName.zip"
  $zipPath = Join-Path $env:TEMP "$portableFolderName.zip"
  $extractRoot = Join-Path $env:TEMP ("sem-app-node-" + [guid]::NewGuid().ToString())
  $expandedRoot = Join-Path $extractRoot $portableFolderName
  $portableHome = Join-Path $installRoot $portableFolderName

  New-Item -ItemType Directory -Force -Path $installRoot | Out-Null
  if (Test-Path -LiteralPath $portableHome) {
    Remove-Item -LiteralPath $portableHome -Recurse -Force
  }

  Invoke-WebRequest -Uri $downloadUrl -OutFile $zipPath
  Expand-Archive -LiteralPath $zipPath -DestinationPath $extractRoot -Force
  Move-Item -LiteralPath $expandedRoot -Destination $portableHome

  return $portableHome
}

function Get-AppWorkspaceRoot {
  foreach ($environmentName in @('SEM_APP_WORKSPACE_ROOT', 'TICKET_SYSTEM_WORKSPACE_ROOT')) {
    $workspaceRoot = [Environment]::GetEnvironmentVariable($environmentName)
    if (-not [string]::IsNullOrWhiteSpace($workspaceRoot)) {
      return [System.IO.Path]::GetFullPath($workspaceRoot)
    }
  }

  return [System.IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..\..'))
}

$workspaceName = Split-Path -Leaf (Get-AppWorkspaceRoot)
if ([string]::IsNullOrWhiteSpace($workspaceName)) {
  $workspaceName = 'sem_sw_app'
}

$portableInstallRoot = Join-Path $env:LOCALAPPDATA "$($workspaceName)_tools"
$script:hostArchitecture = Get-HostArchitectureInfo
$architecture = $script:hostArchitecture.ExpectedNodeArchitecture
$portableHome = Join-Path $portableInstallRoot "node-v$requiredVersion-win-$architecture"
$portableNode = Join-Path $portableHome 'node.exe'

$portableRuntime = Test-NodeExecutable $portableNode 'portable' $architecture
if ($portableRuntime) {
  return $portableRuntime
}

$systemCommand = Get-Command node -ErrorAction SilentlyContinue
if ($systemCommand) {
  $systemRuntime = Test-NodeExecutable $systemCommand.Source 'system' $architecture
  if ($systemRuntime) {
    return $systemRuntime
  }
}

if (-not $InstallIfMissing) {
  throw "Node.js 20.19.x is required. Install it or rerun with -InstallIfMissing."
}

$installedPortableHome = Install-PortableNode -installRoot $portableInstallRoot -architecture $architecture
$installedRuntime = Test-NodeExecutable (Join-Path $installedPortableHome 'node.exe') 'portable' $architecture
if (-not $installedRuntime) {
  throw 'Portable Node.js installation finished, but the runtime could not be validated.'
}

return $installedRuntime


