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
    $region = Get-DefaultAWSRegion | Select-Object -ExpandProperty Region
    $accountId = Get-STSCallerIdentity | Select-Object -ExpandProperty Account
    
    $name = "MythicalMysfitsServiceCodeBuildProject"
    $artifactsType ="no_artifacts"
    $environmentComputeType = "BUILD_GENERAL1_SMALL"
    $environmentImage = "aws/codebuild/dot-net:core-2.1"
    $environmentVariables = @(
        @{
            "name" = "AWS_ACCOUNT_ID";
            "value" = $accountId;
        },
        @{
            "name" = "AWS_DEFAULT_REGION";
            "value" = $region;
        }
    )
    $environmentPrivilegedMode = $true
    $environmentType = "LINUX_CONTAINER"

    $serviceRole = Get-CFNStack -StackName MythicalMysfitsCoreStack | Select-Object -ExpandProperty Outputs | Select-Object ExportName,OutputValue | Where-Object { $_.ExportName -eq "MythicalMysfitsCoreStack:MythicalMysfitsServiceCodeBuildServiceRole" } | Select-Object -ExpandProperty OutputValue
    $sourceType = "CODECOMMIT"
    $sourceLocation = $("https://git-codecommit.{0}.amazonaws.com/v1/repos/MythicalMysfitsService-Repository" -f $region)
    # ######## END VARIABLE BLOCK -- REPLACE ONLY IF SCRIPT ISN'T WORKING ##########

    $params = @{
        Name = $name;
        Artifacts_Type = $artifactsType;
        Environment_ComputeType = $environmentComputeType;
        Environment_Image = $environmentImage;
        Environment_EnvironmentVariable = $environmentVariables;
        Environment_PrivilegedMode = $environmentPrivilegedMode;
        Environment_Type = $environmentType;
        ServiceRole = $serviceRole;
        Source_Location = $sourceLocation;
        Source_Type = $sourceType;
    }
    New-CBProject @params
}
finally {
    Set-Location $startingLoc
    [System.Environment]::CurrentDirectory = $startingDir
    Write-Output "Done. Elapsed time: $($stopwatch.Elapsed)"
}