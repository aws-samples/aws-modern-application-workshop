#!/usr/bin/env node

import cdk = require("@aws-cdk/cdk");
import { CiCdStack } from "../lib/cicdstack";
import { NetworkStack } from "../lib/networkstack";
import { EcrStack } from "../lib/ecrstack";
import { EcsStack } from "../lib/ecsstack";
import { WebApplicationStack } from "../lib/webapplicationstack";
import { DeveloperToolsStack } from "../lib/developertoolsstack";

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
    EcrRepository: ecrStack.ecrRepository,
    EcsService: ecsStack.ecsService.service,
    APIRepositoryARN: developerToolStack.apiRepository.repositoryArn
});
app.run();
