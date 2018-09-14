#Requires -Version 3

using namespace Amazon.DynamoDBv2
using namespace Amazon.DynamoDBv2.Model
using namespace Amazon.Runtime
using namespace System.Collections.Generic

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
    $tableName = "MysfitsTable"
    $ddbClient = New-Object "AmazonDynamoDBClient"
    $batchRequest = New-Object "BatchWriteItemRequest"
    $batchRequest.ReturnConsumedCapacity = "TOTAL"
    $tableItems = New-Object "Dictionary[string, List[WriteRequest]]"
    $requestItems = New-Object "List[WriteRequest]"
    
    $items = (Get-Content $(Join-Path -Path $scriptDir -ChildPath "populate-dynamodb.json") | ConvertFrom-Json)

    # ######## END VARIABLE BLOCK -- REPLACE ONLY IF SCRIPT ISN'T WORKING ##########
    foreach ($item in $items.MysfitsTable) {
        $putRequest = New-Object "PutRequest"
        $putItem = New-Object "Dictionary[string, AttributeValue]"
        foreach ($props in $item.PutRequest.Item) {
            $props | Get-Member -MemberType NoteProperty | ForEach-Object Name | ForEach-Object {
                Write-Output ("{0} = {1}" -f $_, $props.$_)
                $nestedPropKey = $_
                $nestedProp = $props.$_
                $nestedProp | Get-Member -MemberType NoteProperty | ForEach-Object Name | ForEach-Object {
                    Write-Output ("{0} = {1}" -f $_, $nestedProp.$_)
                    $attr = New-Object "AttributeValue"
                    $attr.$_ = $nestedProp.$_
                    $putItem.Add($nestedPropKey, $attr)
                }
            }
        }
        $putRequest.Item = $putItem
        $requestItems.Add(
            $putRequest
        )
    }
    $tableItems.Add($tableName, $requestItems)
    $batchRequest.RequestItems = $tableItems
    
    $response = New-Object "BatchWriteItemResponse";
    $callCount = 0;
    DO {
        $response = $ddbClient.BatchWriteItemAsync($batchRequest).Result;
        $callCount++

        $tableConsumedCapacities = $response.ConsumedCapacity;
        $unprocessed = $response.UnprocessedItems;

        Write-Output("Per-table consumed capacity");
        foreach ($tableConsumedCapacity in $tableConsumedCapacities) {
            Write-Output("{0} - {1}" -f $tableConsumedCapacity.TableName, $tableConsumedCapacity.CapacityUnits);
        }

        Write-Output("Unprocessed");
        foreach ($unp in $unprocessed) {
            Write-Output("{0} - {1}" -f $unp.Keys.Count, $unp.Values.Count);
        }
        $batchRequest.RequestItems = $unprocessed;
    } while ($response.UnprocessedItems.Count -gt 0);

}
finally {
    Set-Location $startingLoc
    [System.Environment]::CurrentDirectory = $startingDir
    # Write-Output "Done. Elapsed time: $($stopwatch.Elapsed)"
}