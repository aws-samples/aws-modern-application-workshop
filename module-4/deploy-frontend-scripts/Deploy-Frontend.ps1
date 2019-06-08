#Requires -Version 3
Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$stopwatch = [System.Diagnostics.Stopwatch]::StartNew()
$scriptDir = Split-Path -LiteralPath $PSCommandPath
$startingLoc = Get-Location
Set-Location $scriptDir
$startingDir = [System.Environment]::CurrentDirectory
[System.Environment]::CurrentDirectory = $scriptDir

$frontEndPath = Join-Path -Path $(Split-Path -Path $scriptDir -Parent) -ChildPath "frontend"
$cdkPath = Join-Path -Path $(Split-Path -Path $scriptDir -Parent) -ChildPath "cdk"
$buildFile = Get-Content -Path $(Join-Path -Path $frontEndPath -ChildPath "angular.json") | ConvertFrom-Json
$projectName = "MythicalMysfits"
$projectNameForS3 = "mythical-mysfits"
$projectSettings = $buildFile.projects.$projectName
$projectBuildFolder = $projectSettings.architect.build.options.outputPath
$frontEndBuildPath = Join-Path -Path $frontEndPath  -ChildPath $projectBuildFolder
Write-Output $frontEndBuildPath
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
    Start-Process -WorkingDirectory $frontEndPath npm -ArgumentList @('install') -Wait -NoNewWindow
    Start-Process -WorkingDirectory $frontEndPath npm -ArgumentList @('run build -- --prod') -Wait -NoNewWindow
    Start-Process -WorkingDirectory $cdkPath npm -ArgumentList @('install') -Wait -NoNewWindow
    Start-Process -WorkingDirectory $cdkPath npm -ArgumentList @('run build') -Wait -NoNewWindow
    Start-Process -WorkingDirectory $cdkPath npm -ArgumentList @('run cdk deploy --app bin/webapp.js -c FRONTEND_BUILD_PATH=`"' + $frontEndPath + '`"') -Wait -NoNewWindow
    Write-Output "Finished building."
}
finally {
    Set-Location $startingLoc
    [System.Environment]::CurrentDirectory = $startingDir
    Write-Output "Done. Elapsed time: $($stopwatch.Elapsed)"
}
