import cdk = require("@aws-cdk/core");
import ecr = require("@aws-cdk/aws-ecr");

export class EcrStack extends cdk.Stack {
  public readonly ecrRepository: ecr.Repository;

  constructor(scope: cdk.Construct, id: string) {
    super(scope, id);

    this.ecrRepository = new ecr.Repository(this, "Repository", {
      repositoryName: "mythicalmysfits/service"
    });
  }
}
