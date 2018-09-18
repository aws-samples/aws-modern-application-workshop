# Module 5: Capturing User Behavior

![Architecture](/images/module-5/architecture-module-5.png)

**Time to complete:** 30 minutes

**Services used:**
* [AWS CloudFormation](https://aws.amazon.com/cloudformation/)
* [AWS Kinesis Firehose](https://aws.amazon.com/kinesis/data-firehose/)
* [Amazon S3](https://aws.amazon.com/s3/)
* [Amazon API Gateway](https://aws.amazon.com/api-gateway/)
* [AWS Lambda](https://aws.amazon.com/lambda/)
* [AWS CodeCommit](https://aws.amazon.com/codecommit/)
* [AWS Extensions for .NET CLI](https://github.com/aws/aws-extensions-for-dotnet-cli)

### Overview
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

### Copy the Streaming Service Code

#### Create a new CodeCommit Repository

This new stack you will deploy using CloudFormation will not only contain the infrastructure environment resources, but the application code itself that AWS Lambda will execute to process streaming events.  To bundle the creation of our infrastructure and code together in one deployment, we are going to use another AWS tool that extends the .NET CLI that needs to be installed.  Code for AWS Lambda functions is delivered to the service by building the .NET project, publishing it for release, and uploading the function code in a .zip package directly to AWS Lambda.  The AWS Extensions for .NET CLI automates that process for us.  Once we run the single command, everything we need to deploy our code to AWS Lambda will happen and we will be able to see the function in the console.

First, let's install those AWS Extensions for .NET CLI:
```
dotnet tool install -g Amazon.Lambda.Tools
```

Next, let's create a new CodeCommit repository where the streaming service code will live:
```
aws codecommit create-repository --repository-name MythicalMysfitsStreamingService-Repository
```
```
New-CCRepository -RepositoryName MythicalMysfitsStreamingService-Repository
```

In the response to that command, copy the value for `"cloneUrlHttp"`.  It should be of the form:
`https://git-codecommit.REPLACE_ME_REGION.amazonaws.com/v1/repos/MythicalMysfitsStreamingService-Repository`

Next, let's clone that new and empty repository:

```
git clone REPLACE_ME_WITH_ABOVE_CLONE_URL
```

#### Copy the Streaming Service Code Base

Now, let's move our working directory into this new repository:
```
cd ./MythicalMysfitsStreamingService-Repository/
```

Then, copy the module-5 application components into this new repository directory:
```
cp -r ./module-5/streaming_lambda/* .
```

And let's copy the CloudFormation template for this module as well.

```
cp ./module-5/cfn/* .
```

### Update the Lambda Function Package and Code

#### Push Your Code into CodeCommit
Now, we have the repository directory set with all of the provided artifacts:
* A CFN template for creating the full stack.
* The .NET project that contains the code for our Lambda function: `Function.cs`
Let's commit our code changes to the new repository so that they're saved in CodeCommit:

```
git add .
```

```
git commit -m "New stream processing service."
```

```
git push
```

### Creating the Streaming Service Stack


#### Create an S3 Bucket for Lambda Function Code Packages

First, use the AWS CLI to create a new S3 bucket where our Lambda function code packages will be uploaded to.  S3 bucket names need to be globally unique among all AWS customers, so replace the end of this bucket name with a string that's unique to you:

```
aws s3 mb s3://REPLACE_ME_YOUR_BUCKET_NAME/
```
```
New-S3Bucket -BucketName REPLACE_ME_YOUR_BUCKET_NAME
```

#### Use the AWS Extensions .NET CLI to Deploy the Stack and Lambda

With our bucket created, we are ready to use the AWS Extensions for .NET CLI to package and upload our code and transform the CloudFormation template. In the command below, make sure to replace your Lambda function code package S3 bucket you just created. 

In the CloudFormation template, we're including the URL for the MysfitsApi as a `Parameter`. This is put into an environment variable that our Lambda function can access to look up more information about the Mysfit whose profile was clicked.

Even though we could make our Lambda function directly integrate with the MysfitsTable in DynamoDB as well, doing so would intrude on the purpose of microservices and leave us with multiple/separate code bases that integrated with the same table.  Instead, we will integrate with that table through the existing service and have a much more decoupled and modular application architecture.

To deploy your new Lambda function, the command follows this pattern:
```
dotnet lambda deploy-serverless --stack-name MythicalMysfitsStreamingStack --template PATH_TO_CFN_TEMPLATE --template-parameters MysfitsApiUrl=REPLACE_ME_MYSFITS_API --s3-bucket REPLACE_ME_YOUR_BUCKET_NAME
```

These two scripts offer a convenient way to retrieve your Mysfits API URL automatically but you'll still need to replace a value with the name of the bucket you just created to store the Lambda function package.

`Bash using AWS CLI`
```
dotnet lambda deploy-serverless --stack-name MythicalMysfitsStreamingStack --template ../cfn/real-time-streaming.json --template-parameters MysfitsApiUrl="$(echo "https://$(aws apigateway get-rest-apis --query 'items[?name == `MysfitsApi`]|[0].id' --output text).execute-api.$([[ $(aws configure get region) = "" ]] && echo "us-west-2" || echo "$(aws configure get region)").amazonaws.com/prod/api/")" --s3-bucket REPLACE_ME_YOUR_BUCKET_NAME
```
`AWS Tools for PowerShell`
```
dotnet lambda deploy-serverless --stack-name MythicalMysfitsStreamingStack --template ../cfn/real-time-streaming.json --template-parameters MysfitsApiUrl=$(Write-Output ("https://{0}.execute-api.{1}.amazonaws.com/prod/api/" -f $(Get-AGRestApiList | Where-Object { $_.Name -eq 'MysfitsApi' } | Select-Object -ExpandProperty Id), $(if($(Get-DefaultAWSRegion) -eq $null) {Write-Output 'us-west-2'} else { Write-Output $(Get-DefaultAWSRegion) }))) --s3-bucket REPLACE_ME_YOUR_BUCKET_NAME
```

Once this stack creation is complete, the full real-time processing microservice will be created. If successful, you will see StreamingApiEndpoint that you should copy and paste as you will need it again.  In future scenarios, where you need to change the lambda, you can just enter the same command and it will update the Lambda function for you.

### Sending Mysfit Profile Clicks to the Service

#### Update the Website Content and Push the New Site to S3
With the streaming stack up and running, we now need to publish a new version of our Mythical Mysfits frontend. You will need to update the production `environment` file that you created in module 3 with the value of StreamingApiEndpoint you copied from the last step. Remember this environment file is located inside this folder `./module-5/frontend/src/environments/` and the file is named `environment.prod.ts`. Do not include the /mysfits path. 
![update-angular-environment](/images/module-5/update-angular-environment.png)

After replacing the endpoint to point with your new streaming endpoint, deploy your updated Angular app by running the following PowerShell script, Bash script, or AWS Amplify command:

`Bash`
```
./module-5/deploy-frontend-scripts/deploy_frontend.sh
```
`PowerShell`
```
./module-5/deploy-frontend-scripts/Deploy-FrontEnd.ps1
```
`AWS Amplify`
```
amplify add hosting
amplify publish
```

Refresh your Mythical Mysfits website in the browser once more and you will now have a site that records and publishes each time a user clicks on a Mysfits profile!

To view the records that have been processed, they will arrive in the destination S3 bucket created as part of your MythicalMysfitsStreamingStack.  Visit the S3 console here and explore the bucket you created for the streaming records (it will be prefixed with `mythicalmysfitsstreamings-clicksdestinationbucket`):
[Amazon S3 Console](https://s3.console.aws.amazon.com/s3/home)

Now that you have a completed modern application architecture, we encourage you now to explore the AWS Console and all the various services you've created to launch Mythical Mysfits!


### Workshop Clean-Up
Be sure to delete all of the resources created during the workshop in order to ensure that billing for the resources does not continue for longer than you intend.  We recommend that you utilize the AWS Console to explore the resources you've created and delete them when you're ready.  

For the two cases where you provisioned resources using AWS CloudFormation, you can remove those resources by simply running the following CLI command for each stack:

```
aws cloudformation delete-stack --stack-name STACK-NAME-HERE
```
Any AWS Amplify resources can be removed with the following command:
```
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

# Conclusion

This experience was meant to give you a taste of what it's like to be a developer designing and building modern application architectures on top of AWS.  Developers on AWS are able to programmatically provision resources using the AWS CLI and AWS Tools for PowerSheel, reuse infrastructure definitions via AWS CloudFormation, automatically build and deploy code changes using the AWS developer tool suite of Code services, and take advantage of multiple different compute and application service capabilities that do not require you to provision or manage any servers at all!

As a great next step, to learn more about the inner workings of the Mythical Mysfits website that you've created, dive into the provided CloudFormation templates and the resources declared within them.

We hope you have enjoyed the AWS Modern Application Workshop!  If you find any issues or have feedback/questions, don't hesitate to open an issue.

Thank you!


## [AWS Developer Center](https://developer.aws)
