import cdk = require("@aws-cdk/cdk");
import ec2 = require("@aws-cdk/aws-ec2");
import ecs = require("@aws-cdk/aws-ecs");
import iam = require("@aws-cdk/aws-iam");
import ecsPatterns = require("@aws-cdk/aws-ecs-patterns");
import { NetworkStack } from "./networkstack";
import { EcrStack } from "./ecrstack";

interface EcsStackProps extends cdk.StackProps {
  NetworkStack: NetworkStack;
  EcrStack: EcrStack;
}
export class EcsStack extends cdk.Stack {
  public readonly ecsCluster: ecs.Cluster;
  public readonly ecsService: ecsPatterns.LoadBalancedFargateService;

  constructor(scope: cdk.App, id: string, props: EcsStackProps) {
    super(scope, id);

    this.ecsCluster = new ecs.Cluster(this, "Cluster", {
      vpc: props.NetworkStack.vpc
    });
    // this.ecsCluster.connections.allowFromAnyIPv4(new ec2.TcpPort(8080));

    // Instantiate Amazon ECS Service with an automatic load balancer
    this.ecsService = new ecsPatterns.LoadBalancedFargateService(this, "Service", {
      cluster: this.ecsCluster,
      loadBalancerType: ecsPatterns.LoadBalancerType.Network,
      containerPort: 8080,
      image: ecs.ContainerImage.fromEcrRepository(props.EcrStack.ecrRepository),
    });
    this.ecsService.service.connections.allowFrom(
      new ec2.CidrIPv4(props.NetworkStack.vpc.vpcCidrBlock),
      new ec2.TcpPort(8080)
    );
    this.ecsService.service.taskDefinition.addToExecutionRolePolicy(
      new iam.PolicyStatement()
        .addActions(
          // Rules which allow ECS to attach network interfaces to instances
          // on your behalf in order for awsvpc networking mode to work right
          "ec2:AttachNetworkInterface",
          "ec2:CreateNetworkInterface",
          "ec2:CreateNetworkInterfacePermission",
          "ec2:DeleteNetworkInterface",
          "ec2:DeleteNetworkInterfacePermission",
          "ec2:Describe*",
          "ec2:DetachNetworkInterface",

          // Rules which allow ECS to update load balancers on your behalf
          //  with the information sabout how to send traffic to your containers
          "elasticloadbalancing:DeregisterInstancesFromLoadBalancer",
          "elasticloadbalancing:DeregisterTargets",
          "elasticloadbalancing:Describe*",
          "elasticloadbalancing:RegisterInstancesWithLoadBalancer",
          "elasticloadbalancing:RegisterTargets",

          //  Rules which allow ECS to run tasks that have IAM roles assigned to them.
          "iam:PassRole",

          //  Rules that let ECS create and push logs to CloudWatch.
          "logs:DescribeLogStreams",
          "logs:CreateLogGroup")
        .addAllResources()
    );
    this.ecsService.service.taskDefinition.addToTaskRolePolicy(
      new iam.PolicyStatement()
        .addActions(
          // Allow the ECS Tasks to download images from ECR
          "ecr:GetAuthorizationToken",
          "ecr:BatchCheckLayerAvailability",
          "ecr:GetDownloadUrlForLayer",
          "ecr:BatchGetImage",
          // Allow the ECS tasks to upload logs to CloudWatch
          "logs:CreateLogStream",
          "logs:CreateLogGroup",
          "logs:PutLogEvents"
        )
        .addAllResources()
    );
  }
}