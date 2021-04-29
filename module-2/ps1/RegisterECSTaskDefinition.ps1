#Requires -Version 3
Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$stopwatch = [System.Diagnostics.Stopwatch]::StartNew()
$scriptDir = Split-Path -LiteralPath $PSCommandPath
$startingLoc = Get-Location
Set-Location $scriptDir
$startingDir = [System.Environment]::CurrentDirectory
[System.Environment]::CurrentDirectory = $scriptDir

function ConvertTo-Dictionary {
    Param ([Hashtable]$HashTable)
    $opts = New-Object 'system.collections.generic.dictionary[string,string]' 
    foreach ($key in $HashTable.Keys) {
        $opts.Add($key, $HashTable[$key])
    }
    return $opts
}

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
    
    $family = "mythicalmysfitsservice"
    $cpu = "256"
    $memory = "512"
    $networkMode = "awsvpc"
    $requiresCompatibilities = @("FARGATE")

    $executionRoleArn = Get-CFNStack -StackName MythicalMysfitsCoreStack | Select-Object -ExpandProperty Outputs | Select-Object ExportName, OutputValue | Where-Object { $_.ExportName -eq 'MythicalMysfitsCoreStack:EcsServiceRole' } | Select-Object -ExpandProperty OutputValue
    $taskRoleArn = Get-CFNStack -StackName MythicalMysfitsCoreStack | Select-Object -ExpandProperty Outputs | Select-Object ExportName, OutputValue | Where-Object { $_.ExportName -eq 'MythicalMysfitsCoreStack:ECSTaskRole' } | Select-Object -ExpandProperty OutputValue
    
    $name = "MythicalMysfits-Service"
    $image = "{0}.dkr.ecr.{1}.amazonaws.com/mythicalmysfits/service" -f $accountId, $region
    $essential = "true"

    $protocol = "tcp"
    $containerPort = "8080"

    $logDriver = "awslogs"
    $options = @{
        "awslogs-group"         = "mythicalmysfits-logs"; 
        "awslogs-region"        = $region; 
        "awslogs-stream-prefix" = "awslogs-mythicalmysfits-service";
    }
    ######## END VARIABLE BLOCK -- REPLACE ONLY IF SCRIPT ISN'T WORKING ##########
    
    $opts = ConvertTo-Dictionary -HashTable $options
    $logConfiguration = @{
        'LogDriver' = $logDriver; 
        'Options'   = $opts; 
    }

    $portMapping = [Amazon.ECS.Model.PortMapping[]]@(
        [Amazon.ECS.Model.PortMapping]@{ 
            'Protocol'      = $protocol; 
            'ContainerPort' = $containerPort; 
        }
    )
    
    $containerDefinition = @{
        'Name'             = $name;
        'Image'            = $image;
        'PortMappings'     = $portMapping;
        'LogConfiguration' = $logConfiguration;
        'Essential'        = $essential
    }

    Register-ECSTaskDefinition -Family $family -Cpu $cpu -Memory $memory -NetworkMode $networkMode -RequiresCompatibility $requiresCompatibilities -ExecutionRoleArn $executionRoleArn -TaskRoleArn $taskRoleArn -ContainerDefinition $containerDefinition
}
finally {
    Set-Location $startingLoc
    [System.Environment]::CurrentDirectory = $startingDir
    Write-Output "Done. Elapsed time: $($stopwatch.Elapsed)"
}
