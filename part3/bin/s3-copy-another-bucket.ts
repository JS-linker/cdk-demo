#!/usr/bin/env node
import "source-map-support/register";
import * as cdk from "aws-cdk-lib";
import { SingleKinesisDataFlowStack } from "../lib/single-kinesis-data-flow-stack";
import { S3CopyAnotherBucketStack } from "../lib/s3-copy-another-bucket-stack";

const CDK_APP_ACCOUNT_ENV = "650139481770";
const CDK_APP_REGION_ENV = "us-east-1";

const app = new cdk.App();
const env = { account: CDK_APP_ACCOUNT_ENV, region: CDK_APP_REGION_ENV };

// The first step needs to be deployed first and then open the second step after obtaining the existing bucket name
new SingleKinesisDataFlowStack(app, "SingleKinesisDataFlowStack", { env });

// ^^^ second step
new S3CopyAnotherBucketStack(app, "S3CopyAnotherBucketStack", { env });
