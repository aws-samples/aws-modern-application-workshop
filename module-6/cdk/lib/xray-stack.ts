import cdk = require('@aws-cdk/core');
import codecommit = require("@aws-cdk/aws-codecommit");
import apigw = require("@aws-cdk/aws-apigateway");
import iam = require("@aws-cdk/aws-iam");
import dynamodb = require("@aws-cdk/aws-dynamodb");
import { ServicePrincipal } from "@aws-cdk/aws-iam";
import lambda = require("@aws-cdk/aws-lambda");
import event = require("@aws-cdk/aws-lambda-event-sources");
import sns = require('@aws-cdk/aws-sns');
import subs = require('@aws-cdk/aws-sns-subscriptions');

export class XRayStack extends cdk.Stack {
  constructor(scope: cdk.Construct, id:string) {
    super(scope, id);

    const lambdaRepository = new codecommit.Repository(this, "QuestionsLambdaRepository", {
      repositoryName: "MythicalMysfits-QuestionsLambdaRepository"
    });

    const table = new dynamodb.Table(this, "Table", {
      tableName: "MysfitsQuestionsTable",
      partitionKey: {
        name: "QuestionId",
        type: dynamodb.AttributeType.STRING
      },
      stream: dynamodb.StreamViewType.NEW_IMAGE
    });

    const postQuestionLambdaFunctionPolicyStmDDB =  new iam.PolicyStatement();
    postQuestionLambdaFunctionPolicyStmDDB.addActions("dynamodb:PutItem");
    postQuestionLambdaFunctionPolicyStmDDB.addResources(table.tableArn);

    const LambdaFunctionPolicyStmXRay =  new iam.PolicyStatement();
    LambdaFunctionPolicyStmXRay.addActions(
          //  Allows the Lambda function to interact with X-Ray
          "xray:PutTraceSegments",
          "xray:PutTelemetryRecords",
          "xray:GetSamplingRules",
          "xray:GetSamplingTargets",
          "xray:GetSamplingStatisticSummaries"
        );
    LambdaFunctionPolicyStmXRay.addAllResources();

    const mysfitsPostQuestion = new lambda.Function(this, "PostQuestionFunction", {
      handler: "mysfitsPostQuestion.postQuestion",
      runtime: lambda.Runtime.PYTHON_3_6,
      description: "A microservice Lambda function that receives a new question submitted to the MythicalMysfits" +
                      " website from a user and inserts it into a DynamoDB database table.",
      memorySize: 128,
      code: lambda.Code.asset("../../lambda-questions/PostQuestionsService"),
      timeout: cdk.Duration.seconds(30),
      initialPolicy: [
        postQuestionLambdaFunctionPolicyStmDDB,
        LambdaFunctionPolicyStmXRay
      ],
      tracing: lambda.Tracing.ACTIVE
    });

    const topic = new sns.Topic(this, 'Topic', {
        displayName: 'MythicalMysfitsQuestionsTopic',
        topicName: 'MythicalMysfitsQuestionsTopic'
    });
    topic.addSubscription(new subs.EmailSubscription("REPLACE@EMAIL_ADDRESS"));

    const postQuestionLambdaFunctionPolicyStmSNS =  new iam.PolicyStatement();
    postQuestionLambdaFunctionPolicyStmSNS.addActions("sns:Publish");
    postQuestionLambdaFunctionPolicyStmSNS.addResources(topic.topicArn);

    const mysfitsProcessQuestionStream = new lambda.Function(this, "ProcessQuestionStreamFunction", {
      handler: "mysfitsProcessStream.processStream",
      runtime: lambda.Runtime.PYTHON_3_6,
      description: "An AWS Lambda function that will process all new questions posted to mythical mysfits" +
                      " and notify the site administrator of the question that was asked.",
      memorySize: 128,
      code: lambda.Code.asset("../../lambda-questions/ProcessQuestionsStream"),
      timeout: cdk.Duration.seconds(30),
      initialPolicy: [
        postQuestionLambdaFunctionPolicyStmSNS,
        LambdaFunctionPolicyStmXRay
      ],
      tracing: lambda.Tracing.ACTIVE,
      environment: {
        SNS_TOPIC_ARN: topic.topicArn
      },
      events: [
        new event.DynamoEventSource(table, {
            startingPosition: lambda.StartingPosition.TRIM_HORIZON,
            batchSize: 1
        })
      ]
    });

    const questionsApiRole = new iam.Role(this, "QuestionsApiRole", {
      assumedBy: new ServicePrincipal("apigateway.amazonaws.com")
    });

    const apiPolicy = new iam.PolicyStatement();
    apiPolicy.addActions("lambda:InvokeFunction");
    apiPolicy.addResources(mysfitsPostQuestion.functionArn);
    new iam.Policy(this, "QuestionsApiPolicy", {
      policyName: "questions_api_policy",
      statements: [
        apiPolicy
      ],
      roles: [questionsApiRole]
    });

    const questionsIntegration = new apigw.LambdaIntegration(
      mysfitsPostQuestion,
      {
        credentialsRole: questionsApiRole,
        integrationResponses: [
          {
            statusCode: "200",
            responseTemplates: {
              "application/json": '{"status":"OK"}'
            }
          }
        ]
      }
    );

    const api = new apigw.LambdaRestApi(this, "APIEndpoint", {
      handler: mysfitsPostQuestion,
      options: {
        restApiName: "Questions API Service",
        deployOptions: {
          tracingEnabled: true
        }
      },
      proxy: false
    });

    const questionsMethod = api.root.addResource("questions");
    questionsMethod.addMethod("POST", questionsIntegration, {
      methodResponses: [{
        statusCode: "200",
        responseParameters: {
          'method.response.header.Access-Control-Allow-Headers': true,
          'method.response.header.Access-Control-Allow-Methods': true,
          'method.response.header.Access-Control-Allow-Origin': true,
        },
      }],
      authorizationType: apigw.AuthorizationType.NONE
    });

    questionsMethod.addMethod('OPTIONS', new apigw.MockIntegration({
      integrationResponses: [{
        statusCode: '200',
        responseParameters: {
          'method.response.header.Access-Control-Allow-Headers': "'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token,X-Amz-User-Agent'",
          'method.response.header.Access-Control-Allow-Origin': "'*'",
          'method.response.header.Access-Control-Allow-Credentials': "'false'",
          'method.response.header.Access-Control-Allow-Methods': "'OPTIONS,GET,PUT,POST,DELETE'",
        },
      }],
      passthroughBehavior: apigw.PassthroughBehavior.NEVER,
      requestTemplates: {
        "application/json": "{\"statusCode\": 200}"
      },
    }), {
      methodResponses: [{
        statusCode: '200',
        responseParameters: {
          'method.response.header.Access-Control-Allow-Headers': true,
          'method.response.header.Access-Control-Allow-Methods': true,
          'method.response.header.Access-Control-Allow-Credentials': true,
          'method.response.header.Access-Control-Allow-Origin': true,
        },
      }]
    });

    new cdk.CfnOutput(this, "questionsRepositoryCloneUrlHttp", {
      value: lambdaRepository.repositoryCloneUrlHttp,
      description: "Questions Lambda Repository Clone Url HTTP"
    });

    new cdk.CfnOutput(this, "questionsRepositoryCloneUrlSsh", {
      value: lambdaRepository.repositoryCloneUrlSsh,
      description: "Questions Lambda Repository Clone Url SSH"
    });
  }
}
