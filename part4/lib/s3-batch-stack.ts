import { Stack, StackProps } from "aws-cdk-lib";
import * as cdk from "aws-cdk-lib";
import * as s3 from "aws-cdk-lib/aws-s3";
import * as iam from "aws-cdk-lib/aws-iam";
import * as lambda from "aws-cdk-lib/aws-lambda";
import { Construct } from "constructs";

export class S3BatchStack extends Stack {
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    // Prepare the data warehouse in advance
    const LandDataBucket = new s3.Bucket(this, "LandDataBucket", {
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      versioned: true,
    });

    // standard zone
    const RawDataBucket = new s3.Bucket(this, "RawDataBucket", {
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      versioned: true,
    });

    new cdk.CfnOutput(this, "LandDataBucket.bucketName", {
      value: LandDataBucket.bucketName,
    });

    new cdk.CfnOutput(this, "RawDataBucket.bucketName", {
      value: RawDataBucket.bucketName,
    });

    // create
    const landToRawFunction = new lambda.Function(this, "land_to_raw", {
      code: lambda.Code.fromAsset("resources/lambda/land_to_raw"),
      handler: "index.handler",
      functionName: "BucketPutHandler",
      runtime: lambda.Runtime.NODEJS_12_X,
    });

    landToRawFunction.role?.attachInlinePolicy(
      new iam.Policy(this, "move-land-to-raw-policy", {
        statements: [
          new iam.PolicyStatement({
            effect: iam.Effect.ALLOW,
            actions: ["s3:GetObject", "s3:GetObjectVersion"],
            resources: [LandDataBucket.arnForObjects("*")],
          }),
          new iam.PolicyStatement({
            effect: iam.Effect.ALLOW,
            actions: ["s3:PutObject"],
            resources: [RawDataBucket.arnForObjects("*")],
          }),
        ],
      })
    );

    new cdk.CfnOutput(this, "landToRawFunction.functionArn", {
      value: landToRawFunction.functionArn,
    });
    new cdk.CfnOutput(this, "landToRawFunction.role.roleArn", {
      value: landToRawFunction.role?.roleArn || "",
    });

    // create batch role
    const bucketBatchPolicy = new iam.Policy(
      this,
      "AllowBatchOperationsInvokeFunction",
      {
        statements: [
          new iam.PolicyStatement({
            effect: iam.Effect.ALLOW,
            actions: ["lambda:InvokeFunction"],
            resources: [
              landToRawFunction.functionArn
              // "arn:aws:lambda:us-east-1:270222400520:function:BucketPutHandler:$LATEST",
            ],
          }),
          new iam.PolicyStatement({
            effect: iam.Effect.ALLOW,
            actions: ["s3:GetObject", "s3:GetObjectVersion"],
            resources: [LandDataBucket.arnForObjects("manifest.csv")],
          }),
          new iam.PolicyStatement({
            effect: iam.Effect.ALLOW,
            actions: ["s3:PutObject"],
            resources: [LandDataBucket.arnForObjects("*")],
          }),
        ],
      }
    );

    const bucketBatchRole = new iam.Role(
      this,
      "AllowBatchOperationsInvokeFunctionRole",
      {
        assumedBy: new iam.ServicePrincipal("batchoperations.s3.amazonaws.com"),
      }
    );

    bucketBatchRole.attachInlinePolicy(bucketBatchPolicy);

    new cdk.CfnOutput(this, "bucketBatchRole.roleArn", {
      value: bucketBatchRole.roleArn,
    });


    // const bucketBatchRole = new iam.Role(
    //   this,
    //   "AllowBatchOperationsInvokeFunctionRole",
    //   {
    //     assumedBy: new iam.ServicePrincipal("batchoperations.s3.amazonaws.com"),
    //   }
    // );

    // bucketBatchRole.attachInlinePolicy(
    //   new iam.Policy(this, "AllowBatchOperationsInvokeFunction", {
    //     statements: [
    //       new iam.PolicyStatement({
    //         effect: iam.Effect.ALLOW,
    //         actions: ["s3:InitiateReplication"],
    //         resources: [LandDataBucket.arnForObjects("*")],
    //       }),
    //       new iam.PolicyStatement({
    //         effect: iam.Effect.ALLOW,
    //         actions: ["s3:GetObject", "s3:GetObjectVersion"],
    //         resources: [RawDataBucket.arnForObjects("*")],
    //       }),
    //       new iam.PolicyStatement({
    //         effect: iam.Effect.ALLOW,
    //         actions: ["s3:PutObject"],
    //         resources: [LandDataBucket.arnForObjects("*")],
    //       }),
    //       new iam.PolicyStatement({
    //         effect: iam.Effect.ALLOW,
    //         actions: ["s3:PutObject"],
    //         resources: [RawDataBucket.arnForObjects("*")],
    //       }),
    //       new iam.PolicyStatement({
    //         effect: iam.Effect.ALLOW,
    //         actions: [
    //           "s3:GetReplicationConfiguration",
    //           "s3:PutInventoryConfiguration",
    //         ],
    //         resources: [LandDataBucket.bucketArn],
    //       }),
    //     ],
    //   })
    // );
    // const s3crrRole = new iam.Role(
    //   this,
    //   "s3crr_role_for_land_to_raw",
    //   {
    //     assumedBy: new iam.ServicePrincipal("s3.amazonaws.com"),
    //   }
    // );

    // s3crrRole.attachInlinePolicy(
    //   new iam.Policy(this, "s3crr_role_for_land_to_raw_policy", {
    //     statements: [
    //       new iam.PolicyStatement({
    //         effect: iam.Effect.ALLOW,
    //         actions: ["s3:*"],
    //         resources: [LandDataBucket.arnForObjects("*")],
    //       }),
    //       new iam.PolicyStatement({
    //         effect: iam.Effect.ALLOW,
    //         actions: ["s3:*"],
    //         resources: [RawDataBucket.arnForObjects("*")],
    //       }),
    //     ],
    //   })
    // );

    // new cdk.CfnOutput(this, "s3crrRole.roleArn", {
    //   value: s3crrRole.roleArn,
    // });
  }
}
