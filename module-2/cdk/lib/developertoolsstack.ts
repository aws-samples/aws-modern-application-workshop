import cdk = require('@aws-cdk/cdk');
import codecommit = require("@aws-cdk/aws-codecommit");

export class DeveloperToolsStack extends cdk.Stack {
  public readonly apiRepository: codecommit.Repository;

  constructor(scope: cdk.Construct, id: string) {
    super(scope, id);

    const cdkRepository = new codecommit.Repository(this, "CDKRepository", {
      repositoryName: "MythicalMysfitsService-Repository-CDK"
    });

    const webRepository = new codecommit.Repository(this, "WebRepository", {
      repositoryName: "MythicalMysfitsService-Repository-Web"
    });

    this.apiRepository = new codecommit.Repository(this, "APIRepository", {
      repositoryName: "MythicalMysfitsService-Repository-API"
    });

    new cdk.CfnOutput(this, 'CDKRepositoryCloneUrlHttp', {
      description: 'CDK Repository CloneUrl HTTP',
      value: cdkRepository.repositoryCloneUrlHttp
    });

    new cdk.CfnOutput(this, 'CDKRepositoryCloneUrlSsh', {
      description: 'CDK Repository CloneUrl SSH',
      value: cdkRepository.repositoryCloneUrlSsh
    });

    new cdk.CfnOutput(this, 'WebRepositoryCloneUrlHttp', {
      description: 'Web Repository CloneUrl HTTP',
      value: webRepository.repositoryCloneUrlHttp
    });

    new cdk.CfnOutput(this, 'WebRepositoryCloneUrlSsh', {
      description: 'Web Repository CloneUrl SSH',
      value: webRepository.repositoryCloneUrlSsh
    });

    new cdk.CfnOutput(this, 'APIRepositoryCloneUrlHttp', {
      description: 'API Repository CloneUrl HTTP',
      value: this.apiRepository.repositoryCloneUrlHttp
    });

    new cdk.CfnOutput(this, 'APIRepositoryCloneUrlSsh', {
      description: 'API Repository CloneUrl SSH',
      value: this.apiRepository.repositoryCloneUrlSsh
    });
  }
}