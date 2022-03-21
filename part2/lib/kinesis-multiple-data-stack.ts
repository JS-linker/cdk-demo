import { Stack, StackProps } from "aws-cdk-lib";
import * as cdk from "aws-cdk-lib";
import * as s3 from "aws-cdk-lib/aws-s3";
import * as iam from "aws-cdk-lib/aws-iam";
import * as kinesis from "aws-cdk-lib/aws-kinesis";
import * as kinesisfirehose from "aws-cdk-lib/aws-kinesisfirehose";
import { Construct } from "constructs";

export class KinesisMultipleDataStack extends Stack {
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    // rootStream is a raw kinesis stream in which we build other modules on top of.
    const rootStream = new kinesis.Stream(this, "RootStream", {
      shardCount: 2,
    });

    // Output the stream name so we can connect our script to this stream
    new cdk.CfnOutput(this, "RootStreamName", {
      value: rootStream.streamName,
    });

    // S3 bucket that will serve as the destination for our raw compressed data
    const aRawDataBucket = new s3.Bucket(this, "ARawDataBucket", {
      removalPolicy: cdk.RemovalPolicy.DESTROY, // REMOVE FOR PRODUCTION
      autoDeleteObjects: true, // REMOVE FOR PRODUCTION
    });

    const bRawDataBucket = new s3.Bucket(this, "BRawDataBucket", {
      removalPolicy: cdk.RemovalPolicy.DESTROY, // REMOVE FOR PRODUCTION
      autoDeleteObjects: true, // REMOVE FOR PRODUCTION
    });

    const firehoseRole = new iam.Role(this, "firehoseRole", {
      assumedBy: new iam.ServicePrincipal("firehose.amazonaws.com"),
    });

    const bfirehoseRole = new iam.Role(this, "bfirehoseRole", {
      assumedBy: new iam.ServicePrincipal("firehose.amazonaws.com"),
    });

    rootStream.grantRead(firehoseRole);
    rootStream.grantRead(bfirehoseRole);
    rootStream.grant(firehoseRole, "kinesis:DescribeStream");
    rootStream.grant(bfirehoseRole, "kinesis:DescribeStream");
    aRawDataBucket.grantWrite(firehoseRole);
    bRawDataBucket.grantWrite(bfirehoseRole);

    const aFirehoseStreamToS3 = new kinesisfirehose.CfnDeliveryStream(
      this,
      "AFirehoseStreamToS3",
      {
        deliveryStreamName: "AStreamRawToS3",
        deliveryStreamType: "KinesisStreamAsSource",
        kinesisStreamSourceConfiguration: {
          kinesisStreamArn: rootStream.streamArn,
          roleArn: firehoseRole.roleArn,
        },
        s3DestinationConfiguration: {
          bucketArn: aRawDataBucket.bucketArn,
          bufferingHints: {
            sizeInMBs: 64,
            intervalInSeconds: 60,
          },
          compressionFormat: "GZIP",
          encryptionConfiguration: {
            noEncryptionConfig: "NoEncryption",
          },

          prefix: "raw/a/",
          roleArn: firehoseRole.roleArn,
        },
      }
    );

    const bFirehoseStreamToS3 = new kinesisfirehose.CfnDeliveryStream(
      this,
      "BFirehoseStreamToS3",
      {
        deliveryStreamName: "BStreamRawToS3",
        deliveryStreamType: "KinesisStreamAsSource",
        kinesisStreamSourceConfiguration: {
          kinesisStreamArn: rootStream.streamArn,
          roleArn: bfirehoseRole.roleArn,
        },
        s3DestinationConfiguration: {
          bucketArn: bRawDataBucket.bucketArn,
          bufferingHints: {
            sizeInMBs: 64,
            intervalInSeconds: 60,
          },
          compressionFormat: "GZIP",
          encryptionConfiguration: {
            noEncryptionConfig: "NoEncryption",
          },

          prefix: "raw/b/",
          roleArn: bfirehoseRole.roleArn,
        },
      }
    );

    // Ensures our role is created before we try to create a Kinesis Firehose
    aFirehoseStreamToS3.node.addDependency(firehoseRole);
    bFirehoseStreamToS3.node.addDependency(bfirehoseRole);
  }
}
