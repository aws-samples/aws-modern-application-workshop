# Module 1: IDE Setup and Static Website Hosting

![Architecture](/images/module-1/architecture-module-1.png)

**Time to complete:** 20 minutes

---
**Short of time?:** If you are short of time, refer to the completed reference AWS CDK code in `module-1/cdk`

---

**Services used:**

* [AWS Cloud9](https://aws.amazon.com/cloud9/)
* [Amazon Simple Storage Service (S3)](https://aws.amazon.com/s3/)
* [Amazon CloudFront](https://aws.amazon.com/cloudfront/)

In this module, follow the instructions to create your cloud-based IDE on [AWS Cloud9](https://aws.amazon.com/cloud9/) and deploy the first version of the static Mythical Mysfits website.  [Amazon S3](https://aws.amazon.com/s3/) is a highly durable, highly available, and inexpensive object storage service that can serve stored objects directly via HTTP. Amazon CloudFront is a highly-secure CDN that provides both network and application level protection. Your traffic and applications benefit through a variety of built-in protections such as AWS Shield Standard, at no additional cost. You can also use configurable features such as AWS Certificate Manager (ACM) to create and manage custom SSL certificates at no extra cost.

The combination of S3 and CloudFront makes for a wonderfully useful capability for serving static web content (html, js, css, media content, etc.) directly to web browsers for sites on the Internet.  We will utilize S3 to host the content and the fast content delivery network (CDN) service, CloudFront, to securely deliver our Mythical Mysfits website to customers globally with low latency, high transfer speeds.

## Getting Started

### Sign In to the AWS Console

To begin, sign in to the [AWS Console](https://console.aws.amazon.com) for the AWS account you will be using in this workshop.

This web application can be deployed in any AWS region that supports all the services used in this application. The supported regions include:

* us-east-1 (N. Virginia)
* us-east-2 (Ohio)
* us-west-2 (Oregon)
* ap-southeast-1 (Singapore)
* ap-northeast-1 (Tokyo)
* eu-central-1 (Frankfurt)
* eu-west-1 (Ireland)

Select a region from the dropdown in the upper right corner of the AWS Management Console.

### Creating your Mythical Mysifts IDE

#### Create a new AWS Cloud9 Environment

 On the AWS Console home page, type **Cloud9** into the service search bar and select it:
 ![aws-console-home](/images/module-1/cloud9-service.png)

Click **Create Environment** on the Cloud9 home page:
![cloud9-home](/images/module-1/cloud9-home.png)

Name your environment **MythicalMysfitsIDE** with any description you'd like, and click **Next Step**:
![cloud9-name](/images/module-1/cloud9-name-ide.png)

Leave the Environment settings as their defaults and click **Next Step**:
![cloud9-configure](/images/module-1/cloud9-configure-env.png)

Click **Create Environment**:
![cloud9-review](/images/module-1/cloud9-review.png)

When the IDE has finished being created for you, you'll be presented with a welcome screen that looks like this:
![cloud9-welcome](/images/module-1/cloud9-welcome.png)

#### Cloning the Mythical Mysfits Workshop Repository

In the bottom panel of your new Cloud9 IDE, you will see a terminal command line terminal open and ready to use. First, let's create a directory within which we will store of the files created and used with this workshop:

```sh
mkdir workshop && cd workshop
```

Run the following git command in the terminal to clone the necessary code to complete this tutorial:

```sh
git clone -b python-cdk https://github.com/aws-samples/aws-modern-application-workshop.git source
```

After cloning the repository, you'll see that your project explorer now includes the files cloned:
![cloud9-explorer](/images/module-1/cloud9-explorer.png)

## Infrastructure As Code

Next, we will create the infrastructure components needed for creating a repository for your web application code, the hosting of a static website in Amazon S3 and delivering that content to your customers via the CloudFront Content Delivery Network (CDN). To achieve this we will generate our Infrastructure as Code using a tool called [AWS CloudFormation](https://aws.amazon.com/cloudformation/).

### AWS CloudFormation

AWS CloudFormation is a service that can programmatically provision AWS resources that you declare within JSON or YAML files called *CloudFormation Templates*, enabling the common best practice of *Infrastructure as Code*.  AWS CloudFormation enables you to:

* Create and provision AWS infrastructure deployments predictably and repeatedly.
* Leverage AWS products such as Amazon EC2, Amazon Elastic Block Store, Amazon SNS, Elastic Load Balancing, and Auto Scaling.
* Build highly reliable, highly scalable, cost-effective applications in the cloud without worrying about creating and configuring the underlying AWS infrastructure.
* Use a template file to create and delete a collection of resources together as a single unit (a stack).

### AWS Cloud Development Kit (AWS CDK)

To generate our CloudFormation, we will utilise the [AWS Cloud Development Kit](https://aws.amazon.com/cdk/) (also known as AWS CDK).  The AWS CDK is an open-source software development framework to define cloud infrastructure in code and provision it through AWS CloudFormation. The CDK integrates fully with AWS services and offers a higher level object-oriented abstraction to define AWS resources imperatively. Using the CDK’s library of infrastructure constructs, you can easily encapsulate AWS best practices in your infrastructure definition and share it without worrying about boilerplate logic. The CDK improves the end-to-end development experience because you get to use the power of modern programming languages to define your AWS infrastructure in a predictable and efficient manner.

The CDK can be used to define your cloud resources using one of the supported programming languages: C#/.NET, Java, JavaScript, Python, or TypeScript.  Developers can use one of the supported programming languages to define reusable cloud components known as Constructs. You compose these together into Stacks and Apps.

One of the biggest benefits from AWS CDK is the principal of reusability - Being able to write, reuse and share components throughout your application and team.  These components are referred to as Constructs within AWS CDK.  To this end, the code we will write in Module 1 will be reused throughout all remaining modules.

#### Install AWS CDK

If you haven't already, install the AWS CDK in your Cloud9 environment using the following command:

```sh
npm install -g aws-cdk
```

Run the following command to see the version number of the CDK:

```sh
cdk --version
```

#### Initialise CDK App folder

Within the `workshop` folder create a new folder to contain your AWS CDK application

```sh
mkdir cdk && cd cdk/
```

In the `cdk` folder, lets now initialize a CDK app, where LANGUAGE is one of the supported programming languages: csharp (C#), java (Java), python (Python), or typescript (TypeScript) and TEMPLATE is an optional template that creates an app with different resources than the default app that cdk init creates for the language.

`cdk init app --language LANGUAGE`

For the purposes of this workshop we will use TypeScript as our language:

```sh
cdk init app --language typescript
```

This command has now initialised a new CDK app in your `cdk` folder.  Part of the initialisation process also establishes the given directory as a new git repository.

Notice the standard structure of an AWS CDK app, that consists of a `bin` folder and a `lib` folder.

* The `bin` folder is where we will define the entry point for the CDK app.
* The `lib` folder is where we will define all our workshop infrastructure components.

> **Note:** please remove the `cdk/lib/cdk-stack.ts` and `cdk/test/cdk.test.ts` files as we will be creating our own stack files.

## Creating the Mythical Mysfits Website

Now, let's define the infrastructure needed to host our website.  

Create a new file called `web-application-stack.ts` in the `lib` folder, and define the skeleton class structure by writing/copying the following code:

```typescript
import cdk = require('@aws-cdk/core');

export class WebApplicationStack extends cdk.Stack {
  constructor(app: cdk.App, id: string) {
    super(app, id);

    // The code that defines your stack goes here
  }
}
```

Add an import statement for the `WebApplicationStack` to the `bin/cdk.ts` file.

```typescript
#!/usr/bin/env node
import 'source-map-support/register';
import cdk = require('@aws-cdk/core');
import { WebApplicationStack } from "../lib/web-application-stack";

const app = new cdk.App();
new WebApplicationStack(app, "MythicalMysfits-Website");
```

Now we have the required files, let's go through defining the S3 and CloudFront infrastructure.  But before we do that, we must add references to the appropriate npm packages that we will be using. Execute the following command from the `workshop/cdk/` directory:

```sh
npm install --save-dev @types/node @aws-cdk/aws-cloudfront @aws-cdk/aws-iam @aws-cdk/aws-s3 @aws-cdk/aws-s3-deployment
```

### Copy the Web Application Code

In your `workshop` root directory, create a new directory for the web application code:

```sh
cd ~/environment/workshop
mkdir web
```

Copy the website static content from the `source/module-1/web` directory:

```sh
cp -r source/module-1/web/* ./web
```

### Define the Website root directory

Ensure the webAppRoot variable points to the `~/environment/workshop/web` directory. In the `web-application-stack.ts` file, we want to import the `path` module, which we will use to resolve the path to our website folder:

```typescript
import path = require('path');
```

Next, import the AWS CDK libraries we will be using.

```typescript
import s3 = require('@aws-cdk/aws-s3');
import cloudfront = require('@aws-cdk/aws-cloudfront');
import iam = require('@aws-cdk/aws-iam');
import s3deploy = require('@aws-cdk/aws-s3-deployment');
```

Now, within the `web-application-stack.ts` constructor, write the folllowing code.

```typescript
const webAppRoot = path.resolve(__dirname, '..', '..', 'web');
```

### Define the S3 bucket

We are going to define our S3 bucket and define the web index document as 'index.html'

```typescript
const bucket = new s3.Bucket(this, "Bucket", {
  websiteIndexDocument: "index.html"
});
```

### Restrict access to the S3 bucket

We want to restrict access to our S3 bucket, and only allow access from the CloudFront distribution. We'll use an [Origin Access Identity (OAI)](https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/private-content-restricting-access-to-s3.html) to allow CloudFront to access and serve files to our users.

Within the `web-application-stack.ts` constructor write the folllowing code:

```typescript
// Obtain the cloudfront origin access identity so that the s3 bucket may be restricted to it.
const origin = new cloudfront.OriginAccessIdentity(this, "BucketOrigin", {
    comment: "mythical-mysfits"
});

// Restrict the S3 bucket via a bucket policy that only allows our CloudFront distribution
bucket.grantRead(new iam.CanonicalUserPrincipal(
  origin.cloudFrontOriginAccessIdentityS3CanonicalUserId
));
```

### CloudFront Distribution

Next, Write the definition for a new CloudFront web distribution:

```typescript
const cdn = new cloudfront.CloudFrontWebDistribution(this, "CloudFront", {
  viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.ALLOW_ALL,
  priceClass: cloudfront.PriceClass.PRICE_CLASS_ALL,
  originConfigs: [
    {
      behaviors: [
        {
          isDefaultBehavior: true,
          maxTtl: undefined,
          allowedMethods:
            cloudfront.CloudFrontAllowedMethods.GET_HEAD_OPTIONS
        }
      ],
      originPath: `/web`,
      s3OriginSource: {
        s3BucketSource: bucket,
        originAccessIdentity: origin
      }
    }
  ]
});
```

### Upload the website content to the S3 bucket

Now we want to use a handy CDK helper that takes the defined source directory, compresses it, and uploads it to the destination s3 bucket:

```typescript
new s3deploy.BucketDeployment(this, "DeployWebsite", {
  sources: [
    s3deploy.Source.asset(webAppRoot)
  ],
  destinationKeyPrefix: "web/",
  destinationBucket: bucket,
  distribution: cdn,
  retainOnDelete: false
});
```

### CloudFormation Outputs

Finally, we want to define a cloudformation output for the domain name assigned to our CloudFront distribution:

```typescript
new cdk.CfnOutput(this, "CloudFrontURL", {
  description: "The CloudFront distribution URL",
  value: "https://" + cdn.domainName
});
```

With that, we have completed writing the components of our module 1 stack.  Your `cdk` folder should resemble like the reference implementation, which can be found in the `workshop/source/module-1/cdk` directory.

### View the synthesized CloudFormation template

From within the `workshop/cdk/` folder run the `cdk synth MythicalMysfits-Website` command to display the CloudFormation template that is generated based on the code you have just written.

### Deploy the Website and Infrastructure

The first time you deploy an AWS CDK app that deploys content into a S3 environment you’ll need to install a “bootstrap stack”. This function creates the resources required for the CDK toolkit’s operation. Currently the bootstrap command creates only an Amazon S3 bucket.

> **Note:** You incur any charges for what the AWS CDK stores in the bucket. Because the AWS CDK does not remove any objects from the bucket, the bucket can accumulate objects as you use the AWS CDK. You can get rid of the bucket by deleting the MythicalMysfits-Website stack from your account.

```sh
cdk bootstrap
```

We can now deploy the `MythicalMysfits-Website` by executing the `cdk deploy` command from within the `cdk` folder and defining the stack we wish to deploy, such as:

  cdk deploy _stackname_

Execute the following command:

```sh
cdk deploy MythicalMysfits-Website
```

You will be prompted with a messages such as `Do you wish to deploy these changes (y/n)?` to which you should respond by typing `y`

The AWS CDK will then perform the following actions:

* Creates an S3 Bucket
* Creates a CloudFront distribution to deliver the website code hosted in S3
* Enables access for CloudFront to access the S3 Bucket
* Removes any existing files in the bucket.
* Copies the local static content to the bucket.
* Prints the URL where you can visit your site.

Try to navigate to the URL displayed and see your website.

![mysfits-welcome](/images/module-1/mysfits-welcome.png)

> **Note:** If you are not able to see the mysfits images, please [allow *mixed content* in your browser settings](https://docs.adobe.com/content/help/en/target/using/experiences/vec/troubleshoot-composer/mixed-content.html).

Congratulations, you have created the basic static Mythical Mysfits Website!

That concludes Module 1.

[Proceed to Module 2](/module-2)

## [AWS Developer Center](https://developer.aws)
