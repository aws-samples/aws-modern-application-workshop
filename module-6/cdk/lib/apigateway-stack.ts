import apigateway = require('@aws-cdk/aws-apigateway');
import cdk = require('@aws-cdk/core');
import elbv2 = require('@aws-cdk/aws-elasticloadbalancingv2');
import fs = require('fs');
import path = require('path');

interface APIGatewayStackProps extends cdk.StackProps {
  loadBalancerDnsName: string;
  loadBalancerArn: string;
  userPoolId: string;
}
export class APIGatewayStack extends cdk.Stack {

  constructor(scope: cdk.App, id: string, props: APIGatewayStackProps) {
    super(scope, id);

    const nlb = elbv2.NetworkLoadBalancer.fromNetworkLoadBalancerAttributes(this, 'NLB', {
      loadBalancerArn: props.loadBalancerArn
    });
    const vpcLink = new apigateway.VpcLink(this, 'VPCLink', {
      description: 'VPC Link for our  REST API',
      vpcLinkName: 'MysfitsApiVpcLink',
      targets: [
        nlb
      ]
    });
    const schema = this.generateSwaggerSpec(props.loadBalancerDnsName, props.userPoolId, vpcLink);
    const jsonSchema = JSON.parse(schema);
    const api = new apigateway.CfnRestApi(this, 'Schema', {
      name: 'MysfitsApi',
      body: jsonSchema,
      endpointConfiguration: {
        types: [
          apigateway.EndpointType.REGIONAL
        ]
      },
      failOnWarnings: true
    });
    new apigateway.CfnDeployment(this, 'Prod', {
      restApiId: api.ref,
      stageName: 'prod'
    });
    new cdk.CfnOutput(this, 'APIID', {
      value: api.ref,
      description: 'API Gateway ID'
    })
  }

  private generateSwaggerSpec(dnsName: string, userPoolId:string, vpcLink: apigateway.VpcLink): string {
    const schemaFilePath = path.resolve(__dirname + '/../api-swagger.json');
    const apiSchema = fs.readFileSync(schemaFilePath);
    let schema: string = apiSchema.toString().replace(/REPLACE_ME_REGION/gi, cdk.Aws.REGION);
    schema = schema.toString().replace(/REPLACE_ME_ACCOUNT_ID/gi, cdk.Aws.ACCOUNT_ID);
    schema = schema.toString().replace(/REPLACE_ME_COGNITO_USER_POOL_ID/gi, userPoolId);
    schema = schema.toString().replace(/REPLACE_ME_VPC_LINK_ID/gi, vpcLink.vpcLinkId);
    schema = schema.toString().replace(/REPLACE_ME_NLB_DNS/gi, dnsName);
    return schema;
  }
}