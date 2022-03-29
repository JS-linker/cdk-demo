#!/usr/bin/env node
import "source-map-support/register";
import * as cdk from "aws-cdk-lib";
import { S3BatchStack } from "../lib/s3-batch-stack";

const CDK_APP_ACCOUNT_ENV = "000000000000";
const CDK_APP_REGION_ENV = "us-west-1";

const app = new cdk.App();
const env = { account: CDK_APP_ACCOUNT_ENV, region: CDK_APP_REGION_ENV };

new S3BatchStack(app, "LL-SC-S3BatchStack", { env });