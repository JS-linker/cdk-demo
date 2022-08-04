import { Stack, StackProps } from "aws-cdk-lib";
import * as cdk from "aws-cdk-lib";
import * as s3 from "aws-cdk-lib/aws-s3";
import * as iam from "aws-cdk-lib/aws-iam";
import * as kinesis from "aws-cdk-lib/aws-kinesis";
import * as lambda from "aws-cdk-lib/aws-lambda";
import * as glue from "aws-cdk-lib/aws-glue";
import * as path from "path";
import { NodejsFunction } from "aws-cdk-lib/aws-lambda-nodejs";
import * as kinesisfirehose from "aws-cdk-lib/aws-kinesisfirehose";
import { Construct } from "constructs";

export class DynamicPartitioningFirehoseStack extends Stack {
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    // const lambdaFunction = new lambda.Function(this, "Function", {
    //   code: lambda.Code.fromAsset("resources/lambda/firehose-transform"),
    //   handler: "main.handler",
    //   timeout: cdk.Duration.minutes(1),
    //   functionName: "FirehoseTransformHandler",
    //   runtime: lambda.Runtime.NODEJS_12_X,
    // });

    const lambdaFunction = new NodejsFunction(this, "firehose-transform", {
      runtime: lambda.Runtime.NODEJS_14_X,
      handler: "handler",
      functionName: "FirehoseTransformHandler",
      timeout: cdk.Duration.minutes(1),
      entry: path.join(
        __dirname,
        `../resources/lambda/firehose-transform/main.ts`
      ),
    });

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

    firehoseRole.addToPolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions: ["lambda:InvokeFunction", "lambda:GetFunctionConfiguration"],
        resources: [lambdaFunction.functionArn],
      })
    );

    rootStream.grantRead(firehoseRole);
    rootStream.grant(firehoseRole, "kinesis:DescribeStream");
    rawDataBucket.grantWrite(firehoseRole);

    const glue_db_name = "ll-sc-db";
    const glue_db = new glue.CfnDatabase(this, "ll-sc-db", {
      catalogId: this.account,
      databaseInput: {
        name: glue_db_name,
      },
    });

    const glue_table_name = `ll-sc-report-table2`;
    const glue_table = new glue.CfnTable(this, glue_table_name, {
      catalogId: this.account,
      databaseName: glue_db_name,
      tableInput: {
        partitionKeys: [],
        name: glue_table_name,
        parameters: {
          classification: "json",
        },
        storageDescriptor: {
          bucketColumns: [],
          location: rawDataBucket.s3UrlForObject("/raw/"),
          columns: [
            { name: "asin", type: "string" },
            { name: "seller_central_id", type: "string" },
          ],
          inputFormat: "org.apache.hadoop.mapred.TextInputFormat",
          outputFormat:
            "org.apache.hadoop.hive.ql.io.parquet.MapredParquetOutputFormat",
          compressed: false,
          storedAsSubDirectories: false,
          serdeInfo: {
            serializationLibrary: "org.openx.data.jsonserde.JsonSerDe",
          },
        },
        tableType: "EXTERNAL_TABLE",
      },
    });

    const glueRole = new iam.Role(this, "LL-SC-Raw-Schema", {
      assumedBy: new iam.ServicePrincipal("firehose.amazonaws.com"),
    });
    glueRole.addToPolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions: ["glue:*"],
        resources: ["*"],
      })
    );

    const firehoseStreamToS3 = new kinesisfirehose.CfnDeliveryStream(
      this,
      "FirehoseStreamToS3",
      {
        deliveryStreamName: "StreamRawToS3OfTransform",
        deliveryStreamType: "KinesisStreamAsSource",
        kinesisStreamSourceConfiguration: {
          kinesisStreamArn: rootStream.streamArn,
          roleArn: firehoseRole.roleArn,
        },
        extendedS3DestinationConfiguration: {
          bucketArn: rawDataBucket.bucketArn,
          bufferingHints: {
            sizeInMBs: 64,
            intervalInSeconds: 60,
          },
          // compressionFormat: "GZIP",
          dataFormatConversionConfiguration: {
            inputFormatConfiguration: {
              deserializer: {
                hiveJsonSerDe: {},
              },
            },
            schemaConfiguration: {
              databaseName: glue_db_name,
              tableName: glue_table_name,
              roleArn: glueRole.roleArn,
            },
            outputFormatConfiguration: {
              serializer: {
                parquetSerDe: {
                  compression: "SNAPPY",
                },
              },
            },
          },
          encryptionConfiguration: {
            noEncryptionConfig: "NoEncryption",
          },
          errorOutputPrefix:
            "raw/errors/!{firehose:error-output-type}/year=!{timestamp:yyyy}/month=!{timestamp:MM}/day=!{timestamp:dd}/hour=!{timestamp:HH}/",
          prefix:
            // "raw/htime=!{partitionKeyFromQuery:htime}/mrandom=!{partitionKeyFromQuery:mrandom}/",
            "raw/htime=!{partitionKeyFromQuery:htime}/",
          roleArn: firehoseRole.roleArn,
          dynamicPartitioningConfiguration: {
            enabled: true,
          },
          processingConfiguration: {
            enabled: true,
            processors: [
              {
                type: "MetadataExtraction",
                parameters: [
                  {
                    parameterName: "MetadataExtractionQuery",
                    parameterValue: "{htime: .htime}",
                  },
                  // {
                  //   parameterName: "MetadataExtractionQuery",
                  //   parameterValue: "{mrandom: .mrandom}",
                  // },
                  {
                    parameterName: "JsonParsingEngine",
                    parameterValue: "JQ-1.6",
                  },
                ],
              },
              {
                type: "Lambda",
                parameters: [
                  {
                    parameterName: "LambdaArn",
                    parameterValue: lambdaFunction.functionArn,
                  },
                  {
                    parameterName: "BufferSizeInMBs",
                    parameterValue: "1",
                  },
                  {
                    parameterName: "BufferIntervalInSeconds",
                    parameterValue: "60",
                  },
                ],
              },
            ],
          },
        },
      }
    );

    // Ensures our role is created before we try to create a Kinesis Firehose
    firehoseStreamToS3.node.addDependency(firehoseRole);
    firehoseStreamToS3.node.addDependency(lambdaFunction);
  }
}
