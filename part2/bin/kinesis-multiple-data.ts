#!/usr/bin/env node
import "source-map-support/register";
import * as cdk from "aws-cdk-lib";
import { KinesisMultipleDataStack } from "../lib/kinesis-multiple-data-stack";

const CDK_APP_ACCOUNT_ENV = "000000000000";
const CDK_APP_REGION_ENV = "us-east-1";

const app = new cdk.App();
new KinesisMultipleDataStack(app, "KinesisMultipleDataStack", {
  /* If you don't specify 'env', this stack will be environment-agnostic.
   * Account/Region-dependent features and context lookups will not work,
   * but a single synthesized template can be deployed anywhere. */

  /* Uncomment the next line to specialize this stack for the AWS Account
   * and Region that are implied by the current CLI configuration. */
  env: { account: CDK_APP_ACCOUNT_ENV, region: CDK_APP_REGION_ENV },

  /* Uncomment the next line if you know exactly what Account and Region you
   * want to deploy the stack to. */
  // env: { account: '123456789012', region: 'us-east-1' },

  /* For more information, see https://docs.aws.amazon.com/cdk/latest/guide/environments.html */
});
