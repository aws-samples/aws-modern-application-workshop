# Module 4: Adding User and API features with Amazon API Gateway and AWS Cognito

![Architecture](/images/module-4/architecture-module-4.png)

**Time to complete:** 60 minutes

---
**Short of time?:** If you are short of time, refer to the completed reference AWS CDK code in `module-4/cdk`

---

**Services used:**
* [Amazon Cognito](http://aws.amazon.com/cognito/)
* [Amazon API Gateway](https://aws.amazon.com/api-gateway/)
* [Amazon Simple Storage Service (S3)](https://aws.amazon.com/s3/)

### Overview

In order to add some more critical aspects to the Mythical Mysfits website, like allowing users to vote for their favorite Mysfit and adopt a Mysfit, we need to first have users register on the website.  To enable registration and authentication of website users, we will create a [**User Pool**](https://docs.aws.amazon.com/cognito/latest/developerguide/cognito-user-identity-pools.html) in [**AWS Cognito**](http://aws.amazon.com/cognito/), a fully managed user identity management service.

We want to restrict liking and adopting Mysfits to registered users, so we'll need to restrict access to those paths in our Flask web app running on Fargate. Our Fargate service is currently using a Network Load Balancer (NLB), which doesn't support validating request authorization headers. To achieve this we have a few options: we can switch to an [Application Load Balancer](https://docs.aws.amazon.com/elasticloadbalancing/latest/application/introduction.html), we can have our Flask web app validate our authorization headers, or we can use [Amazon API Gateway](https://aws.amazon.com/api-gateway/).

Amazon API Gateway provides commonly required REST API capabilities out of the box like SSL termination, CORS, request authorization, throttling, API stages and versioning, and much more. For these reasons, we'll choose to deploy an API Gateway in front of our NLB.

Our API Gateway will provide HTTPS and CORS support, and also request authorization validation by integrating with our Cognito User Pool. We'll restrict access to authenicated users only on the `/adopt` and `/like` API endpoints

API Gateway will then pass traffic through to our NLB to be processed by our Flask web app running on Fargate.

### Adding a User Pool for Website Users

#### Create the Cognito User Pool

To create the **Cognito User Pool** where all of the Mythical Mysfits visitors will be stored, execute the following CLI command to create a user pool named *MysfitsUserPool* and indicate that all users who are registered with this pool should automatically have their email address verified via confirmation email before they become confirmed users.

```
aws cognito-idp create-user-pool --pool-name MysfitsUserPool --auto-verified-attributes email
```

Copy the response from the above command, e.g.: `Id: us-east-1_ab12345YZ`. This is the unique ID for your user pool and you will need this in later steps.

#### Create a Cognito User Pool Client

Next, in order to integrate our frontend website with Cognito, we must create a new **User Pool Client** for this user pool. This generates a unique client identifier that will allow our website to be authorized to call the unauthenticated APIs in cognito where website users can sign-in and register against the Mythical Mysfits user pool.  To create a new client using the AWS CLI for the above user pool, run the following command (replacing the `--user-pool-id` value with the one you copied above):

```
aws cognito-idp create-user-pool-client --user-pool-id REPLACE_ME --client-name MysfitsUserPoolClient
```

Copy the response from the above command, e.g.: `"ClientId": "6p3bs000no6a4ue1idruvd05ad"`. This is the unique ID for your user pool client and you will need this in later steps.

### Adding a new REST API with Amazon API Gateway

#### Create an API Gateway VPC Link
Next, let's turn our attention to creating a new RESTful API in front of our existing Flask service, so that we can perform request authorization before our NLB receives any requests.  We will do this with **Amazon API Gateway**, as described in the module overview.  In order for API Gateway to privately integrate with our NLB, we will configure an **API Gateway VPCLink** that enables API Gateway APIs to directly integrate with backend web services that are privately hosted inside a VPC.

> **Note:** For the purposes of this workshop, we created the NLB to be *internet-facing* so that it could be called directly in earlier modules. Because of this, even though we will be requiring Authorization tokens in our API after this module, our NLB will still actually be open to the public behind the API Gateway API.  In a real-world scenario, you should create your NLB to be *internal* from the beginning (or create a new internal load balancer to replace the existing one), knowing that API Gateway would be your strategy for Internet-facing API authorization. But for the sake of time, we'll use the NLB that we've already created that will stay publicly accessible.

The VPC Link will be created as part of our Module 4 CDK application.

#### Create the REST API using Swagger

Your MythicalMysfits REST API is defined using **Swagger**, a popular open-source framework for describing APIs via JSON.  This Swagger definition of the API is located at `workshop/source/module-4/api/api-swagger.json`.  Open this file and you'll see the REST API and all of its resources, methods, and configuration defined within.

The `securityDefinitions` object within the API definition indicates that we have setup an apiKey authorization mechanism using the Authorization header.  You will notice that AWS has provided custom extensions to Swagger using the prefix `x-amazon-api-gateway-`, these extensions are where API Gateway specific functionality can be added to typical Swagger files to take advantage of API Gateway-specific capabilities.

To create the VPCLink and the API Gateway using the AWS CDK, create a new file in the `workshop/cdk/lib` folder called `apigateway-stack.ts`.

```sh
cd ~/environment/workshop/cdk
touch lib/apigateway-stack.ts
```

Within the file you just created, define the skeleton CDK Stack structure as we have done before, this time naming the class `APIGatewayStack`:

```typescript
import cdk = require('@aws-cdk/core');

export class APIGatewayStack extends cdk.Stack {
  constructor(scope: cdk.Construct, id:string) {
    super(scope, id);

    // The code that defines your stack goes here
  }
}
```

Then, add the APIGatewayStack to our CDK application definition in `bin/cdk.ts`, when done, your `bin/cdk.ts` should look like this;

```typescript
#!/usr/bin/env node

import cdk = require("@aws-cdk/core");
import 'source-map-support/register';
import { WebApplicationStack } from "../lib/web-application-stack";
import { NetworkStack } from "../lib/network-stack";
import { EcrStack } from "../lib/ecr-stack";
import { EcsStack } from "../lib/ecs-stack";
import { CiCdStack } from "../lib/cicd-stack";
import { DynamoDbStack } from '../lib/dynamodb-stack';
import { APIGatewayStack } from "../lib/apigateway-stack";

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
    fargateService: ecsStack.ecsService.service
});
new APIGatewayStack(app, "MythicalMysfits-APIGateway", {
  vpc: networkStack.vpc,
  fargateService: ecsStack.ecsService.service
});
```

Install the AWS CDK npm package for API Gateway by executing the following command from within the `workshop/cdk/` directory:

```sh
npm install --save-dev @aws-cdk/aws-apigateway
```

Back in `APIGatewayStack.ts`, define the class imports for the code we will be writing:

```typescript
import cdk = require('@aws-cdk/core');
import apigateway = require('@aws-cdk/aws-apigateway');
import elbv2 = require('@aws-cdk/aws-elasticloadbalancingv2');
import ecspatterns = require('@aws-cdk/aws-ecs-patterns');
import fs = require('fs');
import path = require('path');
```

Next, define the Stack Properties class which details the dependencies our API Gateway implementation has upon other stacks.

```typescript
interface APIGatewayStackProps extends cdk.StackProps {
  fargateService: ecspatterns.NetworkLoadBalancedFargateService;
}
```

Now change the constructor of your APIGatewayStack to require your properties object.

```typescript
  constructor(scope: cdk.Construct, id: string, props: APIGatewayStackProps) {
```

Now, within the constructor of our `APIGatewayStack` class, let's import the Network Load Balancer from the ECS Cluster created in Module 2:

```typescript
const nlb = elbv2.NetworkLoadBalancer.fromNetworkLoadBalancerAttributes(this, 'NLB', {
  loadBalancerArn: props.fargateService.loadBalancer.loadBalancerArn,
});
```

We then define a VPCLink for our API Gateway, attaching the NLB as the VPCLink target:

```typescript
const vpcLink = new apigateway.VpcLink(this, 'VPCLink', {
  description: 'VPCLink for our  REST API',
  vpcLinkName: 'MysfitsApiVpcLink',
  targets: [
    nlb
  ]
});
```

Now, below the constructor, we will write one helper function to import an API specified in a swagger file. Make sure to replace the Cognito UserPool ID with the one saved earlier on, e.g. `us-east-1_ab12345YZ`.

> **Note:** The `REPLACE_ME_COGNITO_USER_POOL_ID` is the **only** placeholder that needs to be replaced in this block of code. The remaining `REPLACE_ME` placeholders will be automatically replaced.

```typescript
private generateSwaggerSpec(dnsName: string, vpcLink: apigateway.VpcLink): string {
  try {
    const userPoolIdentity = 'us-east-1_ab12345YZ'; // REPLACE THIS WITH YOUR COGNITO POOL ID
    const schemaFilePath = path.resolve(__dirname + '/../../source/module-4/api/api-swagger.json');
    const apiSchema = fs.readFileSync(schemaFilePath);
    let schema: string = apiSchema.toString().replace(/REPLACE_ME_REGION/gi, cdk.Aws.REGION);
    schema = schema.toString().replace(/REPLACE_ME_ACCOUNT_ID/gi, cdk.Aws.ACCOUNT_ID);
    schema = schema.toString().replace(/REPLACE_ME_COGNITO_USER_POOL_ID/gi, userPoolIdentity);
    schema = schema.toString().replace(/REPLACE_ME_VPC_LINK_ID/gi, vpcLink.vpcLinkId);
    schema = schema.toString().replace(/REPLACE_ME_NLB_DNS/gi, dnsName);
    return schema;
  } catch (exception) {
    throw new Error('Failed to generate swagger specification.  Please refer to the Module 4 readme for instructions.');
  }
}
```

And finally, back within the constructor, we define our API Gateway utilising the helper function we just wrote:

```typescript
const schema = this.generateSwaggerSpec(props.fargateService.loadBalancer.loadBalancerDnsName, vpcLink);
const jsonSchema = JSON.parse(schema);
const api = new apigateway.CfnRestApi(this, 'Schema', {
  name: 'MysfitsApi',
  body: jsonSchema,
  endpointConfiguration: {
    types: [
      apigateway.EndpointType.REGIONAL
    ]
  },
  failOnWarnings: true
});

const prod = new apigateway.CfnDeployment(this, 'Prod', {
    restApiId: api.ref,
    stageName: 'prod'
});

new cdk.CfnOutput(this, 'APIID', {
  value: api.ref,
  description: 'API Gateway ID'
})
```

Once you have finished, deploy your stack.

```sh
npm run build
```

```sh
cdk deploy MythicalMysfits-APIGateway
```

With that, our REST API that's capable of user authorization is deployed and available on the Internet... but where?!  Your API is available at the following location:

```sh
https://REPLACE_ME_WITH_API_ID.execute-api.REPLACE_ME_WITH_REGION.amazonaws.com/prod/mysfits
```

Copy the above, replacing the appropriate values, and enter it into a browser address bar. You should once again see your Mysfits JSON response.  But, we've added several capabilities like adopting and liking mysfits that our Flask backend doesn't have implemented yet.

Let's take care of that next.

### Updating the Mythical Mysfits Website

#### Update the Flask Backend
To accommodate the new functionality to view Mysfit Profiles, like, and adopt them, we have included updated Python code for your backend Flask web service.  Let's overwrite your existing codebase with these files and push them into the repository:

```sh
cp ~/environment/workshop/source/module-4/app/service/* ~/environment/MythicalMysfits-BackendRepository/service/
```

```sh
cd ~/environment/MythicalMysfits-BackendRepository
git add .
git commit -m "Update service code backend to enable additional website features."
git push
```

While those service updates are being automatically pushed through your CI/CD pipeline, continue on to the next step.

#### Update the Mythical Mysfits Website in S3

The new version of the Mythical Mysfits website includes additional HTML and JavaScript code that is being used to add a user registration and login experience.  This code is interacting with the AWS Cognito JavaScript SDK to help manage registration, authentication, and authorization to all of the API calls that require it.

The new version of the Mythical Mysfits website is located at `~/environment/workshop/source/module-4/web`. Copy the new version of the website to the `workshop/web` directory:

```sh
cp -r ~/environment/workshop/source/module-4/web/* ~/environment/workshop/web
```

Open the `~/environment/workshop/web/index.html` file in your Cloud9 IDE and replace the strings **REPLACE_ME** inside the single quotes with the values you copied from above and save the file:

![before-replace](/images/module-4/before-replace.png)

> **Note:** The Cognito UserPool ID and the Cognito UserPool Client ID are the values you saved earlier on, e.g. `us-east-1_ab12345YZ` and  `6p3bs000no6a4ue1idruvd05ad` respectively. To retrieve the values of the API Gateway endpoint and AWS Region, you can use the following commands:

```sh
aws apigateway get-rest-apis --query 'items[?name==`MysfitsApi`][id]' --output text
```

```sh
aws configure get region
```

Open the `~/environment/workshop/web/register.html` file in your Cloud9 IDE and replace the strings **REPLACE_ME** inside the single quotes with the Cognito UserPool ID and the Cognito UserPool Client ID values you copied from above and save the file. Repeat the same steps for the `~/environment/workshop/web/confirm.html` file.

Now, let's update your S3 hosted website and deploy the `MythicalMysfits-Website` stack:

```sh
cd ~/environment/workshop/cdk/
npm run build
cdk deploy MythicalMysfits-Website
```

Refresh the Mythical Mysfits website in your browser to see the new functionality in action!

This concludes Module 4.

[Proceed to Module 5](/module-5)


## [AWS Developer Center](https://developer.aws)
