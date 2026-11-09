@{
    # All default rules, at every severity. Invoke-Checks.ps1 fails on Warning and Error.
    Severity = @('Error', 'Warning', 'Information')
    Rules    = @{
        PSUseCompatibleSyntax = @{
            Enable         = $true
            TargetVersions = @('5.1', '7.4')
        }
    }
}
