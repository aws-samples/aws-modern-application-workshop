import cdk = require("@aws-cdk/cdk");
import iam = require("@aws-cdk/aws-iam");
import codebuild = require("@aws-cdk/aws-codebuild");
import ecr = require("@aws-cdk/aws-ecr");
import ecs = require("@aws-cdk/aws-ecs");
import codecommit = require("@aws-cdk/aws-codecommit");
import codepipeline = require("@aws-cdk/aws-codepipeline");
import actions = require("@aws-cdk/aws-codepipeline-actions");

interface CiCdStackProps extends cdk.StackProps {
  ecrRepository: ecr.Repository;
  ecsService: ecs.FargateService;
  apiRepositoryARN: string;
}
export class CiCdStack extends cdk.Stack {
  constructor(scope: cdk.Construct, id: string, props: CiCdStackProps) {
    super(scope, id);

    const apiRepository = codecommit.Repository.fromRepositoryArn(this,'Repository', props.apiRepositoryARN);
    const codebuildProject = new codebuild.PipelineProject(this, "BuildProject", {
      projectName: "MythicalMysfitsServiceCodeBuildProject",
      environment: {
        computeType: codebuild.ComputeType.Small,
        buildImage: codebuild.LinuxBuildImage.UBUNTU_14_04_PYTHON_3_5_2,
        privileged: true,
        environmentVariables: {
          AWS_ACCOUNT_ID: {
            type: codebuild.BuildEnvironmentVariableType.PlainText,
            value: cdk.Aws.accountId
          },
          AWS_DEFAULT_REGION: {
            type: codebuild.BuildEnvironmentVariableType.PlainText,
            value: cdk.Aws.region
          }
        }
      }
    });
    codebuildProject.addToRolePolicy(new iam.PolicyStatement()
      .addResource(apiRepository.repositoryArn)
      .addActions(
        "codecommit:ListBranches",
        "codecommit:ListRepositories",
        "codecommit:BatchGetRepositories",
        "codecommit:GitPull"
      )
    );
    props.ecrRepository.grantPullPush(codebuildProject.grantPrincipal);

    const sourceOutput = new codepipeline.Artifact();
    const sourceAction = new actions.CodeCommitSourceAction({
      actionName: "CodeCommit-Source",
      branch: "master",
      pollForSourceChanges: false,
      repository: apiRepository,
      output: sourceOutput
    });
    const buildOutput = new codepipeline.Artifact();
    const buildAction = new actions.CodeBuildAction({
      actionName: "Build",
      input: sourceOutput,
      output: buildOutput,
      project: codebuildProject
    });
    const deployAction = new actions.EcsDeployAction({
      actionName: "DeployAction",
      service: props.ecsService,
      input: buildOutput
    });

    const pipeline = new codepipeline.Pipeline(this, "Pipeline", {
      pipelineName: "MythicalMysfitsPipeline"
    });
    pipeline.addStage({
      name: "Source",
      actions: [sourceAction]
    });
    pipeline.addStage({
      name: "Build",
      actions: [buildAction]
    });
    pipeline.addStage({
      name: "Deploy",
      actions: [deployAction]
    });
  }
}
