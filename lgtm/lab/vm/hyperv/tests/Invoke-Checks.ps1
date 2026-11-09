#Requires -Version 5.1
<#
.SYNOPSIS
    Runs PSScriptAnalyzer and the Pester tests for the Hyper-V script, using the pinned
    modules in lgtm/lab/.bin/psmodules (run Install-TestTools.ps1 first).
    Exits non-zero when the analyzer reports a warning or error, or a test fails.
#>
[CmdletBinding()]
param(
    [string]$ModulePath = ''
)
Set-StrictMode -Version 3.0
$ErrorActionPreference = 'Stop'
if (-not $ModulePath) { $ModulePath = Join-Path $PSScriptRoot '..\..\..\.bin\psmodules' }
$ModulePath = (Resolve-Path -LiteralPath $ModulePath).ProviderPath
$hyperv = Split-Path -Parent $PSScriptRoot

Import-Module (Join-Path $ModulePath 'PSScriptAnalyzer\1.25.0\PSScriptAnalyzer.psd1') -Force
Import-Module (Join-Path $ModulePath 'Pester\5.7.1\Pester.psd1') -Force

$settings = Join-Path $hyperv 'PSScriptAnalyzerSettings.psd1'
$findings = @(Invoke-ScriptAnalyzer -Path $hyperv -Recurse -Settings $settings)
$findings | Format-Table -AutoSize RuleName, Severity, ScriptName, Line, Message | Out-String -Width 220 | Write-Output
$blocking = @($findings | Where-Object { $_.Severity -in @('Warning', 'Error', 'ParseError') })
Write-Output "PSScriptAnalyzer: $($findings.Count) findings, $($blocking.Count) warnings or errors."

$config = New-PesterConfiguration
$config.Run.Path = $PSScriptRoot
$config.Run.PassThru = $true
$config.Output.Verbosity = 'Detailed'
$result = Invoke-Pester -Configuration $config
Write-Output "Pester: $($result.PassedCount) passed, $($result.FailedCount) failed, $($result.SkippedCount) skipped."

if ($blocking.Count -gt 0 -or $result.FailedCount -gt 0 -or $result.Result -ne 'Passed') { exit 1 }
exit 0
