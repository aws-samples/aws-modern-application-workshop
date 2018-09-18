# Module 3 - Adding a Data Tier with Amazon DynamoDB

![Architecture](/images/module-3/architecture-module-3.png)

**Time to complete:** 20 minutes

**Services used:**
* [Amazon DynamoDB](https://aws.amazon.com/dynamodb/)

### Overview

Now that you have a service deployed and a working CI/CD pipeline to deliver changes to that service automatically whenever you update your code repository, you can quickly move new application features from conception to available for your Mythical Mysfits customers. With this increased agility, let's add another foundational piece of functionality to the Mythical Mysfits website architecture: a data tier. A data tier allows you to persistently store data used by your application and provides one place to manage data about the Mysfits. In this module you will create a table in [Amazon DynamoDB](https://aws.amazon.com/dynamodb/), a managed and scalable NoSQL database service on AWS with super fast performance. Rather than have all of the Mysfits be stored in a static JSON file, we will store them in a database to make the website's future more extensible and scalable.

### Adding a NoSQL Database to Mythical Mysfits

#### Create a DynamoDB Table

To add a DynamoDB table to the architecture, we have included another JSON CLI input file that defines a table called **MysfitsTable**. This table will have a primary index defined by a hash key attribute called **MysfitId**, and two more secondary indexes.  The first secondary index will have the hash key of **GoodEvil** and a range key of **MysfitId**, and the other secondary index will have the hash key of **LawChaos** and a range key of **MysfitId**.  These two secondary indexes will allow us to execute queries against the table to retrieve all of the mysfits that match a given Species or Alignment to enable the filter functionality.  You can view this file at `/module-3/aws-cli/dynamodb-table.json`. No changes need to be made to this file and it is ready to execute.

To create the table using the AWS CLI or PowerShell, execute the following command in your terminal in Visual Studio Code:

`Bash`
```
aws dynamodb create-table --cli-input-json file://module-3/aws-cli/dynamodb-table.json
```
`PowerShell`
```
./module-3/ps1/CreateDDBTable.ps1
```

After the command runs, you can view the details of your newly created table by executing the following AWS CLI or PowerShell command in the terminal:

`Bash`
```
aws dynamodb describe-table --table-name MysfitsTable
```
`PowerShell`
```
Get-DDBTable -TableName MysfitsTable
```

If we execute the following command to retrieve all of the items stored in the table, you'll see that the table is empty:

`Bash`
```
aws dynamodb scan --table-name MysfitsTable
```
`PowerShell`
```
$ddbClient = New-Object "Amazon.DynamoDBv2.AmazonDynamoDBClient";$ddbClient.ScanAsync("MysfitsTable").Result;
```

```
{
    "Count": 0,
    "Items": [],
    "ScannedCount": 0,
    "ConsumedCapacity": null
}
```

#### Add Items to the DynamoDB Table

Also provided is a JSON file that can be used to batch insert a number of Mysfit items into this table.  This will be accomplished through the DynamoDB API **BatchWriteItem.** To call this API using the provided JSON file, execute the following terminal command (the response from the service should report that there are no items that went unprocessed):

`Bash`
```
aws dynamodb batch-write-item --request-items file://~/environment/aws-modern-application-workshop/module-3/aws-cli/populate-dynamodb.json
```
`PowerShell`
```
./module-3/ps1/BatchWriteToDDBTable.ps1
```

Now, if you run the same command to scan all of the table contents, you'll find the items have been loaded into the table:

`Bash`
```
aws dynamodb scan --table-name MysfitsTable
```
`PowerShell`
```
$ddbClient = New-Object "Amazon.DynamoDBv2.AmazonDynamoDBClient";$ddbClient.ScanAsync("MysfitsTable").Result;
```

### Committing The First *Real* Code change

#### Copy the Updated .NET Web Api Code
Now that we have our data included in the table, let's modify our application code to read from this table instead of returning the static JSON file that was used in Module 2.  We have included a Mysfits Service that will make a request to DynamoDB that our Mysfits Controller is now calling instead of reading the static JSON file.

The request is formed using the AWS .NET SDK Nuget package for DynamoDB called **DynamoDBv2**. This SDK is a powerful yet simple way to interact with AWS services from .NET applications.  In our service file, we are using the [Object Persistence Model](https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/DotNetSDKHighLevel.html) to communicate with our Dynamo Table, which allows us to create C# objects that map to items in the corresponding tables. To copy the new files into your CodeCommit repository directory, execute the following command in the terminal:

```
cp -r ./module-3/webapi/* ./MythicalMysfitsService-Repository/
```

#### Push the Updated Code into the CI/CD Pipeline

Now, we need to check in these code changes to CodeCommit using the git command line client.  Run the following commands to check in the new code changes and kick of your CI/CD pipeline:

```
cd ./MythicalMysfitsService-Repository
```

```
git add .
```

```
git commit -m "Add new integration to DynamoDB."
```

```
git push
```

Now, in just 5-10 minutes you'll see your code changes make it through your full CI/CD pipeline in CodePipeline and out to AWS Fargate on Amazon ECS.  Feel free to explore the AWS CodePipeline console to see the changes progress through your pipeline.

#### Update The Website Content in S3

Finally, we need to publish our Angular app to our S3 bucket so that the new API functionality using query strings to filter responses will be used.  You will need to create or update your Angular environment file located in the `./module-3/frontend/environments/` folder. Make sure the file is named `environment.prod.ts`.

Open the `environment.prod.ts` file in VS Code and copy the `categories` property from the `environment.ts` file located in the same folder.
![update-angular-environment](/images/module-3/update-angular-environment.png)

Deploy your updated angular app by running the following PowerShell script or Bash script:

`Bash`
```
./module-3/deploy-frontend-scripts/deploy_frontend.sh
```
`PowerShell`
```
./module-3/deploy-frontend-scripts/Deploy-FrontEnd.ps1
```
**(Optional)**

**Note:** If you used AWS Amplify to deploy your Angular app, use the following command to deploy your updated code:
```
amplify publish
```

Re-visit your Mythical Mysfits website to see the new population of Mysfits loading from your DynamoDB table and how the Filter functionality is working!

That concludes module 3.

[Proceed to Module 4](/module-4)


## [AWS Developer Center](https://developer.aws)
