# Module 4: Adding User and API Features with Amazon API Gateway and AWS Cognito

![Architecture](/images/module-4/architecture-module-4.png)

**Time to complete:** 60 minutes

**Services used:**
* [Amazon Cognito](https://aws.amazon.com/cognito/)
* [Amazon API Gateway](https://aws.amazon.com/api-gateway/)
* [Amazon Simple Storage Service (S3)](https://aws.amazon.com/s3/)
* [AWS Amplify](https://aws-amplify.github.io/)

### Overview

In order to add some more critical aspects to the Mythical Mysfits website, like allowing users to vote for their favorite Mysfit and adopt a Mysfit, we need to first have users register on the website.  To enable registration and authentication of website users, we will create a User Pool in Amazon Cognito, a fully managed user identity management service. We'll use [AWS Amplify](https://aws-amplify.github.io/) to help us set up Cognito. We will install the AWS Amplify CLI to add this feature. 

We want to restrict liking and adopting Mysfits to registered users, so we'll need to restrict access to those paths in our .NET API running on ECS with Fargate. Our Fargate service is currently using an NLB, which doesn't support validating request authorization headers. We have a few options: we can switch to an [Application Load Balancer](https://docs.aws.amazon.com/elasticloadbalancing/latest/application/introduction.html), we can have our .NET API validate our authorization headers, or we can use [Amazon API Gateway](https://aws.amazon.com/api-gateway/).

[Amazon API Gateway](https://aws.amazon.com/api-gateway/) provides commonly required REST API capabilities out of the box like SSL termination, CORS, request authorization, throttling, API stages and versioning, and much more. For these reasons, we'll choose to deploy an API Gateway in front of our NLB.

Our API Gateway will provide HTTPS and CORS support, and also request authorization validation by integrating with our Cognito User Pool. We'll restrict access to authenicated users only on the `/adopt` and `/like` API endpoints

API Gateway will then pass traffic through to our NLB to be processed by our .NET API running on ECS with Fargate.

### Adding a User Pool for Website Users with Amplify

#### Install AWS Amplify and Configure
**Note:** If you already completed installation and setup of the AWS Amplify CLI, and initialization of your AWS Amplify project in Module 1, please skip to the section named [Create the Cognito User Pool With Amplify](#create-the-cognito-user-pool-with-amplify).

To install the AWS Amplify CLI run the following commands in your VS Code terminal
```
npm install -g @aws-amplify/cli
amplify configure
```
Once you run `amplify configure` it will open the AWS login page in your browser. Login if you are not logged in already. Once logged in, you will be asked to specify a default AWS Region. 

Next, you will be asked to create an IAM user for Amplify to use. You are redirected in your browser to complete the creation of an IAM user in the console. Make sure you give this user Administrator Access on the Policy page.

After creating this IAM user, you will see an Access Key and Secret in your browser. The AWS Amplify CLI requires you to enter these values when prompted. If you completed this process successfully you should see "Successfully set up the new user." in your terminal.

#### Initialize the AWS Amplify Project
To create a new AWS Amplify project, navigate to the `frontend` directory.
```
cd ./module-4/frontend
```
In this folder, run the following command:

```
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
After finishing installation, setup, and initialization, we'll add user authentication to our Angular app that uses **Amazon Cognito**. In addition to authentication, Cognito offers other user management utilities.

Run the following command to add authentication to the Angular app and also create the necessary resources in your AWS account:
```
amplify add auth
amplify push
```

You should now have a Cognito User Pool in your default AWS region. AWS Amplify also creates an `aws-exports.js` file in your Angular app located `./module-4/frontend/src/aws-exports.js`. The `aws-exports.js` file contains information about the backend services AWS Amplify has added to your project.

### Adding a new REST API with Amazon API Gateway

#### Create an API Gateway VPC Link
Next, let's turn our attention to creating a new RESTful API in front of our existing .NET API, so that we can perform request authorization before our NLB receives any requests.  We will do this with **Amazon API Gateway**, as described in the module overview.  In order for API Gateway to privately integrate with our NLB, we will configure an **API Gateway VPC Link** that enables API Gateway APIs to directly integrate with backend web services that are privately hosted inside a VPC. 

**Note:** For the purposes of this workshop, we created the NLB to be *internet-facing* so that it could be called directly in earlier modules. Because of this, even though we will be requiring Authorization tokens in our API after this module, our NLB will still actually be open to the public behind the API Gateway API.  In a real-world scenario, you should create your NLB to be *internal* from the beginning (or create a new internal load balancer to replace the existing one), knowing that API Gateway would be your strategy for Internet-facing API authorization. But for the sake of time, we'll use the NLB that we've already created that will stay publicly accessible.

Create the VPC Link for our upcoming REST API using the following commands:

`Bash`

**Note:** You need to replace the indicated value with the Load Balancer ARN you saved when the NLB was created in Module 2
```
aws apigateway create-vpc-link --name MysfitsApiVpcLink --target-arns REPLACE_ME_NLB_ARN
```
`PowerShell`

**Note:** This command autoretrieves your load balancer ARN.
```
New-AGVpcLink -Name MysfitsApiVpcLink -TargetArn $(Get-ELB2LoadBalancer -Name mysfits-nlb | Select-Object -ExpandProperty LoadBalancerArn)
```
The response to the above will indicate that a new VPC link is being provisioned and is in `PENDING` state. Copy the indicated `id` for future use when we create our REST API in the next step.

```
{
    "status": "PENDING",
    "targetArns": [
        "YOUR_ARN_HERE"
    ],
    "id": "abcdef1",
    "name": "MysfitsApiVpcLink"
}
```

With the VPC link creating, we can move on to create the actual REST API using Amazon API Gateway.  

#### Create the REST API using Swagger

Your MythicalMysfits REST API is defined using **Swagger**, a popular open-source framework for describing APIs via JSON.  This Swagger definition of the API is located at `./module-4/aws-cli/api-swagger.json`.  Open this file and you'll see the REST API and all of its resources, methods, and configuration defined within.   

The `securityDefinitions` object within the API definition indicates that we have setup an apiKey authorization mechanism using the Authorization header.  You will notice that AWS has provided custom extensions to Swagger using the prefix `x-amazon-api-gateway-`, these extensions are where API Gateway specific functionality can be added to typical Swagger files to take advantage of API Gateway-specific capabilities.

**Note:** If you're using the AWS Tools for PowerShell, the script to deploy your API Gateway attemps to retrieve all of the necessary values needed to create the API. 

If the script fails, open the file and replace the variables with your values manually. To locate your Cognito User Pool values, navigate to the `aws-exports.js` file created by AWS Amplify. 
```
cd ./module-4/frontend/src/aws-exports.js
```
`PowerShell`
```
./module-4/ps1/Import-APIGateway.ps1
```
If you're using the AWS CLI, you'll need to manually update some values.

There are several places within the `api-swagger.json` file that need to be updated to include parameters specific to your Cognito User Pool, as well as your Network Load Balancer. 

To locate your Cognito User Pool values, navigate to the `aws-exports.js` file created by AWS Amplify. 
```
cd ./module-4/frontend/src/aws-exports.js
```

CTRL-F through the file to search for the various places `REPLACE_ME` is located and awaiting your specific parameters.  Once the edits have been made, save the file and execute the following AWS CLI command:

```
aws apigateway import-rest-api --parameters endpointConfigurationTypes=REGIONAL --body file://~/environment/aws-modern-application-workshop/module-4/aws-cli/api-swagger.json --fail-on-warnings
```

Copy the response this command returns and save the `id` value for the next step:

```
{
    "name": "MysfitsApi",
    "endpointConfiguration": {
        "types": [
            "REGIONAL"
        ]
    },
    "id": "abcde12345",
    "createdDate": 1529613528
}
```

#### Deploy the API

Now, our API has been created, but it's yet to be deployed anywhere. To deploy our API, we must first create a deployment and indicate which **stage** the deployment is for.  A stage is a named reference to a deployment, which is a snapshot of the API. You use a Stage to manage and optimize a particular deployment. For example, you can set up stage settings to enable caching, customize request throttling, configure logging, define stage variables or attach a canary release for testing.  We will call our stage `prod`. To create a deployment for the prod stage, execute the following commands:

`Bash`
```
aws apigateway create-deployment --rest-api-id REPLACE_ME_WITH_API_ID --stage-name prod
```
`PowerShell`

**Note:** This command autoretrieves your API Gateway ID.
```
New-AGDeployment -RestApiId $(Get-AGRestApiList | Where-Object { $_.Name -eq 'MysfitsApi' } | Select-Object -ExpandProperty Id) -StageName prod
```

With that, our REST API that's capable of user authorization is deployed and available on the Internet... but where?!  Your API is available at the following location:

`Bash`
```
curl https://REPLACE_ME_WITH_API_ID.execute-api.REPLACE_ME_WITH_REGION.amazonaws.com/prod/api/mysfits
```
`PowerShell`
```
Invoke-WebRequest ("https://{0}.execute-api.{1}.amazonaws.com/prod/api/mysfits" -f $(Get-AGRestApiList | Where-Object {$_.Name -eq 'MysfitsApi' } |  Select-Object -ExpandProperty Id), $(Get-DefaultAWSRegion))
```

Copy the above, replacing the appropriate values, and add `/api/mysfits` to the end of the URI.  Entered into a browser address bar, you should once again see your Mysfits JSON response.  But, we've added several capabilities like adopting and liking mysfits that our .NET backend doesn't have implemented yet.

Let's take care of that next.


### Updating the Mythical Mysfits Website

#### Update the .NET Backend

To accommodate the new functionality to view Mysfit Profiles, like, and adopt them, we have included an updated Mysfits Controller with the additional .NET methods.  Let's overwrite your existing codebase with these files and push them into the repository:

```
cd ./MythicalMysfitsService-Repository/
```

```
cp -r ./module-4/webapi/* .
```

```
git add .
```

```
git commit -m "Update service code backend to enable additional website features."
```

```
git push
```

While those service updates are being automatically pushed through your CI/CD pipeline, continue on to the next step.

#### Update the Mythical Mysfits Website in S3
**Note:** Be sure that the `environment.prod.ts` file exists in `./module-4/frontend/src/environments/environment.prod.ts` and has the same values as the previous module.

You'll need to add our new API as an environment value in the `environment.prod.ts` file. Navigate to `./module-4/frontend/src/environments/environment.prod.ts` and create a key/value pair like the following:

```js
export const environment = {
    ...
    mysfitsApiUrl: 'https://REPLACE_ME_WITH_API_ID.execute-api.REPLACE_ME_WITH_REGION.amazonaws.com/prod/api'
    ...
}
```
**Note:** Reference the `./module-4/frontend/src/environments/environment.ts` file to see an example.

To retrieve the values you need to replace in the URL, you can visit the API Gateway console in AWS, or use one of the following commands:

`Bash`
```
aws apigateway get-rest-apis --query 'items[?name==`MysfitsApi`][id]' --output text
aws configure get region
```
`PowerShell`
```
Get-AGRestApiList | Where-Object {$_.Name -eq 'MysfitsApi' } |  Select-Object -ExpandProperty Id
Get-DefaultAWSRegion | Select-Object -ExpandProperty Region
```

Once you've updated the `environment.prod.ts` file, update your Angular app with the deploy scripts located at `./module-4/deploy-frontend-scripts` or with AWS Amplify.

To use AWS Amplify to publish your Angular application, but you'll need to create a new S3 Bucket when prompted by the AWS Amplify CLI. If you attempt to reuse an existing S3 Bucket, you'll experience some errors.

AWS Amplify allows you to host your Angular app in S3 and also distribute the app through our CDN, Amazon CloudFront.

Use the following commands to deploy your Angular app:
```
amplify add hosting
amplify publish
```

Refresh the Mythical Mysfits website in your browser to see the new functionality in action!

This concludes Module 4.

[Proceed to Module 5](/module-5)


## [AWS Developer Center](https://developer.aws)
