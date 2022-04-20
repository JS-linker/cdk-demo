import { Stack, StackProps, RemovalPolicy } from "aws-cdk-lib";
import * as kinesis from "aws-cdk-lib/aws-kinesis";
import * as iam from "aws-cdk-lib/aws-iam";
import * as lambda from "aws-cdk-lib/aws-lambda";
import * as lambdaEventSources from "aws-cdk-lib/aws-lambda-event-sources";
import * as s3 from "aws-cdk-lib/aws-s3";
import { Construct } from "constructs";

export class KinesisToComprehendStack extends Stack {
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    // kinesis stream data
    const rootStream = new kinesis.Stream(this, "KinesisToComprehendStream");
    // bucket
    // const bucket = new s3.Bucket(this, "KinesisToComprehendBucket", {
    //   removalPolicy: RemovalPolicy.DESTROY,
    // });
    // get kinesis message
    const lambdaRole = new iam.Role(this, "kinesis-message-handle-role", {
      assumedBy: new iam.ServicePrincipal("lambda.amazonaws.com"),
    });
    lambdaRole.addToPolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions: ["comprehend:*"],
        resources: ["*"],
      })
    );
    const kinesisMessageFunction = new lambda.Function(
      this,
      "kinesis-message-handle",
      {
        code: lambda.Code.fromAsset("resources/lambda/kinesis-message"),
        handler: "index.handler",
        functionName: "KinesisMessage",
        runtime: lambda.Runtime.NODEJS_14_X,
        role: lambdaRole,
      }
    );

    const kinesisEventSource = new lambdaEventSources.KinesisEventSource(
      rootStream,
      {
        startingPosition: lambda.StartingPosition.TRIM_HORIZON,
      }
    );
    // kinesis event
    kinesisMessageFunction.addEventSource(kinesisEventSource);
  }
}
