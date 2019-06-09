import apigateway = require('@aws-cdk/aws-apigateway');
import elbv2 = require('@aws-cdk/aws-elasticloadbalancingv2');
import ecspatterns = require('@aws-cdk/aws-ecs-patterns');
import cdk = require('@aws-cdk/cdk');
import fs = require('fs');
import path = require('path');

interface APIGatewayStackProps extends cdk.StackProps {
  LBFargateService: ecspatterns.LoadBalancedFargateService;
}
export class APIGatewayStack extends cdk.Stack {

  constructor(scope: cdk.App, id: string, props: APIGatewayStackProps) {
    super(scope, id);

    const nlb = elbv2.NetworkLoadBalancer.fromNetworkLoadBalancerAttributes(this, 'NLB', {
      loadBalancerArn: props.LBFargateService.loadBalancer.loadBalancerArn,
    });
    const vpcLink = new apigateway.VpcLink(this, 'VPCLink', {
      description: 'VPC Link for our  REST API',
      name: 'MysfitsApiVpcLink',
      targets: [
        nlb
      ]
    });
    const schema = this.generateSwaggerSpec(props.LBFargateService.loadBalancer.loadBalancerDnsName, vpcLink);
    const jsonSchema = JSON.parse(schema);
    const api = new apigateway.CfnRestApi(this, 'Schema', {
      name: 'MysfitsApi',
      body: jsonSchema,
      endpointConfiguration: {
        types: [
          apigateway.EndpointType.Regional
        ]
      },
      failOnWarnings: true
    });
    new cdk.CfnOutput(this, 'APIID', {
      value: api.restApiId,
      description: 'API Gateway ID'
    })
  }

  private generateSwaggerSpec(dnsName: string, vpcLink: apigateway.VpcLink): string {
    try {
      const userPoolIdentity = this.getUserPoolIdentity();
      const schemaFilePath = path.resolve(__dirname + '/../api-swagger.json');
      const apiSchema = fs.readFileSync(schemaFilePath);
      let schema: string = apiSchema.toString().replace(/REPLACE_ME_REGION/gi, cdk.Aws.region);
      schema = schema.toString().replace(/REPLACE_ME_ACCOUNT_ID/gi, cdk.Aws.accountId);
      schema = schema.toString().replace(/REPLACE_ME_COGNITO_USER_POOL_ID/gi, userPoolIdentity);
      schema = schema.toString().replace(/REPLACE_ME_VPC_LINK_ID/gi, vpcLink.vpcLinkId);
      schema = schema.toString().replace(/REPLACE_ME_NLB_DNS/gi, dnsName);
      return schema;
    } catch (exception) {
      throw new Error('Failed to generate swagger specification.  Please refer to the Module 4 readme about how to initialise AWS Amplify.');
    }
  }
  private getUserPoolIdentity(): string {
    const amplifySettingsFilePath = path.resolve(__dirname + '../../../frontend/src/aws-exports.js');
    if (fs.existsSync(amplifySettingsFilePath)) {
      const amplifySettings = fs.readFileSync(amplifySettingsFilePath).toString();
      const locateIdentityPool = '"aws_cognito_identity_pool_id": "';
      const locationOfIdentityPoolString = amplifySettings.indexOf(locateIdentityPool);
      if (locationOfIdentityPoolString === -1) {
        throw new Error('Failed to import aws-exports.js.  Please refer to the Module 4 readme about how to initialise AWS Amplify.');
      }
      const userPoolIdentity = amplifySettings.substring(locationOfIdentityPoolString + locateIdentityPool.length,
        amplifySettings.indexOf('",', locationOfIdentityPoolString + 1));
      return userPoolIdentity;
    } else {
      throw new Error('Failed to locate aws-exports.js.  Please refer to the Module 4 readme about how to initialise AWS Amplify.');
    }
  }
}