import cdk = require("@aws-cdk/cdk");
import dynamodb = require("@aws-cdk/aws-dynamodb");
import iam = require("@aws-cdk/aws-iam");
import ec2 = require("@aws-cdk/aws-ec2");
import { NetworkStack } from "../../../module-2/cdk/lib/NetworkStack";
import { EcsStack } from "../../../module-2/cdk/lib/ecsstack";


interface DynamoDBStackProps extends cdk.StackProps {
  NetworkStack: NetworkStack;
  EcsStack: EcsStack;
}

export class DynamoDBStack extends cdk.Stack {
  Table: dynamodb.Table;
  constructor(scope: cdk.App, id: string, props: DynamoDBStackProps) {
    super(scope, id);

    const dynamoDbEndpoint = props.NetworkStack.vpc.addGatewayEndpoint("DynamoDbEndpoint", {
      service: ec2.GatewayVpcEndpointAwsService.DynamoDb
    });
    dynamoDbEndpoint.addToPolicy(
      new iam.PolicyStatement()
        .addAnyPrincipal()
        .addActions("*")
        .addAllResources()
    );

    this.Table = new dynamodb.Table(this, "Table", {
      tableName: "MysfitsTable",
      partitionKey: {
        name: "MysfitId",
        type: dynamodb.AttributeType.String
      }
    });
    this.Table.addGlobalSecondaryIndex({
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
    this.Table.addGlobalSecondaryIndex({
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

    props.EcsStack.ecsService.service.taskDefinition.addToTaskRolePolicy(
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
