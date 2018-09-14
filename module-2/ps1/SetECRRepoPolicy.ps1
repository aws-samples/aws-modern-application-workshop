#Requires -Version 3
Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$stopwatch = [System.Diagnostics.Stopwatch]::StartNew()
$scriptDir = Split-Path -LiteralPath $PSCommandPath
$startingLoc = Get-Location
Set-Location $scriptDir
$startingDir = [System.Environment]::CurrentDirectory
[System.Environment]::CurrentDirectory = $scriptDir

try {
    try {
        $IsMacOS
    }
    catch {
        $IsMacOS = $false
    }
    If ($IsMacOS) {
        Import-Module AWSPowerShell.NetCore
    }
    Else {
        Import-Module AWSPowerShell
    }
    Get-AWSPowerShellVersion
    
    # This PS1 script tries to auto-detect the values from the tutorial.
    # If you've changed the names of anything,
    # try manually replacing the values between the following block:
    
    ######## BEGIN VARIABLE BLOCK -- REPLACE ONLY IF SCRIPT ISN'T WORKING ##########
    $repoName = "mythicalmysfits/service"
    $codeBuildRoleARN = Get-CFNStack -StackName MythicalMysfitsCoreStack | Select-Object -ExpandProperty Outputs | Select-Object ExportName, OutputValue | Where-Object { $_.ExportName -eq "MythicalMysfitsCoreStack:MythicalMysfitsServiceCodeBuildServiceRole" } | Select-Object -ExpandProperty OutputValue
    
    $repoPolicy = (Get-Content $(Join-Path -Path $scriptDir -ChildPath "ecr-policy.json") | ConvertFrom-Json)     
    # ######## END VARIABLE BLOCK -- REPLACE ONLY IF SCRIPT ISN'T WORKING ##########

    
    foreach ($p in $repoPolicy.Statement) {
        $p.Principal.AWS = @($codeBuildRoleARN)
    }
    Set-ECRRepositoryPolicy -RepositoryName $repoName -PolicyText $($repoPolicy | ConvertTo-Json -Depth 4)
}
finally {
    Set-Location $startingLoc
    [System.Environment]::CurrentDirectory = $startingDir
    Write-Output "Done. Elapsed time: $($stopwatch.Elapsed)"
}