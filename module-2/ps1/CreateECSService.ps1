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
    $serviceName = "MythicalMysfits-Service"
    $cluster = "MythicalMysfits-Cluster"
    $launchType = "FARGATE"
    $deploymentConfigurationMaximumPercent = 200
    $deploymentConfigurationMinimumHealthyPercent = 0
    $desiredCount = 3
    $healthCheckGracePeriodSecond = 30

    $awsvpcConfigurationAssignPublicIp = "DISABLED"
    $awsvpcConfigurationSecurityGroups = @($(Get-CFNStack -StackName MythicalMysfitsCoreStack | Select-Object -ExpandProperty Outputs | Select-Object ExportName,OutputValue | Where-Object {$_.ExportName -eq "MythicalMysfitsCoreStack:FargateContainerSecurityGroup"} | Select-Object -ExpandProperty OutputValue))
    $awsvpcConfigurationSubnets = @(
        $(Get-CFNStack -StackName MythicalMysfitsCoreStack | Select-Object -ExpandProperty Outputs | Select-Object ExportName,OutputValue | Where-Object {$_.ExportName -eq "MythicalMysfitsCoreStack:PrivateSubnetOne"} | Select-Object -ExpandProperty OutputValue), 
        $(Get-CFNStack -StackName MythicalMysfitsCoreStack | Select-Object -ExpandProperty Outputs | Select-Object ExportName,OutputValue | Where-Object {$_.ExportName -eq "MythicalMysfitsCoreStack:PrivateSubnetTwo"} | Select-Object -ExpandProperty OutputValue) 
    )

    $taskDefinition = "mythicalmysfitsservice"

    $loadBalancer = @{
        'ContainerName' = "MythicalMysfits-Service";
        'ContainerPort' = 8080;
        'TargetGroupArn' = $(Get-ELB2TargetGroup -Name MythicalMysfits-TargetGroup | Select-Object -ExpandProperty TargetGroupArn);
    }
    # ######## END VARIABLE BLOCK -- REPLACE ONLY IF SCRIPT ISN'T WORKING ##########
    $params = @{
        ServiceName = $serviceName;
        Cluster = $cluster;
        LaunchType = $launchType;
        DeploymentConfiguration_MaximumPercent = $deploymentConfigurationMaximumPercent;
        DeploymentConfiguration_MinimumHealthyPercent = $deploymentConfigurationMinimumHealthyPercent;
        DesiredCount = $desiredCount;
        AwsvpcConfiguration_AssignPublicIp = $awsvpcConfigurationAssignPublicIp;
        AwsvpcConfiguration_SecurityGroup = $awsvpcConfigurationSecurityGroups;
        AwsvpcConfiguration_Subnet = $awsvpcConfigurationSubnets;
        TaskDefinition = $taskDefinition;
        LoadBalancer = $loadBalancer;
        HealthCheckGracePeriodSecond = $healthCheckGracePeriodSecond
    }
    New-ECSService @params
}
finally {
    Set-Location $startingLoc
    [System.Environment]::CurrentDirectory = $startingDir
    Write-Output "Done. Elapsed time: $($stopwatch.Elapsed)"
}