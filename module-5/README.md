# Module 5: Capturing User Behavior

![Architecture](/images/module-5/architecture-module-5.png)

**Time to complete:** 30 minutes

---
**Short of time?:** If you are short of time, refer to the completed reference AWS CDK code in `module-5/cdk`

---

**Services used:**
* [AWS CloudFormation](https://aws.amazon.com/cloudformation/)
* [AWS Kinesis Data Firehose](https://aws.amazon.com/kinesis/data-firehose/)
* [Amazon S3](https://aws.amazon.com/s3/)
* [Amazon API Gateway](https://aws.amazon.com/api-gateway/)
* [AWS Lambda](https://aws.amazon.com/lambda/)
* [AWS CodeCommit](https://aws.amazon.com/codecommit/)

### Overview
Now that your Mythical Mysfits site is up and running, let's create a way to better understand how users are interacting with the website and its Mysfits.  It would be very easy for us to analyze user actions taken on the website that lead to data changes in our backend - when mysfits are adopted or liked.  But understanding the actions your users are taking on the website *before* a decision to like or adopt a mysfit could help you design a better user experience in the future that leads to mysfits getting adopted even faster.  To help us gather these insights, we will implement the ability for the website frontend to submit a tiny request, each time a mysfit profile is clicked by a user, to a new microservice API we'll create. Those records will be processed in real-time by a serverless code function, aggregated, and stored for any future analysis that you may want to perform.

Modern application design principles prefer focused, decoupled, and modular services.  So rather than add additional methods and capabilities within the existing Mysfits service that you have been working with so far, we will create a new and decoupled service for the purpose of receiving user click events from the Mysfits website.

The serverless real-time processing service stack you will be creating includes the following AWS resources:
* An [**AWS Kinesis Data Firehose delivery stream**](https://aws.amazon.com/kinesis/data-firehose/): Kinesis Firehose is a highly available and managed real-time streaming service that accepts data records and automatically ingests them into several possible storage destinations within AWS, examples including an Amazon S3 bucket, or an Amazon Redshift data warehouse cluster. Kinesis Firehose also enables all of the records received by the stream to be automatically delivered to a serverless function created with **AWS Lambda** This means that code you've written can perform any additional processing or transformations of the records before they are aggregated and stored in the configured destination.
* An [**Amazon S3 bucket**](https://aws.amazon.com/s3/): A new bucket will be created in S3 where all of the processed click event records are aggregated into files and stored as objects.
* An [**AWS Lambda function**](https://aws.amazon.com/lambda/): AWS Lambda enables developers to write code functions that only contain what their logic requires and have their code be deployed, invoked, made highly reliable, and scale without having to manage infrastructure whatsoever. Here, a Serverless code function is defined using AWS SAM. It will be deployed to AWS Lambda, written in Python, and then process and enrich the click records that are received by the delivery stream.  The code we've written is very simple and the enriching it does could have been accomplished on the website frontend without any subsequent processing  at all.  The function retrieves additional attributes about the clicked on Mysfit to make the click record more meaningful (data that was already retrieved by the website frontend).  But, for the purpose of this workshop, the code is meant to demonstrate the architectural possibilities of including a serverless code function to perform any additional processing or transformation required, in real-time, before records are stored.  Once the Lambda function is created and the Kinesis Firehose delivery stream is configured as an event source for the function, the delivery stream will automatically deliver click records as events to code function we've created, receive the responses that our code returns, and deliver the updated records to the configured Amazon S3 bucket.
* An [**Amazon API Gateway REST API**](https://aws.amazon.com/api-gateway/): AWS Kinesis Firehose provides a service API just like other AWS services, and in this case we are using its PutRecord operation to put user click event records into the delivery stream. But, we don't want our website frontend to have to directly integrate with the Kinesis Firehose PutRecord API.  Doing so would require us to manage AWS credentials within our frontend code to authorize those API requests to the PutRecord API, and it would expose to users the direct AWS API that is being depended on (which may encourage malicious site visitors to attempt to add records to the delivery stream that are malformed, or harmful to our goal of understanding real user behavior).  So instead, we will use Amazon API Gateway to create an **AWS Service Proxy** to the PutRecord API of Kinesis Firehose.  This allows us to craft our own public RESTful endpoint that does not require AWS credential management on the frontend for requests. Also, we will use a request **mapping template** in API Gateway as well, which will let us define our own request payload structure that will restrict requests to our expected structure and then transform those well-formed requests into the structure that the Kinesis Firehose PutRecord API requires.
* [**IAM Roles**](https://docs.aws.amazon.com/IAM/latest/UserGuide/id_roles.html): Kinesis Firehose requires a service role that allows it to deliver received records as events to the created Lambda function as well as the processed records to the destination S3 bucket. The Amazon API Gateway API also requires a new role that permits the API to invoke the PutRecord API within Kinesis Firehose for each received API request.

Before we create the resources described above, we need to update and modify the Lambda function code it will deploy.

### Create a new CodeCommit Repository

This new stack you will deploy using the AWS Cloud Development Kit (CDK) will not only contain the infrastructure environment resources, but the application code itself that AWS Lambda will execute to process streaming events.  

To create the necessary resources using the AWS CDK, create a new file in the `workshop/cdk/lib` folder called `kinesis-firehose-stack.ts`.

```sh
cd ~/environment/workshop/cdk
touch lib/kinesis-firehose-stack.ts
```

Within the file you just created, define the skeleton CDK Stack structure as we have done before, this time naming the class `KinesisFirehoseStack`:

```typescript
import cdk = require('@aws-cdk/core');

export class KinesisFirehoseStack extends cdk.Stack {
  constructor(scope: cdk.Construct, id:string) {
    super(scope, id);
    // The code that defines your stack goes here
  }
}
```

Install the AWS CDK npm package for Kinesis Firehose by executing the following command from within the `workshop/cdk/` directory:

```sh
npm install --save-dev @aws-cdk/aws-kinesisfirehose
```

Define the class imports for the code we will be writing:

```typescript
import cdk = require('@aws-cdk/core');
import codecommit = require("@aws-cdk/aws-codecommit");
import apigw = require("@aws-cdk/aws-apigateway");
import iam = require("@aws-cdk/aws-iam");
import dynamodb = require("@aws-cdk/aws-dynamodb");
import { ServicePrincipal } from "@aws-cdk/aws-iam";
import { CfnDeliveryStream } from "@aws-cdk/aws-kinesisfirehose";
import lambda = require("@aws-cdk/aws-lambda");
import s3 = require("@aws-cdk/aws-s3");
```

Define an interface that defines the properties our KinesisFirehoseStack will require:

```typescript
interface KinesisFirehoseStackProps extends cdk.StackProps {
  table: dynamodb.Table;
}
```

Now change the constructor of your KinesisFirehoseStack to require your properties object.

```typescript
  constructor(scope: cdk.Construct, id: string, props: KinesisFirehoseStackProps) {
```

Within the `KinesisFirehoseStack` constructor, add the CodeCommit repository we'll use for the Kinesis Firehose and Lambda code we will write:

```typescript
const lambdaRepository = new codecommit.Repository(this, "ClicksProcessingLambdaRepository", {
  repositoryName: "MythicalMysfits-ClicksProcessingLambdaRepository"
});

new cdk.CfnOutput(this, "kinesisRepositoryCloneUrlHttp", {
  value: lambdaRepository.repositoryCloneUrlHttp,
  description: "Clicks Processing Lambda Repository Clone Url HTTP"
});

new cdk.CfnOutput(this, "kinesisRepositoryCloneUrlSsh", {
  value: lambdaRepository.repositoryCloneUrlSsh,
  description: "Clicks Processing Lambda Repository Clone Url SSH"
});
```

Then, add the `KinesisFirehoseStack` to our CDK application definition in `bin/cdk.ts`, when done, your `bin/cdk.ts` file should look like this:

```typescript
#!/usr/bin/env node
import 'source-map-support/register';
import cdk = require('@aws-cdk/core');
import { WebApplicationStack } from "../lib/web-application-stack";
import { NetworkStack } from "../lib/network-stack";
import { EcrStack } from "../lib/ecr-stack";
import { EcsStack } from "../lib/ecs-stack";
import { CiCdStack } from "../lib/cicd-stack";
import { DynamoDbStack } from '../lib/dynamodb-stack';
import { CognitoStack } from '../lib/cognito-stack';
import { APIGatewayStack } from "../lib/apigateway-stack";
import { KinesisFirehoseStack } from "../lib/kinesis-firehose-stack";

const app = new cdk.App();
new WebApplicationStack(app, "MythicalMysfits-Website");
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
const dynamoDbStack = new DynamoDbStack(app, "MythicalMysfits-DynamoDB", {
    vpc: networkStack.vpc,
    fargateService: ecsStack.ecsService.service
});
const cognito = new CognitoStack(app,  "MythicalMysfits-Cognito");
new APIGatewayStack(app, "MythicalMysfits-APIGateway", {
  userPoolId: cognito.userPool.userPoolId,
  loadBalancerArn: ecsStack.ecsService.loadBalancer.loadBalancerArn,
  loadBalancerDnsName: ecsStack.ecsService.loadBalancer.loadBalancerDnsName
});
new KinesisFirehoseStack(app, "MythicalMysfits-KinesisFirehose", {
    table: dynamoDbStack.table
});
```

We are not yet finished writing the `KinesisFirehoseStack` implementation but let's deploy what we have written so far:

```sh
cdk deploy MythicalMysfits-KinesisFirehose
```

In the output of that command, copy the value for `"Repository Clone Url HTTP"`.  It should be of the form: `https://git-codecommit.REPLACE_ME_REGION.amazonaws.com/v1/repos/MythicalMysfits-ClicksProcessingLambdaRepository`

Next, let's clone that new and empty repository:

```sh
cd ~/environment/
git clone REPLACE_ME_WITH_ABOVE_CLONE_URL lambda-streaming-processor
```

### Copy the Streaming Service Code Base

Now, let's move our working directory into this new repository:
```
cd ~/environment/lambda-streaming-processor/
```

Then, copy the module-5 application components into this new repository directory:
```
cp -r ~/environment/workshop/source/module-5/app/streaming/* .
```

### Update the Lambda Function Package and Code

#### Use pip to Intall Lambda Function Dependencies
If you look at the code inside the `streamProcessor.py` file, you'll notice that it's using the `requests` and `os` Python packages to make an API requset to the Mythical Mysfits service you created previously.  External libraries are not automatically included in the AWS Lambda runtime environment, because different AWS customers may depend on different versions of various libraries, etc.  You will need to package all of your library dependencies together with your Lambda code function prior to it being uploaded to the Lambda service.  We will use the Python package manager `pip` to accomplish this.  In the Cloud9 terminal, run the following command to install the required packages and their dependencies locally alongside your function code:

```
pip install requests -t .
```

Once this command completes, you will see several additional python package folders stored within your repository directory.  

#### Push Your Code into CodeCommit
Let's commit our code changes to the new repository so that they're saved in CodeCommit:

```sh
git add .
git commit -m "New stream processing service."
git push
```

### Creating the Streaming Service Stack

Change back into the `cdk` folder:

```sh
cd ~/environment/workshop/cdk
```

Back in the `KinesisFirehoseStack` file,  we will now define the Kinesis Firehose infrastructure.  First, let's define the kinesis firehose implementation:

```typescript
const clicksDestinationBucket = new s3.Bucket(this, "Bucket", {
  versioned: true
});

const lambdaFunctionPolicy =  new iam.PolicyStatement();
lambdaFunctionPolicy.addActions("dynamodb:GetItem");
lambdaFunctionPolicy.addResources(props.table.tableArn);

const mysfitsClicksProcessor = new lambda.Function(this, "Function", {
  handler: "streamProcessor.processRecord",
  runtime: lambda.Runtime.PYTHON_3_6,
  description: "An Amazon Kinesis Firehose stream processor that enriches click records" +
    " to not just include a mysfitId, but also other attributes that can be analyzed later.",
  memorySize: 128,
  code: lambda.Code.asset("../../lambda-streaming-processor"),
  timeout: cdk.Duration.seconds(30),
  initialPolicy: [
    lambdaFunctionPolicy
  ],
  environment: {
    MYSFITS_API_URL: "REPLACE_ME_API_URL"
  }
});

const firehoseDeliveryRole = new iam.Role(this, "FirehoseDeliveryRole", {
  roleName: "FirehoseDeliveryRole",
  assumedBy: new ServicePrincipal("firehose.amazonaws.com"),
  externalId: cdk.Aws.ACCOUNT_ID
});

const firehoseDeliveryPolicyS3Stm = new iam.PolicyStatement();
firehoseDeliveryPolicyS3Stm.addActions("s3:AbortMultipartUpload",
      "s3:GetBucketLocation",
      "s3:GetObject",
      "s3:ListBucket",
      "s3:ListBucketMultipartUploads",
      "s3:PutObject");
firehoseDeliveryPolicyS3Stm.addResources(clicksDestinationBucket.bucketArn);
firehoseDeliveryPolicyS3Stm.addResources(clicksDestinationBucket.arnForObjects('*'));

const firehoseDeliveryPolicyLambdaStm = new iam.PolicyStatement();
firehoseDeliveryPolicyLambdaStm.addActions("lambda:InvokeFunction");
firehoseDeliveryPolicyLambdaStm.addResources(mysfitsClicksProcessor.functionArn);

firehoseDeliveryRole.addToPolicy(firehoseDeliveryPolicyS3Stm);
firehoseDeliveryRole.addToPolicy(firehoseDeliveryPolicyLambdaStm);

const mysfitsFireHoseToS3 = new CfnDeliveryStream(this, "DeliveryStream", {
  extendedS3DestinationConfiguration: {
    bucketArn: clicksDestinationBucket.bucketArn,
    bufferingHints: {
      intervalInSeconds: 60,
      sizeInMBs: 50
    },
    compressionFormat: "UNCOMPRESSED",
    prefix: "firehose/",
    roleArn: firehoseDeliveryRole.roleArn,
    processingConfiguration: {
      enabled: true,
      processors: [
        {
          parameters: [
            {
              parameterName: "LambdaArn",
              parameterValue: mysfitsClicksProcessor.functionArn
            }
          ],
          type: "Lambda"
        }
      ]
    }
  }
});

new lambda.CfnPermission(this, "Permission", {
  action: "lambda:InvokeFunction",
  functionName: mysfitsClicksProcessor.functionArn,
  principal: "firehose.amazonaws.com",
  sourceAccount: cdk.Aws.ACCOUNT_ID,
  sourceArn: mysfitsFireHoseToS3.attrArn
});

const clickProcessingApiRole = new iam.Role(this, "ClickProcessingApiRole", {
  assumedBy: new ServicePrincipal("apigateway.amazonaws.com")
});

const apiPolicy = new iam.PolicyStatement();
apiPolicy.addActions("firehose:PutRecord");
apiPolicy.addResources(mysfitsFireHoseToS3.attrArn);
new iam.Policy(this, "ClickProcessingApiPolicy", {
  policyName: "api_gateway_firehose_proxy_role",
  statements: [
    apiPolicy
  ],
  roles: [clickProcessingApiRole]
});

const api = new apigw.RestApi(this, "APIEndpoint", {
    restApiName: "ClickProcessing API Service",
    endpointTypes: [ apigw.EndpointType.REGIONAL ]
});

const clicks = api.root.addResource('clicks');

clicks.addMethod('PUT', new apigw.AwsIntegration({
    service: 'firehose',
    integrationHttpMethod: 'POST',
    action: 'PutRecord',
    options: {
        connectionType: apigw.ConnectionType.INTERNET,
        credentialsRole: clickProcessingApiRole,
        integrationResponses: [
          {
            statusCode: "200",
            responseTemplates: {
              "application/json": '{"status":"OK"}'
            },
            responseParameters: {
              "method.response.header.Access-Control-Allow-Headers": "'Content-Type'",
              "method.response.header.Access-Control-Allow-Methods": "'OPTIONS,PUT'",
              "method.response.header.Access-Control-Allow-Origin": "'*'"
            }
          }
        ],
        requestParameters: {
          "integration.request.header.Content-Type": "'application/x-amz-json-1.1'"
        },
        requestTemplates: {
          "application/json": `{ "DeliveryStreamName": "${mysfitsFireHoseToS3.ref}", "Record": { "Data": "$util.base64Encode($input.json('$'))" }}`
        }
    }
}), {
    methodResponses: [
      {
        statusCode: "200",
        responseParameters: {
          "method.response.header.Access-Control-Allow-Headers": true,
          "method.response.header.Access-Control-Allow-Methods": true,
          "method.response.header.Access-Control-Allow-Origin": true
        }
      }
    ]
  }
);

clicks.addMethod("OPTIONS", new apigw.MockIntegration({
  integrationResponses: [{
    statusCode: "200",
    responseParameters: {
      "method.response.header.Access-Control-Allow-Headers":
        "'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token,X-Amz-User-Agent'",
      "method.response.header.Access-Control-Allow-Origin": "'*'",
      "method.response.header.Access-Control-Allow-Credentials":
        "'false'",
      "method.response.header.Access-Control-Allow-Methods":
        "'OPTIONS,GET,PUT,POST,DELETE'"
    }
  }],
  passthroughBehavior: apigw.PassthroughBehavior.NEVER,
  requestTemplates: {
    "application/json": '{"statusCode": 200}'
  }
}), {
    methodResponses: [
      {
        statusCode: "200",
        responseParameters: {
          "method.response.header.Access-Control-Allow-Headers": true,
          "method.response.header.Access-Control-Allow-Methods": true,
          "method.response.header.Access-Control-Allow-Credentials": true,
          "method.response.header.Access-Control-Allow-Origin": true
        }
      }
    ]
  }
);
```

In the code we just wrote, there is a line that needs to be replaced with the ApiEndpoint for your Mysfits service API - the same service ApiEndpoint that you created in module-4 and used on the website frontend.  Be sure to update the your code.

```typescript
  ## Replace "REPLACE_ME_API_URL" with the ApiEndpoint for your Mysfits service API, eg: 'https://ljqomqjzbf.execute-api.us-east-1.amazonaws.com/prod/'
  environment: {
    MYSFITS_API_URL: "REPLACE_ME_API_URL"
  }
```

That service is responsible for integrating with the MysfitsTable in DynamoDB, so even though we could write a Lambda function that directly integrated with the DynamoDB table as well, doing so would intrude upon the purpose of the first microservice and leave us with multiple/separate code bases that integrated with the same table.  Instead, we will integrate with that table through the existing service and have a much more decoupled and modular application architecture.

Finally, deploy the CDK Application for the final time.

```sh
cdk deploy MythicalMysfits-KinesisFirehose
```

Note down the API Gateway endpoint, as we will need it in the next step.

### Sending Mysfit Profile Clicks to the Service

#### Update the Website Content and Push the New Site to S3
With the streaming stack up and running, we now need to publish a new version of our Mythical Mysfits frontend that includes the JavaScript that sends events to our service whenever a mysfit profile is clicked by a user.

The new index.html file is included at: `~/environment/workshop/source/module-5/web/index.html`. Copy the new version of the website to the `workshop/web` directory:

```sh
cp -r ~/environment/workshop/source/module-5/web/* ~/environment/workshop/web
```

This file contains the same placeholders as module-4 that need to be updated, as well as an additional placeholder for the new stream processing service endpoint you just created. The `streamingApiEndpoint` value is the API Gateway endpoint you noted down earlier.

Now, let's update your S3 hosted website and deploy the `MythicalMysfits-Website` stack:

```sh
npm run build
cdk deploy MythicalMysfits-Website
```

Refresh your Mythical Mysfits website in the browser once more and you will now have a site that records and publishes each time a user clicks on a mysfits profile!

To view the records that have been processed, they will arrive in the destination S3 bucket created as part of your MythicalMysfitsStreamingStack.  Visit the S3 console here and explore the bucket you created for the streaming records (it will be prefixed with `mythicalmysfits-kinesisfirehose-bucket...`):
[Amazon S3 Console](https://s3.console.aws.amazon.com/s3/home)

This concludes Module 5.

### [Proceed to Module 6](/module-6)


#### [AWS Developer Center](https://developer.aws)
