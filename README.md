# Build a Modern Application on AWS (C#)

![mysfits-welcome](/images/module-1/mysfits-welcome.png)

**Mythical Mysfits** is a (fictional) pet adoption non-profit dedicated to helping abandoned, and often misunderstood, mythical creatures find a new forever family! Mythical Mysfits believes that all creatures deserve a second chance, even if they spent their first chance hiding under bridges and unapologetically robbing helpless travelers.

Our business has been thriving with only a single mysfit adoption center, located inside Devils Tower National Monument. Speak, friend, and enter should you ever come to visit.

We've just had a surge of new mysfits arrive at our door with nowhere else to go!  They're all pretty distraught after not only being driven from their homes... but an immensely grumpy ogre has also denied them all entry at a swamp they've used for refuge in the past.

That's why we've hired you to be our first Full Stack Engineer. We need a more scalable way to show off our inventory of mysfits and let families adopt them. We'd like you to build the first Mythical Mysfits adoption website to help introduce these lovable, magical, often mischievous creatures to the world!

**AWS Experience: Beginner**

**Time to Complete: 3-4 hours**

**Cost to Complete: Many of the services used are included in the AWS Free Tier. For those that are not, the sample application will cost, in total, less than $1/day.**

**Tutorial Prereqs:**

* **An AWS Account and Administrator-level access to it**

Please be sure to terminate all of the resources created during this workshop to ensure that you are no longer charged.

**Note:**  Estimated workshop costs assume little to no traffic will be served by your demo website created as part of this workshop.

### Application Architecture

![Application Architecture](/images/arch-diagram.png)

The Mythical Mysfits website serves its static content directly from Amazon S3, provides a microservice API backend deployed as a container through AWS Fargate on Amazon ECS, stores data in a managed NoSQL database provided by Amazon DynamoDB, with authentication and authorization for the application enabled through AWS API Gateway and its integration with Amazon Cognito.  The clicks that users perform on the website will be sent as records to an Amazon Kinesis Firehose Delivery stream where those records will be processed by serverless AWS Lambda functions and then stored in Amazon S3.

You will be creating and deploying changes to this application completely programmatically. You will use the [AWS CLI](https://aws.amazon.com/cli/) or the [AWS Tools for PowerShell](https://aws.amazon.com/powershell/) to execute commands that create the required infrastructure components, which includes a fully managed CI/CD stack utilizing AWS CodeCommit, CodeBuild, and CodePipeline.  Finally, you will complete the development tasks required all within [Visual Studio Code](https://code.visualstudio.com/).

## Begin the Modern Application Workshop

[Proceed to Module 1](/module-1)


### Workshop Clean-Up (Once Complete)
Be sure to delete all of the resources created during the workshop in order to ensure that billing for the resources does not continue for longer than you intend.  We recommend that you utilize the AWS Console to explore the resources you've created and delete them when you're ready.

For the two cases where you provisioned resources using AWS CloudFormation, you can remove those resources by simply running the following commands for each stack:

__AWS CLI__
```
aws cloudformation delete-stack --stack-name STACK-NAME-HERE
```

__AWS Tools for PowerShell__
```
Remove-CFNStack -StackName STACK-NAME-HERE
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


[Proceed to Module 1](/module-1)


## [AWS Developer Center](https://developer.aws)
