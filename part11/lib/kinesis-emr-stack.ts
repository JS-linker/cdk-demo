import { Stack, StackProps, RemovalPolicy } from "aws-cdk-lib";
import * as kinesis from "aws-cdk-lib/aws-kinesis";
import * as iam from "aws-cdk-lib/aws-iam";
import * as s3deployment from "aws-cdk-lib/aws-s3-deployment";
import * as lambda from "aws-cdk-lib/aws-lambda";
import * as lambdaEventSources from "aws-cdk-lib/aws-lambda-event-sources";
import * as kinesisfirehose from "aws-cdk-lib/aws-kinesisfirehose";
import * as s3 from "aws-cdk-lib/aws-s3";
import { Construct } from "constructs";

export class KinesisEmrStack extends Stack {
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    // kinesis stream data
    const rootStream = new kinesis.Stream(this, "KinesisEmrStream", {
      streamName: "KinesisEmrStream",
    });
    // result and job save bukcet
    const bucket = new s3.Bucket(this, "KinesisEmrStreamBucket", {
      bucketName: "kinesis-emr-zone",
      removalPolicy: RemovalPolicy.DESTROY,
    });

    const firehoseRole = new iam.Role(this, "KinesisEmrFirehoseRole", {
      assumedBy: new iam.ServicePrincipal("firehose.amazonaws.com"),
    });

    rootStream.grantRead(firehoseRole);
    rootStream.grant(firehoseRole, "kinesis:DescribeStream");
    bucket.grantWrite(firehoseRole);

    const firehoseStreamToS3 = new kinesisfirehose.CfnDeliveryStream(
      this,
      "KinesisEmrFirehoseStreamToS3",
      {
        deliveryStreamName: "KinesisEmrFirehoseStreamToS3",
        deliveryStreamType: "KinesisStreamAsSource",
        kinesisStreamSourceConfiguration: {
          kinesisStreamArn: rootStream.streamArn,
          roleArn: firehoseRole.roleArn,
        },
        s3DestinationConfiguration: {
          bucketArn: bucket.bucketArn,
          bufferingHints: {
            sizeInMBs: 64,
            intervalInSeconds: 60,
          },
          compressionFormat: "GZIP",
          encryptionConfiguration: {
            noEncryptionConfig: "NoEncryption",
          },

          prefix: "source/",
          roleArn: firehoseRole.roleArn,
        },
      }
    );

    // Ensures our role is created before we try to create a Kinesis Firehose
    firehoseStreamToS3.node.addDependency(firehoseRole);

    new s3deployment.BucketDeployment(this, "UploadSimpleSparkJob", {
      destinationBucket: bucket,
      destinationKeyPrefix: "spark-job/",
      sources: [s3deployment.Source.asset("resources/spark-job/")],
    });
    // kinesis message handle
    const kinesisMessageFunction = new lambda.Function(
      this,
      "kinesis-message-handle",
      {
        code: lambda.Code.fromAsset("resources/lambda/kinesis-message"),
        handler: "index.handler",
        functionName: "KinesisMessageHandler",
        runtime: lambda.Runtime.NODEJS_14_X,
        environment: {
          JOB_BUCKET_PATH: bucket.s3UrlForObject(
            "spark-job/SparkSimpleJob-1.0.0.jar"
          ),
          SOURCE_BUCKET_PATH: bucket.s3UrlForObject("source"),
          TARGET_BUCKET_PATH: bucket.s3UrlForObject("target"),
        },
      }
    );
    kinesisMessageFunction.addToRolePolicy(
      new iam.PolicyStatement({
        actions: ["elasticmapreduce:RunJobFlow"],
        resources: ["*"],
      })
    );
    kinesisMessageFunction.addToRolePolicy(
      new iam.PolicyStatement({
        actions: ["iam:PassRole"],
        resources: [
          `arn:aws:iam::${this.account}:role/EMR_DefaultRole`,
          `arn:aws:iam::${this.account}:role/EMR_EC2_DefaultRole`,
        ],
      })
    );
    kinesisMessageFunction.addEventSource(
      new lambdaEventSources.S3EventSource(bucket, {
        events: [s3.EventType.OBJECT_CREATED],
      })
    );
  }
}
