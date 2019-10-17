# Module 6: Tracing Application Requests

![Architecture](/images/module-6/x-ray-arch-diagram.png)

**Time to complete:** 45 minutes

---
**Short of time?:** If you are short of time, refer to the completed reference AWS CDK code in `~/Workshop/source/module-6/cdk`

---

**Services used:**

* [AWS CDK](https://docs.aws.amazon.com/CDK/latest/userguide/getting_started.html)
* [AWS X-Ray](https://aws.amazon.com/xray/)
* [Amazon DynamoDB](https://aws.amazon.com/dynamodb/)
* [Amazon Simple Notification Service (AWS SNS)](https://aws.amazon.com/sns/)
* [Amazon S3](https://aws.amazon.com/s3/)
* [Amazon API Gateway](https://aws.amazon.com/api-gateway/)
* [AWS Lambda](https://aws.amazon.com/lambda/)
* [AWS CodeCommit](https://aws.amazon.com/codecommit/)

## Overview

Next, we will show you how to deeply inspect and analyze request behavior on new functionality for the Mythical Mysfits site, using [**AWS X-Ray**](https://aws.amazon.com/xray/).  The new functionality will enable users to contact the Mythical Mysfits staff, via a **Contact Us** button we'll place on the site.  Much of the steps required to create a new microservice to handle receiving user questions mimics activities you've performed earlier in this workshop.

The resources we'll create includes:

* An **API Gateway API**:  A new microservice will be created that has a single REST resource, `/questions`.  This API will receive the text of a user question and the email address for the user who submitted it.
* A **DynamoDB Table**: A new DynamoDB table where the user questions will be stored and persisted.  This DynamoDB table will be created with a [**DynamoDB Stream**](https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/Streams.html) enabled.  The stream will provide a real-time event stream for all of the new questions that are stored within the database so that they can be immediately processed.
* An **AWS SNS Topic**: AWS SNS allows applications to publish messages and to subscribe to message topics.  We will use a new topic as a way to send notifications to a subscribed email address for a email address.
* Two **AWS Lambda Functions**: One AWS Lambda function will be used as the service backend for the question API requests. The other AWS Lambda function will receive events from the questions DynamoDB table and publish a message for each of them to the above SNS topic.  When definining these resources, you'll use a Property that indicates `Tracing: Active`.  This means that all invocations of the Lambda function will automatically be traced by **AWS X-Ray**.
* **IAM Roles** required for each of the above resources and actions.

### Create a new CodeCommit Repository

Let's start off by switching once again to our Workshop's CDK folder, and opening it in our editor:

```sh
cd ~/Workshop/cdk
```

```sh
code .
```

To create the necessary resources using the AWS CDK, create a new file in the `workshop/cdk/lib` folder called `xray-stack.ts`.

```sh
cd ~/workshop/cdk
touch lib/xray-stack.ts
```

Within the file you just created, define the skeleton CDK Stack structure as we have done before, this time naming the class `XRayStack`:

```typescript
import cdk = require('@aws-cdk/core');
export class XRayStack extends cdk.Stack {
  constructor(scope: cdk.Construct, id:string) {
    super(scope, id);
    // The code that defines your stack goes here
  }
}
```

The AWS CDK npm package for Lambda already includes support for X-Ray tracing. We do need to install the AWS CDK npm packages for SNS and Lambda:

```sh
npm install --save-dev @aws-cdk/aws-sns @aws-cdk/aws-sns-subscriptions @aws-cdk/aws-lambda-event-sources
```

Define the class imports for the code we will be writing:

```typescript
import cdk = require('@aws-cdk/core');
import codecommit = require("@aws-cdk/aws-codecommit");
import apigw = require("@aws-cdk/aws-apigateway");
import iam = require("@aws-cdk/aws-iam");
import dynamodb = require("@aws-cdk/aws-dynamodb");
import { ServicePrincipal } from "@aws-cdk/aws-iam";
import lambda = require("@aws-cdk/aws-lambda");
import event = require("@aws-cdk/aws-lambda-event-sources");
import sns = require('@aws-cdk/aws-sns');
import subs = require('@aws-cdk/aws-sns-subscriptions');
```

Then, add the `XRayStack` to our CDK application definition in `bin/cdk.ts`, when done, your `bin/cdk.ts` file should look like this:

```typescript
#!/usr/bin/env node

import cdk = require('@aws-cdk/core');
import 'source-map-support/register';
import { DynamoDbStack } from '../lib/dynamodb-stack';
import { NetworkStack } from '../lib/network-stack';
import { WebApplicationStack } from '../lib/web-application-stack';
import { DeveloperToolsStack } from "../lib/developer-tools-stack";
import { APIGatewayStack } from "../lib/api-gateway-stack";
import { EcrStack } from "../lib/ecr-stack";
import { EcsStack } from "../lib/ecs-stack";
import { KinesisFirehoseStack } from "../lib/kinesis-firehose-stack";
import { CiCdStack } from "../lib/cicd-stack";
import { CognitoStack } from '../lib/cognito-stack';
import { XRayStack } from '../lib/xray-stack';

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
    apiRepositoryArn: developerToolStack.apiRepository.repositoryArn
});
const dynamoDBStack = new DynamoDbStack(app, "MythicalMysfits-DynamoDB", {
    vpc: networkStack.vpc,
    fargateService: ecsStack.ecsService
});
const cognito = new CognitoStack(app, "MythicalMysfits-Cognito");
const apiGateway = new APIGatewayStack(app, "MythicalMysfits-APIGateway", {
    userPoolId: cognito.userPool.userPoolId,
    loadBalancerArn: ecsStack.ecsService.loadBalancer.loadBalancerArn,
    loadBalancerDnsName: ecsStack.ecsService.loadBalancer.loadBalancerDnsName
});
new KinesisFirehoseStack(app, "MythicalMysfits-KinesisFirehose", {
    table: dynamoDBStack.table,
    apiId: apiGateway.apiId
});
new XRayStack(app, "MythicalMysfits-XRay");
app.synth();
```

### Copy the Questions Service Code Base

Now, let's move our working directory into the workshop lambda folder:

```sh
cd ~/Workshop/lambda/
```

Then, copy the module-6 lambda components into the repository directory:

```sh
cp -r ~/Workshop/source/module-6/lambda/* .
```

For these new microservices, we have included all of the packages necessary for the AWS Lambda functions to be deployed and invoked.

Restore the resources required by the lambda function and build the function so that it is ready for deployment.

```sh
cd ~/Workshop/lambda/PostQuestionsService
```

```sh
dotnet restore
```

```sh
dotnet publish
```

```sh
cd ~/Workshop/lambda/ProcessQuestionsStream
```

```sh
dotnet restore
```

```sh
dotnet publish
```

### Creating the Questions Service Stack

Change back into the `cdk` folder:

```sh
cd ~/Workshop/cdk
```

Back in the `XRayStack` file,  we will now define the Questions microservice infrastructure:

```typescript
const table = new dynamodb.Table(this, "Table", {
  tableName: "MysfitsQuestionsTable",
  partitionKey: {
    name: "QuestionId",
    type: dynamodb.AttributeType.STRING
  },
  stream: dynamodb.StreamViewType.NEW_IMAGE
});

const postQuestionLambdaFunctionPolicyStmDDB =  new iam.PolicyStatement();
postQuestionLambdaFunctionPolicyStmDDB.addActions("dynamodb:PutItem");
postQuestionLambdaFunctionPolicyStmDDB.addResources(table.tableArn);

const LambdaFunctionPolicyStmXRay =  new iam.PolicyStatement();
LambdaFunctionPolicyStmXRay.addActions(
      //  Allows the Lambda function to interact with X-Ray
      "xray:PutTraceSegments",
      "xray:PutTelemetryRecords",
      "xray:GetSamplingRules",
      "xray:GetSamplingTargets",
      "xray:GetSamplingStatisticSummaries"
    );
LambdaFunctionPolicyStmXRay.addAllResources();

const functionServiceRole = iam.Role.fromRoleArn(this, 'functionServiceRole', props.functionServiceRoleArn);
const mysfitsPostQuestion = new lambda.Function(this, "PostQuestionFunction", {
  handler: "PostQuestionsService::PostQuestionsService.Function::FunctionHandlerAsync",
  runtime: lambda.Runtime.DOTNET_CORE_2_1,
  description: "A microservice Lambda function that receives a new question submitted to the MythicalMysfits" +
    " website from a user and inserts it into a DynamoDB database table.",
  memorySize: 128,
  code: lambda.Code.asset("../lambda/PostQuestionsService/bin/Debug/netcoreapp2.1/Publish"),
  timeout: cdk.Duration.seconds(30),
  initialPolicy: [
    postQuestionLambdaFunctionPolicyStmDDB,
    LambdaFunctionPolicyStmXRay
  ],
  tracing: lambda.Tracing.ACTIVE
});

const topic = new sns.Topic(this, 'Topic', {
    displayName: 'MythicalMysfitsQuestionsTopic',
    topicName: 'MythicalMysfitsQuestionsTopic'
});
topic.addSubscription(new subs.EmailSubscription("REPLACE@EMAIL_ADDRESS"));

const postQuestionLambdaFunctionPolicyStmSNS =  new iam.PolicyStatement();
postQuestionLambdaFunctionPolicyStmSNS.addActions("sns:Publish");
postQuestionLambdaFunctionPolicyStmSNS.addResources(topic.topicArn);

new lambda.Function(this, "ProcessQuestionStreamFunction", {
  handler: "ProcessQuestionsStream::ProcessQuestionsStream.Function::FunctionHandlerAsync",
  runtime: lambda.Runtime.DOTNET_CORE_2_1,
  description: "An AWS Lambda function that will process all new questions posted to mythical mysfits" +
    " and notify the site administrator of the question that was asked.",
  memorySize: 128,
  code: lambda.Code.asset("../lambda/ProcessQuestionsStream/bin/Debug/netcoreapp2.1/Publish"),
  timeout: cdk.Duration.seconds(30),
  initialPolicy: [
    postQuestionLambdaFunctionPolicyStmSNS,
    LambdaFunctionPolicyStmXRay
  ],
  tracing: lambda.Tracing.ACTIVE,
  environment: {
    SNS_TOPIC_ARN: topic.topicArn
  },
  events: [
    new event.DynamoEventSource(table, {
      startingPosition: lambda.StartingPosition.TRIM_HORIZON,
      batchSize: 1
    })
  ]
});

const questionsApiRole = new iam.Role(this, "QuestionsApiRole", {
  assumedBy: new ServicePrincipal("apigateway.amazonaws.com")
});

const apiPolicy = new iam.PolicyStatement();
apiPolicy.addActions("lambda:InvokeFunction");
apiPolicy.addResources(mysfitsPostQuestion.functionArn);
new iam.Policy(this, "QuestionsApiPolicy", {
  policyName: "questions_api_policy",
  statements: [
    apiPolicy
  ],
  roles: [questionsApiRole]
});

const questionsIntegration = new apigw.LambdaIntegration(
  mysfitsPostQuestion,
  {
    credentialsRole: questionsApiRole,
    integrationResponses: [
      {
        statusCode: "200",
        responseTemplates: {
          "application/json": '{"status":"OK"}'
        }
      }
    ]
  }
);

const api = new apigw.LambdaRestApi(this, "APIEndpoint", {
  handler: mysfitsPostQuestion,
  options: {
    restApiName: "Questions API Service"
  },
  proxy: false
});

const questionsMethod = api.root.addResource("questions");
questionsMethod.addMethod("POST", questionsIntegration, {
  methodResponses: [{
    statusCode: "200"
  }],
  authorizationType: apigw.AuthorizationType.NONE
});

questionsMethod.addMethod('OPTIONS', new apigw.MockIntegration({
  integrationResponses: [{
    statusCode: '200',
    responseParameters: {
      'method.response.header.Access-Control-Allow-Headers': "'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token,X-Amz-User-Agent'",
      'method.response.header.Access-Control-Allow-Origin': "'*'",
      'method.response.header.Access-Control-Allow-Credentials': "'false'",
      'method.response.header.Access-Control-Allow-Methods': "'OPTIONS,GET,PUT,POST,DELETE'",
    },
  }],
  passthroughBehavior: apigw.PassthroughBehavior.NEVER,
  requestTemplates: {
    "application/json": "{\"statusCode\": 200}"
  },
}), {
  methodResponses: [{
    statusCode: '200',
    responseParameters: {
      'method.response.header.Access-Control-Allow-Headers': true,
      'method.response.header.Access-Control-Allow-Methods': true,
      'method.response.header.Access-Control-Allow-Credentials': true,
      'method.response.header.Access-Control-Allow-Origin': true,
    },  
  }]
});
```

> **Note:** Make sure to replace "REPLACE@EMAIL_ADDRESS" in the code above with a valid email address you have access to. This will be the email address that user questions are published to by the SNS topic.

Finally, deploy the CDK Application:

```sh
cdk deploy MythicalMysfits-XRay
```

Note down the API Gateway endpoint, as we will need it in the next step.

Next, visit the email address provided and CONFIRM your subscription to the SNS topic:
![SNS Confirm](/images/module-6/confirm-sns.png)

### Update the Website Content and Push the New Site to S3

With the questions stack up and running, we now need to publish a new version of our Mythical Mysfits frontend.

The new index.html file is included at: `~/workshop/source/module-6/frontend/index.html`. Copy the new version of the website to the `workshop/frontend` directory:

```sh
cp -r ~/workshop/source/module-6/frontend/* ~/workshop/frontend
```

This file contains the same placeholders as module-5 that need to be updated, as well as an additional placeholder for the new questions service endpoint you just created. The `questionsApiEndpoint` value is the API Gateway endpoint you noted down earlier.

Now, let's update your S3 hosted website and deploy the `MythicalMysfits-Website` stack:

```sh
npm run build
cdk deploy MythicalMysfits-Website
```

Now that the new Contact Us functionality is deployed, visit the website and submit a question or two.  If you've confirmed the subscription to SNS in the step above, you'll start to see those questions arrive in your inbox! When you've seen that email arrive, you can move on to explore and analyze the request lifecycle.

### Explore the Questions Services Traces and Requests

Now, to start seeing the request behavior for this microservice, visit the AWS X-Ray console to explore:

[AWS X-Ray Console](https://console.aws.amazon.com/xray/home)

Upon visiting the X-Ray Console you'll be immediately viewing a **service map**, which shows the dependency relationship between all the components that X-Ray receives **trace segments** for:  

![X-Ray Lambda Only](/images/module-6/lambda-only-x-ray.png)

At first, this service map only includes our AWS Lambda functions.  Feel free to explore the X-Ray console to learn more about drilling into the data automatically made visible just by listing the `Tracing: Active` property in the resources you deployed.

### Instrument Additional AWS Services with AWS X-Ray

Next, we're going to instrument more of the microservice stack so that all of the service dependencies are included in the service map and recorded trace segments.

First, we will instrument the API Gateway REST API. In the `XRayStack`, modify the API Gateway resource to enable tracing:

```typescript
const api = new apigw.LambdaRestApi(this, "APIEndpoint", {
  handler: mysfitsPostQuestion,
  options: {
    restApiName: "Questions API Service",
    deployOptions: {
      tracingEnabled: true
    }
  },
  proxy: false
});
```

Then, re-deploy the CDK stack:

```sh
npm run build
cdk deploy MythicalMysfits-XRay
```

Now, submit another question to the Mythical Mysfits website and you'll see that the REST API is also included in the service map!

![API Gateway Traced](/images/module-6/api-x-ray.png)

Congratulations, you've completed module 6!

<!-- ### [Proceed to Module 7](/module-7) -->

#### [AWS Developer Center](https://developer.aws)