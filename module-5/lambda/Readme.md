# AWS Lambda Simple Kinesis Firehose Function Project

This starter project consists of:
* Function.cs - class file containing a class with a single function handler method
* aws-lambda-tools-defaults.json - default argument settings for use with Visual Studio and command line deployment tools for AWS

You may also have a test project depending on the options selected.

The generated function handler performs data transformation on records written to an Amazon Kinesis Firehose delivery stream. Replace the body of this method, and parameters, to suit your needs.

After deploying your function you must configure an Amazon Kinesis Firehose delivery stream to enable data transformations and use the deployed Lambda function.

## Here are some steps to follow from Visual Studio:

To deploy your function to AWS Lambda, right click the project in Solution Explorer and select *Publish to AWS Lambda*.

To view your deployed function open its Function View window by double-clicking the function name shown beneath the AWS Lambda node in the AWS Explorer tree.

To perform testing against your deployed function use the Test Invoke tab in the opened Function View window.

To configure event sources for your deployed function, for example to have your function invoked when an object is created in an Amazon S3 bucket, use the Event Sources tab in the opened Function View window.

To update the runtime configuration of your deployed function use the Configuration tab in the opened Function View window.

To view execution logs of invocations of your function use the Logs tab in the opened Function View window.

## Here are some steps to follow to get started from the command line:

Once you have edited your function you can use the following command lines to build, test and deploy your function to AWS Lambda from the command line:

Restore dependencies
```
    cd "streaming_lambda"
    dotnet restore
```

Execute unit tests
```
    cd "streaming_lambda/test/streaming_lambda.Tests"
    dotnet test
```

Deploy function to AWS Lambda
```
    cd "streaming_lambda/src/streaming_lambda"
    dotnet lambda deploy-function
```
