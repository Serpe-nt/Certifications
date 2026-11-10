#Requires -Version 5.1
# Pester 5 tests for LabVms.psm1 and lab-vms.ps1. They need no administrator rights and no Hyper-V.

BeforeAll {
    $script:HyperVDir = Split-Path -Parent $PSScriptRoot
    # The real file: the owner changes its sizes, so tests only check that it parses and validates.
    $script:NodesFile = Join-Path (Split-Path -Parent $script:HyperVDir) 'nodes.yml'
    # A copy with fixed sizes (31 vCPU, 46 GB): every test that asserts numbers or rewrites lines uses it.
    $script:FixtureFile = Join-Path $PSScriptRoot 'fixtures\nodes.yml'
    Import-Module (Join-Path $script:HyperVDir 'LabVms.psm1') -Force
    $script:KeyLine = 'ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIBj2+fakefakefakefakefakefakefakefakefakefake vaka@test'

    function script:New-TestNodesFile {
        param([scriptblock]$Edit = { param($t) $t })
        $text = [IO.File]::ReadAllText($script:FixtureFile)
        $key = Join-Path $TestDrive 'test.pub'
        [IO.File]::WriteAllText($key, $script:KeyLine + "`n")
        $text = $text -replace '(?m)^  public_key_file: .*$', "  public_key_file: $key"
        $text = & $Edit $text
        $path = Join-Path $TestDrive ("nodes-{0}.yml" -f [guid]::NewGuid().ToString('N'))
        [IO.File]::WriteAllText($path, $text)
        return $path
    }

    function script:Get-FakeEnvironment {
        [pscustomobject]@{
            IsElevated    = $false
            HyperVModule  = $true
            HostAddresses = @([pscustomobject]@{ Address = '192.168.1.10'; Prefix = 24; Interface = 'WiFi' })
            HostMemoryGB  = 61.6
            FreeDiskGB    = 120
            KeyStatus     = 'found'
            QemuImg       = [pscustomobject]@{ Kind = 'windows'; Path = 'C:\Program Files\qemu\qemu-img.exe' }
            ImageCached   = $false
            BaseVhdCached = $false
        }
    }
}

Describe 'ConvertFrom-LabYaml' {
    It 'reads nested mappings, lists of mappings and typed scalars' {
        $yaml = @(
            '# comment'
            'a:'
            '  b: 1'
            "  c: 'it''s'"
            '  d: "x\"y"'
            '  e: [1.1.1.1, ''9.9.9.9'']'
            '  f: true'
            '  g: C:\Hyper-V\lab   # trailing comment'
            '  h: https://example.com/a#b'
            'items:'
            '  - name: one'
            '    size: 2'
            '  - name: two'
            'plain:'
            '- x'
            '- y'
        ) -join "`n"
        $r = ConvertFrom-LabYaml -Text $yaml
        $r.a.b | Should -Be 1
        $r.a.b | Should -BeOfType [int]
        $r.a.c | Should -Be "it's"
        $r.a.d | Should -Be 'x"y'
        $r.a.e | Should -Be @('1.1.1.1', '9.9.9.9')
        $r.a.f | Should -BeTrue
        $r.a.g | Should -Be 'C:\Hyper-V\lab'
        $r.a.h | Should -Be 'https://example.com/a#b'
        $r.items.Count | Should -Be 2
        $r.items[0].name | Should -Be 'one'
        $r.items[0].size | Should -Be 2
        $r.items[1].name | Should -Be 'two'
        $r.plain | Should -Be @('x', 'y')
    }

    It 'rejects <Case>' -TestCases @(
        @{ Case = 'tabs'; Text = "a:`n`tb: 1" }
        @{ Case = 'flow mappings'; Text = 'a: {b: 1}' }
        @{ Case = 'anchors'; Text = 'a: &x 1' }
        @{ Case = 'duplicate keys'; Text = "a: 1`na: 2" }
        @{ Case = 'bad indentation'; Text = "a:`n    b: 1`n  c: 2" }
        @{ Case = 'unterminated quotes'; Text = "a: 'x" }
    ) {
        { ConvertFrom-LabYaml -Text $Text } | Should -Throw
    }

    It 'reads nodes.yml the same way as PyYAML' {
        $ErrorActionPreference = 'Continue'
        $json = $null
        foreach ($python in @('python', 'python3')) {
            if (-not (Get-Command $python -ErrorAction SilentlyContinue)) { continue }
            $out = & $python -c 'import json,sys,yaml; print(json.dumps(yaml.safe_load(open(sys.argv[1], encoding="utf-8"))))' $script:NodesFile 2>$null
            if ($LASTEXITCODE -eq 0) { $json = $out; break }
        }
        if (-not $json) { Set-ItResult -Skipped -Because 'no Python with PyYAML on PATH'; return }
        $expected = $json | ConvertFrom-Json | ConvertTo-Json -Depth 10 -Compress
        $actual = ConvertFrom-LabYaml -Text ([IO.File]::ReadAllText($script:NodesFile)) | ConvertTo-Json -Depth 10 -Compress
        $actual | Should -Be $expected
    }
}

