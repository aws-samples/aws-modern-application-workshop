# Module 3 - Adding a Data Tier with Amazon DynamoDB

![Architecture](/images/module-3/architecture-module-3.png)

**Time to complete:** 20 minutes

---
**Short of time?:** If you are short of time, refer to the completed reference AWS CDK code in `~/Workshop/module-3/source/cdk/`

---

**Services used:**

* [Amazon DynamoDB](https://aws.amazon.com/dynamodb/)

## Overview

Now that you have a service deployed and a working CI/CD pipeline to deliver changes to that service automatically whenever you update your code repository, you can quickly move new application features from conception to available for your Mythical Mysfits customers. With this increased agility, let's add another foundational piece of functionality to the Mythical Mysfits website architecture: a data tier. A data tier allows you to persistently store data used by your application and provides one place to manage data about the Mysfits. In this module you will create a table in [Amazon DynamoDB](https://aws.amazon.com/dynamodb/), a managed and scalable NoSQL database service on AWS with super fast performance. Rather than have all of the Mysfits be stored in a static JSON file, we will store them in a database to make the website's future more extensible and scalable.

## Adding a NoSQL Database to Mythical Mysfits

Amazon DynamoDB is a fully managed NoSQL database service that provides fast and predictable performance with seamless scalability. DynamoDB lets you offload the administrative burdens of operating and scaling a distributed database, so that you don't have to worry about hardware provisioning, setup and configuration, replication, software patching, or cluster scaling. Also, DynamoDB offers encryption at rest, which eliminates the operational burden and complexity involved in protecting sensitive data.

### Create a DynamoDB Table

To add a DynamoDB table to the architecture, we will write another CloudFormation stack using AWS CDK that defines a table called **MysfitsTable**. This table will have a primary index defined by a hash key attribute called **MysfitId**, and two more secondary indexes.  The first secondary index will have the hash key of **GoodEvil** and a range key of **MysfitId**, and the other secondary index will have the hash key of **LawChaos** and a range key of **MysfitId**.  These two secondary indexes will allow us to execute queries against the table to retrieve all of the mysfits that match a given Species or Alignment to enable the filter functionality.

To create the table using the AWS CDK, do the following.

Let's start off by switching once again to our Workshop's CDK folder, and opening it in our editor:

```sh
cd ~/WorkShop/cdk
```

```sh
code .
```

Create a new file in the `lib` folder called `dynamodb-stack.ts`.

```sh
touch ~/Workshop/cdk/lib/dynamodb-stack.ts
```

__Note__ As before, you may find it helpful to run the command `npm run watch` from within the CDK folder to provide compile time error reporting whilst you develop your AWS CDK constructs.  We recommend running this from the terminal window within VS Code.

Within the file you just created, define the skeleton CDK Stack structure as we have done before, this time naming the class  `DynamoDbStack`:

**Action:** Write/Copy the following code:

```typescript
import cdk = require('@aws-cdk/core');

export class DynamoDbStack extends cdk.Stack {
  constructor(scope: cdk.Construct, id:string) {
    super(scope, id);

    // The code that defines your stack goes here
  }
}
```

Then, add the NetworkStack to our CDK application definition in `bin/cdk.ts`, when done, your `bin/cdk.ts` should look like this;

**Action:** Write/Copy the following code:

```typescript
#!/usr/bin/env node

import cdk = require('@aws-cdk/core');
import "source-map-support/register";
import { DeveloperToolsStack } from "../lib/developer-tools-stack";
import { WebApplicationStack } from "../lib/web-application-stack";
import { EcrStack } from "../lib/ecr-stack";
import { EcsStack } from "../lib/ecs-stack";
import { NetworkStack } from "../lib/network-stack";

const app = new cdk.App();
const developerToolsStack = new DeveloperToolsStack(app, 'MythicalMysfits-DeveloperTools');
new WebApplicationStack(app, "MythicalMysfits-WebApplication");
const networkStack = new NetworkStack(app, "MythicalMysfits-Network");
const ecrStack = new EcrStack(app, "MythicalMysfits-ECR");
const ecsStack = new EcsStack(app, "MythicalMysfits-ECS", {
  networkStack: networkStack,
  ncrStack: ecrStack
});
new CiCdStack(app, "MythicalMysfits-CICD", {
  ecrRepository: ecrStack.ecrRepository,
  ecsService: ecsStack.ecsService.service,
  apiRepositoryARN: developerToolStack.apiRepository.repositoryArn
});
new DynamoDbStack(app, 'MythicalMysfits-DynamoDB', {
  fargateService: ecsStack.ecsService.service,
  vpc: networkStack.vpc
});
```

Now, we can define the DynamoDB table using AWS CDK.  Once again, AWS CDK makes the implementation of AWS Components and Services a breeze by providing you with high level abstractions.  Let's demonstrate this now.

First, as before, we need to add a install the CDK NPM package for AWS DynamoDB, doing so like below;

**Action:** Execute the following command:

```sh
npm install --save-dev @aws-cdk/aws-dynamodb
```

Within the `DynamoDbStack` file, import the required modules.

**Action:** Write/Copy the following code:

```typescript
import ec2 = require("@aws-cdk/aws-ec2");
import ecs = require("@aws-cdk/aws-ecs");
import dynamodb = require("@aws-cdk/aws-dynamodb");
import iam = require("@aws-cdk/aws-iam");
```

Then define the following properties interface to define what constructs this stack depends upon:

**Action:** Write/Copy the following code:

```typescript
interface DynamoDbStackProps extends cdk.StackProps {
  vpc: ec2.Vpc;
  fargateService: ecs.FargateService;
}
```

Now change the constructor of your DBStack to require your properties object.

**Action:** Write/Copy the following code:

```typescript
  constructor(scope: cdk.Construct, id: string, props: DynamoDbStackProps) {
```

Next, within the DynamoDbStack class, we want to define a VPC endpoint to allow a secure path for traffic to travel between our VPC and the DynamoDB database.

```typescript
const dynamoDbEndpoint = props.NetworkStack.vpc.addGatewayEndpoint("DynamoDbEndpoint", {
  service: ec2.GatewayVpcEndpointAwsService.DynamoDb,
  subnets: [{
      subnetType: ec2.SubnetType.Private
  }]
});
const dynamoDbPolicy = new iam.PolicyStatement();
dynamoDbPolicy.addAnyPrincipal();
dynamoDbPolicy.addActions("*");
dynamoDbPolicy.addAllResources();

dynamoDbEndpoint.addToPolicy(
  dynamoDbPolicy
);
```

Next, we define the dynamoDB table using the following code.

**Action:** Write/Copy the following code:

```typescript
public readonly table: dynamodb.Table;
```

```typescript
this.table = new dynamodb.Table(this, "Table", {
  tableName: "MysfitsTable",
  partitionKey: {
  name: "MysfitId",
  type: dynamodb.AttributeType.String
  }
});
table.addGlobalSecondaryIndex({
  indexName: "LawChaosIndex",
  partitionKey: {
  name: 'LawChaos',
  type: dynamodb.AttributeType.String
  },
  sortKey: {
  name: 'MysfitId',
  type: dynamodb.AttributeType.String
  },
  readCapacity: 5,
  writeCapacity: 5,
  projectionType: dynamodb.ProjectionType.All
});
table.addGlobalSecondaryIndex({
  indexName: "GoodEvilIndex",
  partitionKey: {
  name: 'GoodEvil',
  type: dynamodb.AttributeType.String
  },
  sortKey: {
  name: 'MysfitId',
  type: dynamodb.AttributeType.String
  },
  readCapacity: 5,
  writeCapacity: 5,
  projectionType: dynamodb.ProjectionType.All
});
```

Last but not least, we need to allow our ECS Cluster access to our DynamoDB by adding an IAM Role defining the permissions required:

**Action:** Write/Copy the following code:

```typescript
const fargatePolicy = new iam.PolicyStatement();
fargatePolicy.addActions(
  //  Allows the ECS tasks to interact with only the MysfitsTable in DynamoDB
  "dynamodb:Scan",
  "dynamodb:Query",
  "dynamodb:UpdateItem",
  "dynamodb:GetItem",
  "dynamodb:DescribeTable"
);
fargatePolicy.addResources(
  "arn:aws:dynamodb:*:*:table/MysfitsTable*"
);
props.fargateService.taskDefinition.addToTaskRolePolicy(
  fargatePolicy
);
```

With that done, now we want to deploy the DynamoDB table.  Make sure your CDK application compiles without error (by running `npm run build`) and deploy your application to your AWS account.

Make sure our TypeScript has been compiled.

**Action:** Execute the following command:

```sh
cd ~/Workshop/cdk
```

```sh
npm run build
```

And now deploy the DynamoDB stack

**Action:** Execute the following command:

```sh
cdk deploy MythicalMysfits-DynamoDB
```

You will be prompted with a messages such as `Do you wish to deploy these changes (y/n)?` to which you should respond by typing `y`

After the command runs, you can view the details of your newly created table by executing the following AWS CLI or PowerShell command in the terminal:

**Action:** Execute the following command:

_Note:_ If you use `Bash`, execute the following command:

```sh
aws dynamodb describe-table --table-name MysfitsTable
```

_Note:_ If you use `PowerShell`, execute the following command:

```powershell
Get-DDBTable -TableName MysfitsTable
```

If we execute the following command to retrieve all of the items stored in the table, you'll see that the table is empty:

_Note:_ If you use `Bash`, execute the following command:

```sh
aws dynamodb scan --table-name MysfitsTable
```

_Note:_ If you use `PowerShell`, execute the following command:

```powershell
$ddbClient = New-Object "Amazon.DynamoDBv2.AmazonDynamoDBClient";$ddbClient.ScanAsync("MysfitsTable").Result;
```

```json
{
    "Count": 0,
    "Items": [],
    "ScannedCount": 0,
    "ConsumedCapacity": null
}
```

#### Add Items to the DynamoDB Table

Also provided is a JSON file that can be used to batch insert a number of Mysfit items into this table.  This will be accomplished through the DynamoDB API **BatchWriteItem.** To call this API using the provided JSON file, execute the following terminal command (the response from the service should report that there are no items that went unprocessed):

**Action:** Execute the following command:

_Note:_ If you use `Bash`, execute the following command:

```sh
aws dynamodb batch-write-item --request-items file://~/Workshop/source/module-3/data/populate-dynamodb.json
```

_Note:_ If you use `PowerShell`, execute the following command:

```powershell
~/Workshop/source/module-3/data/BatchWriteToDDBTable.ps1
```

Now, if you run the same command to scan all of the table contents, you'll find the items have been loaded into the table:

_Note:_ If you use `Bash`, execute the following command:

```sh
aws dynamodb scan --table-name MysfitsTable
```

_Note:_ If you use `PowerShell`, execute the following command:

```powershell
$ddbClient = New-Object "Amazon.DynamoDBv2.AmazonDynamoDBClient";$ddbClient.ScanAsync("MysfitsTable").Result;
```

### Committing The First *Real* Code change

#### Copy the Updated .NET Web Api Code

Now that we have our data included in the table, let's modify our application code to read from this table instead of returning the static JSON file that was used in Module 2.  We have included a Mysfits Service that will make a request to DynamoDB that our Mysfits Controller is now calling instead of reading the static JSON file.

The request is formed using the AWS .NET SDK Nuget package for DynamoDB called **DynamoDBv2**. This SDK is a powerful yet simple way to interact with AWS services from .NET applications.  In our service file, we are using the [Object Persistence Model](https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/DotNetSDKHighLevel.html) to communicate with our Dynamo Table, which allows us to create C# objects that map to items in the corresponding tables. To copy the new files into your CodeCommit repository directory, execute the following command in the terminal:

**Action:** Execute the following command:

```sh
cp -r ~/Workshop/source/module-3/webapi/* ~/Workshop/webapi/
```

#### Push the Updated Code into the CI/CD Pipeline

Now, we need to check in these code changes to CodeCommit using the git command line client.  Run the following commands to check in the new code changes and kick of your CI/CD pipeline:

**Action:** Execute the following commands:

```sh
cd ~/Workshop/webapi/
```

```sh
git add .
```

```sh
git commit -m "Add new integration to DynamoDB."
```

```sh
git push
```

Now, in just 5-10 minutes you'll see your code changes make it through your full CI/CD pipeline in CodePipeline and out to AWS Fargate on Amazon ECS.  Feel free to explore the AWS CodePipeline console to see the changes progress through your pipeline.

#### Update The Website Content in S3

Finally, we need to publish our Angular app to our S3 bucket so that the new API functionality using query strings to filter responses will be used.  First, Transfer the updated frontend code from the workshop repository over to your local repository.

**Action:** Execute the following command:

```sh
cp -r ~/Workshop/source/module-3/frontend/* ~/Workshop/frontend/
```

You will need to create or update your Angular environment file located in the `~/Workshop/frontend/environments/` folder. Make sure the file is named `environment.prod.ts`.

Open the `environment.prod.ts` file in VS Code and copy the `categories` property from the `environment.ts` file located in the same folder.
![update-angular-environment](/images/module-3/update-angular-environment.png)

Deploy your updated angular app by running the following command:

**Action:** Execute the following commands:

Since we use `npm run build -- --prod` to build the Angular app, we'll need to create a `prod` version of the `environment` file.

```sh
cd ~/Workshop/frontend
```

```sh
npm install
npm run build -- --prod
```

```sh
cd ~/Workshop/cdk
```

```sh
cdk deploy MythicalMysfits-WebApplication
```

### (Optional)

Re-visit your Mythical Mysfits website to see the new population of Mysfits loading from your DynamoDB table and how the Filter functionality is working!

That concludes module 3.

[Proceed to Module 4](/module-4)

## [AWS Developer Center](https://developer.aws)
