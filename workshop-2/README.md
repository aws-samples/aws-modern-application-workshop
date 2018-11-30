# Mythical Mysfits: DevSecOps with Docker and AWS Fargate

## Overview
![mysfits-welcome](/images/mysfits-welcome.png)

**Mythical Mysfits** is a (fictional) pet adoption non-profit dedicated to helping abandoned, and often misunderstood, mythical creatures find a new forever family! Mythical Mysfits believes that all creatures deserve a second chance, even if they spent their first chance hiding under bridges and unapologetically robbing helpless travelers.

Our business has been thriving with only a single Mysfits adoption center, located inside Devils Tower National Monument. Speak, friend, and enter should you ever come to visit.

We've just had a surge of new mysfits arrive at our door with nowhere else to go!  They're all pretty distraught after not only being driven from their homes... but an immensely grumpy ogre has also denied them all entry at a swamp they've used for refuge in the past.  

That's why we've hired you to be our first Full Stack Engineer. We need a more scalable way to show off our inventory of mysfits and let families adopt them. We'd like you to build the first Mythical Mysfits adoption website to help introduce these lovable, magical, often mischievous creatures to the world!

We're growing, but we're struggling to keep up with our new mysfits mainly due to our legacy inventory platform.  We heard about the benefits of containers, especially in the context of microservices and devsecops. We've already taken some steps in that direction, but can you help us take this to the next level? 

We've already moved to a microservice based model, but are still not able to develop quickly. We want to be able to deploy to our microservices as quickly as possible while maintaining a certain level of confidence that our code will work well. This is where you come in.

If you are not familiar with DevOps, there are multiple facets to the the word. One focuses on organizational values, such as small, well rounded agile teams focusing on owning a particular service, whereas one focuses on automating the software delivery process as much as possible to shorten the time between code check in and customers testing and providing feedback. This allows us to shorten the feedback loop and iterate based on customer requirements at a much quicker rate. 

In this workshop, you will take our Mythical stack and apply concepts of CI/CD to their environment. To do this, you will create a pipeline to automate all deployments using AWS CodeCommit or GitHub, AWS CodeBuild, AWS CodePipeline, and AWS Fargate. Today, the Mythical stack runs on AWS Fargate following a microservice architecture, meaning that there are very strict API contracts that are in place. As part of the move to a more continuous delivery model, they would like to make sure these contracts are always maintained.

The tools that we use in this workshop are part of the AWS Dev Tools stack, but are by no means an end all be all. What you should focus on is the idea of CI/CD and how you can apply it to your environments.

### Requirements:
* AWS account - if you don't have one, it's easy and free to [create one](https://aws.amazon.com/)
* AWS IAM account with elevated privileges allowing you to interact with CloudFormation, IAM, EC2, ECS, ECR, ALB, VPC, SNS, CloudWatch, AWS CodeCommit, AWS CodeBuild, AWS CodePipeline
* Familiarity with Python, vim/emacs/nano, [Docker](https://www.docker.com/), AWS and microservices - not required but a bonus

### What you'll do:

These labs are designed to be completed in sequence, and the full set of instructions are documented below.  Read and follow along to complete the labs.  If you're at a live AWS event, the workshop attendants will give you a high level run down of the labs and help answer any questions.  Don't worry if you get stuck, we provide hints along the way.  

* **[Lab 0](Lab-0):** Deploy Existing Mythical Stack
* **[Lab 1](Lab-1):** Integrating Security Right from the Get Go
* **[Lab 2](Lab-2):** Offloading Builds to AWS CodeBuild
* **[Lab 3](Lab-3):** Automating End to End Deployments for AWS Fargate
* **[Lab 4](Lab-4):** Moar Security! Implementing Container Image scanning
* **Workshop Cleanup** [Cleanup working environment](#workshop-cleanup)

### Conventions:
Throughout this workshop, we will provide commands for you to run in the terminal.  These commands will look like this:

<pre>
$ ssh -i <b><i>PRIVATE_KEY.PEM</i></b> ec2-user@<b><i>EC2_PUBLIC_DNS_NAME</i></b>
</pre>

The command starts after the $.  Text that is ***UPPER_ITALIC_BOLD*** indicates a value that is unique to your environment.  For example, the ***PRIVATE\_KEY.PEM*** refers to the private key of an SSH key pair that you've created, and the ***EC2\_PUBLIC\_DNS\_NAME*** is a value that is specific to an EC2 instance launched in your account.  You can find these unique values either in the CloudFormation outputs or by going to the specific service dashboard in the [AWS management console](https://console.aws.amazon.com).

If you are asked to enter a specific value in a text field, the value will look like `VALUE`.

Hints are also provided along the way and will look like this:

<details>
<summary>HINT</summary>

**Nice work, you just revealed a hint!**
</details>


*Click on the arrow to show the contents of the hint.*

### IMPORTANT: Workshop Cleanup

You will be deploying infrastructure on AWS which will have an associated cost. If you're attending an AWS event, credits will be provided.  When you're done with the workshop, [follow the steps at the very end of the instructions](#workshop-cleanup) to make sure everything is cleaned up and avoid unnecessary charges.

* * *

## Let's Begin!

[Go to Lab-0 to set up your environment](Lab-0)

### Workshop Cleanup

This is really important because if you leave stuff running in your account, it will continue to generate charges.  Certain things were created by CloudFormation and certain things were created manually throughout the workshop.  Follow the steps below to make sure you clean up properly.  

1. Delete any manually created resources throughout the labs, e.g. CodePipeline Pipelines and CodeBuild projects.  Certain things like task definitions do not have a cost associated, so you don't have to worry about that.  If you're not sure what has a cost, you can always look it up on our website.  All of our pricing is publicly available, or feel free to ask one of the workshop attendants when you're done.
2. Go to the CodePipeline console and delete prod-like-service. Hit Edit and then Delete.
3. Delete any container images stored in ECR, delete CloudWatch logs groups, and empty/delete S3 buckets
4. In your ECS Cluster, edit all services to have 0 tasks and delete all services
5. Delete log groups in CloudWatch Logs
6. Finally, delete the CloudFormation stack launched at the beginning of the workshop to clean up the rest.  If the stack deletion process encountered errors, look at the Events tab in the CloudFormation dashboard, and you'll see what steps failed.  It might just be a case where you need to clean up a manually created asset that is tied to a resource goverened by CloudFormation.

