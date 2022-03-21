import { Stack, StackProps } from "aws-cdk-lib";
import * as cdk from "aws-cdk-lib";
import * as s3 from "aws-cdk-lib/aws-s3";
import * as iam from "aws-cdk-lib/aws-iam";
import * as kinesis from "aws-cdk-lib/aws-kinesis";
import * as kinesisfirehose from "aws-cdk-lib/aws-kinesisfirehose";
import { Construct } from "constructs";

export class KinesisDataStack extends Stack {
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    // rootStream is a raw kinesis stream in which we build other modules on top of.
    const rootStream = new kinesis.Stream(this, "RootStream");

    // Output the stream name so we can connect our script to this stream
    new cdk.CfnOutput(this, "RootStreamName", {
      value: rootStream.streamName,
    });

    // S3 bucket that will serve as the destination for our raw compressed data
    const rawDataBucket = new s3.Bucket(this, "RawDataBucket", {
      removalPolicy: cdk.RemovalPolicy.DESTROY, // REMOVE FOR PRODUCTION
      autoDeleteObjects: true, // REMOVE FOR PRODUCTION
    });

    const firehoseRole = new iam.Role(this, "firehoseRole", {
      assumedBy: new iam.ServicePrincipal("firehose.amazonaws.com"),
    });

    rootStream.grantRead(firehoseRole);
    rootStream.grant(firehoseRole, "kinesis:DescribeStream");
    rawDataBucket.grantWrite(firehoseRole);

    const firehoseStreamToS3 = new kinesisfirehose.CfnDeliveryStream(
      this,
      "FirehoseStreamToS3",
      {
        deliveryStreamName: "StreamRawToS3",
        deliveryStreamType: "KinesisStreamAsSource",
        kinesisStreamSourceConfiguration: {
          kinesisStreamArn: rootStream.streamArn,
          roleArn: firehoseRole.roleArn,
        },
        s3DestinationConfiguration: {
          bucketArn: rawDataBucket.bucketArn,
          bufferingHints: {
            sizeInMBs: 64,
            intervalInSeconds: 60,
          },
          compressionFormat: "GZIP",
          encryptionConfiguration: {
            noEncryptionConfig: "NoEncryption",
          },

          prefix: "raw/",
          roleArn: firehoseRole.roleArn,
        },
      }
    );

    // Ensures our role is created before we try to create a Kinesis Firehose
    firehoseStreamToS3.node.addDependency(firehoseRole);
  }
}
