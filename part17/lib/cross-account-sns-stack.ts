import * as cdk from "aws-cdk-lib";
import * as path from "path";
import { Stack, StackProps } from "aws-cdk-lib";
import { Construct } from "constructs";
import { NodejsFunction } from "aws-cdk-lib/aws-lambda-nodejs";
import * as lambda from "aws-cdk-lib/aws-lambda";
import * as sns from "aws-cdk-lib/aws-sns";
import * as subscriptions from "aws-cdk-lib/aws-sns-subscriptions";
import * as logs from "aws-cdk-lib/aws-logs";
import * as sfn from "aws-cdk-lib/aws-stepfunctions";

export class CrossAccountSnsStack extends Stack {
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    const sqsWorkerFunction = new NodejsFunction(this, "sqs-worker-lambda", {
      runtime: lambda.Runtime.NODEJS_14_X,
      handler: "handler",
      functionName: "sns-x-account",
      timeout: cdk.Duration.minutes(1),
      logRetention: logs.RetentionDays.ONE_WEEK,
      entry: path.join(__dirname, `../resources/lambda/sns-x-account/main.ts`),
    });

    // const principal = new iam.ServicePrincipal("sns.amazonaws.com");
    // sqsWorkerFunction.grantInvoke(principal);
    // sqsWorkerFunction.addPermission("sns-x-account", { principal });

    const crossAccountTopic = sns.Topic.fromTopicArn(
      this,
      "sns-x-topic",
      "TODO"
    );

    crossAccountTopic.addSubscription(
      new subscriptions.LambdaSubscription(sqsWorkerFunction)
    );

    if (sqsWorkerFunction.role) {
      sfn.StateMachine.fromStateMachineArn(
        this,
        "sfn",
        "TODO"
      ).grantStartExecution(sqsWorkerFunction);
    }
  }
}
