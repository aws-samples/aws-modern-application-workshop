# Module 1: IDE Setup and Static Website Hosting

![Architecture](/images/module-1/architecture-module-1.png)

**Time to complete:** 20 minutes

**Services used:**
* [Amazon Simple Storage Service (S3)](https://aws.amazon.com/s3/)

In this module, follow the instructions to set up your environment with Visual Studio Code to deploy the first version of the static Mythical Mysfits website.  Amazon S3 is a highly durable, highly available, and inexpensive object storage service that can serve stored objects directly via HTTP. This makes it wonderfully useful for serving static web content (html, js, css, media content, etc.) directly to web browsers for sites on the Internet.  We will utilize S3 to host the content for our Mythical Mysfits website.

### Getting Started: Configuring your environment for Mythical Mysfits

#### Install required tools
* [Visual Studio Code](https://code.visualstudio.com/)
* [git](https://git-scm.com/downloads)
* [AWS CLI](https://aws.amazon.com/cli/) or [AWS Tools for PowerShell](https://aws.amazon.com/powershell/)
    * Pick a tool based on the environment you're more comfortable with:
        * Bash -- AWS CLI
        * PowerShell -- AWS Tools for PowerShell
    * Configure tool to use your AWS account
        * [AWS CLIz](https://docs.aws.amazon.com/cli/latest/userguide/cli-chap-configure.html)
        * [Powershell](https://docs.aws.amazon.com/powershell/latest/userguide/specifying-your-aws-credentials.html)
* [Node.js and NPM](https://nodejs.org/en/) - v12 or greater
* [.NET Core 2.1](https://www.microsoft.com/net/download)
* [Angular CLI](https://cli.angular.io/)
    * npm install -g @angular/cli
* [AWS Amplify](https://aws-amplify.github.io/)
    * npm install -g @aws-amplify/cli

#### Clone the Mythical Mysfits Workshop Repository

Open the terminal in Visual Studio Code, located under **View > Terminal**

Type the following `git` command to clone the necessary code to complete this tutorial:

```
git clone https://github.com/aws-samples/aws-modern-application-workshop.git
```

Make sure you are working on dotnet branch either on your favorite git client or using the following command:
```
git checkout origin/dotnet
```

After cloning the repository, click **Open Folder** in Visual Studio Code and find the directory you just cloned. It will be named `aws-modern-application-workshop`.


In the terminal, change directory to the newly cloned repository directory:

```
cd aws-modern-application-workshop
```

### Creating a Static Website in Amazon S3

#### Overview of the `frontend`
In the `frontend` folder, the repo includes a fully built [Angular](https://angular.io/) application. This application was generated using `ng new`, and we added the basic features for the Mythical Mysfits web app. Included is the [Bootstrap framework](https://getbootstrap.com/) and a popular Angular library [ng-bootstrap](https://ng-bootstrap.github.io/#/home). Both give pre-built UX features and layout options.

This version of the frontend has all of the Mysfits data hardcoded into the `MythicalMysfitProfileService` (located at `frontend/src/app/services/mythical-mysfit-profile.service.ts`). This is an injectable [Angular service](https://angular.io/tutorial/toh-pt4) created to work with Mysfit profile data. In the following modules, we'll update this service to pull the Mysfits data from an API we create.

#### Create an S3 Bucket and Configure it for Website Hosting
Before you can build and publish your Angular app, you will need to create a production Angular environment file located in the `./module-1/frontend/src/environments/` folder. Make sure the file is named `environment.prod.ts`.

Open the `environment.prod.ts` file in VS Code and copy the properties from the `environment.ts` file located in the same folder. The property at this point should only be the following:
```js
export const environment = {
  production: false
};
```

In `environment.prod.ts`, change `production` to `true`.

Next, we will create the infrastructure components needed for hosting a static website in Amazon S3 via the AWS CLI or the AWS Tools for PowerShell.

Included in the [deploy-frontend-scripts](/deploy-frontend-scripts) folder are two scripts for deploying your Angular application. `deploy-frontend-scripts/deploy_frontend.sh` is a `bash` script for *nix systems and `deploy-frontend-scripts/Deploy-Frontend.ps1` is a PowerShell script for Windows systems and systems that support [PowerShell Core](https://github.com/PowerShell/PowerShell).

Choose `deploy_frontend.sh` if you're using the [AWS CLI](https://aws.amazon.com/cli/), or choose `Deploy_Frontend.ps1` if you're using the [AWS Tools for PowerShell](https://aws.amazon.com/powershell/).

Both scripts do the following:
* Runs `npm run build -- --prod` to create a `production` build of your Angular application.
* Creates an S3 Bucket with the following naming scheme: `PROJECT_NAME-frontend-AWS_ACCOUNT_ID`
    * The project name is set as `mythical-mysfits` in both scripts.
* Enables the S3 Bucket to host a website.
* Removes any existing files in the bucket.
* Copies the local files from the Angular build directory located at `frontend/dist`.
* Prints the URL where you can visit your site.

To verify your S3 bucket was created, you can use these commands:
```
aws s3api list-buckets --query 'Buckets[?starts_with(Name, `mythical-mysfits-frontend`) == `true`]'
```
```
Get-S3Bucket | Where-Object { $_.BucketName -Like "mythical-mysfits-frontend*" }
```
#### (Optional) Use AWS Amplify to Configure Website Hosting
Instead of using the deploy scripts in the `deploy-frontend-scripts` folder, we can use a toolchain called [AWS Amplify](https://aws-amplify.github.io/). AWS Amplify is a library and CLI tool built to help quickly create, deploy, and use backend services with client applications in JavaScript, iOS, and Android.

We'll use AWS Amplify later in the tutorial to add authentication, user sign-in, and API access, but the AWS Amplify CLI also includes a feature for `hosting`.

**It's important to note:** Only choose one method of deployment – either use the deployment scripts or AWS Amplify.

Follow these minimum steps for working with the AWS Amplify CLI, or view the full [Getting Started guide](https://aws-amplify.github.io/amplify-js/media/quick_start?platform=purejs).

* Install the AWS Amplify CLI:
    * npm install -g @aws-amplify/cli
    * amplify configure
* Navigate to the `frontend` directory.
* Run `amplify init` in the `frontend` directory and select the following options:
    * Choose your default editor: `Visual Studio Code`
    * Choose the type of app that you're building: `javascript`
    * What javascript framework are you using: `angular`
    * Source Directory Path: `src`
    * Distribution Directory Path: `dist`
    * Build Command: `npm run build -- --prod`
    * Start Command: `npm start`
* Run `amplify add hosting`
    * Select `PROD (S3 with CloudFront using HTTPS)`
    * Provide a [globally unique name](https://docs.aws.amazon.com/AmazonS3/latest/dev/BucketRestrictions.html) for your hosting bucket
* Run `amplify publish`

AWS Amplify will automatically create a CloudFormation stack for you. You'll now have a working web app that uses S3 for hosting and [Amazon CloudFront](https://aws.amazon.com/cloudfront/) as a CDN.

![mysfits-welcome](/images/module-1/mysfits-welcome.png)

Congratulations, you have created the basic static Mythical Mysfits Website!

That concludes Module 1.

[Proceed to Module 2](/module-2)


## [AWS Developer Center](https://developer.aws)
