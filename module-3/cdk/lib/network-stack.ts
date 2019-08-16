import cdk = require("@aws-cdk/core");
import ec2 = require("@aws-cdk/aws-ec2");
import iam = require("@aws-cdk/aws-iam");

export class NetworkStack extends cdk.Stack {
  public readonly vpc: ec2.Vpc;

  constructor(scope: cdk.Construct, id: string) {
    super(scope, id);

    this.vpc = new ec2.Vpc(this, "VPC", {
      natGateways: 2,
      maxAzs: 2
    });
    
    const dynamoDbEndpoint = this.vpc.addGatewayEndpoint("DynamoDbEndpoint", {
      service: ec2.GatewayVpcEndpointAwsService.DYNAMODB,
      subnets: [{
          subnetType: ec2.SubnetType.PRIVATE
      }]
    });
    
    const dynamoDbPolicy = new iam.PolicyStatement();
    dynamoDbPolicy.addAnyPrincipal();
    dynamoDbPolicy.addActions("*");
    dynamoDbPolicy.addAllResources();
    
    dynamoDbEndpoint.addToPolicy(
      dynamoDbPolicy
    );
    
  }
}