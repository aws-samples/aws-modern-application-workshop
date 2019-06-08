import cdk = require("@aws-cdk/cdk");
import apigw = require("@aws-cdk/aws-apigateway");
import iam = require("@aws-cdk/aws-iam");
import codecommit = require("@aws-cdk/aws-codecommit");
import { ServicePrincipal } from "@aws-cdk/aws-iam";
import { CfnDeliveryStream } from "@aws-cdk/aws-kinesisfirehose";
import lambda = require("@aws-cdk/aws-lambda");
import s3 = require("@aws-cdk/aws-s3");
import { DynamoDBStack } from "../../../module-3/cdk/lib/DynamoDBStack";

interface KinesisFirehoseStackProps extends cdk.StackProps {
  DynamoDBStack: DynamoDBStack;
}
export class KinesisFirehoseStack extends cdk.Stack {

  constructor(scope: cdk.App, id: string, props: KinesisFirehoseStackProps) {
    super(scope, id);

    const repo = new codecommit.Repository(this, "Repository", {
      repositoryName: "MythicalMysfitsService-Repository-Lambda"
    });
    new cdk.CfnOutput(this, "repositoryCloneUrlHttp", {
      value: repo.repositoryCloneUrlHttp,
      description: "Repository Clone Url HTTP"
    });
    new cdk.CfnOutput(this, "repositoryCloneUrlSsh", {
      value: repo.repositoryCloneUrlSsh,
      description: "Repository Clone Url SSH"
    });

    const clicksDestinationBucket = new s3.Bucket(this, "Bucket", {
      versioned: true
    });

    const firehoseDeliveryRole = new iam.Role(this, "FirehoseDeliveryRole", {
      roleName: "FirehoseDeliveryRole",
      assumedBy: new ServicePrincipal("firehose.amazonaws.com"),
      externalId: cdk.Aws.accountId
    });

    const mysfitsClicksProcessor = new lambda.Function(this, "Function", {
      handler: "streaming_lambda::streaming_lambda.function::FunctionHandlerAsync",
      runtime: lambda.Runtime.DotNetCore21,
      description: "An Amazon Kinesis Firehose stream processor that enriches click records" +
        " to not just include a mysfitId, but also other attributes that can be analyzed later.",
      memorySize: 128,
      code: lambda.Code.directory("../lambda"),
      timeout: 30,
      initialPolicy: [
        new iam.PolicyStatement()
          .addAction("dynamodb:GetItem")
          .addResource(props.DynamoDBStack.Table.tableArn)
      ],
      environment: {
        mysfits_api_url: "MysfitsApiUrl"
      }
    });

    const mysfitsFireHoseToS3 = new CfnDeliveryStream(this, "DeliveryStream", {
      extendedS3DestinationConfiguration: {
        bucketArn: clicksDestinationBucket.bucketArn,
        bufferingHints: {
          intervalInSeconds: 60,
          sizeInMBs: 50
        },
        compressionFormat: "UNCOMPRESSED",
        prefix: "firehose/",
        roleArn: firehoseDeliveryRole.roleArn,
        processingConfiguration: {
          enabled: true,
          processors: [
            {
              parameters: [
                {
                  parameterName: "LambdaArn",
                  parameterValue: mysfitsClicksProcessor.functionArn
                }
              ],
              type: "Lambda"
            }
          ]
        }
      }
    });

    new lambda.CfnPermission(this, "Permission", {
      action: "lambda:InvokeFunction",
      functionName: mysfitsClicksProcessor.functionArn,
      principal: "firehose.amazonaws.com",
      sourceAccount: cdk.Aws.accountId,
      sourceArn: mysfitsFireHoseToS3.deliveryStreamArn
    });

    const clickProcessingApiRole = new iam.Role(this, "ClickProcessingApiRole", {
      assumedBy: new ServicePrincipal("apigateway.amazonaws.com")
    });

    new iam.Policy(this, "ClickProcessingApiPolicy", {
      policyName: "api_gateway_firehose_proxy_role",
      statements: [
        new iam.PolicyStatement()
          .allow()
          .addAction("firehose:PutRecord")
          .addResource(mysfitsFireHoseToS3.deliveryStreamArn)
      ],
      roles: [clickProcessingApiRole]
    });

    const clicksIntegration = new apigw.LambdaIntegration(
      mysfitsClicksProcessor,
      {
        connectionType: apigw.ConnectionType.Internet,
        credentialsRole: clickProcessingApiRole,
        integrationResponses: [
          {
            statusCode: "200",
            responseTemplates: {
              "application/json": '{"status":"OK"}'
            }
          }
        ],
        requestParameters: {
          "integration.request.header.Content-Type": "'application/x-amz-json-1.1'"
        },
        requestTemplates: {
          "application/json": `{ "DeliveryStreamName": "${mysfitsFireHoseToS3.ref}", "Record": { "Data": "$util.base64Encode($input.json('$'))" }}`
        }
      }
    );

    const api = new apigw.LambdaRestApi(this, "APIEndpoint", {
      handler: mysfitsClicksProcessor,
      options: {
        restApiName: "ClickProcessing API Service"
      },
      proxy: false
    });

    api.root.addMethod("OPTIONS", new apigw.MockIntegration({
      integrationResponses: [{
        statusCode: "200",
        responseParameters: {
          "method.response.header.Access-Control-Allow-Headers":
            "'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token,X-Amz-User-Agent'",
          "method.response.header.Access-Control-Allow-Origin": "'*'",
          "method.response.header.Access-Control-Allow-Credentials":
            "'false'",
          "method.response.header.Access-Control-Allow-Methods":
            "'OPTIONS,GET,PUT,POST,DELETE'"
        }
      }],
      passthroughBehavior: apigw.PassthroughBehavior.Never,
      requestTemplates: {
        "application/json": '{"statusCode": 200}'
      }
    }), {
        methodResponses: [
          {
            statusCode: "200",
            responseParameters: {
              "method.response.header.Access-Control-Allow-Headers": true,
              "method.response.header.Access-Control-Allow-Methods": true,
              "method.response.header.Access-Control-Allow-Credentials": true,
              "method.response.header.Access-Control-Allow-Origin": true
            }
          }
        ]
      }
    );

    const clicksMethod = api.root.addResource("clicks");
    clicksMethod.addMethod("PUT", clicksIntegration, {
      apiKeyRequired: true,
      methodResponses: [{
        statusCode: "200"
      }],
      authorizationType: apigw.AuthorizationType.None
    });
  }
}
