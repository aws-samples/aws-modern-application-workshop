#!/usr/bin/env node

import cdk = require("@aws-cdk/cdk");
import { CiCdStack } from "../lib/cicdstack";
import { NetworkStack } from "../lib/networkstack";
import { EcrStack } from "../lib/ecrstack";
import { EcsStack } from "../lib/ecsstack";
import { WebApplicationStack } from "../../../module-1/cdk/lib/webapplicationstack";

const app = new cdk.App();
const networkStack = new NetworkStack(app, "MythicalMysfits-Network");
const ecrStack = new EcrStack(app, "MythicalMysfits-ECR");
const ecsStack = new EcsStack(app, "MythicalMysfits-ECS", {
    NetworkStack: networkStack,
    EcrStack: ecrStack
});
new CiCdStack(app, "MythicalMysfits-CICD", {
    EcrStack: ecrStack,
    EcsStack: ecsStack
});
new WebApplicationStack(app, "MythicalMysfits-WebApplication");
app.run();
