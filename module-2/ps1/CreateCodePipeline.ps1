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
    function ConvertTo-Dictionary {
        Param ([Hashtable]$HashTable)
        $opts = New-Object 'system.collections.generic.dictionary[string,string]' 
        foreach ($key in $HashTable.Keys) {
            $opts.Add($key, $HashTable[$key])
        }
        return $opts
    }

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
    $name = "MythicalMysfitsServiceCICDPipeline"
    $roleArn = Get-CFNStack -StackName MythicalMysfitsCoreStack | Select-Object -ExpandProperty Outputs | Select-Object ExportName, OutputValue | Where-Object { $_.ExportName -eq "MythicalMysfitsCoreStack:MythicalMysfitsServiceCodePipelineServiceRole" } | Select-Object -ExpandProperty OutputValue

    $sourceStageActions = New-Object "System.Collections.Generic.List [Amazon.CodePipeline.Model.ActionDeclaration]"
    $sourceStageAction = [Amazon.CodePipeline.Model.ActionDeclaration]@{
        inputArtifacts  = @();
        Name            = "Source";
        ActionTypeId    = @{
            Category = "Source";
            Owner    = "AWS";
            Version  = "1";
            Provider = "CodeCommit";
        };
        OutputArtifacts = [Amazon.CodePipeline.Model.OutputArtifact[]]@(
            [Amazon.CodePipeline.Model.OutputArtifact]@{
                Name = "MythicalMysfitsService-SourceArtifact"
            }
        );
        Configuration   = $(ConvertTo-Dictionary -HashTable @{BranchName = "master"; RepositoryName = "MythicalMysfitsService-Repository"; })
        RunOrder        = 1;
    };

    $sourceStageActions.Add($sourceStageAction); 
    $sourceStage = @{
        Name    = "Source";
        Actions = $sourceStageActions
    };

    $buildStageActions = New-Object "System.Collections.Generic.List [Amazon.CodePipeline.Model.ActionDeclaration]"
    $buildStageAction = [Amazon.CodePipeline.Model.ActionDeclaration]@{
        Name            = "Build";
        Configuration   = $(ConvertTo-Dictionary -HashTable @{ProjectName = "MythicalMysfitsServiceCodeBuildProject"; })
        ActionTypeId    = @{
            Category = "Build";
            Owner    = "AWS";
            Version  = "1";
            Provider = "CodeBuild";
        }
        OutputArtifacts = [Amazon.CodePipeline.Model.OutputArtifact[]]@(
            [Amazon.CodePipeline.Model.OutputArtifact]@{
                Name = "MythicalMysfitsService-BuildArtifact";
            }
        );
        InputArtifacts  = [Amazon.CodePipeline.Model.InputArtifact[]]@(
            [Amazon.CodePipeline.Model.InputArtifact]@{
                Name = "MythicalMysfitsService-SourceArtifact";
            }
        );
        RunOrder        = 1;
    };
    $buildStageActions.Add($buildStageAction);
    $buildStage = @{
        name    = "Build";
        actions = $buildStageActions
    };
    
    $deployStageActions = New-Object "System.Collections.Generic.List [Amazon.CodePipeline.Model.ActionDeclaration]"
    $deployStageAction = @{
        Name           = "Deploy";
        ActionTypeId   = @{
            Category = "Deploy";
            Owner    = "AWS";
            Version  = "1";
            Provider = "ECS";
        };
        InputArtifacts  = [Amazon.CodePipeline.Model.InputArtifact[]]@(
            [Amazon.CodePipeline.Model.InputArtifact]@{
                Name = "MythicalMysfitsService-BuildArtifact"
            }
        );
        Configuration  = $( ConvertTo-Dictionary -HashTable @{ClusterName = "MythicalMysfits-Cluster"; ServiceName = "MythicalMysfits-Service"; FileName = "imagedefinitions.json"; })
    };
    $deployStageActions.Add($deployStageAction);
    $deployStage = @{
        name    = "Deploy";
        actions = $deployStageActions
    };

    $stages = New-Object "System.Collections.Generic.List``1 [Amazon.CodePipeline.Model.StageDeclaration]"
    foreach ($stage in @($sourceStage, $buildStage, $deployStage)) {
        $stages.Add($stage)
    }
            
    $accountId = Get-STSCallerIdentity | Select-Object -ExpandProperty Account
    $bucketName = "mythical-mysfits-artifacts-{0}" -f $accountId

    $artifactStore = @{
        type     = "S3";
        location = $bucketName;
    }

    # ######## END VARIABLE BLOCK -- REPLACE ONLY IF SCRIPT ISN'T WORKING ##########

    $params = @{
        Pipeline = @{
            Name          = $name;
            RoleArn       = $roleArn;
            Stages        = $stages;
            ArtifactStore = $artifactStore
        }
    }
    New-CPPipeline @params
}
finally {
    Set-Location $startingLoc
    [System.Environment]::CurrentDirectory = $startingDir
    Write-Output "Done. Elapsed time: $($stopwatch.Elapsed)"
}
