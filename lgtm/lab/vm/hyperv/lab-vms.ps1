#Requires -Version 5.1
<#
.SYNOPSIS
    Creates and runs the Hyper-V VMs of the LGTM lab from lgtm/lab/vm/nodes.yml.

.DESCRIPTION
    Actions:
      plan     Print exactly what 'create' would do. Needs no administrator rights.
      create   Create the internal switch, host address, NAT, base image and the VMs with their
               cloud-init seeds. Idempotent: what exists is kept. Does not start the VMs.
      start    Start the VMs: lb first, then the control plane, then the workers.
      stop     Shut the VMs down in the reverse order.
      destroy  Delete the VMs tagged with lab.tag and their disks, and the switch, NAT, name
               resolution rule and port proxies that this script created. Nothing else.
      status   Show each VM, its state and whether SSH answers.

    Everything except 'plan' needs an elevated PowerShell (Run as administrator).
    'create -WhatIf' runs without elevation up to the first Hyper-V call and says where it stopped.

.PARAMETER Action
    plan, create, start, stop, destroy or status. Default: plan.

.PARAMETER NodesFile
    Path to nodes.yml. Default: ..\nodes.yml next to this script.

.PARAMETER PublicKeyFile
    Use this SSH public key instead of ssh.public_key_file from nodes.yml, for example a
    throwaway key in CI. The VMs get the key that is used when they are created.

.PARAMETER ConfigureDns
    With create: add a Windows name resolution rule that sends '.k8s.local' to the lb VM,
    so the browser resolves the lab addresses.

.EXAMPLE
    .\lab-vms.ps1 plan

.EXAMPLE
    .\lab-vms.ps1 create -WhatIf

.EXAMPLE
    .\lab-vms.ps1 create -ConfigureDns; .\lab-vms.ps1 start
#>
[CmdletBinding(SupportsShouldProcess, ConfirmImpact = 'Medium')]
param(
    [Parameter(Position = 0)]
    [ValidateSet('plan', 'create', 'start', 'stop', 'destroy', 'status')]
    [string]$Action = 'plan',

    [string]$NodesFile = '',

    [string]$PublicKeyFile = '',

    [switch]$ConfigureDns
)

Set-StrictMode -Version 3.0
$ErrorActionPreference = 'Stop'
Import-Module (Join-Path $PSScriptRoot 'LabVms.psm1') -Force
# Windows PowerShell 5.1 does not set $PSScriptRoot while it binds parameter defaults.
if (-not $NodesFile) { $NodesFile = Join-Path (Split-Path -Parent $PSScriptRoot) 'nodes.yml' }

# Preference variables do not cross into the module, so pass them on explicitly.
$common = @{ WhatIf = [bool]$WhatIfPreference; InformationAction = 'Continue' }
if ($PSBoundParameters.ContainsKey('Confirm')) { $common['Confirm'] = [bool]$PSBoundParameters['Confirm'] }

try {
    $config = Get-LabConfig -Path $NodesFile
    if ($PublicKeyFile) { $config.PublicKeyFile = $PublicKeyFile }
    switch ($Action) {
        'plan' {
            $environment = Get-LabEnvironment -Config $config
            Get-LabPlan -Config $config -Environment $environment -ConfigureDns:$ConfigureDns
        }
        'create' { Invoke-LabCreate -Config $config -ConfigureDns:$ConfigureDns @common }
        'start' { Invoke-LabStart -Config $config @common }
        'stop' { Invoke-LabStop -Config $config @common }
        'destroy' { Invoke-LabDestroy -Config $config @common }
        'status' { Get-LabStatus -Config $config | Format-Table -AutoSize }
    }
    # Exit 0 on success, whatever exit code a native command left behind: the qemu-img search
    # runs wsl.exe, and a caller that reads $LASTEXITCODE would otherwise see its code.
    exit 0
}
catch [System.UnauthorizedAccessException] {
    if ($WhatIfPreference) {
        Write-Warning "WhatIf stopped here: $($_.Exception.Message)"
        Write-Warning "Every step above this line ran without administrator rights. Run '.\lab-vms.ps1 plan' for the full list of steps."
        exit 0
    }
    Write-Error -Message $_.Exception.Message -ErrorAction Continue
    exit 2
}
catch {
    Write-Error -Message $_.Exception.Message -ErrorAction Continue
    exit 1
}
