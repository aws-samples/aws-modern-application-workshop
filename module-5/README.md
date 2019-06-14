# Module 5: Capturing User Behavior

![Architecture](/images/module-5/architecture-module-5.png)

**Time to complete:** 30 minutes

---
**Short of time?:** If you are short of time, refer to the completed reference AWS CDK code in `~/Workshop/module-5/source/cdk/`

---

**Services used:**

* [AWS CloudFormation](https://aws.amazon.com/cloudformation/)
* [AWS Kinesis Firehose](https://aws.amazon.com/kinesis/data-firehose/)
* [Amazon S3](https://aws.amazon.com/s3/)
* [Amazon API Gateway](https://aws.amazon.com/api-gateway/)
* [AWS Lambda](https://aws.amazon.com/lambda/)
* [AWS CodeCommit](https://aws.amazon.com/codecommit/)
* [AWS Extensions for .NET CLI](https://github.com/aws/aws-extensions-for-dotnet-cli)

## Overview

Now that your Mythical Mysfits site is up and running, let's create a way to better understand how users are interacting with the website and its Mysfits.  It would be very easy for us to analyze user actions taken on the website that lead to data changes in our backend - when Mysfits are adopted or liked.  But understanding the actions your users are taking on the website *before* a decision to like or adopt a Mysfit could help you design a better user experience in the future that leads to Mysfits getting adopted even faster.  To help us gather these insights, we will implement a new microservice API using some serverless architecture. The frontend will submit a tiny request to this API each time a Mysfit profile is clicked by a user. Those records will be processed in real-time by an AWS Lambda function, aggregated, and stored for any future analysis that you may want to perform.

Modern application design principles prefer focused, decoupled, and modular services.  So rather than add additional methods and capabilities within the existing Mysfits service that you have been working with so far, we will create a new and decoupled service for the purpose of receiving user click events from the Mysfits website.  This full stack has been represented using a provided CloudFormation template.

The serverless real-time processing service stack you are creating includes the following AWS resources:

* An [**AWS Kinesis Firehose**](https://aws.amazon.com/kinesis/data-firehose/) **delivery stream**: AWS Kinesis Firehose is a managed real-time streaming service that accepts data records and automatically ingests them into several possible storage destinations within AWS: examples include an Amazon S3 bucket or an Amazon Redshift data warehouse cluster. Kinesis Firehose also enables all of the records received by the stream to be automatically delivered to an **AWS Lambda function**. This means that code you've written can perform any additional processing or transformations of the records before they are aggregated and stored in the configured destination.
* An [**Amazon S3 bucket**](https://aws.amazon.com/s3/): A new bucket will be created in S3 where all of the processed click event records are aggregated into files and stored as objects.
* An [**AWS Lambda function**](https://aws.amazon.com/lambda/): AWS Lambda enables developers to write code that executes only when invoked. Each function is deployed, invoked, and scaled without having to manage infrastructure whatsoever. Here, a Lambda function is defined using the AWS Extensions for .NET CLI. The function will be deployed to AWS Lambda, written in C#, and will run on .NET Core 2.1. The function processes and enriches the click records that are received by the delivery stream. The code we've written is very simple and enriching each click does could have been accomplished on the website frontend without any subsequent processing at all. The function retrieves additional attributes about the clicked on Mysfit to make the click record more meaningful (data that was already retrieved by the website frontend).  But, for the purpose of this workshop, the code is meant to demonstrate the architectural possibilities of including a serverless code function to perform any additional processing or transformation required, in real-time, before records are stored.  Once the Lambda function is created and the Kinesis Firehose delivery stream is configured as an event source for the function, the delivery stream will automatically deliver click records as events to code function we've created, receive the responses that our code returns, and deliver the updated records to the configured Amazon S3 bucket.
* An [**Amazon API Gateway REST API**](https://aws.amazon.com/api-gateway/): AWS Kinesis Firehose provides a service API just like other AWS services, and in this case we are using its PutRecord operation to put user click event records into the delivery stream. But, we don't want our frontend to have to directly integrate with the Kinesis Firehose PutRecord API.  Doing so would require us to manage AWS credentials within our frontend code to authorize those API requests to the PutRecord API, and it would expose to users the direct AWS API that is being depended on.  So instead, we will use Amazon API Gateway to create an **AWS Service Proxy** to the PutRecord API of Kinesis Firehose.  This allows us to craft our own public RESTful endpoint that does not require AWS credential management on the frontend for requests. Also, we will use a request **mapping template** in API Gateway as well, which will let us define our own request payload structure that will restrict requests to our expected structure and then transform those well-formed requests into the structure that the Kinesis Firehose PutRecord API requires.
* [**IAM Roles**](https://aws.amazon.com/iam/): Kinesis Firehose requires a service role that allows it to deliver received records as events to the created Lambda function as well as the processed records to the destination S3 bucket. The Amazon API Gateway API also requires a new role that permits the API to invoke the PutRecord API within Kinesis Firehose for each received API request.

Before we launch the CloudFormation template described above, we need to update and modify the Lambda function code it will deploy.

As an aside, AWS Amplify could also be an option when considering how to capture analytics in a frontend application. You can set up both Amazon Pinpoint and Amazon Kinesis with AWS Amplify. [See this guide](https://aws-amplify.github.io/amplify-js/media/analytics_guide) for more details.

### Install AWS Extensions for .NET CLI

First, let's install those AWS Extensions for .NET CLI:

```sh
dotnet tool install -g Amazon.Lambda.Tools
```

### Create a new CodeCommit Repository

This new stack you will deploy using AWS CDK will not only contain the infrastructure environment resources, but the application code itself that AWS Lambda will execute to process streaming events.  To bundle the creation of our infrastructure and code together in one deployment, we are going to use another AWS tool that extends the .NET CLI that needs to be installed.  Code for AWS Lambda functions is delivered to the service by building the .NET project, publishing it for release, and uploading the function code in a .zip package directly to AWS Lambda.  The AWS Extensions for .NET CLI automates that process for us.  Once we run the single command, everything we need to deploy our code to AWS Lambda will happen and we will be able to see the function in the console.

Let's start off by switching once again to our Workshop's CDK folder, and opening it in our editor:

```sh
cd ~/WorkShop/cdk
```

```sh
code .
```

Open the `developertoolsstack.ts` and define another CodeCommit repository, this time for the Kinesis Firehose and Lambda code we will write.

```typescript
this.lambdaRepository = new codecommit.Repository(this, "LambdaRepository", {
  repositoryName: "MythicalMysfitsService-Repository-Lambda"
});

new cdk.CfnOutput(this, "kinesisRepositoryCloneUrlHttp", {
  value: this.lambdaRepository.repositoryCloneUrlHttp,
  description: "Lambda Repository Clone Url HTTP"
});

new cdk.CfnOutput(this, "kinesisRepositoryCloneUrlSsh", {
  value: this.lambdaRepository.repositoryCloneUrlSsh,
  description: "Lambda Repository Clone Url SSH"
});
```

Now, create a new file in the `lib` folder called `kinesisfirehosestack.ts`.

```sh
touch ~/Workshop/cdk/lib/kinesisfirehosestack.ts
```

__Note__ As before, you may find it helpful to run the command `npm run watch` from within the CDK folder to provide compile time error reporting whilst you develop your AWS CDK constructs.  We recommend running this from the terminal window within VS Code.

Within the file you just created, define the skeleton CDK Stack structure as we have done before, this time naming the class `KinesisFirehoseStack`:

**Action:** Write/Copy the following code:

```typescript
import cdk = require('@aws-cdk/cdk');
export class KinesisFirehoseStack extends cdk.Stack {
  constructor(scope: cdk.Construct, id:string) {
    super(scope, id);
    // The code that defines your stack goes here
  }
}
```

**Action:** Execute the following command:

```sh
cd ~/Workshop/cdk/
```

```sh
npm install --save-dev @aws-cdk/aws-kinesisfirehose
```


Define the class imports for the code we will be writing:

**Action:** Write/Copy the following code:

```typescript
import cdk = require('@aws-cdk/cdk');
import apigw = require("@aws-cdk/aws-apigateway");
import iam = require("@aws-cdk/aws-iam");
import dynamodb = require("@aws-cdk/aws-dynamodb");
import { ServicePrincipal } from "@aws-cdk/aws-iam";
import { CfnDeliveryStream } from "@aws-cdk/aws-kinesisfirehose";
import lambda = require("@aws-cdk/aws-lambda");
import s3 = require("@aws-cdk/aws-s3");
```

Define an interface that defines the properties our KinesisFirehoseStack will require

**Action:** Write/Copy the following code:

```typescript
interface KinesisFirehoseStackProps extends cdk.StackProps {
  table: dynamodb.Table;
}
```

Then, add the NetworkStack to our CDK application definition in `bin/cdk.ts`, when done, your `bin/cdk.ts` should look like this;

**Action:** Write/Copy the following code:

```typescript
#!/usr/bin/env node

import cdk = require("@aws-cdk/cdk");
import "source-map-support/register";
import { DeveloperToolsStack } from "../lib/developer-tools-stack";
import { WebApplicationStack } from "../lib/web-applicatio-nstack";
import { EcrStack } from "../lib/ecrstack";
import { EcsStack } from "../lib/ecsstack";
import { NetworkStack } from "../lib/networkstack";

const app = new cdk.App();
const developerToolStack = new DeveloperToolsStack(app, 'MythicalMysfits-DeveloperTools');
new WebApplicationStack(app, "MythicalMysfits-WebApplication");
const networkStack = new NetworkStack(app, "MythicalMysfits-Network");
const ecrStack = new EcrStack(app, "MythicalMysfits-ECR");
const ecsStack = new EcsStack(app, "MythicalMysfits-ECS", {
    vpc: networkStack.vpc,
    ecrRepository: ecrStack.ecrRepository
});
new CiCdStack(app, "MythicalMysfits-CICD", {
    ecrRepository: ecrStack.ecrRepository,
    ecsService: ecsStack.ecsService.service,
    apiRepositoryARN: developerToolStack.apiRepository.repositoryArn
});
const DynamoDbStack = new DynamoDbStack(app, "MythicalMysfits-DynamoDB", {
    vpc: networkStack.vpc,
    fargateService: ecsStack.ecsService
});
new APIGatewayStack(app, "MythicalMysfits-APIGateway", {
    fargateService: ecsStack.ecsService
});
new KinesisFirehoseStack(app, "MythicalMysfits-KinesisFirehose", {
    table: DynamoDbStack.table
});
app.run();
```

We are not yet finished writing the KinesisFirehoseStack implementation but let's deploy what we have written so far.

**Action:** Execute the following commands:

```sh
cd ~/Workshop/cdk/
```

```sh
cdk deploy MythicalMysfits-KinesisFirehose
```

In the response to that command, copy the value for `"Repository Clone Url HTTP"`.  It should be of the form:
`https://git-codecommit.REPLACE_ME_REGION.amazonaws.com/v1/repos/MythicalMysfitsService-Repository-Kinesis`

Next, let's clone that new and empty repository:

**Action:** Execute the following commands:

```sh
cd ~/Workshop/
```

```sh
git clone REPLACE_ME_WITH_ABOVE_CLONE_URL lambda
```

### Copy the Streaming Service Code Base

Now, let's move our working directory into this new repository:

**Action:** Execute the following commands:

```sh
cd ~/Workshop/lambda/
```

Then, copy the module-5 application components into this new repository directory:

**Action:** Execute the following commands:

```sh
cp -r ~/Workshop/source/module-5/lambda/* ~/Workshop/lambda/
```

### Update the Lambda Function Package and Code

**Push Your Code into CodeCommit**
Now, we have the repository directory set with all of the provided artifacts, namely:

* The .NET project that contains the code for our Lambda function: `Function.cs`

Let's commit our code changes to the new repository so that they're saved in CodeCommit:

**Action:** Execute the following commands:

```sh
git add .
```

```sh
git commit -m "New stream processing service."
```

```sh
git push
```

### Creating the Streaming Service Stack

**Action:** Execute the following commands:

```sh
cd ~/Workshop/cdk
```

Back in the `KinesisFirehoseStack` file,  we will now define the Kinesis Firehose infrastructure.  First, let's define the kinesis firehose implementation.

**Action:** Write/Copy the following code:

```typescript
const clicksDestinationBucket = new s3.Bucket(this, "Bucket", {
  versioned: true
});

const firehoseDeliveryRole = new iam.Role(this, "FirehoseDeliveryRole", {
  roleName: "FirehoseDeliveryRole",
  assumedBy: new ServicePrincipal("firehose.amazonaws.com"),
  externalId: cdk.Aws.accountId
});

const mysfitsClicksProcessor = new lambda.Function(this, "Function", {
  handler: "streaming_lambda::streaming_lambda.function::FunctionHandlerAsync",
  runtime: lambda.Runtime.DotNetCore21,
  description: "An Amazon Kinesis Firehose stream processor that enriches click records" +
    " to not just include a mysfitId, but also other attributes that can be analyzed later.",
  memorySize: 128,
  code: lambda.Code.directory("../../lambda"),
  timeout: 30,
  initialPolicy: [
    new iam.PolicyStatement()
      .addAction("dynamodb:GetItem")
      .addResource(props.table.tableArn)
  ],
  environment: {
    mysfits_api_url: "MysfitsApiUrl"
  }
});

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
  sourceAccount: cdk.Aws.accountId,
  sourceArn: mysfitsFireHoseToS3.deliveryStreamArn
});

const clickProcessingApiRole = new iam.Role(this, "ClickProcessingApiRole", {
  assumedBy: new ServicePrincipal("apigateway.amazonaws.com")
});

new iam.Policy(this, "ClickProcessingApiPolicy", {
  policyName: "api_gateway_firehose_proxy_role",
  statements: [
    new iam.PolicyStatement()
      .allow()
      .addAction("firehose:PutRecord")
      .addResource(mysfitsFireHoseToS3.deliveryStreamArn)
  ],
  roles: [clickProcessingApiRole]
});

const clicksIntegration = new apigw.LambdaIntegration(
  mysfitsClicksProcessor,
  {
    connectionType: apigw.ConnectionType.Internet,
    credentialsRole: clickProcessingApiRole,
    integrationResponses: [
      {
        statusCode: "200",
        responseTemplates: {
          "application/json": '{"status":"OK"}'
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
);

const api = new apigw.LambdaRestApi(this, "APIEndpoint", {
  handler: mysfitsClicksProcessor,
  options: {
    restApiName: "ClickProcessing API Service"
  },
  proxy: false
});

api.root.addMethod("OPTIONS", new apigw.MockIntegration({
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
  passthroughBehavior: apigw.PassthroughBehavior.Never,
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

const clicksMethod = api.root.addResource("clicks");
clicksMethod.addMethod("PUT", clicksIntegration, {
  apiKeyRequired: true,
  methodResponses: [{
    statusCode: "200"
  }],
  authorizationType: apigw.AuthorizationType.None
});
```

Finally, deploy the CDK Application for the final time.

```sh
cdk deploy MythicalMysfits-KinesisFirehose
```

![kinesis deployment](/images/module-5/KinesisDeploy.png)

### Sending Mysfit Profile Clicks to the Service

#### Update the Website Content and Push the New Site to S3

With the streaming stack up and running, we now need to publish a new version of our Mythical Mysfits frontend. You will need to update the production `environment` file that you created in module 3 with the value of StreamingApiEndpoint you copied from the last step. Remember this environment file is located inside this folder `~/Workshop/frontend/module-5/frontend/src/environments/` and the file is named `environment.prod.ts`. Do not include the /mysfits path.
![update-angular-environment](/images/module-5/update-angular-environment.png)

After replacing the endpoint to point with your new streaming endpoint, deploy your updated Angular app by running the following command:

**Action:** Execute the following commands:

We use `npm run build -- --prod` to build the Angular app.

```sh
cd ~/Workshop/frontend
```

```sh
cp -r ~/Workshop/source/module-4/webapi/* ~/WorkShop/webapi/
```

```sh
git add .
```

```sh
git commit -m "Module 5"
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

Refresh your Mythical Mysfits website in the browser once more and you will now have a site that records and publishes each time a user clicks on a Mysfits profile!

To view the records that have been processed, they will arrive in the destination S3 bucket created as part of your MythicalMysfitsStreamingStack.  Visit the S3 console here and explore the bucket you created for the streaming records (it will be prefixed with `mythicalmysfitsstreamings-clicksdestinationbucket`):
[Amazon S3 Console](https://s3.console.aws.amazon.com/s3/home)

Now that you have a completed modern application architecture, we encourage you now to explore the AWS Console and all the various services you've created to launch Mythical Mysfits!

### Workshop Clean-Up

Be sure to delete all of the resources created during the workshop in order to ensure that billing for the resources does not continue for longer than you intend.  We recommend that you utilize the AWS Console to explore the resources you've created and delete them when you're ready.  

For the two cases where you provisioned resources using AWS CloudFormation, you can remove those resources by simply running the following CLI command for each stack:

All stacks deployed by AWS CDK can be removed and cleaned up using this handy script:

```sh
cd ~/Workshop/cdk/
```

```sh
cdk destroy
```

Any AWS Amplify resources can be removed with the following command:

```sh
amplify delete
```

To remove all of the created resources, you can visit the following AWS Consoles, which contain resources you've created during the Mythical Mysfits workshop:

* [AWS Kinesis](https://console.aws.amazon.com/kinesis/home)
* [AWS Lambda](https://console.aws.amazon.com/lambda/home)
* [Amazon S3](https://console.aws.amazon.com/s3/home)
* [Amazon API Gateway](https://console.aws.amazon.com/apigateway/home)
* [Amazon Cognito](https://console.aws.amazon.com/cognito/home)
* [AWS CodePipeline](https://console.aws.amazon.com/codepipeline/home)
* [AWS CodeBuild](https://console.aws.amazon.com/codebuild/home)
* [AWS CodeCommit](https://console.aws.amazon.com/codecommit/home)
* [Amazon DynamoDB](https://console.aws.amazon.com/dynamodb/home)
* [Amazon ECS](https://console.aws.amazon.com/ecs/home)
* [Amazon EC2](https://console.aws.amazon.com/ec2/home)
* [Amazon VPC](https://console.aws.amazon.com/vpc/home)
* [AWS IAM](https://console.aws.amazon.com/iam/home)
* [AWS CloudFormation](https://console.aws.amazon.com/cloudformation/home)

## Conclusion

This experience was meant to give you a taste of what it's like to be a developer designing and building modern application architectures on top of AWS.  Developers on AWS are able to programmatically provision resources using the AWS CLI and AWS Tools for PowerSheel, reuse infrastructure definitions via AWS CloudFormation, automatically build and deploy code changes using the AWS developer tool suite of Code services, and take advantage of multiple different compute and application service capabilities that do not require you to provision or manage any servers at all!

As a great next step, to learn more about the inner workings of the Mythical Mysfits website that you've created, dive into the provided CloudFormation templates and the resources declared within them.

We hope you have enjoyed the AWS Modern Application Workshop!  If you find any issues or have feedback/questions, don't hesitate to open an issue.

Thank you!

## [AWS Developer Center](https://developer.aws)
