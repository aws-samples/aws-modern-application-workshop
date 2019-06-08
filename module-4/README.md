# Module 4: Adding User and API Features with Amazon API Gateway and AWS Cognito

![Architecture](/images/module-4/architecture-module-4.png)

**Time to complete:** 60 minutes

**Services used:**

* [Amazon Cognito](https://aws.amazon.com/cognito/)
* [Amazon API Gateway](https://aws.amazon.com/api-gateway/)
* [Amazon Simple Storage Service (S3)](https://aws.amazon.com/s3/)
* [AWS Amplify](https://aws-amplify.github.io/)

## Overview

In order to add some more critical aspects to the Mythical Mysfits website, like allowing users to vote for their favorite Mysfit and adopt a Mysfit, we need to first have users register on the website.  To enable registration and authentication of website users, we will create a User Pool in Amazon Cognito, a fully managed user identity management service. We'll use [AWS Amplify](https://aws-amplify.github.io/) to help us set up Cognito. We will install the AWS Amplify CLI to add this feature. 

We want to restrict liking and adopting Mysfits to registered users, so we'll need to restrict access to those paths in our .NET API running on ECS with Fargate. Our Fargate service is currently using an NLB, which doesn't support validating request authorization headers. We have a few options: we can switch to an [Application Load Balancer](https://docs.aws.amazon.com/elasticloadbalancing/latest/application/introduction.html), we can have our .NET API validate our authorization headers, or we can use [Amazon API Gateway](https://aws.amazon.com/api-gateway/).

[Amazon API Gateway](https://aws.amazon.com/api-gateway/) provides commonly required REST API capabilities out of the box like SSL termination, CORS, request authorization, throttling, API stages and versioning, and much more. For these reasons, we'll choose to deploy an API Gateway in front of our NLB.

Our API Gateway will provide HTTPS and CORS support, and also request authorization validation by integrating with our Cognito User Pool. We'll restrict access to authenicated users only on the `/adopt` and `/like` API endpoints

API Gateway will then pass traffic through to our NLB to be processed by our .NET API running on ECS with Fargate.

### Adding a User Pool for Website Users with Amplify

#### Install AWS Amplify and Configure

**Note:** If you already completed installation and setup of the AWS Amplify CLI, and initialization of your AWS Amplify project in Module 1, please skip to the section named [Create the Cognito User Pool With Amplify](#create-the-cognito-user-pool-with-amplify).

To install the AWS Amplify CLI run the following commands in your VS Code terminal

```sh
npm install -g @aws-amplify/cli
```

```sh
amplify configure
```

Once you run `amplify configure` it will open the AWS login page in your browser. Login if you are not logged in already. Once logged in, you will be asked to specify a default AWS Region. 

Next, you will be asked to create an IAM user for Amplify to use. You are redirected in your browser to complete the creation of an IAM user in the console. Make sure you give this user Administrator Access on the Policy page.

After creating this IAM user, you will see an Access Key and Secret in your browser. The AWS Amplify CLI requires you to enter these values when prompted. If you completed this process successfully you should see "Successfully set up the new user." in your terminal.

#### Initialize the AWS Amplify Project

To create a new AWS Amplify project, navigate to the `frontend` directory.

```sh
cp -r ~/Workshop/source/module-3/frontend/* ~/Workshop/frontend/
```

```sh
cd ~/Workshop/frontend/
```

In this folder, run the following command:

```sh
amplify init
```

The CLI will ask you a few questions. Be sure to answer these specific questions with the following answers:

* Choose your default editor: `Visual Studio Code`
* Choose the type of app that you're building: `javascript`
* What javascript framework are you using: `angular`
* Source Directory Path: `src`
* Distribution Directory Path: `dist`
* Build Command: `npm run build -- --prod`
* Start Command: `npm start`

#### Create the Cognito User Pool With Amplify

After finishing installation, setup, and initialization, we'll add user authentication to our Angular app that uses **Amazon Cognito**. In addition to authenticationm, Cognito offers other user management utilities.

Run the following command to add authentication to the Angular app and also create the necessary resources in your AWS account:

```sh
amplify add auth
```

```sh
amplify push
```

You should now have a Cognito User Pool in your default AWS region. AWS Amplify also creates an `aws-exports.js` file in your Angular app located `./module-4/frontend/src/aws-exports.js`. The `aws-exports.js` file contains information about the backend services AWS Amplify has added to your project.

### Adding a new REST API with Amazon API Gateway

#### Create an API Gateway VPC Link

Next, let's turn our attention to creating a new RESTful API in front of our existing .NET API, so that we can perform request authorization before our NLB receives any requests.  We will do this with **Amazon API Gateway**, as described in the module overview.  In order for API Gateway to privately integrate with our NLB, we will configure an **API Gateway VPC Link** that enables API Gateway APIs to directly integrate with backend web services that are privately hosted inside a VPC. 

**Note:** For the purposes of this workshop, we created the NLB to be *internet-facing* so that it could be called directly in earlier modules. Because of this, even though we will be requiring Authorization tokens in our API after this module, our NLB will still actually be open to the public behind the API Gateway API.  In a real-world scenario, you should create your NLB to be *internal* from the beginning (or create a new internal load balancer to replace the existing one), knowing that API Gateway would be your strategy for Internet-facing API authorization. But for the sake of time, we'll use the NLB that we've already created that will stay publicly accessible.

The VPC Link will be created as part of our Module 4 CDK application. 

#### Create the REST API using Swagger

Your MythicalMysfits REST API is defined using **Swagger**, a popular open-source framework for describing APIs via JSON.  This Swagger definition of the API is located at `./module-4/cdk/api-swagger.json`.  Open this file and you'll see the REST API and all of its resources, methods, and configuration defined within.

The `securityDefinitions` object within the API definition indicates that we have setup an apiKey authorization mechanism using the Authorization header.  You will notice that AWS has provided custom extensions to Swagger using the prefix `x-amazon-api-gateway-`, these extensions are where API Gateway specific functionality can be added to typical Swagger files to take advantage of API Gateway-specific capabilities.

Let's deploy the VPCLink and the API Gateway.

To create the table using the AWS CDK, do the following.

Let's start off by switching once again to our Workshop's CDK folder, and opening it in our editor:

```sh
cd ~/WorkShop/cdk
```

```sh
cp -r ~/Workshop/source/module-3/frontend/* ~/Workshop/frontend/
```

```sh
code .
```

Create a new file in the `lib` folder called `apigatewaystack.ts`.

__Note__ As before, you may find it helpful to run the command `npm run watch` from within the CDK folder to provide compile time error reporting whilst you develop your AWS CDK constructs.  We recommend running this from the terminal window within VS Code.

Within the file you just created, define the skeleton CDK Stack structure as we have done before, this time naming the class `APIGatewayStack`:

```typescript
import cdk = require('@aws-cdk/cdk');

export class APIGatewayStack extends cdk.Stack {
  constructor(scope: cdk.Construct, id:string) {
    super(scope, id);

    // The code that defines your stack goes here
  }
}
```

Then, add the NetworkStack to our CDK application definition in `bin/cdk.ts`, when done, your `bin/cdk.ts` should look like this;

```typescript
#!/usr/bin/env node

import cdk = require("@aws-cdk/cdk");
import "source-map-support/register";
import { DeveloperToolsStack } from "../lib/developertoolsstack";
import { WebApplicationStack } from "../lib/webapplicationstack";
import { EcrStack } from "../lib/ecrstack";
import { EcsStack } from "../lib/ecsstack";
import { NetworkStack } from "../lib/networkstack";
import { APIGatewayStack } from "../lib/apigatewaystack";

const app = new cdk.App();
new DeveloperToolsStack(app, 'MythicalMysfits-DeveloperTools');
new WebApplicationStack(app, "MythicalMysfits-WebApplication");
const networkStack = new NetworkStack(app, "MythicalMysfits-Network");
const ecrStack = new EcrStack(app, "MythicalMysfits-ECR");
const ecsStack = new EcsStack(app, "MythicalMysfits-ECS", {
  NetworkStack: networkStack,
  EcrStack: ecrStack
});
new DynamoDBStack(app, 'MythicalMysfits-DynamoDB');
new APIGatewayStack(app, 'MythicalMysfits-APIGateway');
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
import cdk = require('@aws-cdk/cdk');
import fs = require('fs');
import path = require('path');
import { EcsStack } from './ECSStack';
```

Next, define the Stack Properties class which details the dependencies our API Gateway implementation has upon other stacks.

**Action:** Write/Copy the following code:

```typescript
interface APIGatewayStackProps extends cdk.StackProps {
  EcsStack: EcsStack;
}
```

Now, within the constructor of our `APIGatewayStack` class, first we import the Network Load Balancer from the ECS Cluster created in Module 2.

**Action:** Write/Copy the following code:

```typescript
const nlb = elbv2.NetworkLoadBalancer.fromNetworkLoadBalancerAttributes(this, 'NLB', {
  loadBalancerArn: props.EcsStack.ecsService.loadBalancer.loadBalancerArn,
});
```

We then define a VPC Link for our API Gateway, attaching the NLB imported above as the VPCLink target:

**Action:** Write/Copy the following code:

```typescript
const vpcLink = new apigateway.VpcLink(this, 'VPCLink', {
  description: 'VPC Link for our  REST API',
  name: 'MysfitsApiVpcLink',
  targets: [
      nlb
  ]
});
```

Now, below the constructor, we will write two helper functions, one to import an API specified in a swagger file, and the second to obtain the User Pool Identity defined in the Amplify JS settings file.

**Action:** Write/Copy the following code:

```typescript
private generateSwaggerSpec(dnsName: string, vpcLink: apigateway.VpcLink): string {
  try {
      const userPoolIdentity = this.getUserPoolIdentity();
      const schemaFilePath = path.resolve(__dirname + '/../api-swagger.json');
      const apiSchema = fs.readFileSync(schemaFilePath);
      let schema: string = apiSchema.toString().replace(/REPLACE_ME_REGION/gi, cdk.Aws.region);
      schema = schema.toString().replace(/REPLACE_ME_ACCOUNT_ID/gi, cdk.Aws.accountId);
      schema = schema.toString().replace(/REPLACE_ME_COGNITO_USER_POOL_ID/gi, userPoolIdentity);
      schema = schema.toString().replace(/REPLACE_ME_VPC_LINK_ID/gi, vpcLink.vpcLinkId);
      schema = schema.toString().replace(/REPLACE_ME_NLB_DNS/gi, dnsName);
      return schema;
  } catch (exception) {
      throw new Error('Failed to generate swagger specification.  Please refer to the Module 4 readme about how to initialise AWS Amplify.');
  }
}
private getUserPoolIdentity(): string {
  const amplifySettingsFilePath = path.resolve(__dirname + '../../frontend/src/aws-exports.js');
  if (fs.existsSync(amplifySettingsFilePath)) {
      const amplifySettings = fs.readFileSync(amplifySettingsFilePath).toString();
      const locateIdentityPool = '"aws_cognito_identity_pool_id": "';
      const locationOfIdentityPoolString = amplifySettings.indexOf(locateIdentityPool);
      if (locationOfIdentityPoolString === -1) {
      throw new Error('Failed to import aws-exports.js.  Please refer to the Module 4 readme about how to initialise AWS Amplify.');
      }
      const userPoolIdentity = amplifySettings.substring(locationOfIdentityPoolString + locateIdentityPool.length,
      amplifySettings.indexOf('",', locationOfIdentityPoolString + 1));
      return userPoolIdentity;
  } else {
      throw new Error('Failed to locate aws-exports.js.  Please refer to the Module 4 readme about how to initialise AWS Amplify.');
  }
}
```

And finally, back within the constructor, we define our API Gateway utilising the helper functions we just wrote:

**Action:** Write/Copy the following code:

```typescript
const schema = this.generateSwaggerSpec(props.EcsStack.ecsService.loadBalancer.loadBalancerDnsName, vpcLink);
const jsonSchema = JSON.parse(schema);
const api = new apigateway.CfnRestApi(this, 'Schema', {
  name: 'MysfitsApi',
  body: jsonSchema,
  endpointConfiguration: {
    types: [
      apigateway.EndpointType.Regional
    ]
  },
  failOnWarnings: true
});
new cdk.CfnOutput(this, 'APIID', {
  value: api.restApiId,
  description: 'API Gateway ID'
})
```

With that, our REST API that's capable of user authorization is deployed and available on the Internet... but where?!  Your API is available at the following location:

`Bash`

```sh
curl https://REPLACE_ME_WITH_API_ID.execute-api.REPLACE_ME_WITH_REGION.amazonaws.com/prod/api/mysfits
```

`PowerShell`

```powershell
Invoke-WebRequest ("https://{0}.execute-api.{1}.amazonaws.com/prod/api/mysfits" -f $(Get-AGRestApiList | Where-Object {$_.Name -eq 'MysfitsApi' } |  Select-Object -ExpandProperty Id), $(Get-DefaultAWSRegion))
```

Copy the above, replacing the appropriate values, and add `/api/mysfits` to the end of the URI.  Entered into a browser address bar, you should once again see your Mysfits JSON response.  But, we've added several capabilities like adopting and liking mysfits that our .NET backend doesn't have implemented yet.

Let's take care of that next.

### Updating the Mythical Mysfits Website

#### Update the .NET Backend

To accommodate the new functionality to view Mysfit Profiles, like, and adopt them, we have included an updated Mysfits Controller with the additional .NET methods.  Let's overwrite your existing codebase with these files and push them into the repository:

```sh
cd ~/WorkShop/api/
```

```sh
cp -r ~/Workshop/source/module-4/webapi/* .
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

**Note:** Be sure that the `environment.prod.ts` file exists in `~/Workshop/source/module-4/frontend/src/environments/environment.prod.ts` and has the same values as the previous module.

You'll need to add our new API as an environment value in the `environment.prod.ts` file. Navigate to `~/Workshop/source/module-4/frontend/src/environments/environment.prod.ts` and create a key/value pair like the following:

```js
export const environment = {
    ...
    mysfitsApiUrl: 'https://REPLACE_ME_WITH_API_ID.execute-api.REPLACE_ME_WITH_REGION.amazonaws.com/prod/api'
    ...
}
```

**Note:** Reference the `~/Workshop/source/module-4/frontend/src/environments/environment.ts` file to see an example.

To retrieve the values you need to replace in the URL, you can visit the API Gateway console in AWS, or use one of the following commands:

`Bash`

```sh
aws apigateway get-rest-apis --query 'items[?name==`MysfitsApi`][id]' --output text
```

```sh
aws configure get region
```

`PowerShell`

```sh
Get-AGRestApiList | Where-Object {$_.Name -eq 'MysfitsApi' } |  Select-Object -ExpandProperty Id
```

```sh
Get-DefaultAWSRegion | Select-Object -ExpandProperty Region
```

Once you've updated the `environment.prod.ts` file, Deploy your updated angular app by running the following command:

**Action:** Execute the following commands:

```sh
cd ~/Workshop/cdk/
```

```sh
cdk deploy MythicalMysfits-WebApplication
```

Refresh the Mythical Mysfits website in your browser to see the new functionality in action!

This concludes Module 4.

[Proceed to Module 5](/module-5)

## [AWS Developer Center](https://developer.aws)
