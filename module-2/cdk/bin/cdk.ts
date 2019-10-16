#!/usr/bin/env node

import cdk = require("@aws-cdk/core");
import 'source-map-support/register';
import { CiCdStack } from "../lib/cicd-stack";
import { NetworkStack } from "../lib/network-stack";
import { EcrStack } from "../lib/ecr-stack";
import { EcsStack } from "../lib/ecs-stack";
import { WebApplicationStack } from "../lib/web-application-stack";
import { DeveloperToolsStack } from "../lib/developer-tools-stack";

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
  apiRepositoryArn: developerToolStack.apiRepository.repositoryArn
});
app.synth();
