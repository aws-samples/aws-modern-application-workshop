import cdk = require("@aws-cdk/core");
import ec2 = require("@aws-cdk/aws-ec2");

export class NetworkStack extends cdk.Stack {
  public readonly vpc: ec2.Vpc;

  constructor(scope: cdk.Construct, id: string) {
    super(scope, id);

    this.vpc = new ec2.Vpc(this, "VPC", {
      natGateways: 1,
      maxAzs: 2
    });
  }
}
