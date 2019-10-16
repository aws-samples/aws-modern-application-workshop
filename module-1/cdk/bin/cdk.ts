#!/usr/bin/env node

import cdk = require('@aws-cdk/core');
import ssm = require('@aws-cdk/aws-ssm');
import 'source-map-support/register';
import { WebApplicationStack } from '../lib/web-application-stack';
import { DeveloperToolsStack } from "../lib/developer-tools-stack";

const app = new cdk.App();

new DeveloperToolsStack(app, 'MythicalMysfits-DeveloperTools');
new WebApplicationStack(app, "MythicalMysfits-WebApplication");
app.synth();