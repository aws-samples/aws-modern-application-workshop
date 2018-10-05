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
    $accountId = Get-STSCallerIdentity | Select-Object -ExpandProperty Account

    $bucketName = "mythical-mysfits-artifacts-{0}" -f $accountId
    $codeBuildRoleARN = Get-CFNStack -StackName MythicalMysfitsCoreStack | Select-Object -ExpandProperty Outputs | Select-Object ExportName, OutputValue | Where-Object { $_.ExportName -eq "MythicalMysfitsCoreStack:MythicalMysfitsServiceCodeBuildServiceRole" } | Select-Object -ExpandProperty OutputValue
    $codePipelineRoleARN = Get-CFNStack -StackName MythicalMysfitsCoreStack | Select-Object -ExpandProperty Outputs | Select-Object ExportName, OutputValue | Where-Object { $_.ExportName -eq "MythicalMysfitsCoreStack:MythicalMysfitsServiceCodePipelineServiceRole" } | Select-Object -ExpandProperty OutputValue
    
    $artifactsPolicy = (Get-Content $(Join-Path -Path $scriptDir -ChildPath "artifacts-bucket-policy.json") | ConvertFrom-Json)     
    # ######## END VARIABLE BLOCK -- REPLACE ONLY IF SCRIPT ISN'T WORKING ##########

    try {
        New-S3Bucket -BucketName $bucketName
    }
    catch {
        $bucketError = $_ | Out-String
        if ($bucketError -and -not $bucketError.Contains("you already own it")) {
            Write-Output "found error"
            throw $error
        }
    }
    foreach ($p in $artifactsPolicy.Statement) {
        $p.Principal.AWS = @($codeBuildRoleARN, $codePipelineRoleARN)
        $p.Resource = @(("arn:aws:s3:::{0}/*" -f $bucketName), ("arn:aws:s3:::{0}" -f $bucketName))
    }
    Write-S3BucketPolicy -BucketName $bucketName -Policy $($artifactsPolicy | ConvertTo-Json -Depth 4)
}
finally {
    Set-Location $startingLoc
    [System.Environment]::CurrentDirectory = $startingDir
    Write-Output "Done. Elapsed time: $($stopwatch.Elapsed)"
}