Describe 'Get-LabConfig with the real nodes.yml' {
    It 'parses and passes validation, whatever sizes the owner chose' {
        $config = Get-LabConfig -Path $script:NodesFile -CacheDir (Join-Path $TestDrive 'cache')
        @($config.Nodes | Where-Object Role -EQ 'lb').Count | Should -Be 1
        @($config.Nodes | Where-Object Role -EQ 'control_plane').Count | Should -BeGreaterThan 0
        @($config.Nodes | Where-Object Role -EQ 'worker').Count | Should -BeGreaterThan 0
    }
}

Describe 'Get-LabConfig with the fixture nodes file' {
    BeforeAll { $script:Config = Get-LabConfig -Path (New-TestNodesFile) -CacheDir (Join-Path $TestDrive 'cache') }

    It 'lists the 8 machines of the lab contract in creation order' {
        @($script:Config.Nodes | ForEach-Object Name) | Should -Be @('lb', 'master1', 'master2', 'master3', 'worker1', 'worker2', 'worker3', 'worker4')
        @($script:Config.Nodes | Where-Object Role -EQ 'lb' | ForEach-Object Address) | Should -Be @('10.10.0.5')
        @($script:Config.Nodes | Where-Object Role -EQ 'control_plane' | ForEach-Object Address) | Should -Be @('10.10.0.11', '10.10.0.12', '10.10.0.13')
        @($script:Config.Nodes | Where-Object Role -EQ 'worker' | ForEach-Object Address) | Should -Be @('10.10.0.30', '10.10.0.31', '10.10.0.32', '10.10.0.33')
    }

    It 'matches the network of the lab contract' {
        $script:Config.SwitchName | Should -Be 'lgtm-lab'
        $script:Config.Subnet | Should -Be '10.10.0.0/24'
        $script:Config.Gateway | Should -Be '10.10.0.1'
        $script:Config.LabDns | Should -Be '10.10.0.5'
        $script:Config.Domain | Should -Be 'k8s.local'
        $script:Config.SshUser | Should -Be 'vaka'
    }

    It 'has the fixture sizes (46 GB memory, 31 vCPU)' {
        ($script:Config.Nodes | Measure-Object MemoryGB -Sum).Sum | Should -Be 46
        ($script:Config.Nodes | Measure-Object Vcpu -Sum).Sum | Should -Be 31
        @($script:Config.Nodes | Where-Object DataDiskGB -GT 0 | ForEach-Object Name) | Should -Be @('worker1', 'worker2', 'worker3', 'worker4')
    }

    It 'derives unique unicast MAC addresses from the addresses' {
        ($script:Config.Nodes | Where-Object Name -EQ 'master1').Mac | Should -Be '02:4c:47:0a:00:0b'
        @($script:Config.Nodes | ForEach-Object Mac | Select-Object -Unique).Count | Should -Be 8
    }

    It 'keeps the image cache in the cache folder' {
        $script:Config.ImagePath | Should -BeLike '*cache*ubuntu-24.04-server-cloudimg-amd64.img'
        $script:Config.BaseVhd | Should -BeLike '*cache*ubuntu-24.04-server-cloudimg-amd64.vhdx'
    }
}

