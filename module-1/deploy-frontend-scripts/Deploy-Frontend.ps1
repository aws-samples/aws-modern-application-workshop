#Requires -Version 3
Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$stopwatch = [System.Diagnostics.Stopwatch]::StartNew()
$scriptDir = Split-Path -LiteralPath $PSCommandPath
$startingLoc = Get-Location
Set-Location $scriptDir

$frontEndPath = Join-Path -Path $(Split-Path -Path $scriptDir -Parent) -ChildPath "frontend"
$buildFile = Get-Content -Path $(Join-Path -Path $frontEndPath -ChildPath "angular.json") -Raw | ConvertFrom-Json
$projectName = "MythicalMysfits"
$projectNameForS3 = "mythical-mysfits"
$projectSettings = $buildFile.projects.$projectName
$projectBuildFolder = $projectSettings.architect.build.options.outputPath
$frontEndBuildPath = Join-Path -Path $frontEndPath  -ChildPath $projectBuildFolder
Write-Output $frontEndBuildPath
try {
    if ($PSVersionTable.PSVersion.Major -ge 6) {
        $awsModuleName = 'AWSPowerShell.NetCore'
    } else {
        $awsModuleName = 'AWSPowerShell'
    }

    Import-Module $awsModuleName

    Get-AWSPowerShellVersion
    $awsRegion = if ($null -eq $(Get-DefaultAWSRegion)) { "us-west-2" } else { $(Get-DefaultAWSRegion) }
    $awsAccountId = $(Get-STSCallerIdentity -Region $awsRegion | Select-Object -ExpandProperty Account)
    $bucketName = ("{0}-frontend-{1}" -f $projectNameForS3, $awsAccountId)
    Write-Output $bucketName
    Write-Output "Checking if Node.js is installed on this machine..."
    Start-Process node -ArgumentList @('--version') -Wait
    Start-Process -WorkingDirectory $frontEndPath npm -ArgumentList @('install') -Wait -NoNewWindow
    Start-Process -WorkingDirectory $frontEndPath npm -ArgumentList @('run build -- --prod') -Wait -NoNewWindow
    $bucketError = ""
    try {
        New-S3Bucket -BucketName $bucketName -PublicReadOnly -Region $awsRegion
    }
    catch {
        $bucketError = $_ | Out-String
    }
    if ($bucketError -and -not $bucketError.Contains("you already own it")) {
        Write-Output "found error"
        throw $error
    }
    else {
        Write-S3BucketWebsite -BucketName $bucketName -WebsiteConfiguration_IndexDocumentSuffix index.html -WebsiteConfiguration_ErrorDocument index.html
        Write-Output "Removing previous files from this S3 Bucket..."
        Get-S3Object -BucketName $bucketName | Remove-S3Object -Force

        foreach ($f in (Get-ChildItem $frontEndBuildPath)) {
            Write-Output "Uploading $f to S3 Bucket..."
            Write-S3Object -BucketName $bucketName  -File $f.FullName -PublicReadOnly
            Write-Output "$f successfully uploaded."
        }
        $locationObj = Get-S3BucketLocation -BucketName $bucketName
        $location = $locationObj.Value
        if (!$location) {
            $location = "us-east-1"
        }
        Write-Output "View your site: http://$($bucketName).s3-website.$location.amazonaws.com"
        Write-Output "Finished building."
    }
}
finally {
    Set-Location $startingLoc
    Write-Output "Done. Elapsed time: $($stopwatch.Elapsed)"
}
