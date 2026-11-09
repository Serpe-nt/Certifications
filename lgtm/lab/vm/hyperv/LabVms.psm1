#Requires -Version 5.1
<#
.SYNOPSIS
    Functions behind lab-vms.ps1: read nodes.yml, render cloud-init seeds, print the plan,
    and create, start, stop, destroy and report the Hyper-V VMs of the LGTM lab.

.NOTES
    Only the functions that touch Hyper-V, the host network or disks need an elevated
    PowerShell. Reading the nodes file, rendering cloud-init and printing the plan do not.
    Keep this file ASCII: Windows PowerShell 5.1 reads BOM-less files as ANSI.
#>

Set-StrictMode -Version 3.0

$script:DefaultCacheDir = Join-Path $PSScriptRoot '.cache'
$script:ValidRoles = @('lb', 'control_plane', 'worker')

#region Small helpers

function Write-LabStep {
    [CmdletBinding()]
    param([Parameter(Mandatory)][string]$Message)
    Write-Information -MessageData "[lab-vms] $Message"
}

function Test-LabElevated {
    <#
    .SYNOPSIS
        True when the session runs as administrator on Windows.
    #>
    [CmdletBinding()]
    [OutputType([bool])]
    param()
    $onWindows = ($PSVersionTable.PSEdition -eq 'Desktop') -or [bool](Get-Variable -Name IsWindows -ValueOnly -ErrorAction SilentlyContinue)
    if (-not $onWindows) { return $false }
    $identity = [Security.Principal.WindowsIdentity]::GetCurrent()
    $principal = New-Object Security.Principal.WindowsPrincipal($identity)
    return $principal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
}

function Assert-LabElevated {
    <#
    .SYNOPSIS
        Stops with an UnauthorizedAccessException naming the step that needs administrator rights.
    #>
    [CmdletBinding()]
    param(
        [Parameter(Mandatory)][string]$Step,
        [bool]$IsElevated = (Test-LabElevated)
    )
    if (-not $IsElevated) {
        throw (New-Object System.UnauthorizedAccessException(
                "'$Step' needs administrator rights. Run lab-vms.ps1 from an elevated PowerShell (Run as administrator)."))
    }
}

function ConvertTo-LabIPv4Number {
    [CmdletBinding()]
    [OutputType([long])]
    param([Parameter(Mandatory)][string]$Address)
    $parts = $Address.Split('.')
    if ($parts.Count -ne 4) { throw "'$Address' is not an IPv4 address." }
    [long]$number = 0
    foreach ($part in $parts) {
        $octet = 0
        if (-not [int]::TryParse($part, [ref]$octet) -or $octet -lt 0 -or $octet -gt 255 -or $part -notmatch '^[0-9]+$') {
            throw "'$Address' is not an IPv4 address."
        }
        $number = $number * 256 + $octet
    }
    return $number
}

function Test-LabAddressInSubnet {
    <#
    .SYNOPSIS
        True when an IPv4 address lies inside a CIDR subnet such as 10.10.0.0/24.
    #>
    [CmdletBinding()]
    [OutputType([bool])]
    param(
        [Parameter(Mandatory)][string]$Address,
        [Parameter(Mandatory)][string]$Subnet
    )
    $network, $prefixText = $Subnet.Split('/')
    $prefix = [int]$prefixText
    $block = [long][math]::Pow(2, 32 - $prefix)
    $a = ConvertTo-LabIPv4Number $Address
    $n = ConvertTo-LabIPv4Number $network
    return ([math]::Floor($a / $block) -eq [math]::Floor($n / $block))
}

function Get-LabMacAddress {
    <#
    .SYNOPSIS
        Builds the MAC address of a VM from a three-byte prefix and the last three octets of its address.
    #>
    [CmdletBinding()]
    [OutputType([string])]
    param(
        [Parameter(Mandatory)][string]$Prefix,
        [Parameter(Mandatory)][string]$Address
    )
    $octets = $Address.Split('.') | Select-Object -Last 3 | ForEach-Object { '{0:x2}' -f [int]$_ }
    return (($Prefix.ToLowerInvariant().Split(':')) + $octets) -join ':'
}

function ConvertTo-LabWslPath {
    <#
    .SYNOPSIS
        Maps C:\pathile to /mnt/c/path/file for a WSL command.
    #>
    [CmdletBinding()]
    [OutputType([string])]
    param([Parameter(Mandatory)][string]$Path)
    if ($Path -notmatch '^(?<drive>[A-Za-z]):\\(?<rest>.*)$') { throw "Cannot map '$Path' into WSL: only drive-letter paths are supported." }
    return '/mnt/' + $Matches['drive'].ToLowerInvariant() + '/' + ($Matches['rest'] -replace '\\', '/')
}

function ConvertTo-LabYamlQuoted {
    [CmdletBinding()]
    [OutputType([string])]
    param([Parameter(Mandatory)][AllowEmptyString()][string]$Value)
    return "'" + $Value.Replace("'", "''") + "'"
}

#endregion

#region YAML subset reader

