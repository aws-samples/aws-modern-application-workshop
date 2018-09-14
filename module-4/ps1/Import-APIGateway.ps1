#Requires -Version 3
Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$stopwatch = [System.Diagnostics.Stopwatch]::StartNew()
$scriptDir = Split-Path -LiteralPath $PSCommandPath
$startingLoc = $(Get-Location | Select-Object -ExpandProperty Path)
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
    Write-Output $startingLoc
    Get-AWSPowerShellVersion
    
    # This PS1 script tries to auto-detect the values from the tutorial.
    # If you've changed the names of anything,
    # try manually replacing the values between the following block:
    
    ######## BEGIN VARIABLE BLOCK -- REPLACE ONLY IF SCRIPT ISN'T WORKING ##########
    $apiSwagger = Get-Content $(Join-Path -Path $scriptDir -ChildPath "api-swagger.json") | ConvertFrom-Json
    $cognitoPoolIdIdentifier = "aws_user_pools_id"
    
    try {
        $awsExportsPath = $([io.path]::combine($scriptDir, "..", "frontend", "src", "aws-exports.js"))
        $awsExports = $(Get-Content $awsExportsPath)
        $cognitoPoolId = ($awsExports | Select-String -Pattern $cognitoPoolIdIdentifier).Line.Split(': "')[1] -Replace '[",]', ''
        $cognitoPoolArn = $(Get-CGIPUserPool -UserPoolId $cognitoPoolId | Select-Object -ExpandProperty Arn)
    
        $vpcLinkId = Get-AGVpcLinkList | Where-Object { $_.Name -eq 'MysfitsApiVpcLink' } | Select-Object -ExpandProperty Id
        $nlbDnsName = $(Get-ELB2LoadBalancer -Name mysfits-nlb | Select-Object -ExpandProperty DnsName)
        # $accountId = Get-STSCallerIdentity | Select-Object -ExpandProperty Account
        $apiSwagger.securityDefinitions.MysfitsUserPoolAuthorizer."x-amazon-apigateway-authorizer".providerARNs = @($cognitoPoolArn)
        $apiSwagger.paths."/".get."x-amazon-apigateway-integration".connectionId = $vpcLinkId
        Write-Output $apiSwagger.paths."/".get."x-amazon-apigateway-integration".connectionId
        $apiSwagger.paths."/".get."x-amazon-apigateway-integration".uri = "http://$nlbDnsName"
        Write-Output $apiSwagger.paths."/".get."x-amazon-apigateway-integration".uri
        $apiSwagger.paths."/api/mysfits".get."x-amazon-apigateway-integration".uri = "http://$nlbDnsName/api/mysfits"
        $apiSwagger.paths."/api/mysfits".get."x-amazon-apigateway-integration".connectionId = $vpcLinkId
        $apiSwagger.paths."/api/mysfits/{mysfitId}".get."x-amazon-apigateway-integration".uri = "http://$nlbDnsName/api/mysfits/{mysfitId}"
        $apiSwagger.paths."/api/mysfits/{mysfitId}".get."x-amazon-apigateway-integration".connectionId = $vpcLinkId
        $apiSwagger.paths."/api/mysfits/{mysfitId}/adopt".post."x-amazon-apigateway-integration".uri = "http://$nlbDnsName/api/mysfits/{mysfitId}/adopt"
        $apiSwagger.paths."/api/mysfits/{mysfitId}/adopt".post."x-amazon-apigateway-integration".connectionId = $vpcLinkId
        $apiSwagger.paths."/api/mysfits/{mysfitId}/like".post."x-amazon-apigateway-integration".uri = "http://$nlbDnsName/api/mysfits/{mysfitId}/like"
        $apiSwagger.paths."/api/mysfits/{mysfitId}/like".post."x-amazon-apigateway-integration".connectionId = $vpcLinkId

        # # ######## END VARIABLE BLOCK -- REPLACE ONLY IF SCRIPT ISN'T WORKING ##########
    }
    catch [System.Management.Automation.ItemNotFoundException] {
        Write-Error "
    The aws-exports.js file can't be found.
    $("The file is expected at this path: 
    {0}" -f $awsExportsPath)

    Path $($_.TargetObject) not found!

    You need to use AWS Amplify to create your backend components first.
    Or, you can manually replace the values needed in this PowerShell script.
    "
    }
    Out-File -FilePath $(Join-Path -Path $scriptDir -ChildPath "api-swagger-processed.json") -InputObject $($apiSwagger | ConvertTo-Json -Depth 10)
    $stream = [IO.MemoryStream]::new([Text.Encoding]::UTF8.GetBytes(($apiSwagger | ConvertTo-Json -Depth 10)))
    Import-AGRestApi -Body $stream -Parameter @{ endpointConfigurationTypes = "REGIONAL" }
}
finally {
    Set-Location $startingLoc
    [System.Environment]::CurrentDirectory = $startingDir
    Write-Output "Done. Elapsed time: $($stopwatch.Elapsed)"
}