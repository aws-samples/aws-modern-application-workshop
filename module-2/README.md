# Module 2: Creating a Service with AWS Fargate

![Architecture](/images/module-2/architecture-module-2.png)

**Time to complete:** 60 minutes

**Services used:**
* [AWS CloudFormation](https://aws.amazon.com/cloudformation/)
* [AWS Identity and Access Management (IAM)](https://aws.amazon.com/iam/)
* [Amazon Virtual Private Cloud (VPC)](https://aws.amazon.com/vpc/)
* [Amazon Elastic Load Balancing](https://aws.amazon.com/elasticloadbalancing/)
* [Amazon Elastic Container Service (ECS)](https://aws.amazon.com/ecs/)
* [AWS Fargate](https://aws.amazon.com/fargate/)
* [AWS Elastic Container Registry (ECR)](https://aws.amazon.com/ecr/)
* [AWS CodeCommit](https://aws.amazon.com/codecommit/)
* [AWS CodePipeline](https://aws.amazon.com/codepipeline/)
* [AWS CodeDeploy](https://aws.amazon.com/codedeploy/)
* [AWS CodeBuild](https://aws.amazon.com/codebuild/)


### Overview

In Module 2, you will create a new microservice hosted with [AWS Fargate](https://aws.amazon.com/fargate/) on [Amazon Elastic Container Service](https://aws.amazon.com/ecs/) so that your Mythical Mysfits website can have an application backend to integrate with. AWS Fargate is a deployment option in Amazon ECS that allows you to deploy containers without having to manage any clusters or servers. For our Mythical Mysfits backend, we will use [.NET Core 2.1](https://docs.microsoft.com/en-us/dotnet/core/) and create a [Web API app](https://docs.microsoft.com/en-us/aspnet/core/web-api/?view=aspnetcore-2.1) in a [Docker container](https://www.docker.com/) behind a [Network Load Balancer](https://docs.aws.amazon.com/elasticloadbalancing/latest/network/introduction.html). These will form the microservice backend for the frontend website to integrate with.

### Creating the Core Infrastructure using AWS CloudFormation

Before we can create our service, we need to create the core infrastructure environment that the service will use, including the networking infrastructure in [Amazon VPC](https://aws.amazon.com/vpc/), and the AWS Identity and Access Management Roles that will define the permissions that ECS and our containers will have on top of AWS.  We will use [AWS CloudFormation](https://aws.amazon.com/cloudformation/) to accomplish this. AWS CloudFormation is a service that can programmatically provision AWS resources that you declare within JSON or YAML files called *CloudFormation Templates*, enabling the common best practice of *Infrastructure as Code*. We have provided a CloudFormation template to create all of the necessary Network and Security resources in /module-2/cfn/core.yml.  This template will create the following resources:

* **An Amazon VPC** - a network environment that contains four subnets (two public and two private) in the 10.0.0.0/16 private IP space, as well as all the needed Route Table configurations.
* **Two NAT Gateways** (one for each public subnet) - allows the containers we will eventually deploy into our private subnets to communicate out to the Internet to download necessary packages, etc.
* **A DynamoDB Endpoint** - our microservice backend will eventually integrate with Amazon DynamoDB for persistence (as part of module 3).
* **A Security Group** - Allows your docker containers to receive traffic on port 8080 from the Internet through the Network Load Balancer.
* **IAM Roles** - Identity and Access Management Roles are created. These will be used throughout the workshop to give AWS services or resources you create access to other AWS services like DynamoDB, S3, and more.

To create these resources, run the following command in your Visual Studio Code terminal (will take ~10 minutes for stack to be created) using either the AWS CLI or the PowerShell command:

`Bash`
```
aws cloudformation create-stack --stack-name MythicalMysfitsCoreStack --capabilities CAPABILITY_NAMED_IAM --template-body file://module-2/cfn/core.yml   
```
`PowerShell`
```
New-CFNStack -StackName MythicalMysfitsCoreStack -Capability CAPABILITY_NAMED_IAM -TemplateBody $(Get-Content $([io.path]::combine($(Get-Location), "module-2", "cfn", "core.yml")) | Out-String)
```

You can check on the status of your stack creation either via the AWS Console or by running the command using either the AWS CLI or the PowerShell command:

```
aws cloudformation describe-stacks --stack-name MythicalMysfitsCoreStack
```
```
Get-CFNStack -StackName MythicalMysfitsCoreStack | Select-Object -Property StackStatus
```

Run the the `describe-stacks` command, until you see a status of ```"StackStatus": "CREATE_COMPLETE"```

When you get this response, CloudFormation has finished provisioning all of the core networking and security resources described above.

Copy the **full response** and save it for future reference in a text editor. Or, create a temporary folder and file to save it to within your IDE. This JSON response contains the unique identifiers for several of the created resources, which we will use later in this workshop.  

## Module 2a: Deploying a Service with AWS Fargate

### Creating a .NET Web API Container

#### Building A Docker Image

Next, you will create a Docker container image that contains all of the code and configuration required to run the Mythical Mysfits backend as a microservice API created with .NET Core. We will build the docker container image within our local terminal and then push it to the Amazon Elastic Container Registry, where it will be available to pull when we create our service using Fargate.

All of the code required to run our service backend is stored within the `/module-2/webapi/` directory of the repository you've cloned into your local dev environment.  If you would like to review the .NET Core code that is used to create the service API, view the `/module-2/webapi/Controllers/MysfitsController.cs` file.

If you do not have Docker installed on your machine, you will need to install it. If you have it aleady installed, we can build the image by running the following commands:

* First change directory to `/module-2/webapi`

```
cd ./module-2/webapi
```

* Then build the Docker image. This will use the file in the current directory called `Dockerfile` that tells Docker all of the instructions that should take place when the build command is executed. Replace the contents in and the {braces} below with the appropriate information from the account/region you're working in.

To retrieve the needed information about your account and region, you can run the following CLI command that uses the AWS Security Token Service to return back information about the principal issuing either the CLI command or the PoewrShell command:

```
aws sts get-caller-identity
```
```
Get-STSCallerIdentity | Select-Object -Property Account
```

Once you have your Account ID, you are ready to build the docker image:

```
docker build . -t REPLACE_ME_AWS_ACCOUNT_ID.dkr.ecr.REPLACE_ME_REGION.amazonaws.com/mythicalmysfits/service:latest
```
Commands with autoreplace:

`Bash`
```
docker build . -t $(aws sts get-caller-identity --query Account --output text).dkr.ecr.$(aws configure get region).amazonaws.com/mythicalmysfits/service:latest
```
`PowerShell`
```
docker build . -t ("{0}.dkr.ecr.{1}.amazonaws.com/mythicalmysfits/service:latest" -f $(Get-STSCallerIdentity | Select-Object -ExpandProperty Account), $(Get-DefaultAWSRegion | Select-Object -ExpandProperty Region))
```

You will see docker download and install all of the necessary dependency packages that our application needs, and output the tag for the built image.  **Copy the image tag for later reference. Below the example tag shown is: 111111111111.dkr.ecr.us-east-1.amazonaws.com/mythicalmysfits/service:latest**

```
Successfully built 8bxxxxxxxxab
Successfully tagged 111111111111.dkr.ecr.us-east-1.amazonaws.com/mythicalmysfits/service:latest
```

#### Testing the Service Locally

Let's test our image locally to make sure everything is operating as expected. Copy the image tag that resulted from the previous command and run the following command to deploy the container locally:

```
docker run -p 8080:8080 REPLACE_ME_WITH_DOCKER_IMAGE_TAG
```

As a result you will see docker reporting that your container is up and running locally:

```
 * Running on http://0.0.0.0:8080/ (Press CTRL+C to quit)
```

To test our service with a local request, open up the above ip address in your browser of choice. Append /api/mysfits to the end of the URI in the address bar of the preview browser and hit enter:

![preview-menu](/images/module-2/address-bar.png)

If successful you will see a response from the service that returns the JSON document stored at `./module-2/webapi/mysfits-response.json`

When done testing the service you can stop it by pressing CTRL-c on PC or Mac.

#### Pushing the Docker Image to Amazon ECR

With a successful test of our service locally, we're ready to create a container image repository in Amazon Elastic Container Registry (Amazon ECR) and push our image into it.  In order to create the registry, run the following command, this creates a new repository in the default AWS ECR registry created for your account. Run the below command using either the AWS CLI or the PowerShell command:

`Bash`
```
aws ecr create-repository --repository-name mythicalmysfits/service
```
`PowerShell`
```
New-ECRRepository -RepositoryName mythicalmysfits/service
```

The response to this command will contain additional metadata about the created repository.
In order to push container images into our new repository, we will need to obtain authentication credentials for our Docker client to the repository.  Run the following command, which will return a login command to retrieve credentials for our Docker client and then automatically execute it (include the full command including the $ below). 'Login Succeeded' will be reported if the command is successful. Run the below command using either the AWS CLI or the PowerShell command:

`Bash`
```
$(aws ecr get-login --no-include-email)
```
`PowerShell`
```
$user,$token = $([System.Text.Encoding]::UTF8.GetString([System.Convert]::FromBase64String($(Get-ECRAuthorizationToken | Select -ExpandProperty AuthorizationToken))) -split ":"); Write-Output $token | docker login -u $user --password-stdin $(echo https://$(Get-STSCallerIdentity | Select -ExpandProperty Account).dkr.ecr.$(Get-DefaultAWSRegion | Select -ExpandProperty Region).amazonaws.com); $user, $token = @();
```

Next, push the image you created to the ECR repository using the copied tag from above. Using this command, docker will push your image and all the images it depends on to Amazon ECR:

```
docker push REPLACE_ME_WITH_DOCKER_IMAGE_TAG
```

Run the following command to see your newly pushed docker image stored inside the ECR repository using either the AWS CLI or the PowerShell command:

`Bash`
```
aws ecr describe-images --repository-name mythicalmysfits/service
```
`PowerShell`
```
Get-ECRImage -RepositoryName mythicalmysfits/service
```
### Configuring the Service Prerequisites in Amazon ECS

#### Create an ECS Cluster

Now,  we have an image available in ECR that we can deploy to a service hosted on Amazon ECS using AWS Fargate.  The same service you tested locally via the terminal in Visual Studio Code as part of the last module will now be deployed in the cloud and publicly available behind a Network Load Balancer.  

First, we will create a **Cluster** in the **Amazon Elastic Container Service (ECS)**. This represents the cluster of “servers” that your service containers will be deployed to. Servers is in "quotations" because you will be using **AWS Fargate**. Fargate allows you to specify that your containers be deployed to a cluster without having to actually provision or manage any servers yourself.

To create a new cluster in ECS, run the following command using either the AWS CLI or the PowerShell command:

`Bash`
```
aws ecs create-cluster --cluster-name MythicalMysfits-Cluster
```
`PowerShell`
```
New-ECSCluster -ClusterName MythicalMysfits-Cluster
```

#### Create an AWS CloudWatch Logs Group

Next, we will create a new log group in **AWS CloudWatch Logs**.  AWS CloudWatch Logs is a service for log collection and analysis. The logs that your container generates will automatically be pushed to AWS CloudWatch logs as part of this specific group. This is especially important when using AWS Fargate since you will not have access to the server infrastructure where your containers are running.

To create the new log group in CloudWatch logs, run the following command using either the AWS CLI or the PowerShell command:

`Bash`
```
aws logs create-log-group --log-group-name mythicalmysfits-logs
```
`PowerShell`
```
New-CWLLogGroup -LogGroupName mythicalmysfits-logs
```

#### Register an ECS Task Definition

Now that we have a cluster created and a log group defined for where our container logs will be pushed to, we're ready to register an ECS `task definition`.  A `task` in ECS is a set of container images that should be scheduled together. A `task definition` declares both the set of containers defined in a `task` and the resources and configuration those containers require. These `task definitions` are used to create a `service` with AWS Fargate as we'll see later in the tutorial.

You will use the AWS CLI to create a new `task definition` for how your new container image should be scheduled to the ECS cluster we just created.  

**Note:** If you are using the AWS Tools for PowerShell, you do not need to alter this JSON file. Please skip to the section [Register Your Task Definition](#register-your-task-definition).

##### Replace Values if Using the AWS CLI
A JSON file has been provided that will serve as the input to the CLI command.

Open `./module-2/aws-cli/task-definition.json` in Visual Studio Code.

Replace the indicated values with the appropriate ones from your created resources.  

These values with be pulled from the CloudFormation response you copied earlier as well as the docker image tag that you pushed earlier to ECR, eg: `111111111111.dkr.ecr.us-east-1.amazonaws.com/mythicalmysfits/service:latest`

If you need to retrieve the values from the CloudFormation respose, run this command using either the AWS CLI or the PowerShell command:

`Bash`
```
aws cloudformation describe-stacks --stack-name MythicalMysfitsCoreStack
```
`PowerShell`
```
Get-CFNStack -StackName MythicalMysfitsCoreStack | Select-Object -ExpandProperty Outputs | Select-Object ExportName,OutputValue
```

Once you have replaced the values in `task-defintion.json` and saved it. Execute the following command to register a new task definition in ECS using either the AWS CLI or the PowerShell command:
##### Register Your Task Definition
```
aws ecs register-task-definition --cli-input-json file://module-2/aws-cli/task-definition.json
```
`PowerShell`

**Note:** This PowerShell script attempts to retrieve values so that you don't need to replace anything. If the script fails, open the file and replace the variables with your values manually.
```
./module-2/ps1/RegisterECSTaskDefinition.ps1
```

### Enabling a Load Balanced Fargate Service

#### Create a Network Load Balancer

With a new task definition registered, we're ready to provision the infrastructure needed in our service stack. Rather than directly expose our service to the Internet, we will provision a **Network Load Balancer (NLB)** to sit in front of our service tier.  This enables our frontend code to communicate with a single DNS name while our backend service is free to provision containers elastically to meet scaling demands or to handle failures.

To provision a new NLB, execute the following CLI command in your Visual Studio Code terminal (retrieve the subnetIds from the CloudFormation output you saved) using either the AWS CLI or the PowerShell command:

`Bash`
```
aws elbv2 create-load-balancer --name mysfits-nlb --scheme internet-facing --type network --subnets REPLACE_ME_PUBLIC_SUBNET_ONE REPLACE_ME_PUBLIC_SUBNET_TWO
```
`PowerShell`

**Note:** This command autoretrieves your subnet IDs.
```
$subnet1 = Get-CFNStack -StackName MythicalMysfitsCoreStack | Select-Object -ExpandProperty Outputs | Select-Object ExportName, OutputValue | Where-Object { $_.ExportName -eq 'MythicalMysfitsCoreStack:PublicSubnetOne' } | Select-Object -ExpandProperty OutputValue; `
$subnet2 = Get-CFNStack -StackName MythicalMysfitsCoreStack | Select-Object -ExpandProperty Outputs | Select-Object ExportName, OutputValue | Where-Object { $_.ExportName -eq 'MythicalMysfitsCoreStack:PublicSubnetTwo' } | Select-Object -ExpandProperty OutputValue; `
New-ELB2LoadBalancer -Name mysfits-nlb -Scheme internet-facing -Type network -Subnets @($subnet1,$subnet2)

```
Copy the values at ```"DNSName":```, ```"VpcId":```, & ```"LoadBalancerArn":``` or save the **full response** provided by this command, which contains the DNS name of the provisioned NLB as well as its ARN.  You will use this DNS name to test the service once it has been deployed.  And the ARN will be used in a future step.

#### Create a Load Balancer Target Group

Next, use the CLI or PowerShell command to create an NLB **target group**. A target group allows AWS resources to register themselves as targets for requests that the load balancer receives to forward.  Our service containers will automatically register to this target so that they can receive traffic from the NLB when they are provisioned. This command includes one value that will need to be replaced, your `vpc-id` which can be found as a value within the earlier saved `MythicalMysfitsCoreStack` output returned by CloudFormation. Run the below command using either the AWS CLI or the PowerShell command:

`Bash`
```
aws elbv2 create-target-group --name MythicalMysfits-TargetGroup --port 8080 --protocol TCP --target-type ip --vpc-id REPLACE_WITH_VPC_ID --health-check-interval-seconds 10 --health-check-path / --health-check-protocol HTTP --healthy-threshold-count 3 --unhealthy-threshold-count 3
```
`PowerShell`

**Note:** This command autoretrieves your VPC ID.
```
New-ELB2TargetGroup -Name MythicalMysfits-TargetGroup -Port 8080 -Protocol TCP -TargetType ip -VpcId $(Get-CFNStack -StackName MythicalMysfitsCoreStack | Select-Object -ExpandProperty Outputs | Select-Object ExportName, OutputValue | Where-Object { $_.ExportName -eq 'MythicalMysfitsCoreStack:VPCId' } | Select-Object -ExpandProperty OutputValue) -HealthCheckIntervalSeconds 10 -HealthCheckPath / -HealthCheckProtocol HTTP -HealthyThresholdCount 3 -UnhealthyThresholdCount 3
```
Copy the value at ```"TargetGroupArn":``` or save the **full response** from the above command as well, which contains the Target Group ARN to be used in the next step.

#### Create a Load Balancer Listener

Next, use the CLI to create a load balancer **listener** for the NLB.  This informs that load balancer that for requests received on a specific port, they should be forwarded to targets that have registered to the above target group. Be sure to replace the two indicated values with the appropriate ARN from the TargetGroup and the NLB that you saved from the previous steps using either the AWS CLI or the PowerShell command:

`Bash`
```
aws elbv2 create-listener --default-actions TargetGroupArn=REPLACE_WITH_TARGET_GROUP_ARN,Type=forward --load-balancer-arn REPLACE_WITH_LOAD_BALANCER_ARN --port 80 --protocol TCP
```
`PowerShell`
```
New-ELB2Listener -DefaultAction @{'TargetGroupArn'='REPLACE_WITH_TARGET_GROUP_ARN';'Type'='forward'} -LoadBalancerArn REPLACE_WITH_LOAD_BALANCER_ARN -Port 80 -Protocol TCP
```
### Creating a Service with Fargate

#### Creating a Service Linked Role for ECS

If you have already used ECS in the past you can skip over this step and [move on to the next step](#create-the-service).  If you have never used ECS before, we need to create a **service linked role** in IAM that grants the ECS service itself permissions to make ECS API requests within your account.  This is required because when you create a service in ECS, the service will call APIs within your account to perform actions like pulling Docker images, creating new tasks, etc.

Without creating this role, the ECS service would not be granted permissions to perform the actions required.  To create the role, execute the following command in the terminal using either the AWS CLI or the PowerShell command:

`Bash`
```
aws iam create-service-linked-role --aws-service-name ecs.amazonaws.com
```
`PowerShell`
```
New-IAMServiceLinkedRole -AWSServiceName ecs.amazonaws.com
```

If the above returns an error about the role existing already, you can ignore it, as it would indicate the role has automatically been created in your account in the past.

#### Create the Service

With the NLB created and configured, and the ECS service granted appropriate permissions, we're ready to create the actual ECS **service** where our containers will run and register themselves to the load balancer to receive traffic.  

The service launches using **AWS Fargate** - which means that you do not have to provision any servers within the targeted cluster.  The containers that are scheduled as part of the task used in this service will run on top of a cluster that is fully managed by AWS.

We have included a JSON file for the CLI input that is located at: `./module-2/aws-cli/service-definition.json`.  This file includes all of the configuration details for the service to be created. 

**Note:** If you are using the AWS Tools for PowerShell, you do not need to alter this JSON file. Please skip to the section [Create the Service to launch in Fargate](#create-the-service-to-launch-in-fargate).
##### Replace Values if Using the AWS CLI

Open ```./module-2/aws-cli/service-definition.json``` in Visual Studio Code and replace the indicated values of `REPLACE_ME`. Save it, then run the following command to create the service  using either the AWS CLI or the PowerShell command:
##### Create the Service to launch in Fargate
`Bash`
```
aws ecs create-service --cli-input-json file://module-2/aws-cli/service-definition.json
```
`PowerShell`

**Note:** This PowerShell script attempts to retrieve values so that you don't need to replace anything. If the script fails, open the file and replace the variables with your values manually.
``` 
./module-2/ps1/CreateECSService.ps1
```

After your service is created, ECS will provision a new task that's running the container you've pushed to ECR and register it to the created NLB.  

#### Test the Service

Copy the DNS name you saved when creating the NLB and send a request to it using your browser of choice. Try sending a request to the mysfits resource using either the AWS CLI or the PowerShell command:

`Bash`
```
curl http://mysfits-nlb-123456789-abc123456.elb.us-east-1.amazonaws.com/api/mysfits
```
`PowerShell`

**Note:** This command autoretrieves your NLB DNS name.
```
Invoke-WebRequest -Uri $("http://{0}/api/mysfits" -f $(Get-ELB2LoadBalancer -Name mysfits-nlb | Select-Object -ExpandProperty DNSName))
```

A response showing the same JSON response we received earlier when testing the docker container locally in our browser means your .NET Web API is up and running on AWS Fargate.

>Note: This Network Load Balancer only supports HTTP (http://) requests since no SSL/TLS certificates are installed on it. For this tutorial, be sure to submit requests using http:// only, https:// requests will not work properly.

### Update Mythical Mysfits to Call the NLB

#### Replace the API Endpoint and Upload to S3
Next, we need to integrate our Angular app with your new API backend instead of using the hardcoded Mysfit profile data. We need to edit our `enviroment` file in our Angular app to include a `mysfitsApiUrl` property and re-publish it to our S3 bucket so the endpoint will now point to our NLB.  

Since we use `npm run build -- --prod` to build the Angular app, we'll need to create a `prod` version of the `environment` file.

Navigate to the `environments` folder in the Angular app.

```
cd ./module-2/frontend/src/environments
```

We'll copy the existing local `environment.ts` file to create our `prod` version.

```
cp ./environment.ts ./environment.prod.ts
```

Open the `environment.prod.ts` file in Visual Studio Code and replace the `mysfitsApiUrl` value with your NLB endpoint and add `/api` to end of it. Also change `production` to be `true`. Remember do not include the `/mysfits` path. 

![angular-update](/images/module-2/replace-mysfits-api-url.png)

After replacing the endpoint to point at your NLB and adding `/api`, deploy your updated angular app by running the following PowerShell or Bash script:

`Bash`
```
./module-2/deploy-frontend-scripts/deploy_frontend.sh
```
`PowerShell`
```
./module-2/deploy-frontend-scripts/Deploy-FrontEnd.ps1
```
**(Optional)**

**Note:** If you used AWS Amplify to deploy your Angular app, use the following command to deploy your updated code:
```
amplify publish
```

## Module 2b: Automating Deployments using AWS Code Services

![Architecture](/images/module-2/architecture-module-2b.png)


### Creating the CI/CD Pipeline

#### Create a S3 Bucket for Pipelie Artifacts

Now that you have a service up and running, you may think of code changes that you'd like to make to your .NET service.  It would be a bottleneck for your development speed if you had to go through all of the same steps above every time you wanted to deploy a new feature to your service. That's where Continuous Integration and Continuous Delivery or CI/CD come in!

In this module, you will create a fully managed CI/CD stack that will automatically deliver all of the code changes that you make to your code base to the service you created during the last module.  

First, we need to create another S3 bucket that will be used to store the temporary artifacts that are created in the middle of our CI/CD pipeline executions. We'll also assign a bucket policy allowing the CI/CD pipeline we create to have access to the bucket.

If you're using the AWS Tools for PowerShell, the following script will automatically create a bucket and apply the policy. When creating the bucket, the PowerShell script uses this naming convention: `mythical-mysfits-artifacts-AWS_ACCOUNT_ID`

`PowerShell`
```
./module-2/ps1/CreateArtifactsBucket.ps1
```
##### Instructions For Using the AWS CLI
Choose a new bucket name for these artifacts and create one using the following CLI command or PowerShell script:

`Bash`
```
aws s3 mb s3://REPLACE_ME_CHOOSE_ARTIFACTS_BUCKET_NAME
```
Next, this bucket needs a bucket policy to define permissions for the data stored within it. But unlike our website bucket that allowed access to anyone, only our CI/CD pipeline should have access to this bucket.  We have provided the JSON file needed for this policy at `/module-2/aws-cli/artifacts-bucket-policy.json`.  Open this file, and inside you will need to replace several strings to include the ARNs that were created as part of the MythicalMysfitsCoreStack earlier, as well as your newly chosen bucket name for your CI/CD artifacts.

Once you've modified and saved this file, execute the following command to grant access to this bucket to your CI/CD pipeline:

```
aws s3api put-bucket-policy --bucket REPLACE_ME_ARTIFACTS_BUCKET_NAME --policy file://module-2/aws-cli/artifacts-bucket-policy.json
```

#### Create a CodeCommit Repository

You'll need a place to push and store your code in. Create an **AWS CodeCommit Repository** using the CLI or PowerShell command for this purpose:

`Bash`
```
aws codecommit create-repository --repository-name MythicalMysfitsService-Repository
```
`PowerShell`
```
New-CCRepository -RepositoryName MythicalMysfitsService-Repository
```

#### Create a CodeBuild Project

With a repository to store our code in, and an S3 bucket that will be used for our CI/CD artifacts, lets add to the CI/CD stack with a way for a service build to occur. This will be accomplished by creating an **AWS CodeBuild Project**. Any time a build execution is triggered, AWS CodeBuild will automatically provision a build server following our configuration and execute the steps required to build our Docker image and push the new version of the image to the ECR repository we created. The build server automatically shuts down after the build step completes. The steps for our build (which package our .NET code and build/push the Docker container) are included in the `./module-2/webapi/buildspec.yml` file.  The **buildspec.yml** file instructs CodeBuild what steps are required for a build execution within a CodeBuild project.

To create the CodeBuild project, another CLI input JSON file is required to be updated with parameters specific to your resources when using the AWS CLI.

**Note:** If you are using the AWS Tools for PowerShell, you do not need to alter this JSON file.

 It is located at `./module-2/aws-cli/code-build-project.json`.  Similarly replace the values within this file as you have done before from the MythicalMysfitsCoreStackOutput.

`Bash`
```
aws codebuild create-project --cli-input-json file://module-2/aws-cli/code-build-project.json
```
`PowerShell`

**Note:** This PowerShell script attempts to retrieve values so that you don't need to replace anything. If the script fails, open the file and replace the variables with your values manually.
```
./module-2/ps1/CreateCodeBuildProject.ps1
```

#### Create a CodePipeline Pipeline

Finally, we need a way to *continuously integrate* our CodeCommit repository with our CodeBuild project so that builds will automatically occur whenever a code change is pushed to the repository.  Then, we need a way to *continuously deliver* those newly built artifacts to our service in ECS.  **AWS CodePipeline** is the service that glues these actions together in a **pipeline** you will create next.  

Your pipeline in CodePipeline will do just what I described above.  Anytime a code change is pushed into your CodeCommit repository, CodePipeline will deliver the latest code to your AWS CodeBuild project so that a build will occur. When successfully built by CodeBuild, CodePipeline will perform a deployment to ECS using the latest container image that the CodeBuild execution pushed into ECR.

All of these steps are defined in a JSON file provided that you will use as the input into the AWS CLI to create the pipeline. 

**Note:** If you are using the AWS Tools for PowerShell, you do not need to alter this JSON file.

This file is located at `./module-2/aws-cli/code-pipeline.json`, open it and replace the required attributes within, and save the file.


```
aws codepipeline create-pipeline --cli-input-json file://module-2/aws-cli/code-pipeline.json
```
`PowerShell`

**Note:** This PowerShell script attempts to retrieve values so that you don't need to replace anything. If the script fails, open the file and replace the variables with your values manually.
```
./module-2/ps1/CreateCodePipeline.ps1
```

#### Enable Automated Access to ECR Image Repository

We have one final step before our CI/CD pipeline can execute end-to-end successfully. With a CI/CD pipeline in place, you won't be manually pushing container images into ECR anymore.  CodeBuild will be pushing new images now. We need to give CodeBuild permission to perform actions on your image repository with an **ECR repository policy**.  

**Note:** If you are using the AWS Tools for PowerShell, you do not need to alter this policy file.

The policy document needs to be updated with the specific ARN for the CodeBuild role created by the MythicalMysfitsCoreStack, and the policy document is located at `/module-2/aws-cli/ecr-policy.json`.  Update and save this file and then run the following command to create the policy:

`Bash`
```
aws ecr set-repository-policy --repository-name mythicalmysfits/service --policy-text file://module-2/aws-cli/ecr-policy.json
```
`PowerShell`

**Note:** This PowerShell script attempts to retrieve values so that you don't need to replace anything. If the script fails, open the file and replace the variables with your values manually.
```
./module-2/ps1/SetECRRepoPolicy.ps1
```

When that has been created successfully, you have a working end-to-end CI/CD pipeline to deliver code changes automatically to your service in ECS.

### Test the CI/CD Pipeline

#### Using Git with AWS CodeCommit
To test out the new pipeline, we need to configure git and integrate it with your CodeCommit repository.

[See this documentation for instructions on generating Git credentials for CodeCommit](https://docs.aws.amazon.com/codecommit/latest/userguide/setting-up-gc.html).

With the generated Git credentials downloaded, we are ready to clone our repository using the following terminal command:

```
git clone https://git-codecommit.REPLACE_REGION.amazonaws.com/v1/repos/MythicalMysfitsService-Repository
```

This will tell us that our repository is empty!  Let's fix that by copying the application files into our repository directory using the following command:

```
cp -r ./module-2/webapi/* ./MythicalMysfitsService-Repository/
```

#### Pushing a Code Change

Now the completed service code that we used to create our Fargate service in Module 2 is stored in the local repository that we just cloned from AWS CodeCommit.  Let's make a change to the .NET service before committing our changes to demonstrate that the CI/CD pipeline we've created is working. In Visual Studio Code, open the file stored at `./MythicalMysfitsService-Repository/service/mysfits-response.json` and change the age of one of the mysfits to another value and save the file.

After saving the file, change directories to the new repository directory:

```
cd ./MythicalMysfitsService-Repository/
```

Then, run the following git commands to push in your code changes.  

```
git add .
git commit -m "I changed the age of one of the mysfits."
git push
```

After the change is pushed into the repository, you can open the CodePipeline service in the AWS Console to view your changes as they progress through the CI/CD pipeline. After committing your code change, it will take about 5 to 10 minutes for the changes to be deployed to your live service running in Fargate. Refresh your Mythical Mysfits website in the browser to see that the changes have taken effect.

You can view the progress of your code change through the [AWS CodePipeline](https://console.aws.amazon.com/codepipeline/home) console -- no actions needed, just watch the automation in action!

This concludes Module 2.

[Proceed to Module 3](/module-3)


## [AWS Developer Center](https://developer.aws)