Describe 'Get-LabConfig validation' {
    It 'rejects <Case>' -TestCases @(
        @{ Case = 'a duplicate address'; From = 'address: 10.10.0.12'; To = 'address: 10.10.0.11'; Message = '*already used*' }
        @{ Case = 'an address outside the subnet'; From = 'address: 10.10.0.33'; To = 'address: 10.10.1.33'; Message = '*outside*' }
        @{ Case = 'a second lb'; From = "role: worker`n    address: 10.10.0.33"; To = "role: lb`n    address: 10.10.0.33"; Message = "*exactly one node needs role 'lb'*" }
        @{ Case = 'an unknown role'; From = "role: worker`n    address: 10.10.0.33"; To = "role: db`n    address: 10.10.0.33"; Message = '*must be one of*' }
        @{ Case = 'lab_dns not on lb'; From = 'lab_dns: 10.10.0.5'; To = 'lab_dns: 10.10.0.6'; Message = '*must be the address of the lb node*' }
        @{ Case = 'a bad checksum'; From = 'sha256: 04e8'; To = 'sha256: zz04e8'; Message = '*64 hexadecimal*' }
        @{ Case = 'a duplicate name'; From = 'name: worker4'; To = 'name: worker3'; Message = '*used twice*' }
        @{ Case = 'a zero size'; From = 'memory_gb: 1'; To = 'memory_gb: 0'; Message = '*above 0*' }
        @{ Case = 'a multicast MAC prefix'; From = 'mac_prefix: "02:4c:47"'; To = 'mac_prefix: "03:4c:47"'; Message = '*multicast*' }
    ) {
        # Pester 5 defines $From, $To and $Message from the test case.
        $path = New-TestNodesFile -Edit { param($t) $t.Replace(($From -replace "`n", "`n"), $To) }.GetNewClosure()
        { Get-LabConfig -Path $path } | Should -Throw -ExpectedMessage $Message
    }
}

Describe 'ConvertTo-LabCloudInit' {
    BeforeAll {
        $script:Config = Get-LabConfig -Path (New-TestNodesFile)
        $script:Worker = $script:Config.Nodes | Where-Object Name -EQ 'worker1'
        $script:Seed = ConvertTo-LabCloudInit -Config $script:Config -Node $script:Worker -PublicKey $script:KeyLine
    }

    It 'renders the three NoCloud files with LF endings' {
        $script:Seed.Keys | Should -Be @('meta-data', 'user-data', 'network-config')
        foreach ($text in $script:Seed.Values) { $text | Should -Not -Match "`r" }
    }

    It 'sets the instance id and hostname' {
        $meta = ConvertFrom-LabYaml -Text $script:Seed['meta-data']
        $meta.'instance-id' | Should -Be 'lgtm-lab-worker1'
        $meta.'local-hostname' | Should -Be 'worker1'
    }

    It 'creates the user with the key and no password login' {
        $script:Seed['user-data'] | Should -Match '^#cloud-config\n'
        $user = ConvertFrom-LabYaml -Text $script:Seed['user-data']
        $user.hostname | Should -Be 'worker1'
        $user.fqdn | Should -Be 'worker1.k8s.local'
        $user.ssh_pwauth | Should -BeFalse
        $user.disable_root | Should -BeTrue
        $user.users[0].name | Should -Be 'vaka'
        $user.users[0].lock_passwd | Should -BeTrue
        $user.users[0].sudo | Should -Be 'ALL=(ALL) NOPASSWD:ALL'
        $user.users[0].ssh_authorized_keys | Should -Be @($script:KeyLine)
    }

    It 'gives the single card a static address matched by MAC' {
        $net = ConvertFrom-LabYaml -Text $script:Seed['network-config']
        $net.version | Should -Be 2
        $eth = $net.ethernets.eth0
        $eth.match.macaddress | Should -Be '02:4c:47:0a:00:1e'
        $eth.'set-name' | Should -Be 'eth0'
        $eth.dhcp4 | Should -BeFalse
        $eth.addresses | Should -Be @('10.10.0.30/24')
        $eth.routes[0].to | Should -Be 'default'
        $eth.routes[0].via | Should -Be '10.10.0.1'
        $eth.nameservers.addresses | Should -Be @('1.1.1.1', '9.9.9.9')
    }

    It 'escapes single quotes in the key comment' {
        $seed = ConvertTo-LabCloudInit -Config $script:Config -Node $script:Worker -PublicKey ($script:KeyLine + "'s laptop")
        (ConvertFrom-LabYaml -Text $seed['user-data']).users[0].ssh_authorized_keys[0] | Should -Be ($script:KeyLine + "'s laptop")
    }
}

