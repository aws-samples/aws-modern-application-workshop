import cdk = require("@aws-cdk/cdk");
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
      service: ec2.GatewayVpcEndpointAwsService.DynamoDb
    });
    dynamoDbEndpoint.addToPolicy(
      new iam.PolicyStatement()
        .addAnyPrincipal()
        .addActions("*")
        .addAllResources()
    );

    this.table = new dynamodb.Table(this, "Table", {
      tableName: "MysfitsTable",
      partitionKey: {
        name: "MysfitId",
        type: dynamodb.AttributeType.String
      }
    });
    this.table.addGlobalSecondaryIndex({
      indexName: "LawChaosIndex",
      partitionKey: {
        name: 'LawChaos',
        type: dynamodb.AttributeType.String
      },
      sortKey: {
        name: 'MysfitId',
        type: dynamodb.AttributeType.String
      },
      readCapacity: 5,
      writeCapacity: 5,
      projectionType: dynamodb.ProjectionType.All
    });
    this.table.addGlobalSecondaryIndex({
      indexName: "GoodEvilIndex",
      partitionKey: {
        name: 'GoodEvil',
        type: dynamodb.AttributeType.String
      },
      sortKey: {
        name: 'MysfitId',
        type: dynamodb.AttributeType.String
      },
      readCapacity: 5,
      writeCapacity: 5,
      projectionType: dynamodb.ProjectionType.All
    });

    props.fargateService.taskDefinition.addToTaskRolePolicy(
      new iam.PolicyStatement()
        .addActions(
          //  Allows the ECS tasks to interact with only the MysfitsTable in DynamoDB
          "dynamodb:Scan",
          "dynamodb:Query",
          "dynamodb:UpdateItem",
          "dynamodb:GetItem",
          "dynamodb:DescribeTable"
        )
        .addResource(
          "arn:aws:dynamodb:*:*:table/MysfitsTable*"
        )
    );
  }
}