function Get-LabYamlLineContent {
    <#
    .SYNOPSIS
        Returns a line without its trailing comment. A '#' starts a comment at the start of
        the line or after whitespace, outside quotes.
    #>
    [CmdletBinding()]
    [OutputType([string])]
    param([Parameter(Mandatory)][AllowEmptyString()][string]$Line)
    $quote = [char]0
    for ($i = 0; $i -lt $Line.Length; $i++) {
        $c = $Line[$i]
        if ($quote -ne [char]0) {
            if ($c -eq $quote) {
                if ($quote -eq [char]'"' -and $i -gt 0 -and $Line[$i - 1] -eq [char]'\') { continue }
                $quote = [char]0
            }
            continue
        }
        if ($c -eq [char]"'" -or $c -eq [char]'"') {
            # A quote opens a quoted scalar only where a scalar can start.
            $before = $Line.Substring(0, $i).TrimEnd()
            if ($before.Length -eq 0 -or ':-[,'.Contains($before[$before.Length - 1])) { $quote = $c }
            continue
        }
        if ($c -eq [char]'#' -and ($i -eq 0 -or [char]::IsWhiteSpace($Line[$i - 1]))) {
            return $Line.Substring(0, $i).TrimEnd()
        }
    }
    return $Line.TrimEnd()
}

function Test-LabYamlSequenceItem {
    [CmdletBinding()]
    [OutputType([bool])]
    param([Parameter(Mandatory)][string]$Text)
    return ($Text -eq '-' -or $Text.StartsWith('- '))
}

function Split-LabYamlFlowList {
    [CmdletBinding()]
    [OutputType([string[]])]
    param([Parameter(Mandatory)][AllowEmptyString()][string]$Text)
    $items = New-Object System.Collections.Generic.List[string]
    $current = New-Object System.Text.StringBuilder
    $quote = [char]0
    foreach ($c in $Text.ToCharArray()) {
        if ($quote -ne [char]0) {
            if ($c -eq $quote) { $quote = [char]0 }
            [void]$current.Append($c)
        }
        elseif ($c -eq [char]"'" -or $c -eq [char]'"') { $quote = $c; [void]$current.Append($c) }
        elseif ($c -eq [char]',') { $items.Add($current.ToString().Trim()); [void]$current.Clear() }
        else { [void]$current.Append($c) }
    }
    if ($current.ToString().Trim().Length -gt 0) { $items.Add($current.ToString().Trim()) }
    return , ($items.ToArray())
}

function ConvertFrom-LabYamlScalar {
    [CmdletBinding()]
    param(
        [Parameter(Mandatory)][AllowEmptyString()][string]$Value,
        [int]$LineNumber = 0
    )
    $v = $Value.Trim()
    if ($v.StartsWith('"')) {
        if ($v.Length -lt 2 -or -not $v.EndsWith('"')) { throw "nodes file line ${LineNumber}: unterminated double-quoted string." }
        $inner = $v.Substring(1, $v.Length - 2)
        $evaluator = [System.Text.RegularExpressions.MatchEvaluator] {
            param($m)
            switch -CaseSensitive ($m.Groups[1].Value) {
                'n' { "`n" }
                't' { "`t" }
                default { $m.Groups[1].Value }
            }
        }
        return [regex]::Replace($inner, '\\(.)', $evaluator)
    }
    if ($v.StartsWith("'")) {
        if ($v.Length -lt 2 -or -not $v.EndsWith("'")) { throw "nodes file line ${LineNumber}: unterminated single-quoted string." }
        return $v.Substring(1, $v.Length - 2).Replace("''", "'")
    }
    if ($v.StartsWith('[')) {
        if (-not $v.EndsWith(']')) { throw "nodes file line ${LineNumber}: a [list] must close on the same line." }
        $values = New-Object System.Collections.Generic.List[object]
        foreach ($item in (Split-LabYamlFlowList $v.Substring(1, $v.Length - 2))) {
            $values.Add((ConvertFrom-LabYamlScalar -Value $item -LineNumber $LineNumber))
        }
        return , ($values.ToArray())
    }
    if ($v.Length -gt 0 -and '{&*|>!%@`'.Contains($v[0])) {
        throw "nodes file line ${LineNumber}: '$v' uses YAML syntax this reader does not support (flow mappings, anchors, tags, block strings)."
    }
    if ($v -cin @('true', 'True', 'TRUE')) { return $true }
    if ($v -cin @('false', 'False', 'FALSE')) { return $false }
    if ($v -cin @('null', 'Null', 'NULL', '~', '')) { return $null }
    if ($v -match '^-?[0-9]+$') {
        $int = 0
        if ([int]::TryParse($v, [ref]$int)) { return $int }
        return [long]$v
    }
    return $v
}

function Read-LabYamlNode {
    [CmdletBinding()]
    param(
        [Parameter(Mandatory)][hashtable]$State,
        [Parameter(Mandatory)][int]$Indent
    )
    $line = $State.Lines[$State.Pos]
    if (Test-LabYamlSequenceItem $line.Text) { return , (Read-LabYamlSequence -State $State -Indent $Indent) }
    return (Read-LabYamlMapping -State $State -Indent $Indent)
}

function Read-LabYamlMapping {
    [CmdletBinding()]
    param(
        [Parameter(Mandatory)][hashtable]$State,
        [Parameter(Mandatory)][int]$Indent
    )
    $map = [ordered]@{}
    $lines = $State.Lines
    while ($State.Pos -lt $lines.Count) {
        $line = $lines[$State.Pos]
        if ($line.Indent -lt $Indent) { break }
        if ($line.Indent -gt $Indent) { throw "nodes file line $($line.Number): unexpected indentation." }
        if (Test-LabYamlSequenceItem $line.Text) { break }
        $m = [regex]::Match($line.Text, '^(?<key>[^\s:''"#\[\]{}-][^:]*?)\s*:(?:\s+(?<value>.*))?$')
        if (-not $m.Success) { throw "nodes file line $($line.Number): expected 'key: value', found '$($line.Text)'." }
        $key = $m.Groups['key'].Value
        if ($map.Contains($key)) { throw "nodes file line $($line.Number): key '$key' appears twice." }
        $State.Pos++
        if ($m.Groups['value'].Success -and $m.Groups['value'].Value.Trim().Length -gt 0) {
            $map[$key] = ConvertFrom-LabYamlScalar -Value $m.Groups['value'].Value -LineNumber $line.Number
            continue
        }
        $next = if ($State.Pos -lt $lines.Count) { $lines[$State.Pos] } else { $null }
        if ($null -ne $next -and ($next.Indent -gt $Indent -or ($next.Indent -eq $Indent -and (Test-LabYamlSequenceItem $next.Text)))) {
            $map[$key] = Read-LabYamlNode -State $State -Indent $next.Indent
        }
        else {
            $map[$key] = $null
        }
    }
    return $map
}

function Read-LabYamlSequence {
    [CmdletBinding()]
    param(
        [Parameter(Mandatory)][hashtable]$State,
        [Parameter(Mandatory)][int]$Indent
    )
    $items = New-Object System.Collections.Generic.List[object]
    $lines = $State.Lines
    while ($State.Pos -lt $lines.Count) {
        $line = $lines[$State.Pos]
        if ($line.Indent -lt $Indent) { break }
        if ($line.Indent -gt $Indent) { throw "nodes file line $($line.Number): unexpected indentation." }
        if (-not (Test-LabYamlSequenceItem $line.Text)) { break }
        $rest = if ($line.Text -eq '-') { '' } else { $line.Text.Substring(1).TrimStart() }
        if ($rest.Length -eq 0) {
            $State.Pos++
            if ($State.Pos -ge $lines.Count -or $lines[$State.Pos].Indent -le $Indent) {
                $items.Add($null)
            }
            else {
                $items.Add((Read-LabYamlNode -State $State -Indent $lines[$State.Pos].Indent))
            }
        }
        elseif ($rest -match '^[^\s:''"#\[\]{}-][^:]*?\s*:(\s|$)') {
            # "- key: value" starts a mapping whose keys line up with "key".
            $childIndent = $line.Indent + ($line.Text.Length - $rest.Length)
            $lines[$State.Pos] = [pscustomobject]@{ Number = $line.Number; Indent = $childIndent; Text = $rest }
            $items.Add((Read-LabYamlMapping -State $State -Indent $childIndent))
        }
        else {
            $State.Pos++
            $items.Add((ConvertFrom-LabYamlScalar -Value $rest -LineNumber $line.Number))
        }
    }
    return , ($items.ToArray())
}

function ConvertFrom-LabYaml {
    <#
    .SYNOPSIS
        Reads the small YAML subset used by nodes.yml into ordered dictionaries and arrays.
    #>
    [CmdletBinding()]
    param([Parameter(Mandatory)][AllowEmptyString()][string]$Text)
    $lines = New-Object System.Collections.Generic.List[object]
    $number = 0
    foreach ($raw in ($Text -split "`r?`n")) {
        $number++
        $clean = Get-LabYamlLineContent $raw
        if ($clean.Trim().Length -eq 0 -or $clean.Trim() -eq '---') { continue }
        if ($clean -match '^\s*\t') { throw "nodes file line ${number}: indent with spaces, not tabs." }
        $indent = $clean.Length - $clean.TrimStart(' ').Length
        $lines.Add([pscustomobject]@{ Number = $number; Indent = $indent; Text = $clean.Trim() })
    }
    if ($lines.Count -eq 0) { return [ordered]@{} }
    $state = @{ Lines = $lines; Pos = 0 }
    $result = Read-LabYamlNode -State $state -Indent $lines[0].Indent
    if ($state.Pos -lt $lines.Count) {
        throw "nodes file line $($lines[$state.Pos].Number): unexpected indentation or structure."
    }
    return $result
}

#endregion

#region Nodes file

function Get-LabValue {
    [CmdletBinding()]
    param(
        [Parameter(Mandatory)][System.Collections.IDictionary]$Map,
        [Parameter(Mandatory)][string]$Path,
        [switch]$Optional,
        $Default = $null
    )
    $current = $Map
    foreach ($key in $Path.Split('.')) {
        if ($current -isnot [System.Collections.IDictionary] -or -not $current.Contains($key) -or $null -eq $current[$key]) {
            if ($Optional) { return $Default }
            throw "nodes file: '$Path' is missing."
        }
        $current = $current[$key]
    }
    if ($current -is [array]) { return , $current }
    return $current
}

function Get-LabConfig {
    <#
    .SYNOPSIS
        Reads and checks nodes.yml and returns the lab settings with one object per VM.
    #>
    [CmdletBinding()]
    param(
        [Parameter(Mandatory)][string]$Path,
        [string]$CacheDir = $script:DefaultCacheDir
    )
    if (-not (Test-Path -LiteralPath $Path -PathType Leaf)) { throw "Nodes file '$Path' not found." }
    $raw = ConvertFrom-LabYaml -Text ([IO.File]::ReadAllText((Resolve-Path -LiteralPath $Path).ProviderPath))
    $errors = New-Object System.Collections.Generic.List[string]

    $subnet = [string](Get-LabValue $raw 'network.subnet')
    if ($subnet -notmatch '^(\d{1,3}\.){3}\d{1,3}/(\d{1,2})$' -or [int]$Matches[2] -lt 8 -or [int]$Matches[2] -gt 30) {
        throw "nodes file: network.subnet '$subnet' must look like 10.10.0.0/24 (prefix 8 to 30)."
    }
    $prefixLength = [int]$subnet.Split('/')[1]
    $gateway = [string](Get-LabValue $raw 'network.gateway')
    $labDns = [string](Get-LabValue $raw 'network.lab_dns')
    $macPrefix = [string](Get-LabValue $raw 'hyperv.mac_prefix')
    if ($macPrefix -notmatch '^[0-9A-Fa-f]{2}(:[0-9A-Fa-f]{2}){2}$') { $errors.Add("hyperv.mac_prefix '$macPrefix' must be three bytes such as 02:4c:47.") }
    elseif (([Convert]::ToInt32($macPrefix.Substring(0, 2), 16) -band 1) -ne 0) { $errors.Add("hyperv.mac_prefix '$macPrefix' is a multicast prefix; use a unicast one such as 02:4c:47.") }
    foreach ($pair in @(@('network.gateway', $gateway), @('network.lab_dns', $labDns))) {
        try { if (-not (Test-LabAddressInSubnet -Address $pair[1] -Subnet $subnet)) { $errors.Add("$($pair[0]) $($pair[1]) is outside $subnet.") } }
        catch { $errors.Add("$($pair[0]): $($_.Exception.Message)") }
    }
    $upstream = Get-LabValue $raw 'network.upstream_dns'
    if ($upstream -isnot [array]) { $upstream = @($upstream) }
    if ($upstream.Count -eq 0) { $errors.Add('network.upstream_dns needs at least one resolver.') }
    $controlAccess = [string](Get-LabValue $raw 'network.control_access' -Optional -Default 'direct')
    if ($controlAccess -notin @('direct', 'portproxy')) { $errors.Add("network.control_access must be 'direct' or 'portproxy', not '$controlAccess'.") }
    $sha256 = [string](Get-LabValue $raw 'image.sha256')
    if ($sha256 -notmatch '^[0-9a-fA-F]{64}$') { $errors.Add('image.sha256 must be 64 hexadecimal characters.') }
    $imageUrl = [string](Get-LabValue $raw 'image.url')
    if ($imageUrl -notmatch '^https://[^\s]+/[^/\s]+\.img$') { $errors.Add('image.url must be an https URL of a .img (QCOW2) cloud image.') }
    $vmPath = [string](Get-LabValue $raw 'hyperv.vm_path')
    if ($vmPath -notmatch '^[A-Za-z]:\\') { $errors.Add("hyperv.vm_path '$vmPath' must be an absolute path on a drive, such as C:\Hyper-V\lgtm-lab.") }

    $nodes = New-Object System.Collections.Generic.List[object]
    $names = @{}
    $addresses = @{ $gateway = 'network.gateway' }
    $index = 0
    $nodeList = Get-LabValue $raw 'nodes'
    if ($nodeList -isnot [array]) { $nodeList = @($nodeList) }
    foreach ($n in $nodeList) {
        $index++
        if ($n -isnot [System.Collections.IDictionary]) { $errors.Add("nodes[$index] is not a mapping."); continue }
        $name = [string](Get-LabValue $n 'name' -Optional -Default '')
        $label = if ($name) { $name } else { "nodes[$index]" }
        if ($name -notmatch '^[a-z][a-z0-9-]{0,14}$') { $errors.Add("${label}: name must be lower-case letters, digits and '-', start with a letter, at most 15 characters.") }
        elseif ($names.ContainsKey($name)) { $errors.Add("${label}: name is used twice.") }
        else { $names[$name] = $true }
        $role = [string](Get-LabValue $n 'role' -Optional -Default '')
        if ($role -notin $script:ValidRoles) { $errors.Add("${label}: role '$role' must be one of $($script:ValidRoles -join ', ').") }
        $address = [string](Get-LabValue $n 'address' -Optional -Default '')
        try {
            if (-not (Test-LabAddressInSubnet -Address $address -Subnet $subnet)) { $errors.Add("${label}: address $address is outside $subnet.") }
            elseif ($addresses.ContainsKey($address)) { $errors.Add("${label}: address $address is already used by $($addresses[$address]).") }
            else { $addresses[$address] = $label }
        }
        catch { $errors.Add("${label}: $($_.Exception.Message)") }
        $sizes = @{}
        foreach ($field in @('vcpu', 'memory_gb', 'disk_gb', 'data_disk_gb')) {
            $value = Get-LabValue $n $field -Optional -Default $null
            if ($null -eq $value) {
                if ($field -ne 'data_disk_gb') { $errors.Add("${label}: $field is missing.") }
                $sizes[$field] = 0
            }
            elseif ($value -isnot [int] -or $value -lt 1) { $errors.Add("${label}: $field must be a whole number above 0.") ; $sizes[$field] = 0 }
            else { $sizes[$field] = [int]$value }
        }
        $folder = Join-Path $vmPath $name
        $nodes.Add([pscustomobject]@{
                Name       = $name
                Role       = $role
                Address    = $address
                Vcpu       = $sizes['vcpu']
                MemoryGB   = $sizes['memory_gb']
                DiskGB     = $sizes['disk_gb']
                DataDiskGB = $sizes['data_disk_gb']
                Mac        = if ($address -match '^(\d+\.){3}\d+$' -and $macPrefix -match '^[0-9A-Fa-f]{2}(:[0-9A-Fa-f]{2}){2}$') { Get-LabMacAddress -Prefix $macPrefix -Address $address } else { '' }
                Folder     = $folder
                OsVhd      = Join-Path $folder "$name-os.vhdx"
                SeedVhd    = Join-Path $folder "$name-seed.vhdx"
                DataVhd    = Join-Path $folder "$name-data.vhdx"
            })
    }
    $lbs = @($nodes | Where-Object Role -EQ 'lb')
    if ($lbs.Count -ne 1) { $errors.Add("exactly one node needs role 'lb'; found $($lbs.Count).") }
    elseif ($lbs[0].Address -ne $labDns) { $errors.Add("network.lab_dns ($labDns) must be the address of the lb node ($($lbs[0].Address)).") }
    if (@($nodes | Where-Object Role -EQ 'control_plane').Count -lt 1) { $errors.Add("at least one node needs role 'control_plane'.") }
    if (@($nodes | Where-Object Role -EQ 'worker').Count -lt 1) { $errors.Add("at least one node needs role 'worker'.") }
    if ($errors.Count -gt 0) { throw ("nodes file '$Path' has problems:`n  - " + ($errors -join "`n  - ")) }

    $imageFile = Split-Path -Leaf ([uri]$imageUrl).AbsolutePath
    # lb first, then the control plane, then workers; file order within a role.
    $sorted = @(foreach ($r in $script:ValidRoles) { $nodes | Where-Object Role -EQ $r })
    return [pscustomobject]@{
        Path           = (Resolve-Path -LiteralPath $Path).ProviderPath
        Tag            = [string](Get-LabValue $raw 'lab.tag')
        SwitchName     = [string](Get-LabValue $raw 'hyperv.switch_name')
        NatName        = [string](Get-LabValue $raw 'hyperv.nat_name')
        VmPath         = $vmPath
        SecureBootTemplate = [string](Get-LabValue $raw 'hyperv.secure_boot_template')
        QemuImg        = [string](Get-LabValue $raw 'hyperv.qemu_img' -Optional -Default '')
        WslDistribution = [string](Get-LabValue $raw 'hyperv.wsl_distribution' -Optional -Default '')
        Subnet         = $subnet
        PrefixLength   = $prefixLength
        Gateway        = $gateway
        UpstreamDns    = [string[]]$upstream
        LabDns         = $labDns
        Domain         = [string](Get-LabValue $raw 'network.domain')
        Interface      = [string](Get-LabValue $raw 'network.interface')
        ControlAccess  = $controlAccess
        PortProxySshBase = [int](Get-LabValue $raw 'network.portproxy_ssh_base' -Optional -Default 22000)
        SshUser        = [string](Get-LabValue $raw 'ssh.user')
        PublicKeyFile  = [string](Get-LabValue $raw 'ssh.public_key_file')
        ImageRelease   = [string](Get-LabValue $raw 'image.release')
        ImageUrl       = $imageUrl
        ImageSha256    = $sha256.ToLowerInvariant()
        CacheDir       = $CacheDir
        ImagePath      = Join-Path $CacheDir $imageFile
        BaseVhd        = Join-Path $CacheDir ([IO.Path]::ChangeExtension($imageFile, '.vhdx'))
        StatePath      = Join-Path $CacheDir 'state.json'
        Nodes          = $sorted
    }
}

#endregion

#region Cloud-init

function Read-LabPublicKey {
    <#
    .SYNOPSIS
        Reads one OpenSSH public key line and refuses private keys.
    #>
    [CmdletBinding()]
    [OutputType([string])]
    param([Parameter(Mandatory)][string]$Path)
    if (-not (Test-Path -LiteralPath $Path -PathType Leaf)) { throw "SSH public key '$Path' not found. Set ssh.public_key_file in nodes.yml." }
    $text = ([IO.File]::ReadAllText($Path)).Trim()
    if ($text -match 'PRIVATE KEY') { throw "'$Path' is a private key. Point ssh.public_key_file at the .pub file." }
    if ($text -notmatch '^(ssh-ed25519|ssh-rsa|ecdsa-sha2-nistp(256|384|521)|sk-ssh-ed25519@openssh\.com|sk-ecdsa-sha2-nistp256@openssh\.com) [A-Za-z0-9+/=]+( [^\r\n]*)?$') {
        throw "'$Path' does not hold a single OpenSSH public key line."
    }
    return $text
}

function ConvertTo-LabCloudInit {
    <#
    .SYNOPSIS
        Renders the three NoCloud seed files (meta-data, user-data, network-config) for one VM.
    #>
    [CmdletBinding()]
    [OutputType([System.Collections.Specialized.OrderedDictionary])]
    param(
        [Parameter(Mandatory)]$Config,
        [Parameter(Mandatory)]$Node,
        [Parameter(Mandatory)][string]$PublicKey
    )
    $meta = @(
        "instance-id: $($Config.Tag)-$($Node.Name)"
        "local-hostname: $($Node.Name)"
    )
    $user = @(
        '#cloud-config'
        "# Seed for $($Node.Name), written by lab-vms.ps1 from nodes.yml."
        "hostname: $($Node.Name)"
        "fqdn: $($Node.Name).$($Config.Domain)"
        'manage_etc_hosts: true'
        'ssh_pwauth: false'
        'disable_root: true'
        'users:'
        "  - name: $($Config.SshUser)"
        '    groups: [adm, sudo]'
        '    shell: /bin/bash'
        "    sudo: 'ALL=(ALL) NOPASSWD:ALL'"
        '    lock_passwd: true'
        '    ssh_authorized_keys:'
        "      - $(ConvertTo-LabYamlQuoted $PublicKey)"
        'growpart:'
        '  mode: auto'
        "  devices: ['/']"
        'package_update: false'
    )
    $network = @(
        'version: 2'
        'ethernets:'
        "  $($Config.Interface):"
        '    match:'
        "      macaddress: '$($Node.Mac)'"
        "    set-name: $($Config.Interface)"
        '    dhcp4: false'
        '    dhcp6: false'
        '    addresses:'
        "      - $($Node.Address)/$($Config.PrefixLength)"
        '    routes:'
        '      - to: default'
        "        via: $($Config.Gateway)"
        '    nameservers:'
        "      addresses: [$($Config.UpstreamDns -join ', ')]"
    )
    return [ordered]@{
        'meta-data'      = ($meta -join "`n") + "`n"
        'user-data'      = ($user -join "`n") + "`n"
        'network-config' = ($network -join "`n") + "`n"
    }
}

#endregion

#region Environment and plan

function Find-LabQemuImg {
    <#
    .SYNOPSIS
        Finds qemu-img: the configured path, PATH, C:\Program Files\qemu, then the WSL distribution.
    #>
    [CmdletBinding()]
    param([Parameter(Mandatory)]$Config)
    if ($Config.QemuImg) {
        if (Test-Path -LiteralPath $Config.QemuImg -PathType Leaf) { return [pscustomobject]@{ Kind = 'windows'; Path = $Config.QemuImg } }
        return $null
    }
    $onPath = Get-Command qemu-img.exe -ErrorAction SilentlyContinue | Select-Object -First 1
    if ($onPath) { return [pscustomobject]@{ Kind = 'windows'; Path = $onPath.Source } }
    if ($env:ProgramFiles) {
        $programFiles = Join-Path $env:ProgramFiles 'qemu\qemu-img.exe'
        if (Test-Path -LiteralPath $programFiles -PathType Leaf) { return [pscustomobject]@{ Kind = 'windows'; Path = $programFiles } }
    }
    if ($Config.WslDistribution -and (Get-Command wsl.exe -ErrorAction SilentlyContinue)) {
        $found = & wsl.exe -d $Config.WslDistribution -e sh -c 'command -v qemu-img' 2>$null
        if ($LASTEXITCODE -eq 0 -and $found) { return [pscustomobject]@{ Kind = 'wsl'; Path = "wsl.exe -d $($Config.WslDistribution) -e $($found | Select-Object -First 1)" } }
    }
    return $null
}

function Get-LabEnvironment {
    <#
    .SYNOPSIS
        Collects the facts the plan needs. Nothing here needs administrator rights.
    #>
    [CmdletBinding()]
    param([Parameter(Mandatory)]$Config)
    $hostAddresses = @()
    if (Get-Command Get-NetIPAddress -ErrorAction SilentlyContinue) {
        $hostAddresses = @(Get-NetIPAddress -AddressFamily IPv4 -ErrorAction SilentlyContinue |
                ForEach-Object { [pscustomobject]@{ Address = $_.IPAddress; Prefix = $_.PrefixLength; Interface = $_.InterfaceAlias } })
    }
    $memoryGB = 0
    try { $memoryGB = [math]::Round((Get-CimInstance -ClassName Win32_ComputerSystem -ErrorAction Stop).TotalPhysicalMemory / 1GB, 1) } catch { $memoryGB = 0 }
    $freeGB = $null
    try {
        $root = [IO.Path]::GetPathRoot($Config.VmPath)
        $drive = New-Object IO.DriveInfo($root)
        if ($drive.IsReady) { $freeGB = [math]::Round($drive.AvailableFreeSpace / 1GB, 1) }
    }
    catch { $freeGB = $null }
    $keyStatus = 'missing'
    try { [void](Read-LabPublicKey -Path $Config.PublicKeyFile); $keyStatus = 'found' } catch { $keyStatus = "problem: $($_.Exception.Message)" }
    $qemu = $null
    try { $qemu = Find-LabQemuImg -Config $Config } catch { $qemu = $null }
    return [pscustomobject]@{
        IsElevated     = Test-LabElevated
        HyperVModule   = [bool](Get-Module -ListAvailable -Name Hyper-V)
        HostAddresses  = $hostAddresses
        HostMemoryGB   = $memoryGB
        FreeDiskGB     = $freeGB
        KeyStatus      = $keyStatus
        QemuImg        = $qemu
        ImageCached    = (Test-Path -LiteralPath $Config.ImagePath -PathType Leaf)
        BaseVhdCached  = (Test-Path -LiteralPath $Config.BaseVhd -PathType Leaf)
    }
}

function Get-LabPortProxy {
    <#
    .SYNOPSIS
        Lists the Windows port proxies used when network.control_access is 'portproxy'.
    #>
    [CmdletBinding()]
    param([Parameter(Mandatory)]$Config)
    $lb = $Config.Nodes | Where-Object Role -EQ 'lb' | Select-Object -First 1
    $list = @([pscustomobject]@{ ListenPort = 6443; Address = $lb.Address; Port = 6443; For = 'Kubernetes API through HAProxy' })
    foreach ($node in $Config.Nodes) {
        $last = [int]$node.Address.Split('.')[3]
        $list += [pscustomobject]@{ ListenPort = $Config.PortProxySshBase + $last; Address = $node.Address; Port = 22; For = "SSH to $($node.Name)" }
    }
    return $list
}

function Get-LabPlan {
    <#
    .SYNOPSIS
        Returns, as text lines, exactly what 'create' would do. Needs no administrator rights.
    #>
    [CmdletBinding()]
    [OutputType([string[]])]
    param(
        [Parameter(Mandatory)]$Config,
        [Parameter(Mandatory)]$Environment,
        [switch]$ConfigureDns
    )
    $out = New-Object System.Collections.Generic.List[string]
    $nodes = @($Config.Nodes)
    $out.Add("Plan for the LGTM lab from $($Config.Path)")
    $out.Add('Nothing is changed by this command. `create` does the steps below and skips what already exists.')
    $out.Add('')
    $out.Add('Host network')
    $out.Add("  1. Hyper-V internal switch '$($Config.SwitchName)', Notes '$($Config.Tag)'.")
    $out.Add("  2. Host address $($Config.Gateway)/$($Config.PrefixLength) on 'vEthernet ($($Config.SwitchName))'.")
    $out.Add("  3. NAT '$($Config.NatName)' for $($Config.Subnet), so the VMs reach the internet.")
    if ($ConfigureDns) {
        $out.Add("  4. Windows name resolution rule: '.$($Config.Domain)' is sent to $($Config.LabDns) (comment '$($Config.Tag)').")
    }
    else {
        $out.Add("  4. (skipped) Name resolution rule for '.$($Config.Domain)'; add -ConfigureDns to create it.")
    }
    if ($Config.ControlAccess -eq 'portproxy') {
        $out.Add('  5. Port proxies on 127.0.0.1 for WSL (network.control_access: portproxy):')
        foreach ($p in (Get-LabPortProxy -Config $Config)) { $out.Add("       127.0.0.1:$($p.ListenPort) -> $($p.Address):$($p.Port)  $($p.For)") }
    }
    $out.Add('')
    $out.Add('Image')
    $imageState = if ($Environment.ImageCached) { 'cached, checksum checked again' } else { 'download' }
    $out.Add("  - $imageState $($Config.ImageUrl)")
    $out.Add("      to $($Config.ImagePath)")
    $out.Add("      SHA-256 $($Config.ImageSha256)")
    $qemuText = if ($Environment.QemuImg) { "$($Environment.QemuImg.Kind): $($Environment.QemuImg.Path)" } else { 'NOT FOUND (see the acceptance checklist, step 0)' }
    $baseState = if ($Environment.BaseVhdCached) { 'cached' } else { 'convert with qemu-img' }
    $out.Add("  - $baseState QCOW2 to VHDX $($Config.BaseVhd)")
    $out.Add("      qemu-img: $qemuText")
    $out.Add('')
    $out.Add("VMs ($($nodes.Count)), created in this order; folder $($Config.VmPath)\<name>")
    $out.Add(('  {0,-9} {1,-14} {2,-12} {3,4} {4,7} {5,8} {6,9}  {7}' -f 'Name', 'Role', 'Address', 'vCPU', 'Memory', 'OS disk', 'Data disk', 'MAC'))
    foreach ($n in $nodes) {
        $data = if ($n.DataDiskGB -gt 0) { "$($n.DataDiskGB) GB" } else { '-' }
        $out.Add(('  {0,-9} {1,-14} {2,-12} {3,4} {4,7} {5,8} {6,9}  {7}' -f $n.Name, $n.Role, $n.Address, $n.Vcpu, "$($n.MemoryGB) GB", "$($n.DiskGB) GB", $data, $n.Mac))
    }
    $vcpu = ($nodes | Measure-Object -Property Vcpu -Sum).Sum
    $memory = ($nodes | Measure-Object -Property MemoryGB -Sum).Sum
    $disk = ($nodes | Measure-Object -Property DiskGB -Sum).Sum + ($nodes | Measure-Object -Property DataDiskGB -Sum).Sum
    $out.Add("  Total: $vcpu vCPU, $memory GB memory (static), $disk GB of dynamic disks at most.")
    $out.Add('')
    $out.Add('For each VM')
    $out.Add("  a. Copy the base VHDX to <name>-os.vhdx and grow it to the OS disk size.")
    $out.Add("  b. Build <name>-seed.vhdx: 64 MB, FAT32, label CIDATA, holding meta-data, user-data, network-config")
    $out.Add("     (hostname, user '$($Config.SshUser)' with the key from $($Config.PublicKeyFile), no password login,")
    $out.Add("     static address on $($Config.Interface) matched by MAC, gateway $($Config.Gateway), DNS $($Config.UpstreamDns -join ', ')).")
    $out.Add("  c. New-VM generation 2, static memory, automatic checkpoints off, Notes '$($Config.Tag)', static MAC,")
    $out.Add("     Secure Boot template $($Config.SecureBootTemplate), boot from the OS disk, seed disk attached.")
    $out.Add('  d. Workers only: an empty dynamic data disk <name>-data.vhdx for /var/lib/longhorn.')
    $out.Add('  The VMs are not started: run `lab-vms.ps1 start` next.')
    $out.Add('')
    $out.Add('Checks')
    $out.Add("  - Administrator rights: $(if ($Environment.IsElevated) { 'yes' } else { 'no (needed by create, start, stop, destroy and status)' })")
    $out.Add("  - Hyper-V PowerShell module: $(if ($Environment.HyperVModule) { 'installed' } else { 'NOT installed' })")
    $out.Add("  - SSH public key $($Config.PublicKeyFile): $($Environment.KeyStatus)")
    $clashes = @($Environment.HostAddresses | Where-Object {
            $_.Address -ne $Config.Gateway -and (Test-LabAddressInSubnet -Address $_.Address -Subnet $Config.Subnet)
        })
    if ($clashes.Count -gt 0) {
        foreach ($c in $clashes) { $out.Add("  - WARNING: host address $($c.Address) on '$($c.Interface)' is inside $($Config.Subnet).") }
    }
    else {
        $out.Add("  - Host addresses: none inside $($Config.Subnet) except the planned $($Config.Gateway).")
    }
    if ($Environment.HostMemoryGB -gt 0) {
        $left = [math]::Round($Environment.HostMemoryGB - $memory, 1)
        $flag = if ($left -lt 8) { 'WARNING: ' } else { '' }
        $out.Add("  - ${flag}Memory: $memory GB for VMs of $($Environment.HostMemoryGB) GB on the host, $left GB left for Windows.")
    }
    if ($null -ne $Environment.FreeDiskGB) {
        $flag = if ($Environment.FreeDiskGB -lt 90) { 'WARNING: ' } else { '' }
        $out.Add("  - ${flag}Free space on the drive of $($Config.VmPath): $($Environment.FreeDiskGB) GB (the lab is planned for up to 90 GB of real use).")
    }
    else {
        $out.Add("  - Free space: the drive of $($Config.VmPath) is not available.")
    }
    return , ($out.ToArray())
}

#endregion

#region State file

function Get-LabState {
    [CmdletBinding()]
    param([Parameter(Mandatory)]$Config)
    $state = [ordered]@{ createdSwitch = $false; createdNat = $false; createdHostAddress = $false; portProxies = @() }
    if (Test-Path -LiteralPath $Config.StatePath -PathType Leaf) {
        $saved = Get-Content -LiteralPath $Config.StatePath -Raw | ConvertFrom-Json
        foreach ($p in $saved.PSObject.Properties) { $state[$p.Name] = $p.Value }
    }
    return $state
}

function Save-LabState {
    [CmdletBinding(SupportsShouldProcess)]
    param(
        [Parameter(Mandatory)]$Config,
        [Parameter(Mandatory)][System.Collections.IDictionary]$State
    )
    if ($PSCmdlet.ShouldProcess($Config.StatePath, 'Record what this script created')) {
        if (-not (Test-Path -LiteralPath $Config.CacheDir)) { [void](New-Item -ItemType Directory -Path $Config.CacheDir) }
        $State | ConvertTo-Json -Depth 4 | Set-Content -LiteralPath $Config.StatePath -Encoding ASCII
    }
}

#endregion

#region Image and disks

function Save-LabImage {
    <#
    .SYNOPSIS
        Downloads the cloud image once and checks its SHA-256.
    #>
    [CmdletBinding(SupportsShouldProcess)]
    param([Parameter(Mandatory)]$Config)
    if (Test-Path -LiteralPath $Config.ImagePath -PathType Leaf) {
        $hash = (Get-FileHash -LiteralPath $Config.ImagePath -Algorithm SHA256).Hash.ToLowerInvariant()
        if ($hash -eq $Config.ImageSha256) { Write-LabStep "Image cached and checksum correct: $($Config.ImagePath)"; return }
        throw "Cached image $($Config.ImagePath) has SHA-256 $hash, expected $($Config.ImageSha256). Delete it and run create again."
    }
    if ($PSCmdlet.ShouldProcess($Config.ImageUrl, "Download to $($Config.ImagePath)")) {
        if (-not (Test-Path -LiteralPath $Config.CacheDir)) { [void](New-Item -ItemType Directory -Path $Config.CacheDir) }
        $partial = "$($Config.ImagePath).part"
        [Net.ServicePointManager]::SecurityProtocol = [Net.ServicePointManager]::SecurityProtocol -bor [Net.SecurityProtocolType]::Tls12
        $previous = $ProgressPreference
        $ProgressPreference = 'SilentlyContinue'
        try { Invoke-WebRequest -Uri $Config.ImageUrl -OutFile $partial -UseBasicParsing }
        finally { $ProgressPreference = $previous }
        $hash = (Get-FileHash -LiteralPath $partial -Algorithm SHA256).Hash.ToLowerInvariant()
        if ($hash -ne $Config.ImageSha256) {
            Remove-Item -LiteralPath $partial -Force
            throw "Downloaded image has SHA-256 $hash, expected $($Config.ImageSha256). Nothing was kept."
        }
        Move-Item -LiteralPath $partial -Destination $Config.ImagePath
        Write-LabStep "Downloaded and verified $($Config.ImagePath)"
    }
}

function Convert-LabBaseImage {
    <#
    .SYNOPSIS
        Converts the QCOW2 cloud image to a dynamic VHDX once, with qemu-img.
    #>
    [CmdletBinding(SupportsShouldProcess)]
    param([Parameter(Mandatory)]$Config)
    if (Test-Path -LiteralPath $Config.BaseVhd -PathType Leaf) { Write-LabStep "Base VHDX cached: $($Config.BaseVhd)"; return }
    $qemu = Find-LabQemuImg -Config $Config
    if (-not $qemu) {
        throw 'qemu-img not found. Install it (winget install --id SoftwareFreedomConservancy.QEMU, or `sudo pacman -S qemu-img` in WSL), or set hyperv.qemu_img in nodes.yml.'
    }
    if ($PSCmdlet.ShouldProcess($Config.ImagePath, "Convert to VHDX $($Config.BaseVhd) with $($qemu.Path)")) {
        $partial = "$($Config.BaseVhd).part.vhdx"
        if ($qemu.Kind -eq 'windows') {
            & $qemu.Path convert -f qcow2 -O vhdx -o subformat=dynamic $Config.ImagePath $partial
        }
        else {
            & wsl.exe -d $Config.WslDistribution -e qemu-img convert -f qcow2 -O vhdx -o subformat=dynamic (ConvertTo-LabWslPath $Config.ImagePath) (ConvertTo-LabWslPath $partial)
        }
        if ($LASTEXITCODE -ne 0) { throw "qemu-img convert failed with exit code $LASTEXITCODE." }
        # Hyper-V refuses sparse VHDX files; clear the flag in case the converter set it.
        & fsutil.exe sparse setflag $partial 0 | Out-Null
        Move-Item -LiteralPath $partial -Destination $Config.BaseVhd
        Write-LabStep "Converted base image to $($Config.BaseVhd)"
    }
}

function New-LabSeedDisk {
    <#
    .SYNOPSIS
        Builds a small VHDX with a FAT32 volume labelled CIDATA that holds the NoCloud seed files.
    #>
    [CmdletBinding(SupportsShouldProcess)]
    param(
        [Parameter(Mandatory)][string]$Path,
        [Parameter(Mandatory)][System.Collections.IDictionary]$Files
    )
    if (-not $PSCmdlet.ShouldProcess($Path, 'Create cloud-init seed disk (FAT32, label CIDATA)')) { return }
    [void](New-VHD -Path $Path -SizeBytes 64MB -Dynamic)
    $mounted = $false
    try {
        $disk = Mount-VHD -Path $Path -Passthru | Get-Disk
        $mounted = $true
        Initialize-Disk -Number $disk.Number -PartitionStyle MBR
        $partition = New-Partition -DiskNumber $disk.Number -UseMaximumSize -AssignDriveLetter
        [void](Format-Volume -Partition $partition -FileSystem FAT32 -NewFileSystemLabel 'CIDATA' -Confirm:$false)
        $root = "$($partition.DriveLetter):\"
        $utf8 = New-Object System.Text.UTF8Encoding($false)
        foreach ($name in $Files.Keys) { [IO.File]::WriteAllText((Join-Path $root $name), $Files[$name], $utf8) }
    }
    finally {
        if ($mounted) { Dismount-VHD -Path $Path }
    }
}

#endregion

#region Actions

function Get-LabTaggedVm {
    [CmdletBinding()]
    param([Parameter(Mandatory)]$Config)
    $pattern = '(^|\r?\n)' + [regex]::Escape($Config.Tag) + '(\r?\n|$)'
    return @(Get-VM | Where-Object { $_.Notes -match $pattern })
}

function Invoke-LabCreate {
    <#
    .SYNOPSIS
        Creates the switch, NAT, image and VMs. Idempotent: existing parts are kept.
    #>
    [CmdletBinding(SupportsShouldProcess)]
    param(
        [Parameter(Mandatory)]$Config,
        [switch]$ConfigureDns,
        [bool]$IsElevated = (Test-LabElevated)
    )
    if (-not $WhatIfPreference) { Assert-LabElevated -Step 'create' -IsElevated $IsElevated }

    $publicKey = $null
    try { $publicKey = Read-LabPublicKey -Path $Config.PublicKeyFile }
    catch {
        if (-not $WhatIfPreference) { throw }
        Write-Warning "$($_.Exception.Message) The real run stops here."
        $publicKey = 'ssh-ed25519 AAAAPLACEHOLDER whatif'
    }
    $seeds = [ordered]@{}
    foreach ($node in $Config.Nodes) { $seeds[$node.Name] = ConvertTo-LabCloudInit -Config $Config -Node $node -PublicKey $publicKey }
    Write-LabStep "Rendered cloud-init seeds for $($seeds.Count) VMs."

    Save-LabImage -Config $Config
    if ($WhatIfPreference -and -not (Find-LabQemuImg -Config $Config) -and -not (Test-Path -LiteralPath $Config.BaseVhd)) {
        Write-Warning 'qemu-img not found; the real run stops at the conversion step.'
        Write-LabStep "What if: convert $($Config.ImagePath) to $($Config.BaseVhd)"
    }
    else {
        Convert-LabBaseImage -Config $Config
    }

    Assert-LabElevated -Step "Get-VMSwitch -Name $($Config.SwitchName)" -IsElevated $IsElevated
    $state = Get-LabState -Config $Config

    $switch = Get-VMSwitch -Name $Config.SwitchName -ErrorAction SilentlyContinue
    if ($switch) {
        if ($switch.SwitchType -ne 'Internal') { throw "Switch '$($Config.SwitchName)' exists and is $($switch.SwitchType), not Internal." }
        Write-LabStep "Switch '$($Config.SwitchName)' exists."
    }
    elseif ($PSCmdlet.ShouldProcess($Config.SwitchName, 'Create internal Hyper-V switch')) {
        [void](New-VMSwitch -Name $Config.SwitchName -SwitchType Internal -Notes $Config.Tag)
        $state.createdSwitch = $true
        Save-LabState -Config $Config -State $state
    }

    $alias = "vEthernet ($($Config.SwitchName))"
    if (Get-NetIPAddress -InterfaceAlias $alias -IPAddress $Config.Gateway -ErrorAction SilentlyContinue) {
        Write-LabStep "Host address $($Config.Gateway) exists on '$alias'."
    }
    elseif ($PSCmdlet.ShouldProcess($alias, "Add host address $($Config.Gateway)/$($Config.PrefixLength)")) {
        [void](New-NetIPAddress -InterfaceAlias $alias -IPAddress $Config.Gateway -PrefixLength $Config.PrefixLength)
        $state.createdHostAddress = $true
        Save-LabState -Config $Config -State $state
    }

    $nat = Get-NetNat -Name $Config.NatName -ErrorAction SilentlyContinue
    if ($nat) {
        Write-LabStep "NAT '$($Config.NatName)' exists for $($nat.InternalIPInterfaceAddressPrefix)."
    }
    elseif ($PSCmdlet.ShouldProcess($Config.NatName, "Create NAT for $($Config.Subnet)")) {
        try { [void](New-NetNat -Name $Config.NatName -InternalIPInterfaceAddressPrefix $Config.Subnet) }
        catch {
            $others = (Get-NetNat | ForEach-Object { "$($_.Name) ($($_.InternalIPInterfaceAddressPrefix))" }) -join ', '
            throw "New-NetNat failed: $($_.Exception.Message) Existing NAT networks: $others"
        }
        $state.createdNat = $true
        Save-LabState -Config $Config -State $state
    }

    $tagged = Get-LabTaggedVm -Config $Config
    foreach ($node in $Config.Nodes) {
        $existing = Get-VM -Name $node.Name -ErrorAction SilentlyContinue
        if ($existing) {
            if (@($tagged | ForEach-Object Name) -contains $node.Name) { Write-LabStep "VM $($node.Name) exists; kept as it is."; continue }
            throw "A VM named '$($node.Name)' exists without the '$($Config.Tag)' tag. It is not part of this lab; rename it or change nodes.yml."
        }
        if (-not $PSCmdlet.ShouldProcess($node.Name, "Create VM ($($node.Role), $($node.Address), $($node.Vcpu) vCPU, $($node.MemoryGB) GB)")) { continue }
        if (-not (Test-Path -LiteralPath $node.Folder)) { [void](New-Item -ItemType Directory -Path $node.Folder) }
        if (-not (Test-Path -LiteralPath $node.OsVhd)) {
            Copy-Item -LiteralPath $Config.BaseVhd -Destination $node.OsVhd
            & fsutil.exe sparse setflag $node.OsVhd 0 | Out-Null
            Resize-VHD -Path $node.OsVhd -SizeBytes ([long]$node.DiskGB * 1GB)
        }
        if (-not (Test-Path -LiteralPath $node.SeedVhd)) { New-LabSeedDisk -Path $node.SeedVhd -Files $seeds[$node.Name] }
        if ($node.DataDiskGB -gt 0 -and -not (Test-Path -LiteralPath $node.DataVhd)) {
            [void](New-VHD -Path $node.DataVhd -SizeBytes ([long]$node.DataDiskGB * 1GB) -Dynamic)
        }
        [void](New-VM -Name $node.Name -Generation 2 -MemoryStartupBytes ([long]$node.MemoryGB * 1GB) -Path $Config.VmPath -VHDPath $node.OsVhd -SwitchName $Config.SwitchName)
        Set-VM -Name $node.Name -Notes $Config.Tag -ProcessorCount $node.Vcpu -StaticMemory -AutomaticCheckpointsEnabled $false -AutomaticStartAction Nothing -AutomaticStopAction ShutDown
        Set-VMNetworkAdapter -VMName $node.Name -StaticMacAddress ($node.Mac -replace ':', '').ToUpperInvariant()
        Add-VMHardDiskDrive -VMName $node.Name -ControllerType SCSI -Path $node.SeedVhd
        if ($node.DataDiskGB -gt 0) { Add-VMHardDiskDrive -VMName $node.Name -ControllerType SCSI -Path $node.DataVhd }
        $osDrive = Get-VMHardDiskDrive -VMName $node.Name | Where-Object Path -EQ $node.OsVhd
        Set-VMFirmware -VMName $node.Name -EnableSecureBoot On -SecureBootTemplate $Config.SecureBootTemplate -FirstBootDevice $osDrive
        Write-LabStep "Created VM $($node.Name)."
    }

    if ($ConfigureDns) {
        $namespace = ".$($Config.Domain)"
        if (Get-DnsClientNrptRule | Where-Object { $_.Namespace -contains $namespace }) {
            Write-LabStep "Name resolution rule for '$namespace' exists."
        }
        elseif ($PSCmdlet.ShouldProcess($namespace, "Send DNS queries to $($Config.LabDns)")) {
            Add-DnsClientNrptRule -Namespace $namespace -NameServers $Config.LabDns -Comment $Config.Tag
        }
    }

    if ($Config.ControlAccess -eq 'portproxy') {
        $proxies = @($state.portProxies)
        foreach ($p in (Get-LabPortProxy -Config $Config)) {
            if ($proxies -contains $p.ListenPort) { continue }
            if ($PSCmdlet.ShouldProcess("127.0.0.1:$($p.ListenPort)", "Port proxy to $($p.Address):$($p.Port)")) {
                & netsh.exe interface portproxy add v4tov4 listenaddress=127.0.0.1 listenport=$($p.ListenPort) connectaddress=$($p.Address) connectport=$($p.Port) | Out-Null
                if ($LASTEXITCODE -ne 0) { throw "netsh portproxy add failed for port $($p.ListenPort)." }
                $proxies += $p.ListenPort
                $state.portProxies = $proxies
                Save-LabState -Config $Config -State $state
            }
        }
    }
    Write-LabStep 'Create finished. Next: lab-vms.ps1 start'
}

function Invoke-LabStart {
    <#
    .SYNOPSIS
        Starts the lab VMs: lb, then the control plane, then the workers.
    #>
    [CmdletBinding(SupportsShouldProcess)]
    param([Parameter(Mandatory)]$Config)
    Assert-LabElevated -Step 'Start-VM'
    $tagged = Get-LabTaggedVm -Config $Config
    foreach ($node in $Config.Nodes) {
        $vm = $tagged | Where-Object Name -EQ $node.Name
        if (-not $vm) { Write-Warning "VM $($node.Name) does not exist; run create first."; continue }
        if ($vm.State -eq 'Running') { Write-LabStep "$($node.Name) is running."; continue }
        if ($PSCmdlet.ShouldProcess($node.Name, 'Start VM')) { Start-VM -Name $node.Name; Write-LabStep "Started $($node.Name)." }
    }
}

function Invoke-LabStop {
    <#
    .SYNOPSIS
        Shuts the lab VMs down in the reverse order of start.
    #>
    [CmdletBinding(SupportsShouldProcess)]
    param([Parameter(Mandatory)]$Config)
    Assert-LabElevated -Step 'Stop-VM'
    $tagged = Get-LabTaggedVm -Config $Config
    $order = @($Config.Nodes)
    [array]::Reverse($order)
    foreach ($node in $order) {
        $vm = $tagged | Where-Object Name -EQ $node.Name
        if (-not $vm -or $vm.State -eq 'Off') { continue }
        if ($PSCmdlet.ShouldProcess($node.Name, 'Shut down VM')) { Stop-VM -Name $node.Name; Write-LabStep "Shut down $($node.Name)." }
    }
}

function Invoke-LabDestroy {
    <#
    .SYNOPSIS
        Removes the VMs that carry the lab tag, their disks, and the switch, NAT, DNS rule and
        port proxies this script created. It refuses everything else.
    #>
    [CmdletBinding(SupportsShouldProcess, ConfirmImpact = 'High')]
    param([Parameter(Mandatory)]$Config)
    Assert-LabElevated -Step 'Remove-VM'
    $state = Get-LabState -Config $Config
    $vmRoot = [IO.Path]::GetFullPath($Config.VmPath).TrimEnd('\') + '\'
    foreach ($vm in (Get-LabTaggedVm -Config $Config)) {
        if (-not $PSCmdlet.ShouldProcess($vm.Name, 'Delete VM and its disks')) { continue }
        $disks = @(Get-VMHardDiskDrive -VMName $vm.Name | ForEach-Object Path)
        if ($vm.State -ne 'Off') { Stop-VM -Name $vm.Name -TurnOff -Force }
        Remove-VM -Name $vm.Name -Force
        foreach ($disk in $disks) {
            $full = [IO.Path]::GetFullPath($disk)
            if ($full.StartsWith($vmRoot, [StringComparison]::OrdinalIgnoreCase)) { Remove-Item -LiteralPath $full -Force -ErrorAction SilentlyContinue }
            else { Write-Warning "Kept disk ${full}: it is outside $vmRoot." }
        }
        $folder = Join-Path $vmRoot $vm.Name
        if (Test-Path -LiteralPath $folder) { Remove-Item -LiteralPath $folder -Recurse -Force }
        Write-LabStep "Deleted VM $($vm.Name)."
    }
    foreach ($rule in @(Get-DnsClientNrptRule | Where-Object Comment -EQ $Config.Tag)) {
        if ($PSCmdlet.ShouldProcess(($rule.Namespace -join ','), 'Remove name resolution rule')) { Remove-DnsClientNrptRule -Name $rule.Name -Force }
    }
    foreach ($port in @($state.portProxies)) {
        if ($PSCmdlet.ShouldProcess("127.0.0.1:$port", 'Remove port proxy')) {
            & netsh.exe interface portproxy delete v4tov4 listenaddress=127.0.0.1 listenport=$port | Out-Null
        }
    }
    $state.portProxies = @()
    if ($state.createdNat -and (Get-NetNat -Name $Config.NatName -ErrorAction SilentlyContinue)) {
        if ($PSCmdlet.ShouldProcess($Config.NatName, 'Remove NAT')) { Remove-NetNat -Name $Config.NatName -Confirm:$false; $state.createdNat = $false }
    }
    elseif (Get-NetNat -Name $Config.NatName -ErrorAction SilentlyContinue) {
        Write-Warning "NAT '$($Config.NatName)' was not created by this script; kept."
    }
    $switch = Get-VMSwitch -Name $Config.SwitchName -ErrorAction SilentlyContinue
    if ($switch -and $state.createdSwitch -and $switch.Notes -match [regex]::Escape($Config.Tag)) {
        if ($PSCmdlet.ShouldProcess($Config.SwitchName, 'Remove switch')) { Remove-VMSwitch -Name $Config.SwitchName -Force; $state.createdSwitch = $false; $state.createdHostAddress = $false }
    }
    elseif ($switch) {
        Write-Warning "Switch '$($Config.SwitchName)' was not created by this script; kept."
    }
    Save-LabState -Config $Config -State $state
}

function Test-LabTcpPort {
    [CmdletBinding()]
    [OutputType([bool])]
    param([string]$Address, [int]$Port, [int]$TimeoutMs = 500)
    $client = New-Object Net.Sockets.TcpClient
    try { return ($client.ConnectAsync($Address, $Port).Wait($TimeoutMs) -and $client.Connected) }
    catch { return $false }
    finally { $client.Dispose() }
}

function Get-LabStatus {
    <#
    .SYNOPSIS
        Returns one row per VM: state, CPU, memory, uptime and whether SSH answers.
    #>
    [CmdletBinding()]
    param([Parameter(Mandatory)]$Config)
    Assert-LabElevated -Step 'Get-VM'
    $tagged = Get-LabTaggedVm -Config $Config
    foreach ($node in $Config.Nodes) {
        $vm = $tagged | Where-Object Name -EQ $node.Name
        [pscustomobject]@{
            Name     = $node.Name
            Role     = $node.Role
            Address  = $node.Address
            State    = if ($vm) { [string]$vm.State } else { 'missing' }
            CPU      = if ($vm) { "$($vm.CPUUsage)%" } else { '' }
            MemoryGB = if ($vm) { [math]::Round($vm.MemoryAssigned / 1GB, 1) } else { '' }
            Uptime   = if ($vm) { $vm.Uptime.ToString('d\.hh\:mm') } else { '' }
            SSH      = if ($vm -and $vm.State -eq 'Running') { if (Test-LabTcpPort -Address $node.Address -Port 22) { 'open' } else { 'closed' } } else { '' }
        }
    }
}

#endregion

Export-ModuleMember -Function @(
    'ConvertFrom-LabYaml', 'Get-LabConfig', 'Get-LabMacAddress', 'Test-LabAddressInSubnet', 'ConvertTo-LabWslPath',
    'Read-LabPublicKey', 'ConvertTo-LabCloudInit', 'Get-LabEnvironment', 'Get-LabPlan', 'Get-LabPortProxy',
    'Test-LabElevated', 'Assert-LabElevated', 'Find-LabQemuImg',
    'Invoke-LabCreate', 'Invoke-LabStart', 'Invoke-LabStop', 'Invoke-LabDestroy', 'Get-LabStatus'
)
