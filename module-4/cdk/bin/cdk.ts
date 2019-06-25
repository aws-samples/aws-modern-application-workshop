#!/usr/bin/env node

import cdk = require('@aws-cdk/core');
import 'source-map-support/register';
import { DynamoDbStack } from '../lib/dynamodb-stack';
import { NetworkStack } from '../lib/network-stack';
import { WebApplicationStack } from '../lib/web-application-stack';
import { DeveloperToolsStack } from "../lib/developer-tools-stack";
import { APIGatewayStack } from "../lib/api-gateway-stack";
import { EcrStack } from "../lib/ecr-stack";
import { EcsStack } from "../lib/ecs-stack";
import { CiCdStack } from '../lib/cicd-stack';

const app = new cdk.App();
const developerToolStack = new DeveloperToolsStack(app, 'MythicalMysfits-DeveloperTools');
new WebApplicationStack(app, "MythicalMysfits-WebApplication");
const networkStack = new NetworkStack(app, "MythicalMysfits-Network");
const ecrStack = new EcrStack(app, "MythicalMysfits-ECR");
const ecsStack = new EcsStack(app, "MythicalMysfits-ECS", {
    vpc: networkStack.vpc,
    ecrRepository: ecrStack.ecrRepository
});
new CiCdStack(app, "MythicalMysfits-CICD", {
    ecrRepository: ecrStack.ecrRepository,
    ecsService: ecsStack.ecsService.service,
    apiRepositoryARN: developerToolStack.apiRepository.repositoryArn
});
new DynamoDbStack(app, "MythicalMysfits-DynamoDB", {
    vpc: networkStack.vpc,
    fargateService: ecsStack.ecsService
});
new APIGatewayStack(app, "MythicalMysfits-APIGateway", {
    fargateService: ecsStack.ecsService
});
app.synth();
