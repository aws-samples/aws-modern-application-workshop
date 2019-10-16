# Module 4: Adding User and API Features with Amazon API Gateway and AWS Cognito

![Architecture](/images/module-4/architecture-module-4.png)

**Time to complete:** 60 minutes

---
**Short of time?:** If you are short of time, refer to the completed reference AWS CDK code in `~/Workshop/source/module-4/cdk/`

---

**Services used:**

* [AWS CDK](https://docs.aws.amazon.com/CDK/latest/userguide/getting_started.html)
* [Amazon Cognito](https://aws.amazon.com/cognito/)
* [Amazon API Gateway](https://aws.amazon.com/api-gateway/)
* [Amazon Simple Storage Service (S3)](https://aws.amazon.com/s3/)

## Overview

In order to add some more critical aspects to the Mythical Mysfits website, like allowing users to vote for their favorite Mysfit and adopt a Mysfit, we need to first have users register on the website.  To enable registration and authentication of website users, we will create a User Pool in Amazon Cognito, a fully managed user identity management service. We'll use [AWS Amplify](https://aws-amplify.github.io/) to help us set up Cognito. We will install the AWS Amplify CLI to add this feature. 

We want to restrict liking and adopting Mysfits to registered users, so we'll need to restrict access to those paths in our .NET API running on ECS with Fargate. Our Fargate service is currently using an NLB, which doesn't support validating request authorization headers. We have a few options: we can switch to an [Application Load Balancer](https://docs.aws.amazon.com/elasticloadbalancing/latest/application/introduction.html), we can have our .NET API validate our authorization headers, or we can use [Amazon API Gateway](https://aws.amazon.com/api-gateway/).

[Amazon API Gateway](https://aws.amazon.com/api-gateway/) provides commonly required REST API capabilities out of the box like SSL termination, CORS, request authorization, throttling, API stages and versioning, and much more. For these reasons, we'll choose to deploy an API Gateway in front of our NLB.

Our API Gateway will provide HTTPS and CORS support, and also request authorization validation by integrating with our Cognito User Pool. We'll restrict access to authenicated users only on the `/adopt` and `/like` API endpoints

API Gateway will then pass traffic through to our NLB to be processed by our .NET API running on ECS with Fargate.

### Adding a User Pool for Website Users

__Note__ As before, you may find it helpful to run the command `npm run watch` from within the CDK folder to provide compile time error reporting whilst you develop your AWS CDK constructs.  We recommend running this from the terminal window within VS Code.

#### Create the Cognito User Pool

To create the **Cognito User Pool** where all of the Mythical Mysfits visitors will be stored, create a new TypeScript file which we will use to define the Cognito stack.

```sh
cd ~/workshop/cdk
touch lib/cognito-stack.ts
```

Open the file `cognito-stack.ts` in your editor (eg: `code ~/workshop/cdk/lib/cognito.ts`) and define the following stack template:

```typescript
import cdk = require("@aws-cdk/core");

export class CognitoStack extends cdk.Stack {

    constructor(scope: cdk.Construct, id: string) {
    super(scope, id);

    this.userPoolClient = new cognito.UserPoolClient(this, 'UserPoolClient', {
        userPool: this.userPool,
        userPoolClientName: 'MysfitsUserPoolClient'
    })
  }
}
```

At the top of the file, add the import statement for the AWS Cognito cdk library

```typescript
import cognito = require("@aws-cdk/aws-cognito");
```

Just before the constructor statement, define the following public properties

```typescript
public readonly userPool: cognito.UserPool;
public readonly userPoolClient: cognito.UserPoolClient;
```

Now, within the constructor _(after the super(scope, id); statement)_, define the Amazon Cognito UserPool

```typescript
this.userPool = new cognito.UserPool(this, 'UserPool', {
  userPoolName: 'MysfitsUserPool',
  autoVerifiedAttributes: [
    cognito.UserPoolAttribute.EMAIL
  ]
})
```

This will create a Cognito UserPool and defines that all users who are registered with this pool should automatically have their email address verified via confirmation email before they become confirmed users.

The last set we have to perform is to define a Amazon Cognito User Pool Client, which our web application will use.

Again, within the constructor _(after the super(scope, id); statement)_, define the Amazon Cognito UserPool Client

```typescript
this.userPoolClient = new cognito.UserPoolClient(this, 'UserPoolClient', {
  userPool: this.userPool,
  userPoolClientName: 'MysfitsUserPoolClient'
})
```

With that done, your `cognito_stack.ts` file should resemble the following.

```typescript
import cdk = require("@aws-cdk/core");
import cognito = require("@aws-cdk/aws-cognito");

export class CognitoStack extends cdk.Stack {
  public readonly userPool: cognito.UserPool;
  public readonly userPoolClient: cognito.UserPoolClient;

  constructor(scope: cdk.Construct, id: string) {
    super(scope, id);

    this.userPool = new cognito.UserPool(this, 'UserPool', {
      userPoolName: 'MysfitsUserPool',
      autoVerifiedAttributes: [
        cognito.UserPoolAttribute.EMAIL
      ]
    })

    this.userPoolClient = new cognito.UserPoolClient(this, 'UserPoolClient', {
      userPool: this.userPool,
      userPoolClientName: 'MysfitsUserPoolClient'
    })
  }
}
```

OK, That is our Amazon Cognito resources defined.  Now, let's add this to our `cdk.ts` bootstrap file.

Import your new `CognitoStack` definition into the `cdk.ts` file by inserting the following `import` statement at the top of the file

```typescript
import { CognitoStack } from '../lib/cognito-stack';
```

Insert the following definition at the end your `cdk.ts` file, before the `app.synth();` statement

```typescript
const cognito = new CognitoStack(app,  "MythicalMysfits-Cognito");
```

### Adding a new REST API with Amazon API Gateway

#### Create an API Gateway VPC Link

Next, let's turn our attention to creating a new RESTful API in front of our existing .NET API, so that we can perform request authorization before our NLB receives any requests.  We will do this with **Amazon API Gateway**, as described in the module overview.  In order for API Gateway to privately integrate with our NLB, we will configure an **API Gateway VPC Link** that enables API Gateway APIs to directly integrate with backend web services that are privately hosted inside a VPC.

**Note:** For the purposes of this workshop, we created the NLB to be *internet-facing* so that it could be called directly in earlier modules. Because of this, even though we will be requiring Authorization tokens in our API after this module, our NLB will still actually be open to the public behind the API Gateway API.  In a real-world scenario, you should create your NLB to be *internal* from the beginning (or create a new internal load balancer to replace the existing one), knowing that API Gateway would be your strategy for Internet-facing API authorization. But for the sake of time, we'll use the NLB that we've already created that will stay publicly accessible.

#### Create the REST API using Swagger

Your MythicalMysfits REST API is defined using **Swagger**, a popular open-source framework for describing APIs via JSON.  This Swagger definition of the API is located at `./module-4/api/api-swagger.json`.  Open this file and you'll see the REST API and all of its resources, methods, and configuration defined within.

The `securityDefinitions` object within the API definition indicates that we have setup an apiKey authorization mechanism using the Authorization header.  You will notice that AWS has provided custom extensions to Swagger using the prefix `x-amazon-api-gateway-`, these extensions are where API Gateway specific functionality can be added to typical Swagger files to take advantage of API Gateway-specific capabilities.

First we will do some prep work in our workshop folder.  Updating the WebAPI code and copying over our swagger file.

```sh
cd ~/Workshop/webapi
```

```sh
cp -r ~/Workshop/source/module-4/webapi/* ~/Workshop/webapi/
```

```sh
cp ~/Workshop/source/module-4/api/api-swagger.json ~/Workshop/cdk
```

Let's deploy the VPCLink and the API Gateway.  To create the API using the AWS CDK, start off by switching once again to our Workshop's CDK folder, and opening it in our editor:

```sh
cd ~/Workshop/cdk
```

```sh
code .
```

Create a new file in the `lib` folder called `api-gateway-stack.ts`.

```sh
touch ~/Workshop/cdk/lib/api-gateway-stack.ts
```

__Note__ As before, you may find it helpful to run the command `npm run watch` from within the CDK folder to provide compile time error reporting whilst you develop your AWS CDK constructs.  We recommend running this from the terminal window within VS Code.

Within the file you just created, define the skeleton CDK Stack structure as we have done before, this time naming the class `APIGatewayStack`:

```typescript
import cdk = require('@aws-cdk/core');

interface APIGatewayStackProps extends cdk.StackProps {
  loadBalancerDnsName: string;
  loadBalancerArn: string;
  userPoolId: string;
}

export class APIGatewayStack extends cdk.Stack {
  constructor(scope: cdk.Construct, id:string, props: APIGatewayStackProps) {
    super(scope, id);

    // The code that defines your stack goes here
  }
}
```

Then, add the NetworkStack to our CDK application definition in `bin/cdk.ts`, when done, your `bin/cdk.ts` should look like this;

```typescript
#!/usr/bin/env node

import cdk = require('@aws-cdk/core');

import "source-map-support/register";
import { DeveloperToolsStack } from "../lib/developer-tools-stack";
import { WebApplicationStack } from "../lib/webapplicationstack";
import { EcrStack } from "../lib/ecrstack";
import { EcsStack } from "../lib/ecsstack";
import { NetworkStack } from "../lib/networkstack";
import { APIGatewayStack } from "../lib/apigatewaystack";

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
    ecsService: ecsStack.ecsService.service
});
new DynamoDbStack(app, "MythicalMysfits-DynamoDB", {
  vpc: networkStack.vpc,
  fargateService: ecsStack.ecsService.service
});
const cognito = new CognitoStack(app,  "MythicalMysfits-Cognito");
const apiGateway = new APIGatewayStack(app, "MythicalMysfits-APIGateway", {
  userPoolId: cognito.userPool.userPoolId,
  loadBalancerArn: ecsStack.ecsService.loadBalancer.loadBalancerArn,
  loadBalancerDnsName: ecsStack.ecsService.loadBalancer.loadBalancerDnsName
});
```

Install the AWS CDK npm package for API Gateway by executing the following command from within the `~/Workshop/cdk/` directory.

**Action:** Execute the following commands:

```sh
npm install --save-dev @aws-cdk/aws-apigateway
```

Back in `APIGatewayStack.ts`, define the class imports for the code we will be writing:

**Action:** Write/Copy the following code:

```typescript
import apigateway = require('@aws-cdk/aws-apigateway');
import elbv2 = require('@aws-cdk/aws-elasticloadbalancingv2');
import fs = require('fs');
import path = require('path');
```

Now, within the constructor of our `APIGatewayStack` class, first we import the Network Load Balancer from the ECS Cluster created in Module 2.

**Action:** Write/Copy the following code:

```typescript
const nlb = elbv2.NetworkLoadBalancer.fromNetworkLoadBalancerAttributes(this, 'NLB', {
  loadBalancerArn: props.loadBalancerArn
});
```

We then define a VPC Link for our API Gateway, attaching the NLB imported above as the VPCLink target:

**Action:** Write/Copy the following code:

```typescript
const vpcLink = new apigateway.VpcLink(this, 'VPCLink', {
  description: 'VPC Link for our  REST API',
  vpcLinkName: 'MysfitsApiVpcLink',
  targets: [
    nlb
  ]
});
```

Now, below the constructor, we will write two helper functions, one to import an API specified in a swagger file, and the second to obtain the User Pool Identity defined in the Amplify JS settings file.

**Action:** Write/Copy the following code:

```typescript
private generateSwaggerSpec(dnsName: string, vpcLink: apigateway.VpcLink): string {
  const schemaFilePath = path.resolve(__dirname + '/../../api/api-swagger.json');
  const apiSchema = fs.readFileSync(schemaFilePath);
  let schema: string = apiSchema.toString().replace(/REPLACE_ME_REGION/gi, cdk.Aws.REGION);
  schema = schema.toString().replace(/REPLACE_ME_ACCOUNT_ID/gi, cdk.Aws.ACCOUNT_ID);
  schema = schema.toString().replace(/REPLACE_ME_COGNITO_USER_POOL_ID/gi, userPoolId);
  schema = schema.toString().replace(/REPLACE_ME_VPC_LINK_ID/gi, vpcLink.vpcLinkId);
  schema = schema.toString().replace(/REPLACE_ME_NLB_DNS/gi, dnsName);
  return schema;
}
```

And finally, back within the constructor, we define our API Gateway utilising the helper functions we just wrote:

**Action:** Write/Copy the following code:

```typescript
const schema = this.generateSwaggerSpec(props.loadBalancerDnsName, props.userPoolId, vpcLink);
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
new apigateway.CfnDeployment(this, 'Prod', {
  restApiId: api.ref,
  stageName: 'prod'
});
new cdk.CfnOutput(this, 'APIID', {
  value: api.ref,
  description: 'API Gateway ID'
})
```

Once you have finished, deploy your stacks.

**Action:** Execute the following commands:

```sh
cd ~/Workshop/cdk
```

```sh
npm run build
```

```sh
cdk deploy
```

With that, our REST API that's capable of user authorization is deployed and available on the Internet... but where?!  Your API is available at the following location:

```sh
curl https://REPLACE_ME_WITH_API_ID.execute-api.REPLACE_ME_WITH_REGION.amazonaws.com/prod/api/mysfits
```

Copy the above, replacing the appropriate values, and add `/api/mysfits` to the end of the URI.  Entered into a browser address bar, you should once again see your Mysfits JSON response.  But, we've added several capabilities like adopting and liking mysfits that our .NET backend doesn't have implemented yet.

Let's take care of that next.

### Updating the Mythical Mysfits Website

#### Update the .NET Backend

To accommodate the new functionality to view Mysfit Profiles, like, and adopt them, we have included an updated Mysfits Controller with the additional .NET methods.  Let's overwrite your existing codebase with these files and push them into the repository:

```sh
cd ~/Workshop/webapi/
```

```sh
cp -r ~/Workshop/source/module-4/webapi/* ~/Workshop/webapi/
```

```sh
git add .
```

```sh
git commit -m "Update service code backend to enable additional website features."
```

```sh
git push
```

While those service updates are being automatically pushed through your CI/CD pipeline, continue on to the next step.

#### Update the Mythical Mysfits Website in S3

**Note:** Be sure that the `environment.prod.ts` file exists in `~/Workshop/frontend/src/environments/environment.prod.ts` and has the same values as the previous module.

You'll need to add our new API as an environment value in the `environment.prod.ts` file. Navigate to `~/Workshop/frontend/src/environments/environment.prod.ts` and create a key/value pair like the following:

```js
export const environment = {
    ...
    mysfitsApiUrl: 'https://REPLACE_ME_WITH_API_ID.execute-api.REPLACE_ME_WITH_REGION.amazonaws.com/prod/api'
    ...
}
```

**Note:** Reference the `~/Workshop/source/module-4/frontend/src/environments/environment.ts` file to see an example.

To retrieve the values you need to replace in the URL, you can visit the API Gateway console in AWS, or use one of the following commands:

```sh
aws apigateway get-rest-apis --query 'items[?name==`MysfitsApi`][id]' --output text
```

```sh
aws configure get region
```

Once you've updated the `environment.prod.ts` file, Deploy your updated angular app by running the following command:

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
npm run build
cdk deploy MythicalMysfits-WebApplication
```

Refresh the Mythical Mysfits website in your browser to see the new functionality in action!

This concludes Module 4.

[Proceed to Module 5](/module-5)

## [AWS Developer Center](https://developer.aws)
