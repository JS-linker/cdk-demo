#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { KinesisToComprehendStack } from '../lib/kinesis-to-comprehend-stack';

const CDK_APP_ACCOUNT_ENV = "000000000000";
const CDK_APP_REGION_ENV = "us-east-1";

const app = new cdk.App();
const env = { account: CDK_APP_ACCOUNT_ENV, region: CDK_APP_REGION_ENV };

new KinesisToComprehendStack(app, "KinesisToComprehendStack", { env });