Describe 'Read-LabPublicKey' {
    It 'refuses a private key' {
        $path = Join-Path $TestDrive 'id'
        [IO.File]::WriteAllText($path, "-----BEGIN OPENSSH PRIVATE KEY-----`nabc`n-----END OPENSSH PRIVATE KEY-----`n")
        { Read-LabPublicKey -Path $path } | Should -Throw -ExpectedMessage '*private key*'
    }

    It 'refuses a missing file' {
        { Read-LabPublicKey -Path (Join-Path $TestDrive 'none.pub') } | Should -Throw -ExpectedMessage '*not found*'
    }
}

Describe 'Get-LabPlan' {
    BeforeAll {
        $script:Config = Get-LabConfig -Path (New-TestNodesFile)
        $script:Plan = Get-LabPlan -Config $script:Config -Environment (Get-FakeEnvironment)
    }

    It 'lists every VM with its address and sizes' {
        foreach ($n in $script:Config.Nodes) {
            @($script:Plan | Where-Object { $_ -match "^\s+$($n.Name)\s+$($n.Role)\s+$([regex]::Escape($n.Address))\s" }).Count | Should -Be 1
        }
        $script:Plan | Should -Contain '  Total: 31 vCPU, 46 GB memory (static), 365 GB of dynamic disks at most.'
    }

    It 'names the switch, NAT, image checksum and seed method' {
        ($script:Plan -join "`n") | Should -Match "internal switch 'lgtm-lab'"
        ($script:Plan -join "`n") | Should -Match "NAT 'lgtm-lab' for 10\.10\.0\.0/24"
        ($script:Plan -join "`n") | Should -Match '04e8f2461a16a44e78a370284471f29616cdd9baf1893df25807b71f985b6c94'
        ($script:Plan -join "`n") | Should -Match 'FAT32, label CIDATA'
    }

    It 'shows the DNS rule only with -ConfigureDns' {
        ($script:Plan -join "`n") | Should -Match '\(skipped\) Name resolution rule'
        $withDns = Get-LabPlan -Config $script:Config -Environment (Get-FakeEnvironment) -ConfigureDns
        ($withDns -join "`n") | Should -Match "'\.k8s\.local' is sent to 10\.10\.0\.5"
    }

    It 'warns about a host address inside the lab subnet' {
        $environment = Get-FakeEnvironment
        $environment.HostAddresses = @([pscustomobject]@{ Address = '10.10.0.7'; Prefix = 24; Interface = 'Other' })
        ((Get-LabPlan -Config $script:Config -Environment $environment) -join "`n") | Should -Match 'WARNING: host address 10\.10\.0\.7'
    }

    It 'lists port proxies when control_access is portproxy' {
        $config = Get-LabConfig -Path (New-TestNodesFile -Edit { param($t) $t.Replace('control_access: direct', 'control_access: portproxy') })
        $plan = (Get-LabPlan -Config $config -Environment (Get-FakeEnvironment)) -join "`n"
        $plan | Should -Match '127\.0\.0\.1:6443 -> 10\.10\.0\.5:6443'
        $plan | Should -Match '127\.0\.0\.1:22011 -> 10\.10\.0\.11:22'
    }
}

