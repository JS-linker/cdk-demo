import * as cdk from "aws-cdk-lib";
import { Stack, StackProps } from "aws-cdk-lib";
import { Construct } from "constructs";
import * as sqs from "aws-cdk-lib/aws-sqs";
import * as sns from "aws-cdk-lib/aws-sns";
import * as lambda from "aws-cdk-lib/aws-lambda";
import * as subscriptions from "aws-cdk-lib/aws-sns-subscriptions";
import * as lambdaEventSources from "aws-cdk-lib/aws-lambda-event-sources";

export class SnsSqsStack extends Stack {
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    // The code that defines your stack goes here
    const topic = new sns.Topic(this, "sns", {
      topicName: "topic-for-sns",
    });

    // example resource
    const queue1 = new sqs.Queue(this, "SnsSqsQueue1", {
      visibilityTimeout: cdk.Duration.seconds(300),
    });
    const queue2 = new sqs.Queue(this, "SnsSqsQueue2", {
      visibilityTimeout: cdk.Duration.seconds(300),
    });
    const queue3bak = new sqs.Queue(this, "SnsSqsQueue3", {
      visibilityTimeout: cdk.Duration.seconds(300),
    });

    const sqsClient = new lambda.Function(this, "sqs-client", {
      code: lambda.Code.fromAsset("resources/lambda/sqs-sub"),
      handler: "main.handler",
      functionName: "SqsMessageHandler",
      runtime: lambda.Runtime.NODEJS_12_X,
    });

    [queue1, queue2, queue3bak].forEach((q) =>
      sqsClient.addEventSource(
        new lambdaEventSources.SqsEventSource(q, { batchSize: 1 })
      )
    );

    topic.addSubscription(
      new subscriptions.SqsSubscription(queue1, {
        filterPolicy: {
          type: sns.SubscriptionFilter.stringFilter({
            allowlist: ["q1"],
          }),
        },
      })
    );

    topic.addSubscription(
      new subscriptions.SqsSubscription(queue2, {
        filterPolicy: {
          type: sns.SubscriptionFilter.stringFilter({
            allowlist: ["q2"],
          }),
        },
      })
    );
  }
}
