# Module 1: IDE Setup and Static Website Hosting

![Architecture](/images/module-1/architecture-module-1.png)

**Time to complete:** 20 minutes

**Services used:**
* AWS Cloud9
* Amazon CloudFront
* Amazon Simple Storage Service (S3)

In this module, follow the instructions to create your cloud-based IDE on AWS Cloud9 and deploy the first version of the static Mythical Mysfits website.  The content will be served from Amazon CloudFront content delivery service, with the source stored in Amazon S3. This combination allows highly scalable and secure serving in CloudFront, while S3 storage provides a highly durable, highly available, and inexpensive object storage service. This makes it wonderfully useful for serving static web content (html, js, css, media content, etc.) directly to web browsers for sites on the Internet.

### Getting Started

#### Sign In to the AWS Console
To begin, sign in to the AWS Console for the AWS account you will be using in this workshop.

This web application can be deployed in any AWS region that supports all the services used in this application. The supported regions include:

* us-east-1 (N. Virginia)
* us-east-2 (Ohio)
* us-west-2 (Oregon)
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

In the bottom panel of your new Cloud9 IDE, you will see a terminal command line terminal open and read to use.  Run the following git command in the terminal to clone the necessary code to complete this tutorial:

```
git clone https://github.com/aws-samples/aws-modern-application-workshop.git
```

After cloning the repository, you'll see that your project explorer now includes the files cloned:
![cloud9-explorer](/images/module-1/cloud9-explorer.png)


In the terminal, change directory to the newly cloned repository directory:

```
cd aws-modern-application-workshop
```

### Creating a Website with Amazon CloudFront and Amazon S3

#### Create an S3 Bucket for Storing Content
Next, we will create the infrastructure components needed for storing static website in Amazon S3 via the ![AWS CLI](https://aws.amazon.com/cli/). If you do not already have the AWS CLI configured see ![getting started](http://docs.aws.amazon.com/cli/latest/userguide/)

First, create an S3 bucket, replace the name below (mythical-mysfits-bucket-name) with your own unique bucket name.  Copy the name you choose and save it for later, as you will use it in several other places during this workshop:

```
aws s3 mb s3://mythical-mysfits-bucket-name
```

#### Publish the Website Content to S3

Now that our S3 bucket is created, let's add the first iteration of the Mythical Mysfits homepage to the bucket.  Use the following S3 CLI command that mimics the linux command for copying files (**cp**) to copy the provided index.html page locally from your IDE up to the new S3 bucket (replacing the bucket name appropriately).

```
aws s3 cp ~/environment/aws-modern-application-workshop/module-1/web/index.html s3://REPLACE_ME_BUCKET_NAME/index.html
```

#### Create CloudFront Distribution

Using the AWS Management Console, we will create a CloudFront distribution, and configure the S3 bucket as the origin.
1. Open the Amazon CloudFront console at https://console.aws.amazon.com/cloudfront/home.


2. From the console dashboard, click **Create Distribution**.
![cloudfront-create](/images/module-1/cloudfront-create-button.png)


3. Click **Get Started** in the Web section.
![cloudfront-getstarted](/images/module-1/cloudfront-get-started.png)


4. Specify the following settings for the distribution:
  * Drop down the Origin Domain Name to select the S3 bucket you just created.
  * Check **Yes** to Restrict Bucket Access. This setting is for S3 to trust CloudFront to read your objects in this bucket.
  * Check **Create a New identity** and accept default Comment
  * Check **Yes, Update Bucket Policy**
  * Under Distribution Settings section enter **index.html** as **Default Root Object**
  * Click Create Distrubution.
  ![cloudfront-create-distribution](/images/module-1/cloudfront-create-distribution.png)


  * If this was a web site used for more than just testing you should enable logging, and consider the AWS Web Application Firewall (WAF) service to help protect. For more information on the other configuration options, see [Values That You Specify When You Create or Update a Web Distribution](https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/distribution-web-values-specify.html) in the CloudFront documentation.


5. After CloudFront creates your distribution, the value of the Status column for your distribution will change from In Progress to Deployed.
![cloudfront-deployed](/images/module-1/cloudfront-deployed.png)
For more information, see [Testing a Web Distribution](https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/distribution-web-testing.html) in the CloudFront documentation.


7. You have now configured Amazon CloudFront with basic settings and S3 as origin.

For more information on configuring CloudFront, see [Viewing and Updating CloudFront Distributions](https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/HowToUpdateDistribution.html) in the CloudFront documentation.

#### Test Website

Now, it can take some time for your newly created S3 bucket to be accessible by CloudFront, as it is a global network of 100+ locations. Open up your favorite web browser and enter the **Domain Name** from the CloudFront console, it will be a series of characters and end in cloudfront.net. If you get an error and/or redirect to the S3 bucket wait some more time.

![mysfits-welcome](/images/module-1/mysfits-welcome.png)

Congratulations, you have created the basic static Mythical Mysfits Website!

That concludes Module 1.

[Proceed to Module 2](/module-2)


## [AWS Developer Center](https://developer.aws)
