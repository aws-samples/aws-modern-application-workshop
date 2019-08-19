import cdk = require('@aws-cdk/core');
import iam = require("@aws-cdk/aws-iam");
import { ServicePrincipal } from "@aws-cdk/aws-iam";
import sagemaker = require("@aws-cdk/aws-sagemaker");
import codecommit = require("@aws-cdk/aws-codecommit");
import apigw = require("@aws-cdk/aws-apigateway");
import lambda = require("@aws-cdk/aws-lambda");

export class SageMakerStack extends cdk.Stack {
  constructor(scope: cdk.Construct, id:string) {
    super(scope, id);
    
    const mysfitsNotebookRole = new iam.Role(this, "MysfitsNotbookRole", {
      assumedBy: new ServicePrincipal("sagemaker.amazonaws.com")
    });
    
    const mysfitsNotebookPolicy = new iam.PolicyStatement();
    mysfitsNotebookPolicy.addActions('sagemaker:*',
            'ecr:GetAuthorizationToken',
            'ecr:GetDownloadUrlForLayer',
            'ecr:BatchGetImage',
            'ecr:BatchCheckLayerAvailability',
            'cloudwatch:PutMetricData',
            'logs:CreateLogGroup',
            'logs:CreateLogStream',
            'logs:DescribeLogStreams',
            'logs:PutLogEvents',
            'logs:GetLogEvents',
            's3:CreateBucket',
            's3:ListBucket',
            's3:GetBucketLocation',
            's3:GetObject',
            's3:PutObject',
            's3:DeleteObject');
    mysfitsNotebookPolicy.addAllResources();
    
    const mysfitsNotebookPassRolePolicy = new iam.PolicyStatement();
    mysfitsNotebookPassRolePolicy.addActions('iam:PassRole');
    mysfitsNotebookPassRolePolicy.addAllResources();
    mysfitsNotebookPassRolePolicy.addCondition('StringEquals', {
          'iam:PassedToService': 'sagemaker.amazonaws.com',
    });
    
    new iam.Policy(this, "MysfitsNotebookPolicy", {
      policyName: "mysfits_notebook_policy",
      statements: [
        mysfitsNotebookPolicy,
        mysfitsNotebookPassRolePolicy
      ],
      roles: [mysfitsNotebookRole]
    });
    
    const notebookInstance = new sagemaker.CfnNotebookInstance(this, "MythicalMysfits-SageMaker-Notebook", {
        instanceType: "ml.t2.medium",
        roleArn: mysfitsNotebookRole.roleArn
    });
    
    const lambdaRepository = new codecommit.Repository(this, "RecommendationsLambdaRepository", {
      repositoryName: "MythicalMysfits-RecommendationsLambdaRepository"
    });
    
    const recommandationsLambdaFunctionPolicyStm =  new iam.PolicyStatement();
    recommandationsLambdaFunctionPolicyStm.addActions("sagemaker:InvokeEndpoint");
    recommandationsLambdaFunctionPolicyStm.addAllResources();
    
    const mysfitsRecommendations = new lambda.Function(this, "Function", {
      handler: "recommendations.recommend",
      runtime: lambda.Runtime.PYTHON_3_6,
      description: "A microservice backend to invoke a SageMaker endpoint.",
      memorySize: 128,
      code: lambda.Code.asset("../../lambda-recommendations/service"),
      timeout: cdk.Duration.seconds(30),
      initialPolicy: [
        recommandationsLambdaFunctionPolicyStm
      ]
    });
    
    const questionsApiRole = new iam.Role(this, "QuestionsApiRole", {
      assumedBy: new ServicePrincipal("apigateway.amazonaws.com")
    });
    
    const apiPolicy = new iam.PolicyStatement();
    apiPolicy.addActions("lambda:InvokeFunction");
    apiPolicy.addResources(mysfitsRecommendations.functionArn);
    new iam.Policy(this, "QuestionsApiPolicy", {
      policyName: "questions_api_policy",
      statements: [
        apiPolicy
      ],
      roles: [questionsApiRole]
    });
    
    const questionsIntegration = new apigw.LambdaIntegration(
      mysfitsRecommendations,
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
      handler: mysfitsRecommendations,
      options: {
        restApiName: "Recommendation API Service"
      },
      proxy: false
    });
    
    const recommendationsMethod = api.root.addResource("recommendations");
    recommendationsMethod.addMethod("POST", questionsIntegration, {
      methodResponses: [{
        statusCode: "200",
        responseParameters: {
          'method.response.header.Access-Control-Allow-Headers': true,
          'method.response.header.Access-Control-Allow-Methods': true,
          'method.response.header.Access-Control-Allow-Origin': true,
        }
      }],
      authorizationType: apigw.AuthorizationType.NONE
    });
    
    recommendationsMethod.addMethod('OPTIONS', new apigw.MockIntegration({
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
    
    new cdk.CfnOutput(this, "recommendationsRepositoryCloneUrlHttp", {
      value: lambdaRepository.repositoryCloneUrlHttp,
      description: "Recommendations Lambda Repository Clone Url HTTP"
    });
    
    new cdk.CfnOutput(this, "recommendationsRepositoryCloneUrlSsh", {
      value: lambdaRepository.repositoryCloneUrlSsh,
      description: "Recommendations Lambda Repository Clone Url SSH"
    });
    
  }
}