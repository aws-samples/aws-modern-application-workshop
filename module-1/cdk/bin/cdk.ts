#!/usr/bin/env node
import 'source-map-support/register';
import cdk = require('@aws-cdk/core');
import { WebApplicationStack } from "../lib/web-application-stack";

const app = new cdk.App();
new WebApplicationStack(app, "MythicalMysfits-Website");
