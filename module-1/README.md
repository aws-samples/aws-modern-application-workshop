# Module 1: IDE Setup and Static Website Hosting

![Architecture](/images/module-1/architecture-module-1.png)

**Time to complete:** 20 minutes

**Services used:**

* [Amazon Simple Storage Service (S3)](https://aws.amazon.com/s3/)
* [Amazon CloudFront](https://aws.amazon.com/cloudfront/)

In this module, follow the instructions to set up your environment with Visual Studio Code to deploy the first version of the static Mythical Mysfits website.  Amazon S3 is a highly durable, highly available, and inexpensive object storage service that can serve stored objects directly via HTTP.  Amazon CloudFront is a highly-secure CDN that provides both network and application level protection. Your traffic and applications benefit through a variety of built-in protections such as AWS Shield Standard, at no additional cost. You can also use configurable features such as AWS Certificate Manager (ACM) to create and manage custom SSL certificates at no extra cost.

The combination of S3 and CloudFront makes for a wonderfully useful capability for serving static web content (html, js, css, media content, etc.) directly to web browsers for sites on the Internet.  We will utilize S3 to host the content and the fast content delivery network (CDN) service, CloudFront, to securely deliver our Mythical Mysfits website to customers globally with low latency, high transfer speeds.

## Getting Started: Configuring your environment for Mythical Mysfits

### Install required tools

* [Visual Studio Code](https://code.visualstudio.com/)
* [git](https://git-scm.com/downloads)
* [AWS CLI](https://aws.amazon.com/cli/) or [AWS Tools for PowerShell](https://aws.amazon.com/powershell/)
  * Pick a tool based on the environment you're more comfortable with:
    * Bash -- AWS CLI
    * PowerShell -- AWS Tools for PowerShell
* [Node.js and NPM](https://nodejs.org/en/)
* [.NET Core 2.1](https://www.microsoft.com/net/download)
* [AWS CDK](https://docs.aws.amazon.com/CDK/latest/userguide/getting_started.html)
  * npm install -g aws-cdk
* [Angular CLI](https://cli.angular.io/)
  * npm install -g @angular/cli

### Clone the Mythical Mysfits Workshop Repository

Open the terminal in Visual Studio Code, located under **View > Terminal**

First, we will create a directory within which we will store of the files created and used with this workshop.

**Action:** Create to a suitable directory to store your work for this workshop (such as ~/Workshop)

```sh
mkdir ~/Workshop
```

We will refer to this directory as your `Root Folder`.  After creating the `Root Folder`, click **Open Folder** in Visual Studio Code.

**Action:** In the terminal, change directory to your workshop root directory:

```sh
cd ~/WorkShop
```

Now we will clone the workshop repository which contains the workshops source code, and reference implementations.  

**Action:** To continue, execute the following commands.

```sh
git clone https://github.com/aws-samples/aws-modern-application-workshop.git source
```

You have now cloned the workshop directory which will provide you with source code that supports this workshop.

Now, let's prepare the Single Page Web Application we want to host.

## Single Page Web Application (SPA)

In the module-1 folder, the `frontend` folder includes a fully built [Angular](https://angular.io/) application. This application was generated using `ng new`, and we added the basic features for the Mythical Mysfits web app. Included is the [Bootstrap framework](https://getbootstrap.com/) and a popular Angular library [ng-bootstrap](https://ng-bootstrap.github.io/#/home). Both give pre-built UX features and layout options.

**Action:** Switch to the module-1 folder

```sh
cd ~/Workshop/source/
```

```sh
git checkout dotnet
```

```sh
cd module-1
```

### Overview of the `frontend`

This version of the frontend has all of the Mysfits data hardcoded into the `MythicalMysfitProfileService` (located at `frontend/src/app/services/mythical-mysfit-profile.service.ts`). This is an injectable [Angular service](https://angular.io/tutorial/toh-pt4) created to work with Mysfit profile data. In the following modules, we'll update this service to pull the Mysfits data from an API we create.

### Copy the Web Application

**Action:** Copy the web application source code from the module 1 directory

```sh
mkdir ~/Workshop/frontend
```

```sh
git init
```

```sh
cp -r ~/Workshop/source/frontend/* ~/Workshop/frontend/
```

```sh
cd ~/Workshop/frontend/
```

```sh
git add .
```

```sh
git commit -m 'Initial commit of frontend code'
```

### Configure the Web Application

Before you can build and publish your Angular app, you will need to create a production Angular environment file located in your `~/Workshop/frontend/src/environments/` folder. Make sure the file is named `environment.prod.ts`.

**Action:** Create a file `~/Workshop/frontend/src/environments/environment.prod.ts`

**Action:** Open the `environment.prod.ts` file in VS Code and copy the properties from the `environment.ts` file located in the same folder. The property at this point should only be the following:

```js
export const environment = {
  production: false
};
```

In `environment.prod.ts`, change `production` to `true`.

**Action:** Add this environment file to the git repo.

```sh
git add ./src/environments/environment.prod.ts
```

```sh
git commit -m 'Addition of environment.prod.ts'
```

### Build your Web Application

**Action:** Run `npm install` to install all the prerequisites for your web application

**Action:** Run `npm run build -- --prod` to create a `production` build of your Angular application.

Your web application is now ready to deploy.  We will use the code  you just generated in the next step.

## Infrastructure As Code

Next, we will create the infrastructure components needed for creating a GIT repository for your web application code, the hosting of a static website in Amazon S3 and delivering that content to your customers via the CloudFront Content Delivery Network (CDN).  To achieve this we will generate our Infrastructure as Code using a tool called AWS CloudFormation.

### AWS CloudFormation

AWS CloudFormation is a service that can programmatically provision AWS resources that you declare within JSON or YAML files called *CloudFormation Templates*, enabling the common best practice of *Infrastructure as Code*.  AWS CloudFormation enables you to:

* Create and provision AWS infrastructure deployments predictably and repeatedly.
* Leverage AWS products such as Amazon EC2, Amazon Elastic Block Store, Amazon SNS, Elastic Load Balancing, and Auto Scaling.
* Build highly reliable, highly scalable, cost-effective applications in the cloud without worrying about creating and configuring the underlying AWS infrastructure.
* Use a template file to create and delete a collection of resources together as a single unit (a stack).

### AWS Cloud Development Kit

To generate our CloudFormation, we will utilise the [AWS Cloud Development Kit](https://docs.aws.amazon.com/cdk/latest/guide/what-is.html) (aka AWS CDK).  The AWS Cloud Development Kit (AWS CDK) is an open-source software development framework to define cloud infrastructure in code and provision it through AWS CloudFormation. The CDK integrates fully with AWS services and offers a higher level object-oriented abstraction to define AWS resources imperatively. Using the CDK’s library of infrastructure constructs, you can easily encapsulate AWS best practices in your infrastructure definition and share it without worrying about boilerplate logic. The CDK improves the end-to-end development experience because you get to use the power of modern programming languages to define your AWS infrastructure in a predictable and efficient manner.

The CDK can be used to define your cloud resources using one of the supported programming languages: C#/.NET, Java, JavaScript, Python, or TypeScript.  Developers can use one of the supported programming languages to define reusable cloud components known as Constructs. You compose these together into Stacks and Apps.

One of the biggest benefits from AWS CDK is the principal of reusability - Being able to write, reuse and share components throughout your application and team.  These components are referred to as Constructs within AWS CDK.  To this end, the code we will write in Module 1 will be reused throughout all remaining modules.

#### Install AWS CDK

**Action:** If you haven't already, install the AWS CDK using the following command.

```sh
npm install -g aws-cdk
```

**Action:** Run the following command to see the version number of the CDK.

```sh
cdk --version
```

### Initialise CDK App folder

**Action:** Switch to your workshops CDK folder

```sh
cd ~/Workshop/cdk
```

In the cdk folder, lets now initialize a cdk app, where LANGUAGE is one of the supported programming languages: csharp (C#), java (Java), python (Python), or typescript (TypeScript) and TEMPLATE is an optional template that creates an app with different resources than the default app that cdk init creates for the language.

_cdk init app --language LANGUAGE_

For the purposes of this workshop we will use TypeScript as our language.

**Action:** Execute the following command:

```sh
cdk init app --language=typescript
```

This command has now initialised a new CDK app in your `~/Workshop/cdk` folder.

#### AWS CDK folder structure

Now, let's implement the code to host our web application.  Open the `cdk` folder in VS Code.

The standard structure of an AWS CDK app consists of a `bin` folder and a `lib` folder.

* The `bin` folder is where we will define the entry point for the CDK app.
* The `lib` folder is where we will define all our workshop infrastructure components.

before we start implementing our code, let's get typescript to watch for file changes and compile the javascript whenever a change is detected by running the following command from the terminal.

```sh
npm run watch
```

### Code the GIT repositories for our CDK and our Web applications (DeveloperToolsStack)

Next, within the lib folder you should find a file with the default name of `cdk-stack.ts`.  Rename this file to `developertoolsstack.ts`.  Open this file in VS Code and rename the class that already exists to `DeveloperToolsStack`, as illustrated below.

**Action:** Write/Copy the following code:

```typescript
import cdk = require('@aws-cdk/cdk');

export class DeveloperToolsStack extends cdk.Stack {
  constructor(scope: cdk.Construct, id: string) {
      super(scope, id);
    // The code that defines your stack goes here
  }
}
```

Following the change of filename and classname, you should now update the references in the `bin/cdk.ts` file, as such.

**Action:** Write/Copy the following code:

```typescript
#!/usr/bin/env node
import 'source-map-support/register';
import cdk = require('@aws-cdk/cdk');
import { DeveloperToolsStack } from '../lib/developertoolsstack';

const app = new cdk.App();
new DeveloperToolsStack(app, 'MythicalMysfits-DeveloperTools');
```

AWS CodeCommit is a version control service that enables you to privately store and manage Git repositories in the AWS cloud. For further information on CodeCommit, see the [AWS CodeCommit documentation](https://docs.aws.amazon.com/codecommit).

Next, we will define the code that generates the CodeCommit repository.  But before we do that, we must add a reference to the appropriate `@aws-cdk/aws-codecommit` npm package.

**Action:** Execute the following command from the `~/Workshop/cdk/` directory

```sh
npm install --save-dev @aws-cdk/aws-codecommit
```

Now add an import statement into the `developertoolsstack.ts` file.

**Action:** Write/Copy the following code:

```typescript
import codecommit = require('@aws-cdk/aws-codecommit');
```

Once that has completed, let's proceed with defining our AWS CodeCommit repositories.  The AWS CDK consists of a comprehensive array of high level abstractions that both simplify the implementation of your CloudFormation templates as well as providing you with granular control over the resources you generate.

The AWS CodeCommit repositories are defined by using the `Repository` construct as follows:

```typescript
const repo = new codecommit.Repository(this, 'Repository' ,{
    repositoryName: 'MyRepositoryName',
    description: 'Some description.', // optional property
});
```

Define your repositories now within the `developertoolsstack.ts` file.

**Action:** Write/Copy the following code:

```typescript
const cdkRepository = new codecommit.Repository(this, "CDKRepository", {
  repositoryName: "MythicalMysfitsService-Repository-CDK"
});

const webRepository = new codecommit.Repository(this, "WebRepository", {
  repositoryName: "MythicalMysfitsService-Repository-Web"
});
```

We can have the generated CloudFormation template output the clone url for the CodeCommit respositories we create by defining custom output properties `cdk.CfnOutput`, such as,

**Action:** Write/Copy the following code:

```typescript
new cdk.CfnOutput(this, 'repositoryCloneUrlHttp', {
  description: 'Repository CloneUrl HTTP',
  value: myRepository.repositoryCloneUrlHttp
});
```

Declare `CfnOutput` for the HTTP and SSH clone URLs for each of your repositories.  Once done, your file should look something list the code block bellow.

**Action:** Write/Copy the following code:

```typescript
import cdk = require('@aws-cdk/cdk');
import codecommit = require("@aws-cdk/aws-codecommit");

export class DeveloperToolsStack extends cdk.Stack {
   constructor(scope: cdk.Construct, id: string) {
    super(scope, id);

    const cdkRepository = new codecommit.Repository(this, "CDKRepository", {
        repositoryName: "MythicalMysfitsService-Repository-CDK"
    });

    const webRepository = new codecommit.Repository(this, "WebRepository", {
        repositoryName: "MythicalMysfitsService-Repository-Web"
    });

    new cdk.CfnOutput(this, 'CDKRepositoryCloneUrlHttp', {
      description: 'CDK Repository CloneUrl HTTP',
      value: cdkRepository.repositoryCloneUrlHttp
    });

    new cdk.CfnOutput(this, 'CDKRepositoryCloneUrlSsh', {
      description: 'CDK Repository CloneUrl SSH',
      value: cdkRepository.repositoryCloneUrlSsh
    });

    new cdk.CfnOutput(this, 'WebRepositoryCloneUrlHttp', {
      description: 'Web Repository CloneUrl HTTP',
      value: webRepository.repositoryCloneUrlHttp
    });

    new cdk.CfnOutput(this, 'WebRepositoryCloneUrlSsh', {
      description: 'Web Repository CloneUrl SSH',
      value: webRepository.repositoryCloneUrlSsh
    });
  }
}
```

### Deploy the GIT repositories

Before we deploy our GIT repositories we can view the CloudFormation template that will be generated by executing the `cdk synth` command.  Do this now

**Action:** Execute the following command:

```sh
cdk synth MythicalMysfits-DeveloperTools
```

We can deploy the `MythicalMysfits-DeveloperToolsStack` by executing the `cdk deploy` command from within the `cdk` folder and defining the stack we wish to deploy, such as:

  cdk deploy _stackname_

**Action:** Execute the following command:

```sh
cdk deploy MythicalMysfits-DeveloperTools
```

You may be prompted with a messages such as `Do you wish to deploy these changes (y/n)?` to which you should respond by typing `y`

### Bind to your new GIT Repository remotes

Now that you have created your CodeCommit repositories, you should connect to them from your local repositories.  This involves selecting a method by which you wish to communicate (HTTPS or GIT/SSH) and then lastly adding the CodeCommit repository as a remote and pushing your changes.

#### Choose connection method

Choose between connecting to your AWS CodeCommit repositories via HTTPS or SSH.  The easiest way to set up CodeCommit is to configure HTTPS Git credentials for AWS CodeCommit. This HTTPS authentication method:

* Uses a static user name and password.
* Works with all operating systems supported by CodeCommit.
* Is also compatible with integrated development environments (IDEs) and other development tools that support Git credentials.

Refer to [https://docs.aws.amazon.com/codecommit/latest/userguide/setting-up.html](https://docs.aws.amazon.com/codecommit/latest/userguide/setting-up.html) for details on how to configure for connections using HTTP.

Refer to [https://docs.aws.amazon.com/codecommit/latest/userguide/setting-up.html#setting-up-standard](https://docs.aws.amazon.com/codecommit/latest/userguide/setting-up.html#setting-up-standard) for details on how to configure connections via GIT Credentials (SSH)

#### Add CodeCommit Repository and push changes

For both your `~/Workshop/cdk` and `~/Workshop/frontend` folders repeat the following steps:

##### Add the CodeCommit repository as a remote

`git remote add origin <Repository URL for selected connection method (https/git-ssh)`

for example:

`git remote add origin https://git-codecommit.eu-west-1.amazonaws.com/v1/repos/MythicalMysfitsService-Repository-Web`

or

`git remote add origin ssh://git-codecommit.eu-west-1.amazonaws.com/v1/repos/MythicalMysfitsService-Repository-Web`

##### Push your changes

**Action:** Execute the following command:

`git push origin master`

## Code the Web Application Infrastructure

Add an import statement for the `WebApplicationStack` to the `bin/cdk.ts` file.

**Action:** Write/Copy the following code:

```typescript
import { WebApplicationStack } from "../lib/webapplicationstack";
...
new WebApplicationStack(app, "MythicalMysfits-WebApplication");

```

Next, Create a new file called `webapplicationstack.ts` the `lib` folder define the skeleton class structure, as illustrated below.

**Action:** Write/Copy the following code:

```typescript
import cdk = require('@aws-cdk/cdk');

export class WebApplicationStack extends cdk.Stack {
  constructor(app: cdk.App, id: string) {
    super(app, id);

    // The code that defines your stack goes here
  }
}
```

Now we have the required files, let's go through defining the S3 and CloudFront infrastructure.  But before we do that, we must add references to the appropriate npm packages that we will be using.

Execute the following commands from the `~/Workshop/cdk/` directory

**Action:** Execute the following command:

```sh
npm install --save-dev @aws-cdk/aws-cloudfront
```

```sh
npm install --save-dev @aws-cdk/aws-iam
```

```sh
npm install --save-dev @aws-cdk/aws-s3
```

```sh
npm install --save-dev @aws-cdk/aws-s3-deployment
```

### Define the Web Application root directory

Ensure the webAppRoot variable points to the `~/Workshop/frontend/dist/` directory

**Action:** Write/Copy the following code:

```typescript
const webAppRoot = path.resolve(__dirname, '..', '..', 'frontend', 'dist');
```

### Define the S3 bucket

We are going to define our S3 bucket and define the web index document as 'index.html'

**Action:** Write/Copy the following code:

```typescript
const bucket = new s3.Bucket(this, "Bucket", {
  websiteIndexDocument: "index.html"
});
```

### Restrict access to the S3 bucket

Next we obtain the cloudfront origin access identity so that the s3 bucket may be restricted to it.  Then we define an IAM policy to restrict access to the S3 bucket so that only CloudFront distribution can access it.

**Action:** Write/Copy the following code:

```typescript
const origin = new cloudfront.CfnCloudFrontOriginAccessIdentity(this, "BucketOrigin", {
  cloudFrontOriginAccessIdentityConfig: {
    comment: "mythical-mysfits"
  }
});

bucket.grantRead(new iam.CanonicalUserPrincipal(
  origin.cloudFrontOriginAccessIdentityS3CanonicalUserId
));
```

### CloudFront Distribution

Next, Write the definition for a new CloudFront web distribution.

**Action:** Write/Copy the following code:

```typescript
const cdn = new cloudfront.CloudFrontWebDistribution(this, "CloudFront", {
  viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.AllowAll,
  priceClass: cloudfront.PriceClass.PriceClassAll,
  originConfigs: [
    {
      behaviors: [
        {
          isDefaultBehavior: true,
          maxTtlSeconds: undefined,
          allowedMethods:
            cloudfront.CloudFrontAllowedMethods.GET_HEAD_OPTIONS
        }
      ],
      originPath: `/web`,
      s3OriginSource: {
        s3BucketSource: bucket,
        originAccessIdentityId: origin.cloudFrontOriginAccessIdentityId
      }
    }
  ]
});
```

### CloudFormation Outputs

Last of all, we want to define a cloudformation output for the domain name assigned to our CloudFront distribution.

**Action:** Write/Copy the following code:

```typescript
new cdk.CfnOutput(this, "CloudFrontURL", {
  description: "The CloudFront distribution URL",
  value: "https://" + cdn.domainName
});
```

With that, we have completed writing the components of our module 1 stack.  Your `cdk` folder should resemble like the reference implementation, which can be found in the `~/Workshop/source/module-1/cdk/` directory.

### View the synthesized CloudFormation template

From within the `~/Workshop/cdk` folder run the `cdk synth MythicalMysfits-WebApplication` command to display the CloudFormation template that is generated based on the code you have just written.

### Deploy the Web Application Infrastructure

The first time you deploy an AWS CDK app that deploys content into a S3 environment you’ll need to install a “bootstrap stack”. This function creates the resources required for the CDK toolkit’s operation. For example, the stack includes an S3 bucket that is used to store templates and assets during the deployment process.

### Deploy the Website and Infrastructure

Before you can use the AWS CDK you must bootstrap the AWS CDK to create the infrastructure that the AWS CDK needs. Currently the bootstrap command creates only an Amazon S3 bucket.

You incur any charges for what the AWS CDK stores in the bucket. Because the AWS CDK does not remove any objects from the bucket, the bucket can accumulate objects as you use the AWS CDK. You can get rid of the bucket by deleting the CDKToolkit stack from your account.

```sh
cdk bootstrap aws://1234567890/eu-west-1
```

We can deploy the `MythicalMysfits-WebApplication` by executing the `cdk deploy` command from within the `cdk` folder and defining the stack we wish to deploy, such as:

  cdk deploy _stackname_

Execute the following command

**Action:** Execute the following command:

```sh
cdk deploy MythicalMysfits-WebApplication
```

You will be prompted with a messages such as `Do you wish to deploy these changes (y/n)?` to which you should respond by typing `y`

The AWS CDK will then perform the following actions:

* Generate the AWS CodeCommit repositories for us to store our `web` and `CDK` code
* Creates an S3 Bucket
* Creates a CloudFront distribution to deliver the website code hosted in S3
* Enables access for CloudFront to access the S3 Bucket
* Removes any existing files in the bucket.
* Copies the local files from the Angular build directory located at `frontend/dist`.
* Prints the URL where you can visit your site.

Why not navigate to the URL displayed.

![mysfits-welcome](/images/module-1/mysfits-welcome.png)

Congratulations, you have created the basic static Mythical Mysfits Website!

That concludes Module 1.

[Proceed to Module 2](/module-2)


## [AWS Developer Center](https://developer.aws)
