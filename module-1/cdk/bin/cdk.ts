#!/usr/bin/env node

import cdk = require("@aws-cdk/cdk");
import "source-map-support/register";
import { DeveloperToolsStack } from "../lib/developer-tools-stack";
import { WebApplicationStack } from "../lib/web-application-stack";

const app = new cdk.App();
new DeveloperToolsStack(app, 'MythicalMysfits-DeveloperTools');
new WebApplicationStack(app, "MythicalMysfits-WebApplication");