Describe 'Invoke-LabCreate without administrator rights' {
    BeforeAll {
        $script:Config = Get-LabConfig -Path (New-TestNodesFile) -CacheDir (Join-Path $TestDrive 'cache')
    }

    It 'refuses a real run at once' {
        { Invoke-LabCreate -Config $script:Config -IsElevated $false -InformationAction SilentlyContinue } |
            Should -Throw -ExceptionType ([System.UnauthorizedAccessException]) -ExpectedMessage "*'create' needs administrator rights*"
        Test-Path (Join-Path $TestDrive 'cache') | Should -BeFalse
    }

    It 'with -WhatIf runs up to the first Hyper-V call, names it and changes nothing' {
        { Invoke-LabCreate -Config $script:Config -IsElevated $false -WhatIf -InformationAction SilentlyContinue -WarningAction SilentlyContinue } |
            Should -Throw -ExceptionType ([System.UnauthorizedAccessException]) -ExpectedMessage "*'Get-VMSwitch -Name lgtm-lab' needs administrator rights*"
        Test-Path (Join-Path $TestDrive 'cache') | Should -BeFalse
    }
}

Describe 'Helpers' {
    It 'maps Windows paths into WSL' {
        ConvertTo-LabWslPath 'C:\Users\x\lab.img' | Should -Be '/mnt/c/Users/x/lab.img'
    }

    It 'checks subnet membership' {
        Test-LabAddressInSubnet -Address '10.10.0.255' -Subnet '10.10.0.0/24' | Should -BeTrue
        Test-LabAddressInSubnet -Address '10.10.1.0' -Subnet '10.10.0.0/24' | Should -BeFalse
        Test-LabAddressInSubnet -Address '10.10.1.0' -Subnet '10.10.0.0/23' | Should -BeTrue
    }
}

Describe 'lab-vms.ps1' {
    BeforeAll {
        $script:Shell = (Get-Process -Id $PID).Path
        $script:Script = Join-Path $script:HyperVDir 'lab-vms.ps1'
    }

    It 'plan exits 0 and prints the VM table' {
        $output = & $script:Shell -NoProfile -ExecutionPolicy Bypass -File $script:Script plan -NodesFile (New-TestNodesFile) 2>&1
        $LASTEXITCODE | Should -Be 0
        ($output -join "`n") | Should -Match 'VMs \(8\), created in this order'
    }

    It 'plan -PublicKeyFile checks that key instead of the one in nodes.yml' {
        $key = Join-Path $TestDrive 'override.pub'
        [IO.File]::WriteAllText($key, $script:KeyLine + "`n")
        $output = & $script:Shell -NoProfile -ExecutionPolicy Bypass -File $script:Script plan -NodesFile $script:NodesFile -PublicKeyFile $key 2>&1
        $LASTEXITCODE | Should -Be 0
        ($output -join "`n") | Should -Match ([regex]::Escape("SSH public key ${key}: found"))
        ($output -join "`n") | Should -Match ([regex]::Escape("with the key from $key"))
    }

    It 'plan run in the same session leaves exit code 0 after a failed native command' {
        $key = Join-Path $TestDrive 'inprocess.pub'
        [IO.File]::WriteAllText($key, $script:KeyLine + "`n")
        $global:LASTEXITCODE = 7
        & $script:Script plan -NodesFile $script:NodesFile -PublicKeyFile $key | Out-Null
        $LASTEXITCODE | Should -Be 0
    }

    It 'create -WhatIf without elevation exits 0 and says where it stopped' {
        if (Test-LabElevated) { Set-ItResult -Skipped -Because 'this session is elevated'; return }
        $output = & $script:Shell -NoProfile -ExecutionPolicy Bypass -File $script:Script create -WhatIf -NodesFile (New-TestNodesFile) *>&1
        $LASTEXITCODE | Should -Be 0
        ($output -join "`n") | Should -Match 'WhatIf stopped here'
    }

    It 'status without elevation exits 2' {
        if (Test-LabElevated) { Set-ItResult -Skipped -Because 'this session is elevated'; return }
        $ErrorActionPreference = 'Continue'
        & $script:Shell -NoProfile -ExecutionPolicy Bypass -File $script:Script status -NodesFile (New-TestNodesFile) *>&1 | Out-Null
        $LASTEXITCODE | Should -Be 2
    }
}
