# Module 7: Using Machine Learning to Recommend a Mysfit

![Architecture](/images/module-7/sagemaker-architecture.png)

**Time to complete:** 45 minutes

---
**Short of time?:** If you are short of time, refer to the completed reference AWS CDK code in `module-7/cdk`

---

**Services used:**
* [Amazon SageMaker](https://aws.amazon.com/sagemaker/)
* [AWS CloudFormation](https://aws.amazon.com/cloudformation/)
* [Amazon S3](https://aws.amazon.com/s3/)
* [Amazon API Gateway](https://aws.amazon.com/api-gateway/)
* [AWS Lambda](https://aws.amazon.com/lambda/)
* [AWS CodeCommit](https://aws.amazon.com/codecommit/)

## Overview
One of the fastest growing areas of technology is machine learning.  As the cost to leverage high performance computing environments has continued to decrease, the number of use cases where Machine Learning algorithms can be economically applied has grown astronomically.  We can even use machine learning to help the visitors of MythicalMysfits.com discover which Mysfit is perfect for them.  And that's just what you will do in this module.  

With Amazon SageMaker, a fully managed machine learning service, you are going to introduce a new machine learning based recommendation engine on the Mythical Mysfits site.  This will enable site visitors to provide us with details about themselves, and we will use that information to invoke a machine learning model and predict which Mysfit would best suit them. Amazon SageMaker will give you the tools needed to:
* Prepare data for model training (using sample data we've created and made available in S3)
* Train a machine learning model using one of the many already-implemented machine learning algorithms that SageMaker provides, and evaluate the model's accuracy.
* Store and Deploy the created model so that it can be invoked at-scale to provide inferences to your application (the Mythical Mysfits website).

## Building a Machine Learning Model

#### The Importance of Data
A prerequisite to beginning any machine learning journey is gathering data.  The data used will define your algorithm's understanding of the use case its being asked to play a role in, and its ability to make accurate predictions/inferences. If you introduce machine learning into your application using insufficient, irrelevant, or inaccurate data, you risk bringing more harm than benefit to your application.

However, for our Mysfits site, we obviously do not have vast quantities of accurate and historical adoption data to make mysfit recommendations.  So instead, we generated loads of data randomly. This means the model that you'll build will be making predictions based on randomized data, and its "accuracy" will suffer because the data was randomly generated. This data set will still allow you to become familiar with *how* to use SageMaker in a real application... but we will be glossing over all the critical steps required in the real world to identify, gather, and curate an appropriate data set to be used with machine learning successfully.

### Creating a Hosted Notebook instance with SageMaker
Data Scientists and developers that want to curate data, define and run algorithms, build models, and more, all while thoroughly documenting their work can do so in a single place called a **notebook**.  Through AWS SageMaker, you can create an EC2 instance that is preconfigured and optimized for Machine Learning and already has the [Jupyter Notebooks](http://jupyter.org/) application running on it, this is called a **notebook instance**.  In order to create a notebook instance, we must first create some prerequisites that the notebook requires, namely an IAM Role that will give the notebook instance the permissions it needs to perform everything required.

To create the necessary resources using the AWS CDK, create a new file in the `workshop/cdk/lib` folder called `sagemaker-stack.ts`.

```sh
cd ~/environment/workshop/cdk
touch lib/sagemaker-stack.ts
```

Within the file you just created, define the skeleton CDK Stack structure as we have done before, this time naming the class `SageMakerStack`:

```typescript
import cdk = require('@aws-cdk/core');

export class SageMakerStack extends cdk.Stack {
  constructor(scope: cdk.Construct, id:string) {
    super(scope, id);
    // The code that defines your stack goes here
  }
}
```

Next, we need to install the AWS CDK npm packages for SageMaker:

```sh
npm install --save-dev @aws-cdk/aws-sagemaker
```

Define the class imports for the code we will be writing:

```typescript
import cdk = require('@aws-cdk/core');
import iam = require("@aws-cdk/aws-iam");
import { ServicePrincipal } from "@aws-cdk/aws-iam";
import sagemaker = require("@aws-cdk/aws-sagemaker");
import codecommit = require("@aws-cdk/aws-codecommit");
import apigw = require("@aws-cdk/aws-apigateway");
import lambda = require("@aws-cdk/aws-lambda");
```

Within the `SageMakerStack` constructor, add the IAM Role and Notebook instance, as well as the CodeCommit repository we'll use later:

```typescript
const mysfitsNotebookRole = new iam.Role(this, "MysfitsNotbookRole", {
  assumedBy: new ServicePrincipal("sagemaker.amazonaws.com")
});

const mysfitsNotebookPolicy = new iam.PolicyStatement();
mysfitsNotebookPolicy.addActions('sagemaker:*',
        'ecr:GetAuthorizationToken',
        'ecr:GetDownloadUrlForLayer',
        'ecr:BatchGetImage',
        'ecr:BatchCheckLayerAvailability',
        'cloudwatch:PutMetricData',
        'logs:CreateLogGroup',
        'logs:CreateLogStream',
        'logs:DescribeLogStreams',
        'logs:PutLogEvents',
        'logs:GetLogEvents',
        's3:CreateBucket',
        's3:ListBucket',
        's3:GetBucketLocation',
        's3:GetObject',
        's3:PutObject',
        's3:DeleteObject');
mysfitsNotebookPolicy.addAllResources();

const mysfitsNotebookPassRolePolicy = new iam.PolicyStatement();
mysfitsNotebookPassRolePolicy.addActions('iam:PassRole');
mysfitsNotebookPassRolePolicy.addAllResources();
mysfitsNotebookPassRolePolicy.addCondition('StringEquals', {
      'iam:PassedToService': 'sagemaker.amazonaws.com',
});

new iam.Policy(this, "MysfitsNotebookPolicy", {
  policyName: "mysfits_notebook_policy",
  statements: [
    mysfitsNotebookPolicy,
    mysfitsNotebookPassRolePolicy
  ],
  roles: [mysfitsNotebookRole]
});

const notebookInstance = new sagemaker.CfnNotebookInstance(this, "MythicalMysfits-SageMaker-Notebook", {
    instanceType: "ml.t2.medium",
    roleArn: mysfitsNotebookRole.roleArn
});

const lambdaRepository = new codecommit.Repository(this, "RecommendationsLambdaRepository", {
  repositoryName: "MythicalMysfits-RecommendationsLambdaRepository"
});

new cdk.CfnOutput(this, "recommendationsRepositoryCloneUrlHttp", {
  value: lambdaRepository.repositoryCloneUrlHttp,
  description: "Recommendations Lambda Repository Clone Url HTTP"
});

new cdk.CfnOutput(this, "recommendationsRepositoryCloneUrlSsh", {
  value: lambdaRepository.repositoryCloneUrlSsh,
  description: "Recommendations Lambda Repository Clone Url SSH"
});
```

Then, add the `SageMakerStack` to our CDK application definition in `bin/cdk.ts`, when done, your `bin/cdk.ts` file should look like this:

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
import { XRayStack } from "../lib/xray-stack";
import { SageMakerStack } from "../lib/sagemaker-stack";

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
new XRayStack(app, "MythicalMysfits-XRay");
new SageMakerStack(app, "MythicalMysfits-SageMaker");
```

We are not yet finished writing the `SageMakerStack` implementation but let's deploy what we have written so far:

```sh
cdk deploy MythicalMysfits-SageMaker
```

> **Note:** It will take about 10 minutes for your notebook instance to move from `Pending` state to `InService`. You may proceed on to the next steps while the notebook is being provisioned.

In the output of that command, copy the value for `"Repository Clone Url HTTP"`.  It should be of the form: `https://git-codecommit.REPLACE_ME_REGION.amazonaws.com/v1/repos/MythicalMysfits-RecommendationsLambdaRepository`. Note down this value, we'll use in the next step.

Finally, there is a file in your cloned repository that will be used in the next steps that you should download.  In the File Explorer in Cloud9, find `~environment/workshop/source/module-7/sagemaker/mysfit_recommendations_knn.ipynb`, right-click it, and select Download.  Save this file to your local workstation and remember where it has been saved.

### Using Amazon SageMaker

Next, open up a new browser tab and visit the SageMaker console (be sure the region selected at the top-right of your AWS Management Console matches the region you're building within):
[Amazon SageMaker Console](https://console.aws.amazon.com/sagemaker/home)

Then, click on **Notebook Instances.**

Click the radio button next to the **MythicalMysfits-SageMaker-Notebook** instance that you just created via the CLI, and click **Open Jupyter.**  This will redirect you to the Jupyter Notebook application running on your notebook instance.  

![SageMaker Notebook Instances](/images/module-7/sagemaker-notebook-instances.png)

> **Note**: that for this workshop, we have created the notebook instance to allow you access it directly via the Internet, running in a service-managed VPC.  For more details about accessing a notebook instance through a VPC Interface Endpoint, should you desire to for a future use case, visit [this documentation page.](https://docs.aws.amazon.com/sagemaker/latest/dg/notebook-interface-endpoint.html).

With Jupyter open, you will be presented with the following home page for your notebook instance:
![Jupyter Home](/images/module-7/jupyter-home.png)

Click the **Upload** button, and then find the file you downloaded in the previous section `mysfit_recommendations_knn.ipynb`, then click **Upload** on the file line. This will create a new Notebook document on the notebook instance within Jupyter that uses the notebook file you've just uploaded.

We have pre-written the notebook required that will guide you through the code required to build a model.

#### Using the Hosted Notebook to Build, Train, and Deploy a Model
Click on the filename within the Jupyter application, for the file you've just uploaded, and you a new browser tab will be opened for you to work within the notebook document.

# STOP!
Follow the instructions within the notebook document in order to deploy a SageMaker endpoint for predicting the best Mythical Mysfit for a user based on their quesitonnaire responses.

Once you have completed the steps within the notebook, return here to proceed with the workshop.

## Creating a Serverless REST API for Model Predictions
Now that you have a deployed SageMaker endpoint, let's wrap our own Mythical Mysfits serverless REST API around the endpoint. This allows us to define the API exactly to our specifications, and for our frontend application code to continue integrating with APIs that we ourselves define rather than the native AWS service API.  We'll build the microservice to be serverless using API Gateway and AWS Lambda.

We have already created another new CodeCommit repository for where your recommendations service code could be committed. To clone the new repository to your Cloud9 environment use the `cloneUrlHttp` attribute you noted earlier, e.g. `https://git-codecommit.REPLACE_ME_REGION.amazonaws.com/v1/repos/MythicalMysfits-RecommendationsLambdaRepository`.

Next, let's clone that new and empty repository:

```sh
cd ~/environment/
git clone REPLACE_ME_WITH_ABOVE_CLONE_URL lambda-recommendations
```

### Copy the Questions Service Code Base

Now, let's move our working directory into this new repository:
```
cd ~/environment/lambda-recommendations/
```

Then, copy the module-7 application components into this new repository directory:
```
cp -r ~/environment/workshop/source/module-7/app/* .
```

There is one code change that you must make to the service Python code before we
can deploy the API.  Open `~/environment/lambda-recommendations/service/recommendation.py` in Cloud9.  You will see a single entry that needs replacing: `REPLACE_ME_SAGEMAKER_ENDPOINT`

To retrieve the value required, run the following CLI command to describe your SageMaker endpoints:

```
aws sagemaker list-endpoints > ~/environment/sagemaker-endpoints.json
```

Open `sagemaker-endpoints.json` and copy the EndpointName value that is prefixed with `knn-ml-m4-xlarge-` (this is what we prefixed our endpoint name with inside the Jupyter notebook).

Paste the EndpointValue name in the `recommendation.py` file and save the file.

### Creating the Questions Service Stack

Change back into the `cdk` folder:

```sh
cd ~/environment/workshop/cdk
```

Back in the `SageMakerStack` file, we will now define the Recommendations microservice infrastructure:

```typescript
const recommandationsLambdaFunctionPolicyStm =  new iam.PolicyStatement();
recommandationsLambdaFunctionPolicyStm.addActions("sagemaker:InvokeEndpoint");
recommandationsLambdaFunctionPolicyStm.addAllResources();

const mysfitsRecommendations = new lambda.Function(this, "Function", {
  handler: "recommendations.recommend",
  runtime: lambda.Runtime.PYTHON_3_6,
  description: "A microservice backend to invoke a SageMaker endpoint.",
  memorySize: 128,
  code: lambda.Code.asset("../../lambda-recommendations/service"),
  timeout: cdk.Duration.seconds(30),
  initialPolicy: [
    recommandationsLambdaFunctionPolicyStm
  ]
});

const questionsApiRole = new iam.Role(this, "QuestionsApiRole", {
  assumedBy: new ServicePrincipal("apigateway.amazonaws.com")
});

const apiPolicy = new iam.PolicyStatement();
apiPolicy.addActions("lambda:InvokeFunction");
apiPolicy.addResources(mysfitsRecommendations.functionArn);
new iam.Policy(this, "QuestionsApiPolicy", {
  policyName: "questions_api_policy",
  statements: [
    apiPolicy
  ],
  roles: [questionsApiRole]
});

const questionsIntegration = new apigw.LambdaIntegration(
  mysfitsRecommendations,
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
  handler: mysfitsRecommendations,
  options: {
    restApiName: "Recommendation API Service"
  },
  proxy: false
});

const recommendationsMethod = api.root.addResource("recommendations");
recommendationsMethod.addMethod("POST", questionsIntegration, {
  methodResponses: [{
    statusCode: "200",
    responseParameters: {
      'method.response.header.Access-Control-Allow-Headers': true,
      'method.response.header.Access-Control-Allow-Methods': true,
      'method.response.header.Access-Control-Allow-Origin': true,
    }
  }],
  authorizationType: apigw.AuthorizationType.NONE
});

recommendationsMethod.addMethod('OPTIONS', new apigw.MockIntegration({
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

Finally, deploy the CDK Application:

```sh
cdk deploy MythicalMysfits-SageMaker
```

When this command completes, you have deployed the REST API microservice wrapper for the SageMaker endpoint you created through the Jupyter notebook. Note down the Recommendations API Gateway endpoint, as we will need it next.

Let's test the new service with the following CLI command that uses curl (a Linux tool for making web requests). This will show you the recommendations in action for a new data point matching the CSV lines we used for training data. You'll use the API Gateway endpoint value you noted down above to invoke your own REST API, be sure to append /recommendations after the endpoint, as shown below:

```
curl -d '{"entry": [1,2,3,4,5]}' REPLACE_ME_RECOMMENDATION_API_ENDPOINT/recommendations -X POST
```

You should get a response like the following:
```
{"recommendedMysfit": "c0684344-1eb7-40e7-b334-06d25ac9268c"}
```

You're now ready to integrate this new backend functionality into the Mythical Mysfits website.

### Update the Website Content and Push the New Site to S3

A new `index.html` file has been included in Module 7 that contain the code required to present users with the Mysfit Recommendation questionnaire and present them with their recommended Mysfit.

![Recommendation Button SS](/images/module-7/recommendation-button-ss.png)

Copy the new version of the website to the `workshop/web` directory:

```sh
cp -r ~/environment/workshop/source/module-7/web/* ~/environment/workshop/web
```

This file contains the same placeholders as module-6 that need to be updated, as well as an additional placeholder for the new recommendations service endpoint you just created. The `recommendationsApiEndpoint` value is the API Gateway endpoint you noted down earlier.

Now, let's update your S3 hosted website and deploy the `MythicalMysfits-Website` stack:

```sh
npm run build
cdk deploy MythicalMysfits-Website
```

Now you should be able to see a new **Recommend a Mysfit** button on the website, which will present you with the questionnaire, capture your selections, and submit those selections to our recommendations microservice.

Congratulations, you've completed module 7!


### Workshop Clean-Up

#### Module 7 Clean-Up:
We have added code to the SageMaker notebook for deleting the deployed endpoint. If you return to the notebook and proceed to the next code cells, you can execute them to bring down the endpoint to stop paying for it.

#### General Workshop Clean-Up
Be sure to delete all of the resources created during the workshop in order to ensure that billing for the resources does not continue for longer than you intend. We recommend that you utilize the AWS Console to explore the resources you've created and delete them when you're ready.

For the two cases where you provisioned resources using AWS CloudFormation, you can remove those resources by simply running the following CLI command for each stack:

```
cdk destroy
```

To remove all of the created resources, you can visit the following AWS Consoles, which contain resources you've created during the Mythical Mysfits workshop:
* [Amazon SageMaker](https://console.aws.amazon.com/sagemaker/home)
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

# Conclusion

This experience was meant to give you a taste of what it's like to be a developer designing and building modern application architectures on top of AWS.  Developers on AWS are able to programmatically provision resources using the AWS CLI, reuse infrastructure definitions via AWS CloudFormation, automatically build and deploy code changes using the AWS developer tool suite of Code services, and take advantage of multiple different compute and application service capabilities that do not require you to provision or manage any servers at all!

As a great next step, to learn more about the inner workings of the Mythical Mysfits website that you've created, dive into the provided CloudFormation templates and the resources declared within them.

We hope you have enjoyed the AWS Modern Application Workshop!  If you find any issues or have feedback/questions, don't hesitate to open an issue.

Thank you!


## [AWS Developer Center](https://developer.aws)
