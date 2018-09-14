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
    $schema = New-DDBTableSchema
    $schema | Add-DDBKeySchema -KeyName "MysfitId" -KeyDataType "S" -KeyType "HASH"

    $gsiLawChaosIndexName = "LawChaosIndex"
    $gsiLawChaosHashKeyName = "LawChaos"; 
    $gsiLawChaosHashKeyType = "S"; 
    $gsiLawChaosRangeKeyName = "MysfitId";
    $gsiLawChaosRangeKeyDataType = "S";
    $gsiLawChaosProjectionType = "ALL"
    $gsiLawChaosReadCapacity = 5;
    $gsiLawChaosWriteCapacity = 5;

    $schema | Add-DDBIndexSchema -IndexName $gsiLawChaosIndexName -HashKeyName $gsiLawChaosHashKeyName -HashKeyDataType $gsiLawChaosHashKeyType -RangeKeyName $gsiLawChaosRangeKeyName -RangeKeyDataType $gsiLawChaosRangeKeyDataType -ProjectionType $gsiLawChaosProjectionType -ReadCapacity $gsiLawChaosReadCapacity -WriteCapacity $gsiLawChaosWriteCapacity -Global
    
    $gsiGoodEvilIndexName = "GoodEvilIndex";
    $gsiGoodEvilHashKeyName = "GoodEvil"; 
    $gsiGoodEvilHashKeyDataType = "S";
    $gsiGoodEvilRangeKeyName = "MysfitId";
    $gsiGoodEvilRangeKeyDataType = "S";
    $gsiGoodEvilProjectionType = "ALL"
    $gsiGoodEvilReadCapacity = 5;
    $gsiGoodEvilWriteCapacity = 5;
    $gsiGoodEvilHashKeyName = "GoodEvil"; 

    $schema | Add-DDBIndexSchema -IndexName $gsiGoodEvilIndexName -HashKeyName $gsiGoodEvilHashKeyName -HashKeyDataType $gsiGoodEvilHashKeyDataType -RangeKeyName $gsiGoodEvilRangeKeyName -RangeKeyDataType $gsiGoodEvilRangeKeyDataType -ProjectionType $gsiGoodEvilProjectionType -ReadCapacity $gsiGoodEvilReadCapacity -WriteCapacity $gsiGoodEvilWriteCapacity -Global

    $tableName = "MysfitsTable"
    $readCapacityUnits = 5
    $writeCapacityUnits = 5
    # ######## END VARIABLE BLOCK -- REPLACE ONLY IF SCRIPT ISN'T WORKING ##########
    $schema | New-DDBTable -TableName $tableName -ReadCapacity $readCapacityUnits -WriteCapacity $writeCapacityUnits
}
finally {
    Set-Location $startingLoc
    [System.Environment]::CurrentDirectory = $startingDir
    Write-Output "Done. Elapsed time: $($stopwatch.Elapsed)"
}