#Requires -Version 5.1
<#
.SYNOPSIS
    Downloads the pinned Pester and PSScriptAnalyzer packages into lgtm/lab/.bin/psmodules
    (git-ignored), checks their SHA-512 against the values below, and unpacks them.
    Nothing is installed system-wide.

.NOTES
    Hashes are the PackageHash values the PowerShell Gallery publishes for these versions
    (https://www.powershellgallery.com/api/v2/Packages(Id='<name>',Version='<version>')),
    checked on 2026-11-09.
#>
[CmdletBinding()]
param(
    [string]$Destination = ''
)
Set-StrictMode -Version 3.0
$ErrorActionPreference = 'Stop'
if (-not $Destination) { $Destination = Join-Path $PSScriptRoot '..\..\..\.bin\psmodules' }

$packages = @(
    @{ Name = 'Pester'; Version = '5.7.1'; Sha512 = 'TZlqSN2UgW0mtOnmk1ro5sy8Gfg5DqOCY0XxIeHOKufM4WNptRfBkM6tBev/AxI/gmarvTVWBK3V8SnCTc8oAg==' }
    @{ Name = 'PSScriptAnalyzer'; Version = '1.25.0'; Sha512 = '5/tXMmLmBLqymRSuYpIdJLl8L4i1GbQSd7QD72zhY/FLfRs23HNEmmjlrlqNlQKJGxDCZBMf0YE63ym/ExwWYw==' }
)

[Net.ServicePointManager]::SecurityProtocol = [Net.ServicePointManager]::SecurityProtocol -bor [Net.SecurityProtocolType]::Tls12
Add-Type -AssemblyName System.IO.Compression.FileSystem
$null = New-Item -ItemType Directory -Force -Path $Destination
$Destination = (Resolve-Path -LiteralPath $Destination).ProviderPath

foreach ($p in $packages) {
    $target = Join-Path (Join-Path $Destination $p.Name) $p.Version
    if (Test-Path -LiteralPath (Join-Path $target "$($p.Name).psd1")) {
        Write-Information -MessageData "$($p.Name) $($p.Version) already present." -InformationAction Continue
        continue
    }
    $nupkg = Join-Path $Destination "$($p.Name).$($p.Version).nupkg"
    $previous = $ProgressPreference
    $ProgressPreference = 'SilentlyContinue'
    try { Invoke-WebRequest -UseBasicParsing -Uri "https://www.powershellgallery.com/api/v2/package/$($p.Name)/$($p.Version)" -OutFile $nupkg }
    finally { $ProgressPreference = $previous }
    $sha = [System.Security.Cryptography.SHA512]::Create()
    $stream = [IO.File]::OpenRead($nupkg)
    try { $actual = [Convert]::ToBase64String($sha.ComputeHash($stream)) }
    finally { $stream.Dispose(); $sha.Dispose() }
    if ($actual -ne $p.Sha512) {
        Remove-Item -LiteralPath $nupkg -Force
        throw "SHA-512 of $($p.Name) $($p.Version) is $actual, expected $($p.Sha512)."
    }
    $null = New-Item -ItemType Directory -Force -Path $target
    [IO.Compression.ZipFile]::ExtractToDirectory($nupkg, $target)
    # Drop the NuGet packaging files; the module itself is at the root of the package.
    foreach ($extra in @('_rels', 'package', '[Content_Types].xml', "$($p.Name).nuspec")) {
        $path = Join-Path $target $extra
        if (Test-Path -LiteralPath $path) { Remove-Item -LiteralPath $path -Recurse -Force }
    }
    Remove-Item -LiteralPath $nupkg -Force
    Write-Information -MessageData "Installed $($p.Name) $($p.Version) into $target" -InformationAction Continue
}
