#!/usr/bin/env node

import cdk = require("@aws-cdk/core");
import 'source-map-support/register';
import { StaticWebsiteStack } from "../lib/static-website-stack";
import { NetworkStack } from "../lib/network-stack";
import { EcrStack } from "../lib/ecr-stack";
import { EcsStack } from "../lib/ecs-stack";
import { CiCdStack } from "../lib/cicd-stack";
import { DynamoDbStack } from '../lib/dynamodb-stack';
import { APIGatewayStack } from "../lib/apigateway-stack";
import { KinesisFirehoseStack } from "../lib/kinesis-firehose-stack";
import { XRayStack } from "../lib/xray-stack";

const app = new cdk.App();
new StaticWebsiteStack(app, "MythicalMysfits-Website");
const networkStack = new NetworkStack(app, "MythicalMysfits-Network");
const ecrStack = new EcrStack(app, "MythicalMysfits-ECR");
const ecsStack = new EcsStack(app, "MythicalMysfits-ECS", {
    vpc: networkStack.vpc,
    ecrRepository: ecrStack.ecrRepository
});
new CiCdStack(app, "MythicalMysfits-CICD", {
    ecrRepository: ecrStack.ecrRepository,
    ecsService: ecsStack.ecsService.service
});
new DynamoDbStack(app, "MythicalMysfits-DynamoDB", {
    fargateService: ecsStack.ecsService
});
new APIGatewayStack(app, "MythicalMysfits-APIGateway", {
  fargateService: ecsStack.ecsService
});
new KinesisFirehoseStack(app, "MythicalMysfits-KinesisFirehose", {
    table: DynamoDbStack.table
});
new XRayStack(app, "MythicalMysfits-XRay");
app.synth();