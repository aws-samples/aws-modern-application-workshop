# Module 2: Creating a Service with AWS Fargate

![Architecture](/images/module-2/architecture-module-2.png)

**Time to complete:** 60 minutes

---
**Short of time?:** If you are short of time, refer to the completed reference AWS CDK code in `module-2/cdk`

---

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

In Module 2, using [AWS CDK](https://aws.amazon.com/cdk/), you will create a new microservice hosted using [AWS Fargate](https://aws.amazon.com/fargate/) on [Amazon Elastic Container Service](https://aws.amazon.com/ecs/) so that your Mythical Mysfits website can have a application backend to integrate with. AWS Fargate is a deployment option in Amazon ECS that allows you to deploy containers without having to manage any clusters or servers. For our Mythical Mysfits backend, we will use Python and create a Flask app in a Docker container behind a Network Load Balancer. These will form the microservice backend for the frontend website to integrate with.

### Creating the Core Infrastructure using the AWS CDK

Before we can create our service, we need to create the core infrastructure environment that the service will use, including the networking infrastructure in [Amazon VPC](https://aws.amazon.com/vpc/), and the [AWS Identity and Access Management](https://aws.amazon.com/iam/) Roles that will define the permissions that ECS and our containers will have on top of AWS.  

The AWS CDK application you are about to write will create the following resources:

* [**An Amazon VPC**](https://aws.amazon.com/vpc/) - a network environment that contains four subnets (two public and two private) in the 10.0.0.0/16 private IP space, as well as all the needed Route Table configurations.  The subnets for this network are created in separate AWS Availability Zones (AZ) to enable high availability across multiple physical facilities in an AWS Region. Learn more about how AZs can help you achieve High Availability [here](https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/Concepts.RegionsAndAvailabilityZones.html).
* [**Two NAT Gateways**](https://docs.aws.amazon.com/vpc/latest/userguide/vpc-nat-gateway.html) (one for each public subnet, also spanning multiple AZs) - allow the containers we will eventually deploy into our private subnets to communicate out to the Internet to download necessary packages, etc.
* [**A DynamoDB VPC Endpoint**](https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/vpc-endpoints-dynamodb.html) - our microservice backend will eventually integrate with [Amazon DynamoDB](https://aws.amazon.com/dynamodb/) for persistence (as part of module 3).
* [**A Security Group**](https://docs.aws.amazon.com/vpc/latest/userguide/VPC_SecurityGroups.html) - Allows your docker containers to receive traffic on port 8080 from the Internet through the Network Load Balancer.
* [**IAM Roles**](https://docs.aws.amazon.com/IAM/latest/UserGuide/id_roles.html) - Identity and Access Management Roles are created. These will be used throughout the workshop to give AWS services or resources you create access to other AWS services like DynamoDB, S3, and more.

In the `workshop/cdk` directory, create a new file in the `lib` folder called `network-stack.ts`.

```sh
cd ~/environment/workshop/cdk
touch lib/network-stack.ts
```

Within the file you just created, define the skeleton CDK Stack structure, naming the class `NetworkStack`:

```typescript
import cdk = require('@aws-cdk/core');

export class NetworkStack extends cdk.Stack {
  constructor(scope: cdk.Construct, id:string) {
    super(scope, id);

    // The code that defines your stack goes here
  }
}
```

Then, add the NetworkStack to our CDK application definition in `bin/cdk.ts`, when done, your `bin/cdk.ts` should look like this:

```typescript
#!/usr/bin/env node
import 'source-map-support/register';
import cdk = require('@aws-cdk/core');
import { WebApplicationStack } from "../lib/web-application-stack";
import { NetworkStack } from "../lib/network-stack";

const app = new cdk.App();
new WebApplicationStack(app, "MythicalMysfits-Website");
const networkStack = new NetworkStack(app, "MythicalMysfits-Network");
```

Now, we can define our VPC using AWS CDK.  Once again, AWS CDK makes the implementation of AWS Components and Services a breeze by providing you with high level abstractions.  Let's demonstrate this now.

First, we need to install the CDK NPM packages for Amazon EC2 and AWS IAM:

```sh
npm install --save-dev @aws-cdk/aws-ec2 @aws-cdk/aws-iam
```

Within the `network-stack.ts` file, define the following VPC construct:

```typescript
import cdk = require('@aws-cdk/core');
import ec2 = require("@aws-cdk/aws-ec2");
import iam = require("@aws-cdk/aws-iam");

export class NetworkStack extends cdk.Stack {
  public readonly vpc: ec2.Vpc;

  constructor(scope: cdk.Construct, id:string) {
    super(scope, id);

    this.vpc = new ec2.Vpc(this, "VPC");
  }
}
```

> **Note:** We are assigning the instance of our `ec2.Vpc` to a readonly property so that it may be referenced by other stacks.


That is all you need to define a VPC!  Let's now run the `cdk synth` command to observe what this single line generates.  In a terminal window run the following command:

```sh
cdk synth -o templates
```

This command will generate the AWS CloudFormation template for the NetworkStack and place it in a folder called templates.  Open the generated file now and review the contents.  

In the generated file, you will find that one line of code generated a huge amount of AWS CloudFormation, including:

* A VPC construct;
* Public, private and isolated subnets in each of the availability zones in your region
* Routing tables for each of the subnets
* NAT and Internet Gateways for each AZ

But lets now customise the VPC we are creating by adding some property overrides.  Change your VPC definiton to reflect the following:

```typescript
this.vpc = new ec2.Vpc(this, "VPC", {
  natGateways: 1,
  maxAzs: 2
});
```

Here we are defining the maximum number of NAT Gateways we want to establish and the maximum number of AZs we want to deploy to.

> **Note:** once you've completed the changes above, compare your `network-stack.ts` file with the one in the `workshop/source/module-2/cdk/lib` folder and make sure it looks the same.

Now, deploy your VPC using the following command:

```sh
cdk deploy MythicalMysfits-Network
```

## Module 2a: Deploying a Service with AWS Fargate

### Creating a Flask Service Container

#### Building A Docker Image

Next, you will create a docker container image that contains all of the code and configuration required to run the Mythical Mysfits backend as a microservice API created with Flask.  We will build the docker container image within Cloud9 and then push it to the Amazon Elastic Container Registry, where it will be available to pull when we create our service using Fargate.

All of the code required to run our service backend is stored within the `workshop/source/module-2/app/` directory of the repository you've cloned into your Cloud9 IDE.  If you would like to review the Python code that uses Flask to create the service API, view the `workshop/source/module-2/app/service/mythicalMysfitsService.py` file.

Docker comes already installed on the Cloud9 IDE that you've created, so in order to build the docker image locally, all we need to do is run the following commands in the Cloud9 terminal:

```sh
cd ~/environment/workshop/
mkdir app && cd app
```

Copy the application code:

```sh
cp -R ~/environment/workshop/source/module-2/app ~/environment/workshop
```

Build your Docker image from the existing Dockerfile:

```sh
docker build . -t $(aws sts get-caller-identity --query Account --output text).dkr.ecr.$(aws configure get region).amazonaws.com/mythicalmysfits/service:latest
```

You will see docker download and install all of the necessary dependency packages that our application needs, and output the tag for the built image.  **Copy the image tag for later reference. Below the example tag shown is: 111111111111.dkr.ecr.us-east-1.amazonaws.com/mythicalmysfits/service:latest**

```
Successfully built 8bxxxxxxxxab
Successfully tagged 111111111111.dkr.ecr.us-east-1.amazonaws.com/mythicalmysfits/service:latest
```

#### Testing the Service Locally

Let's test our image locally within Cloud9 to make sure everything is operating as expected. Copy the image tag that resulted from the previous command and run the following command to deploy the container “locally” (which is actually within your Cloud9 IDE inside AWS!):

```
docker run -p 8080:8080 REPLACE_ME_WITH_DOCKER_IMAGE_TAG
```

As a result you will see docker reporting that your container is up and running locally:

```
 * Running on http://0.0.0.0:8080/ (Press CTRL+C to quit)
```

To test our service with a local request, we're going to open up the built-in web browser within the Cloud9 IDE that can be used to preview applications that are running on the IDE instance.  To open the preview web browser, select **Preview > Preview Running Application** in the Cloud9 menu bar:

![preview-menu](/images/module-2/preview-menu.png)

This will open another panel in the IDE where the web browser will be available.  Append /mysfits to the end of the URI in the address bar of the preview browser in the new panel and hit enter:

![preview-menu](/images/module-2/address-bar.png)

If successful you will see a response from the service that returns the JSON document stored at `~/environment/workshop/source/module-2/app/service/mysfits-response.json`

When done testing the service you can stop it by pressing CTRL-c on PC or Mac.

#### Create an Amazon Elastic Container Registry (ECR) repository

With a successful test of our service locally, we're ready to create a container image repository in [Amazon Elastic Container Registry](https://aws.amazon.com/ecr/) (Amazon ECR) and push our image into it.  In order to create the registry using CDK, let's create a new file within the `lib` folder, this time called `ecr-stack.ts`.  
```sh
cd ~/environment/workshop/cdk
touch lib/ecr-stack.ts
```

And again, as before, define the skeleton structure of a CDK Stack.

```typescript
import cdk = require('@aws-cdk/core');

export class EcrStack extends cdk.Stack {
  constructor(scope: cdk.Construct, id: string) {
    super(scope, id);

    // The code that defines your stack goes here
  }
}
```

Then, add the ECRStack to our CDK application definition in `bin/cdk.ts`, as we have done before.  When done, your `bin/cdk.ts` should look like this;

```typescript
#!/usr/bin/env node

import cdk = require('@aws-cdk/core');
import "source-map-support/register";
import { WebApplicationStack } from "../lib/web-application-stack";
import { NetworkStack } from "../lib/network-stack";
import { EcrStack } from "../lib/ecr-stack";

const app = new cdk.App();
new WebApplicationStack(app, "MythicalMysfits-Website");
const networkStack = new NetworkStack(app, "MythicalMysfits-Network");
const ecrStack = new EcrStack(app, "MythicalMysfits-ECR");
```

Next, we need to install the CDK NPM packages for Amazon ECR:

```sh
npm install --save-dev @aws-cdk/aws-ecr
```

Then we add the definition of our ECR repository to the EcrStack as follows:

Add this import statement after the `import cdk` statement on the first line.

```typescript
import ecr = require("@aws-cdk/aws-ecr");
```
Update your EcrStack to reflect the following:

```typescript
export class EcrStack extends cdk.Stack {
  public readonly ecrRepository: ecr.Repository;

  constructor(scope: cdk.Construct, id: string) {
    super(scope, id);
    this.ecrRepository = new ecr.Repository(this, "Repository", {
      repositoryName: "mythicalmysfits/service"
    });
  }
}
```

> **Note:** We are assigning the instance of our `ecr.Repository` to a readonly property so that it may be referenced by other stacks.

Now, deploy your ECR stack using the following command:

```sh
cdk deploy MythicalMysfits-ECR
```

In your browser, go to the ECR Dashboard and verify you can see the ECR repository you just created in the list.

#### Pushing the Docker Image to Amazon ECR

In order to push container images into our new repository, we will need to obtain authentication credentials for our Docker client to the repository.  Run the following command, which will return a login command to retrieve credentials for our Docker client and then automatically execute it (include the full command including the $ below). 'Login Succeeded' will be reported if the command is successful.

```sh
$(aws ecr get-login --no-include-email)
```

Next, push the image you created to the ECR repository using the copied tag from above. Using this command, docker will push your image and all the images it depends on to Amazon ECR:

```sh
docker push $(aws sts get-caller-identity --query Account --output text).dkr.ecr.$(aws configure get region).amazonaws.com/mythicalmysfits/service:latest
```

Run the following command to see your newly pushed docker image stored inside the ECR repository:

```sh
aws ecr describe-images --repository-name mythicalmysfits/service
```

### Create an Amazon ECS Service with AWS Fargate

Now,  we have an image available in ECR that we can deploy to a service hosted on Amazon ECS using AWS Fargate.  The same service you tested locally via the terminal in Cloud9 as part of the last module will now be deployed in the cloud and publicly available behind a Network Load Balancer.  

First, we will create a **Cluster** in **Amazon Elastic Container Service (ECS)**. This represents the cluster of “servers” that your service containers will be deployed to.  Servers is in "quotations" because you will be using **AWS Fargate**. Fargate allows you to specify that your containers be deployed to a cluster without having to actually provision or manage any servers yourself.

Now, let's define our ECS instance.  But first, we need to install the CDK NPM packages for AWS ECS, doing so like below:

```sh
npm install --save-dev @aws-cdk/aws-ecs @aws-cdk/aws-ecs-patterns
```

As before, let's create a new file within the `lib` folder, this time called `ecs-stack.ts`.  

```sh
touch lib/ecs-stack.ts
```

Define the skeleton structure of a CDK Stack.

```typescript
import cdk = require('@aws-cdk/core');

export class EcsStack extends cdk.Stack {
  constructor(scope: cdk.Construct, id: string) {
    super(scope, id);

    // The code that defines your stack goes here
  }
}
```

This time, the stack we are creating depends on two previous stacks that we have created.  The recommended approach for importing dependencies and properties into a stack is via a properties construct.  Let's define that now.  

Above your EcsStack definition, import the following modules:

```typescript
import ec2 = require('@aws-cdk/aws-ec2');
import ecr = require('@aws-cdk/aws-ecr');
```

And define the following properties object above the definition of the EcsStack

```typescript
interface EcsStackProps extends cdk.StackProps {
    vpc: ec2.Vpc,
    ecrRepository: ecr.Repository
}
```

Now change the constructor of your EcsStack to require your properties object.

```typescript
  constructor(scope: cdk.Construct, id: string, props: EcsStackProps) {
```

Import the remaining AWS CDK modules that we will require within the ECS stack.

```typescript
import ecs = require("@aws-cdk/aws-ecs");
import ecsPatterns = require("@aws-cdk/aws-ecs-patterns");
import iam = require("@aws-cdk/aws-iam");
```

Be sure to define two properties at the top of your EcsStack that expose the ecsCluster and ecsService for other stacks to utilise later in the workshop.

```typescript
export class EcsStack extends cdk.Stack {
  public readonly ecsCluster: ecs.Cluster;
  public readonly ecsService: ecsPatterns.NetworkLoadBalancedFargateService;

  constructor(scope: cdk.Construct, id: string, props: EcsStackProps) {
    super(scope, id);
```

Now we define our ECS Cluster object.

```typescript
this.ecsCluster = new ecs.Cluster(this, "Cluster", {
  clusterName: "MythicalMysfits-Cluster",
  vpc: props.vpc
});
this.ecsCluster.connections.allowFromAnyIpv4(ec2.Port.tcp(8080));
```

Notice how we reference the VPC (`props.vpc`) defined in the `EcsStackProps`.  [AWS CDK](https://aws.amazon.com/cdk/) will automatically create a reference here between the CloudFormation objects.  Also notice that we assign the instance of the `ecs.Cluster` created to a local property so that it can be referenced by this and other stacks.

```typescript
this.ecsService = new ecsPatterns.NetworkLoadBalancedFargateService(this, "Service", {
  cluster: this.ecsCluster,
  desiredCount: 1,
  publicLoadBalancer: true,
  taskImageOptions: {
    enableLogging: true,
    containerPort: 8080,
    image: ecs.ContainerImage.fromEcrRepository(props.ecrRepository),
  }
});
this.ecsService.service.connections.allowFrom(ec2.Peer.ipv4(props.vpc.vpcCidrBlock),ec2.Port.tcp(8080));
```

Notice here the definition of container ports and the customisation of the EC2 SecurityGroups rules created by AWS CDK to limit permitted requests to the CIDR block of the VPC we created.

Next we will add some additional IAM Policy Statements to the Execution and Task Roles.

```typescript
const taskDefinitionPolicy = new iam.PolicyStatement();
taskDefinitionPolicy.addActions(
  // Rules which allow ECS to attach network interfaces to instances
  // on your behalf in order for awsvpc networking mode to work right
  "ec2:AttachNetworkInterface",
  "ec2:CreateNetworkInterface",
  "ec2:CreateNetworkInterfacePermission",
  "ec2:DeleteNetworkInterface",
  "ec2:DeleteNetworkInterfacePermission",
  "ec2:Describe*",
  "ec2:DetachNetworkInterface",

  // Rules which allow ECS to update load balancers on your behalf
  //  with the information sabout how to send traffic to your containers
  "elasticloadbalancing:DeregisterInstancesFromLoadBalancer",
  "elasticloadbalancing:DeregisterTargets",
  "elasticloadbalancing:Describe*",
  "elasticloadbalancing:RegisterInstancesWithLoadBalancer",
  "elasticloadbalancing:RegisterTargets",

  //  Rules which allow ECS to run tasks that have IAM roles assigned to them.
  "iam:PassRole",

  //  Rules that let ECS create and push logs to CloudWatch.
  "logs:DescribeLogStreams",
  "logs:CreateLogGroup");
taskDefinitionPolicy.addAllResources();

this.ecsService.service.taskDefinition.addToExecutionRolePolicy(
  taskDefinitionPolicy
);

const taskRolePolicy =  new iam.PolicyStatement();
taskRolePolicy.addActions(
  // Allow the ECS Tasks to download images from ECR
  "ecr:GetAuthorizationToken",
  "ecr:BatchCheckLayerAvailability",
  "ecr:GetDownloadUrlForLayer",
  "ecr:BatchGetImage",
  // Allow the ECS tasks to upload logs to CloudWatch
  "logs:CreateLogStream",
  "logs:CreateLogGroup",
  "logs:PutLogEvents"
);
taskRolePolicy.addAllResources();

this.ecsService.service.taskDefinition.addToTaskRolePolicy(
  taskRolePolicy
);
```

Then, add the EcsStack to our CDK application definition in `bin/cdk.ts`, as we have done before.  When done, your `bin/cdk.ts` should look like this;

```typescript
#!/usr/bin/env node

import cdk = require('@aws-cdk/core');
import "source-map-support/register";
import { WebApplicationStack } from "../lib/web-application-stack";
import { NetworkStack } from "../lib/network-stack";
import { EcrStack } from "../lib/ecr-stack";
import { EcsStack } from "../lib/ecs-stack";

const app = new cdk.App();
new WebApplicationStack(app, "MythicalMysfits-Website");
const networkStack = new NetworkStack(app, "MythicalMysfits-Network");
const ecrStack = new EcrStack(app, "MythicalMysfits-ECR");
const ecsStack = new EcsStack(app, "MythicalMysfits-ECS", {
    vpc: networkStack.vpc,
    ecrRepository: ecrStack.ecrRepository
});
```

And now deploy the ECS stack:

```sh
cdk deploy MythicalMysfits-ECS
```

You will be prompted with a messages such as `Do you wish to deploy these changes (y/n)?` to which you should respond by typing `y`

After your service is created, ECS will provision a new task that's running the container you've pushed to ECR and register it to the created NLB.  

#### Test the Service

Use the NLB DNS name that was printed as the output of the previous command and send a request to it using your browser of choice. Try sending a request to the mysfits resource using the AWS CLI command:

```sh
curl http://<replace-with-your-nlb-address>/mysfits
```

A response showing the same JSON response we received earlier when testing the docker container locally in our browser means your Python Web API is up and running on AWS Fargate.

> **Note:** This Network Load Balancer only supports HTTP (http://) requests since no SSL/TLS certificates are installed on it. For this tutorial, be sure to submit requests using http:// only, https:// requests will not work properly.

### Update Mythical Mysfits to Call the NLB

#### Replace the API Endpoint
Next, we need to integrate our website with your new API backend instead of using the hard coded data that we previously uploaded to S3. Copy the web application code from the `workshop/source/module-2/web` directory:

```sh
cp -r ~/environment/workshop/source/module-2/web/* ~/environment/workshop/web
```

You'll need to update the following file to use the same NLB URL for API calls (do not include the /mysfits path): `workshop/web/index.html`. Open the file in Cloud9 and replace the highlighted area below between the quotes with the NLB URL:

![before replace](/images/module-2/before-replace.png)

After pasting, the line should look similar to below:

![after replace](/images/module-2/after-replace.png)

#### Update the Mythical Mysfits website
To update your S3 hosted website, deploy the `MythicalMysfits-Website` stack:

```sh
cdk deploy MythicalMysfits-Website
```

Open your website using the same URL used at the end of Module 1 in order to see your new Mythical Mysfits website, which is retrieving JSON data from your Flask API running within a docker container deployed to AWS Fargate!


## Module 2b: Automating Deployments using AWS Code Services

![Architecture](/images/module-2/architecture-module-2b.png)

Now that you have a service up and running, you may think of code changes that you'd like to make to your Flask service.  It would be a bottleneck for your development speed if you had to go through all of the same steps above every time you wanted to deploy a new feature to your service. That's where Continuous Integration and Continuous Delivery or CI/CD come in!

In this section, you will create a fully managed CI/CD stack that will automatically deliver all of the code changes that you make to your code base to the service you created during the last section.

### Create a CodeCommit repository for our backend service

First, we need to install the CDK NPM packages for AWS CodeCommit:

```sh
cd ~/environment/workshop/cdk
npm install --save-dev @aws-cdk/aws-codecommit
```

As before, let's create a new file within the `lib` folder, this time called `cicd-stack.ts`.  

```sh
touch lib/cicd-stack.ts
```

Define the skeleton structure of a CDK Stack.

```typescript
import cdk = require('@aws-cdk/core');

export class CiCdStack extends cdk.Stack {
  constructor(scope: cdk.Construct, id: string) {
    super(scope, id);

    // The code that defines your stack goes here
  }
}
```

The stack we are creating depends on two previous stacks that we have created.  The recommended approach for importing dependencies and properties into a stack is via a properties construct.  Let's define that now.  

Above your CiCdStack definition, import the following modules:

```typescript
import ecr = require("@aws-cdk/aws-ecr");
import ecs = require("@aws-cdk/aws-ecs");
```

And define the following properties object.

```typescript
interface CiCdStackProps extends cdk.StackProps {
  ecrRepository: ecr.Repository;
  ecsService: ecs.FargateService;
}
```

Now change the constructor of your CiCdStack to require your properties object.

```typescript
  constructor(scope: cdk.Construct, id: string, props: CiCdStackProps) {
```

Update the references in the `bin/cdk.ts` file, write/copy the following code:

```typescript
#!/usr/bin/env node

import cdk = require("@aws-cdk/core");
import 'source-map-support/register';
import { WebApplicationStack } from "../lib/web-application-stack";
import { NetworkStack } from "../lib/network-stack";
import { EcrStack } from "../lib/ecr-stack";
import { EcsStack } from "../lib/ecs-stack";
import { CiCdStack } from "../lib/cicd-stack";

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
```

Now, let's add an import statement into the `cicd-stack.ts` file:

```typescript
import codecommit = require('@aws-cdk/aws-codecommit');
```

Let's add the definition for our AWS CodeCommit repository. The AWS CDK consists of a comprehensive array of high level abstractions that both simplify the implementation of your CloudFormation templates as well as providing you with granular control over the resources you generate.

Let's define the CodeCommit repository we need for our Website. In the `cicd-stack.ts` write/copy the following code:

```typescript
const backendRepository = new codecommit.Repository(this, "BackendRepository", {
  repositoryName: "MythicalMysfits-BackendRepository"
});
```

We can have the generated CloudFormation template provide the clone urls for the generated CodeCommit respository by defining custom output properties defining `cdk.CfnOutput` constructs. Declare `cdk.CfnOutput` both for the HTTP and SSH clone URLs for our repositoriy. Once done, your file should look something list the code block below.

```typescript
import cdk = require("@aws-cdk/core");
import ecr = require("@aws-cdk/aws-ecr");
import ecs = require("@aws-cdk/aws-ecs");
import codecommit = require("@aws-cdk/aws-codecommit");

interface CiCdStackProps extends cdk.StackProps {
  ecrRepository: ecr.Repository;
  ecsService: ecs.FargateService;
}
export class CiCdStack extends cdk.Stack {
  constructor(scope: cdk.Construct, id: string, props: CiCdStackProps) {
    super(scope, id);

    const backendRepository = new codecommit.Repository(this, "BackendRepository", {
      repositoryName: "MythicalMysfits-BackendRepository"
    });

    new cdk.CfnOutput(this, 'BackendRepositoryCloneUrlHttp', {
      description: 'Backend Repository CloneUrl HTTP',
      value: backendRepository.repositoryCloneUrlHttp
    });

    new cdk.CfnOutput(this, 'BackendRepositoryCloneUrlSsh', {
      description: 'Backend Repository CloneUrl SSH',
      value: backendRepository.repositoryCloneUrlSsh
    });
  }
}
```

### Creating the CI/CD Pipeline

Let's install the CDK NPM package for AWS CodeBuild and AWS CodePipeline, execute the following command in the `workshop/cdk` directory:

```sh
npm install --save-dev @aws-cdk/aws-codebuild  @aws-cdk/aws-codepipeline  @aws-cdk/aws-codepipeline-actions
```

Add the required library import statements to the `cicd-stack.ts` file:

```typescript
import codebuild = require('@aws-cdk/aws-codebuild');
import codepipeline = require('@aws-cdk/aws-codepipeline');
import actions = require('@aws-cdk/aws-codepipeline-actions');
import iam = require('@aws-cdk/aws-iam');
```

Within the `CiCdStack` file, write/copy the following code to define our CodeBuild project to build our Python Flask web app:

```typescript
const codebuildProject = new codebuild.PipelineProject(this, "BuildProject", {
  projectName: "MythicalMysfitsServiceCodeBuildProject",
  environment: {
    computeType: codebuild.ComputeType.SMALL,
    buildImage: codebuild.LinuxBuildImage.UBUNTU_14_04_PYTHON_3_5_2,
    privileged: true,
    environmentVariables: {
      AWS_ACCOUNT_ID: {
        type: codebuild.BuildEnvironmentVariableType.PLAINTEXT,
        value: cdk.Aws.ACCOUNT_ID
      },
      AWS_DEFAULT_REGION: {
        type: codebuild.BuildEnvironmentVariableType.PLAINTEXT,
        value: cdk.Aws.REGION
      }
    }
  }
});
```

Provide the CodeBuild project with permissions to query the CodeCommit repository:

```typescript
const codeBuildPolicy = new iam.PolicyStatement();
codeBuildPolicy.addResources(backendRepository.repositoryArn)
codeBuildPolicy.addActions(
    "codecommit:ListBranches",
    "codecommit:ListRepositories",
    "codecommit:BatchGetRepositories",
    "codecommit:GitPull"
  )
codebuildProject.addToRolePolicy(
  codeBuildPolicy
);
```

Add permissions for the CodeBuild project to pull and push images to/from the ECR repository:

```typescript
props.ecrRepository.grantPullPush(codebuildProject.grantPrincipal);
```

Now, let's define the CodePipeline Source action which specifies where to obtain the web app source from, in our case our CodeCommit repository:

```typescript
const sourceOutput = new codepipeline.Artifact();
const sourceAction = new actions.CodeCommitSourceAction({
  actionName: "CodeCommit-Source",
  branch: "master",
  trigger: actions.CodeCommitTrigger.EVENTS,
  repository: backendRepository,
  output: sourceOutput
});
```

Define the CodePipeline Build action that uses the CodeBuild project we created earlier to build the Docker image with our Flask web app:

```typescript
const buildOutput = new codepipeline.Artifact();
const buildAction = new actions.CodeBuildAction({
  actionName: "Build",
  input: sourceOutput,
  outputs: [
    buildOutput
  ],
  project: codebuildProject
});
```

Now, define the ECS deployment action to tell CodePipeline how to deploy the output of the BuildAction:

```typescript
const deployAction = new actions.EcsDeployAction({
  actionName: "DeployAction",
  service: props.ecsService,
  input: buildOutput
});
```

Finally define the CodePipeline pipeline and stich all the stages/actions together:

```typescript
const pipeline = new codepipeline.Pipeline(this, "Pipeline", {
  pipelineName: "MythicalMysfitsPipeline"
});
pipeline.addStage({
  stageName: "Source",
  actions: [sourceAction]
});
pipeline.addStage({
  stageName: "Build",
  actions: [buildAction]
});
pipeline.addStage({
  stageName: "Deploy",
  actions: [deployAction]
});
```

Your `cicd-stack.ts` file should now look like this:

```typescript
import cdk = require("@aws-cdk/core");
import ecr = require("@aws-cdk/aws-ecr");
import ecs = require("@aws-cdk/aws-ecs");
import codecommit = require("@aws-cdk/aws-codecommit");
import codebuild = require("@aws-cdk/aws-codebuild");
import codepipeline = require("@aws-cdk/aws-codepipeline");
import actions = require("@aws-cdk/aws-codepipeline-actions");
import iam = require("@aws-cdk/aws-iam");

interface CiCdStackProps extends cdk.StackProps {
  ecrRepository: ecr.Repository;
  ecsService: ecs.FargateService;
}
export class CiCdStack extends cdk.Stack {
  constructor(scope: cdk.Construct, id: string, props: CiCdStackProps) {
    super(scope, id);

    const backendRepository = new codecommit.Repository(this, "BackendRepository", {
      repositoryName: "MythicalMysfits-BackendRepository"
    });

    const codebuildProject = new codebuild.PipelineProject(this, "BuildProject", {
      projectName: "MythicalMysfitsServiceCodeBuildProject",
      environment: {
        computeType: codebuild.ComputeType.SMALL,
        buildImage: codebuild.LinuxBuildImage.UBUNTU_14_04_PYTHON_3_5_2,
        privileged: true,
        environmentVariables: {
          AWS_ACCOUNT_ID: {
            type: codebuild.BuildEnvironmentVariableType.PLAINTEXT,
            value: cdk.Aws.ACCOUNT_ID
          },
          AWS_DEFAULT_REGION: {
            type: codebuild.BuildEnvironmentVariableType.PLAINTEXT,
            value: cdk.Aws.REGION
          }
        }
      }
    });
    const codeBuildPolicy = new iam.PolicyStatement();
    codeBuildPolicy.addResources(backendRepository.repositoryArn)
    codeBuildPolicy.addActions(
        "codecommit:ListBranches",
        "codecommit:ListRepositories",
        "codecommit:BatchGetRepositories",
        "codecommit:GitPull"
      )
    codebuildProject.addToRolePolicy(
      codeBuildPolicy
    );
    props.ecrRepository.grantPullPush(codebuildProject.grantPrincipal);

    const sourceOutput = new codepipeline.Artifact();
    const sourceAction = new actions.CodeCommitSourceAction({
      actionName: "CodeCommit-Source",
      branch: "master",
      trigger: actions.CodeCommitTrigger.POLL,
      repository: backendRepository,
      output: sourceOutput
    });
    const buildOutput = new codepipeline.Artifact();
    const buildAction = new actions.CodeBuildAction({
      actionName: "Build",
      input: sourceOutput,
      outputs: [
        buildOutput
      ],
      project: codebuildProject
    });
    const deployAction = new actions.EcsDeployAction({
      actionName: "DeployAction",
      service: props.ecsService,
      input: buildOutput
    });

    const pipeline = new codepipeline.Pipeline(this, "Pipeline", {
      pipelineName: "MythicalMysfitsPipeline"
    });
    pipeline.addStage({
      stageName: "Source",
      actions: [sourceAction]
    });
    pipeline.addStage({
      stageName: "Build",
      actions: [buildAction]
    });
    pipeline.addStage({
      stageName: "Deploy",
      actions: [deployAction]
    });

    new cdk.CfnOutput(this, 'BackendRepositoryCloneUrlHttp', {
      description: 'Backend Repository CloneUrl HTTP',
      value: backendRepository.repositoryCloneUrlHttp
    });

    new cdk.CfnOutput(this, 'BackendRepositoryCloneUrlSsh', {
      description: 'Backend Repository CloneUrl SSH',
      value: backendRepository.repositoryCloneUrlSsh
    });
  }
}
```

### Deploy the Pipeline

And now deploy the CICD stack:

```sh
cdk deploy MythicalMysfits-CICD
```

### Test the CI/CD Pipeline

#### Using Git with AWS CodeCommit
To test out the new pipeline, we need to configure git within your Cloud9 IDE and integrate it with your CodeCommit repository.

AWS CodeCommit provides a credential helper for git that we will use to make integration easy.  Run the following commands in sequence the terminal to configure git to be used with AWS CodeCommit (neither will report any response if successful):

```sh
git config --global user.name "REPLACE_ME_WITH_YOUR_NAME"
git config --global user.email REPLACE_ME_WITH_YOUR_EMAIL@example.com
git config --global credential.helper '!aws codecommit credential-helper $@'
git config --global credential.UseHttpPath true
```

Next change directories in your IDE to the environment directory using the terminal:

```sh
cd ~/environment/workshop
rm -rf app
```

Now, we are ready to clone our repository using the following terminal command:

```sh
git clone https://git-codecommit.$(aws configure get region).amazonaws.com/v1/repos/MythicalMysfits-BackendRepository app
```

This will tell us that our repository is empty!  Let's fix that by copying the application files into our repository directory using the following command:

```sh
cp -r ~/environment/workshop/source/module-2/app/* ~/environment/workshop/app
```

#### Pushing a Code Change

Now the completed service code that we used to create our Fargate service in the previous section is stored in the local repository that we just cloned from AWS CodeCommit.  Let's make a change to the Flask service before committing our changes, to demonstrate that the CI/CD pipeline we've created is working.

_Perform the following actions_

1. In Cloud9, open the file stored at `~/environment/workshop/app/service/mysfits-response.json`
2. Change the age of one of the mysfits to another value and save the file.

After saving the file, change directories to the new repository directory:

```sh
cd ~/environment/workshop/app/
```

Then, run the following git commands to push in your code changes.  

```sh
git add .
git commit -m "I changed the age of one of the mysfits."
git push
```

After the change is pushed into the repository, you can open the CodePipeline service in the AWS Console to view your changes as they progress through the CI/CD pipeline. After committing your code change, it will take about 5 to 10 minutes for the changes to be deployed to your live service running in Fargate.  During this time, AWS CodePipeline will orchestrate triggering a pipeline execution when the changes have been checked into your CodeCommit repository, trigger your CodeBuild project to initiate a new build, and retrieve the docker image that was pushed to ECR by CodeBuild and perform an automated ECS [Update Service](https://docs.aws.amazon.com/AmazonECS/latest/developerguide/update-service.html) action to connection drain the existing containers that are running in your service and replace them with the newly built image.  Refresh your Mythical Mysfits website in the browser to see that the changes have taken effect.

> **Note:** If you are not able to see the mysfits images, please [allow *mixed content* in your browser settings](https://docs.adobe.com/content/help/en/target/using/experiences/vec/troubleshoot-composer/mixed-content.html).

You can view the progress of your code change through the CodePipeline console here (no actions needed, just watch the automation in action!):
[AWS CodePipeline](https://console.aws.amazon.com/codepipeline/home)

This concludes Module 2.

[Proceed to Module 3](/module-3)


## [AWS Developer Center](https://developer.aws)
