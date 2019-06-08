#!/usr/bin/env node

import cdk = require("@aws-cdk/cdk");
import "source-map-support/register";
import { NetworkStack } from "../../../module-2/cdk/lib/NetworkStack";
import { EcrStack } from "../../../module-2/cdk/lib/ECRStack";
import { EcsStack } from "../../../module-2/cdk/lib/ECSStack";
import { APIGatewaySchemaStack } from "../lib/APIGatewayStack";
import { WebApplicationStack } from '../../../module-1/cdk/lib/WebApplicationStack';
import { DynamoDBStack } from '../../../module-3/cdk/lib/DynamoDBStack';

const app = new cdk.App();
const networkStack = new NetworkStack(app, "MythicalMysfits-Module2-Network");
const ecrStack = new EcrStack(app, "MythicalMysfits-ECR");
const ecsStack = new EcsStack(app, "MythicalMysfits-ECS", {
    NetworkStack: networkStack,
    EcrStack: ecrStack
});
new DynamoDBStack(app, "MythicalMysfits-DynamoDB", {
    NetworkStack: networkStack,
    EcsStack: ecsStack
});
new APIGatewaySchemaStack(app, "MythicalMysfits-APIGateway", {
    EcsStack: ecsStack
});
new WebApplicationStack(app, "MythicalMysfits-WebApplication");
app.run();