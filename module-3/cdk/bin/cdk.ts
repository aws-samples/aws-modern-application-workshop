#!/usr/bin/env node

import cdk = require('@aws-cdk/cdk');
import 'source-map-support/register';
import { DynamoDBStack } from '../lib/DynamoDBStack';
import { NetworkStack } from '../../../module-2/cdk/lib/NetworkStack';
import { WebApplicationStack } from '../../../module-1/cdk/lib/WebApplicationStack';
import { EcrStack } from "../../../module-2/cdk/lib/EcrStack";
import { EcsStack } from "../../../module-2/cdk/lib/EcsStack";

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
new WebApplicationStack(app, "MythicalMysfits-WebApplication");
app.run();