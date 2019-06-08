#!/usr/bin/env node
import cdk = require('@aws-cdk/cdk');
import 'source-map-support/register';
import { GitRepoStack } from '../lib/GitRepoStack';
import { KinesisFirehoseStack } from '../lib/KinesisFirehoseStack';
import { DynamoDBStack } from '../../../module-3/cdk/lib/DynamoDBStack';
import { WebApplicationStack } from '../../../module-1/cdk/lib/WebApplicationStack';
import { NetworkStack } from '../../../module-2/cdk/lib/NetworkStack';
import { EcrStack } from '../../../module-2/cdk/lib/EcrStack';
import { EcsStack } from '../../../module-2/cdk/lib/EcsStack';

const app = new cdk.App();
new GitRepoStack(app);
const networkStack = new NetworkStack(app, "MythicalMysfits-Module2-Network");
const ecrStack = new EcrStack(app, "MythicalMysfits-ECR");
const ecsStack = new EcsStack(app, "MythicalMysfits-ECS", {
    NetworkStack: networkStack,
    EcrStack: ecrStack
});
const dynamoDBStack = new DynamoDBStack(app, "MythicalMysfits-DynamoDB", {
    NetworkStack: networkStack,
    EcsStack: ecsStack
});
new KinesisFirehoseStack(app, "MythicalMysfits-KinesisStack", {
    DynamoDBStack: dynamoDBStack
});
new WebApplicationStack(app, "MythicalMysfits-WebApplication");
app.run();