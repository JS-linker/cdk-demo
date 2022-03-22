import { Stack, StackProps } from "aws-cdk-lib";
import * as cdk from "aws-cdk-lib";
import * as s3 from "aws-cdk-lib/aws-s3";
import * as lambda from "aws-cdk-lib/aws-lambda";
import * as s3n from "aws-cdk-lib/aws-s3-notifications";
import { Construct } from "constructs";

export class S3CopyAnotherBucketStack extends Stack {
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);
    // standard zone
    const standardDataBucket = new s3.Bucket(this, "StandardDataBucket", {
      removalPolicy: cdk.RemovalPolicy.DESTROY, // REMOVE FOR PRODUCTION
    });

    const lambdaFunction = new lambda.Function(this, "Function", {
      code: lambda.Code.fromAsset("resources/lambda/raw_to_standard"),
      handler: "index.handler",
      functionName: "BucketPutHandler",
      runtime: lambda.Runtime.NODEJS_12_X,
    });

    const tagetBucket = ":TODO";
    const sourcesBucket = s3.Bucket.fromBucketName(this, id, tagetBucket);
    // trigger
    sourcesBucket.addEventNotification(
      s3.EventType.OBJECT_CREATED_PUT,
      new s3n.LambdaDestination(lambdaFunction)
    );

    // lambdaFunction.role?.attachInlinePolicy(
    //   new iam.Policy(this, "move-objects-from-raw-zone-bucket", {
    //     statements: [
    //       new iam.PolicyStatement({
    //         effect: iam.Effect.ALLOW,
    //         actions: ["s3:ListBucket"],
    //         resources: [],
    //       }),
    //       new iam.PolicyStatement({
    //         effect: iam.Effect.ALLOW,
    //         actions: ["s3:DeleteObject", "s3:GetObject"],
    //         resources: objectResources,
    //       }),
    //     ],
    //   })
    // );
  }
}
