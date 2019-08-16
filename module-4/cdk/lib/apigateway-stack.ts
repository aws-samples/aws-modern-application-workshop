import apigateway = require('@aws-cdk/aws-apigateway');
import cdk = require('@aws-cdk/core');
import elbv2 = require('@aws-cdk/aws-elasticloadbalancingv2');
import ecspatterns = require('@aws-cdk/aws-ecs-patterns');
import fs = require('fs');
import path = require('path');

interface APIGatewayStackProps extends cdk.StackProps {
  fargateService: ecspatterns.LoadBalancedFargateService;
}
export class APIGatewayStack extends cdk.Stack {

  constructor(scope: cdk.App, id: string, props: APIGatewayStackProps) {
    super(scope, id);

    const nlb = elbv2.NetworkLoadBalancer.fromNetworkLoadBalancerAttributes(this, 'NLB', {
      loadBalancerArn: props.fargateService.loadBalancer.loadBalancerArn,
    });
    const vpcLink = new apigateway.VpcLink(this, 'VPCLink', {
      description: 'VPCLink for our  REST API',
      vpcLinkName: 'MysfitsApiVpcLink',
      targets: [
        nlb
      ]
    });
    const schema = this.generateSwaggerSpec(props.fargateService.loadBalancer.loadBalancerDnsName, vpcLink);
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
    
    const prod = new apigateway.CfnDeployment(this, 'Prod', {
        restApiId: api.ref,
        stageName: 'prod'
    });
    
    new cdk.CfnOutput(this, 'APIID', {
      value: api.ref,
      description: 'API Gateway ID'
    })
  }

  private generateSwaggerSpec(dnsName: string, vpcLink: apigateway.VpcLink): string {
    try {
      const userPoolIdentity = 'REPLACE_ME_COGNITO_USER_POOL_ID';
      const schemaFilePath = path.resolve(__dirname + '/../../source/module-4/api/api-swagger.json');
      const apiSchema = fs.readFileSync(schemaFilePath);
      let schema: string = apiSchema.toString().replace(/REPLACE_ME_REGION/gi, cdk.Aws.REGION);
      schema = schema.toString().replace(/REPLACE_ME_ACCOUNT_ID/gi, cdk.Aws.ACCOUNT_ID);
      schema = schema.toString().replace(/REPLACE_ME_COGNITO_USER_POOL_ID/gi, userPoolIdentity);
      schema = schema.toString().replace(/REPLACE_ME_VPC_LINK_ID/gi, vpcLink.vpcLinkId);
      schema = schema.toString().replace(/REPLACE_ME_NLB_DNS/gi, dnsName);
      return schema;
    } catch (exception) {
      throw new Error('Failed to generate swagger specification.  Please refer to the Module 4 readme for instructions.');
    }
  }
}