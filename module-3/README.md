# Module 3 - Adding a Data Tier with Amazon DynamoDB

![Architecture](/images/module-3/architecture-module-3.png)

**Time to complete:** 20 minutes

---
**Short of time?:** If you are short of time, refer to the completed reference AWS CDK code in `module-3/cdk-complete`

---

**Services used:**
* [Amazon DynamoDB](https://aws.amazon.com/dynamodb/)

### Overview

Now that you have a service deployed and a working CI/CD pipeline to deliver changes to that service automatically whenever you update your code repository, you can quickly move new application features from conception to available for your Mythical Mysfits customers.  With this increased agility, let's add another foundational piece of functionality to the Mythical Mysfits website architecture, a data tier.  In this module you will create a table in [Amazon DynamoDB](https://aws.amazon.com/dynamodb/), a managed and scalable NoSQL database service on AWS with super fast performance.  Rather than have all of the Mysfits be stored in a static JSON file, we will store them in a database to make the websites future more extensible and scalable.

### Adding a NoSQL Database to Mythical Mysfits

#### Create a DynamoDB Table

To add a DynamoDB table to the architecture, we will write another CloudFormation stack using AWS CDK that defines a table called **MysfitsTable**. This table will have a primary index defined by a hash key attribute called **MysfitId**, and two more secondary indexes.  The first secondary index will have the hash key of **GoodEvil** and a range key of **MysfitId**, and the other secondary index will have the hash key of **LawChaos** and a range key of **MysfitId**.  These two secondary indexes will allow us to execute queries against the table to retrieve all of the mysfits that match a given Species or Alignment to enable the filter functionality.

To create the table using the AWS CDK, run the following command in the Cloud9 terminal:

```sh
cd aws-modern-application-workshop/module-3
mkdir cdk && cd cdk/
cdk init --language typescript
```

Create a new file in the `lib` folder called `dynamodb-stack.ts`.

```sh
touch lib/dynamodb-stack.ts
```

Within the file you just created, define the skeleton CDK Stack structure as we have done before, this time naming the class  `DynamoDbStack`:

```typescript
import cdk = require('@aws-cdk/core');

export class DynamoDbStack extends cdk.Stack {
  constructor(scope: cdk.Construct, id:string) {
    super(scope, id);

    // The code that defines your stack goes here
  }
}
```

Then, add the DynamoDbStack to our CDK application definition in `bin/cdk.ts`, when done, your `bin/cdk.ts` should look like this:

```typescript
#!/usr/bin/env node

import cdk = require("@aws-cdk/core");
import 'source-map-support/register';
import { StaticWebsiteStack } from "../lib/static-website-stack";
import { NetworkStack } from "../lib/network-stack";
import { EcrStack } from "../lib/ecr-stack";
import { EcsStack } from "../lib/ecs-stack";
import { CiCdStack } from "../lib/cicd-stack";
import { DynamoDbStack } from '../lib/dynamodb-stack';

const app = new cdk.App();
new StaticWebsiteStack(app, "MythicalMysfits-Website");
const networkStack = new NetworkStack(app, "MythicalMysfits-Network");
const ecrStack = new EcrStack(app, "MythicalMysfits-ECR");
const ecsStack = new EcsStack(app, "MythicalMysfits-ECS", {
    vpc: networkStack.vpc,
    ecrRepository: ecrStack.ecrRepository
});
new CiCdStack(app, "MythicalMysfits-CICD", {
    ecrRepository: ecrStack.ecrRepository,
    ecsService: ecsStack.ecsService.service
});
new DynamoDbStack(app, "MythicalMysfits-DynamoDB", {
    fargateService: ecsStack.ecsService
});
```

As we have done previously, we need to install the CDK NPM package for AWS DynamoDB:

```sh
npm install --save-dev @aws-cdk/aws-dynamodb
```

Within the `dynamodb-stack.ts` file, import the required modules:

```typescript
import cdk = require("@aws-cdk/core");
import dynamodb = require("@aws-cdk/aws-dynamodb");
import iam = require("@aws-cdk/aws-iam");
import ecs = require("@aws-cdk/aws-ecs");
```

Then define the following properties interface to define what constructs this stack depends upon:

```typescript
interface DynamoDbStackProps extends cdk.StackProps {
  fargateService: ecs.FargateService;
}
```

Now change the constructor of your DBStack to require your properties object.

```typescript
  constructor(scope: cdk.Construct, id: string, props: DynamoDbStackProps) {
```

Next, we nned to define the DynamoDB table; within the `DynamoDbStack` class write/copy the following code:

```typescript
public readonly table: dynamodb.Table;
```

Within the constructor write/copy the following code:

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

With that done, now we want to deploy the DynamoDB table.  Make sure your CDK application compiles without error and deploy your application to your AWS account.

```sh
npm run build
cdk deploy MythicalMysfits-DynamoDB
```

You will be prompted with a messages such as `Do you wish to deploy these changes (y/n)?` to which you should respond by typing `y`

After the command runs, you can view the details of your newly created table by executing the following AWS CLI command in the terminal:

```sh
aws dynamodb describe-table --table-name MysfitsTable
```

If we execute the following command to retrieve all of the items stored in the table, you'll see that the table is empty:

```sh
aws dynamodb scan --table-name MysfitsTable
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

```
aws dynamodb batch-write-item --request-items file://~/environment/aws-modern-application-workshop/module-3/data/populate-dynamodb.json
```

Now, if you run the same command to scan all of the table contents, you'll find the items have been loaded into the table:

```
aws dynamodb scan --table-name MysfitsTable
```

### Committing The First *Real* Code change

#### Copy the Updated Flask Service Code
Now that we have our data included in the table, let's modify our application code to read from this table instead of returning the static JSON file that was used in Module 2.  We have included a new set of Python files for your Flask microservice, but now instead of reading the static JSON file will make a request to DynamoDB.

The request is formed using the AWS Python SDK called **boto3**. This SDK is a powerful yet simple way to interact with AWS services via Python code. It enables you to use service client definitions and functions that have great symmetry with the AWS APIs and CLI commands you've already been executing as part of this workshop.  Translating those commands to working Python code is simple when using **boto3**.  To copy the new files into your CodeCommit repository directory, execute the following command in the terminal:

```sh
cp ~/environment/aws-modern-application-workshop/module-3/app/service/* ~/environment/MythicalMysfitsService-Repository/service/
```

#### Push the Updated Code into the CI/CD Pipeline

Now, we need to check in these code changes to CodeCommit using the git command line client.  Run the following commands to check in the new code changes and kick of your CI/CD pipeline:

```sh
cd ~/environment/MythicalMysfitsService-Repository
git add .
git commit -m "Add new integration to DynamoDB."
git push
```

Now, in just 5-10 minutes you'll see your code changes make it through your full CI/CD pipeline in CodePipeline and out to your deployed Flask service to AWS Fargate on Amazon ECS.  Feel free to explore the AWS CodePipeline console to see the changes progress through your pipeline.

#### Update The Website Content in S3

Finally, we need to publish a new static website to our S3 bucket so that the new API functionality using query strings to filter responses will be used.  The new index.html file is located at `~/environment/aws-modern-application-workshop/module-3/web/index.html`.  Open this file in your Cloud9 IDE and replace the string indicating “REPLACE_ME” just as you did in Module 2, with the appropriate NLB endpoint. Remember do not inlcude the /mysfits path. Refer to the file you already edited in the /module-2/ directory if you need to.  

After replacing the endpoint to point at your NLB, update your S3 hosted website and deploy the `MythicalMysfits-Website` stack:

```sh
npm run build
cdk deploy MythicalMysfits-Website
```

Re-visit your Mythical Mysfits website to see the new population of Mysfits loading from your DynamoDB table and how the Filter functionality is working!

That concludes module 3.

[Proceed to Module 4](/module-4)


## [AWS Developer Center](https://developer.aws)
