import cdk = require("@aws-cdk/core");
import dynamodb = require("@aws-cdk/aws-dynamodb");
import iam = require("@aws-cdk/aws-iam");
import ec2 = require("@aws-cdk/aws-ec2");
import ecs = require("@aws-cdk/aws-ecs");


interface DynamoDbStackProps extends cdk.StackProps {
  vpc: ec2.Vpc;
  fargateService: ecs.FargateService;
}

export class DynamoDbStack extends cdk.Stack {
  public readonly table: dynamodb.Table;

  constructor(scope: cdk.App, id: string, props: DynamoDbStackProps) {
    super(scope, id);

    const dynamoDbEndpoint = props.vpc.addGatewayEndpoint("DynamoDbEndpoint", {
      service: ec2.GatewayVpcEndpointAwsService.DYNAMODB
    });
    
    const dynamoDbPolicy = new iam.PolicyStatement();
    dynamoDbPolicy.addAnyPrincipal();
    dynamoDbPolicy.addActions("*");
    dynamoDbPolicy.addAllResources();

    dynamoDbEndpoint.addToPolicy(
      dynamoDbPolicy
    );

    this.table = new dynamodb.Table(this, "Table", {
      tableName: "MysfitsTable",
      partitionKey: {
        name: "MysfitId",
        type: dynamodb.AttributeType.STRING
      }
    });
    this.table.addGlobalSecondaryIndex({
      indexName: "LawChaosIndex",
      partitionKey: {
        name: 'LawChaos',
        type: dynamodb.AttributeType.STRING
      },
      sortKey: {
        name: 'MysfitId',
        type: dynamodb.AttributeType.STRING
      },
      readCapacity: 5,
      writeCapacity: 5,
      projectionType: dynamodb.ProjectionType.ALL
    });
    this.table.addGlobalSecondaryIndex({
      indexName: "GoodEvilIndex",
      partitionKey: {
        name: 'GoodEvil',
        type: dynamodb.AttributeType.STRING
      },
      sortKey: {
        name: 'MysfitId',
        type: dynamodb.AttributeType.STRING
      },
      readCapacity: 5,
      writeCapacity: 5,
      projectionType: dynamodb.ProjectionType.ALL
    });

    const fargatePolicy = new iam.PolicyStatement();
    fargatePolicy.addActions(
      //  Allows the ECS tasks to interact with only the MysfitsTable in DynamoDB
      "dynamodb:Scan",
      "dynamodb:Query",
      "dynamodb:UpdateItem",
      "dynamodb:GetItem",
      "dynamodb:DescribeTable"
    );
    fargatePolicy.addResources(
      "arn:aws:dynamodb:*:*:table/MysfitsTable*"
    );
    props.fargateService.taskDefinition.addToTaskRolePolicy(
      fargatePolicy
    );
  }
}
