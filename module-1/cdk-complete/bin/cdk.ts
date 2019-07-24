#!/usr/bin/env node
import 'source-map-support/register';
import cdk = require('@aws-cdk/core');
import { StaticWebsiteStack } from "../lib/static-website-stack";

const app = new cdk.App();
new StaticWebsiteStack(app, "MythicalMysfits-Website");
