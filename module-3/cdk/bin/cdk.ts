#!/usr/bin/env node

import cdk = require('@aws-cdk/cdk');
import 'source-map-support/register';
import { DynamoDBStack } from '../lib/dynamodbstack';
import { NetworkStack } from '../lib/networkstack';
import { WebApplicationStack } from '../lib/webapplicationstack';
import { DeveloperToolsStack } from "../lib/developertoolsstack";
import { EcrStack } from "../lib/ecrstack";
import { EcsStack } from "../lib/ecsstack";
import { CiCdStack } from "../lib/cicdstack";

const app = new cdk.App();
const developerToolStack = new DeveloperToolsStack(app, 'MythicalMysfits-DeveloperTools');
new WebApplicationStack(app, "MythicalMysfits-WebApplication");
const networkStack = new NetworkStack(app, "MythicalMysfits-Module2-Network");
const ecrStack = new EcrStack(app, "MythicalMysfits-ECR");
const ecsStack = new EcsStack(app, "MythicalMysfits-ECS", {
    vpc: networkStack.vpc,
    ecrRepository: ecrStack.ecrRepository
});
new CiCdStack(app, "MythicalMysfits-CICD", {
    EcrRepository: ecrStack.ecrRepository,
    EcsService: ecsStack.ecsService.service,
    APIRepository: developerToolStack.apiRepository
});
new DynamoDBStack(app, "MythicalMysfits-DynamoDB", {
    Vpc: networkStack.vpc,
    FargateService: ecsStack.ecsService
});
app.run();