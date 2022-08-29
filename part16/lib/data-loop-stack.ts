import { Stack, StackProps } from "aws-cdk-lib";
import * as cdk from "aws-cdk-lib";
import * as s3 from "aws-cdk-lib/aws-s3";
import * as s3n from "aws-cdk-lib/aws-s3-notifications";
import * as iam from "aws-cdk-lib/aws-iam";
import * as kinesis from "aws-cdk-lib/aws-kinesis";
import * as lambda from "aws-cdk-lib/aws-lambda";
import * as glue from "aws-cdk-lib/aws-glue";
import * as logs from "aws-cdk-lib/aws-logs";
import * as path from "path";
import { NodejsFunction } from "aws-cdk-lib/aws-lambda-nodejs";
import * as kinesisfirehose from "aws-cdk-lib/aws-kinesisfirehose";
import * as sqs from "aws-cdk-lib/aws-sqs";
import * as lambdaEventSources from "aws-cdk-lib/aws-lambda-event-sources";
import { Construct } from "constructs";

export class DataLoopStack extends Stack {
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    const asinQueue = new sqs.Queue(this, "SnsSqsQueue1", {
      visibilityTimeout: cdk.Duration.seconds(300),
    });

    const sqsWorkerFunction = new NodejsFunction(this, "sqs-worker-lambda", {
      runtime: lambda.Runtime.NODEJS_14_X,
      handler: "handler",
      functionName: "sqsWorkerHandler",
      timeout: cdk.Duration.minutes(1),
      logRetention: logs.RetentionDays.ONE_WEEK,
      entry: path.join(__dirname, `../resources/lambda/sqs-worker/main.ts`),
    });

    // bind sqs and worker
    [asinQueue].forEach((q) =>
      sqsWorkerFunction.addEventSource(
        new lambdaEventSources.SqsEventSource(q, { batchSize: 1 })
      )
    );

    if (sqsWorkerFunction.role) {
      sqsWorkerFunction.role.attachInlinePolicy(
        new iam.Policy(this, "kinesis-policy", {
          statements: [
            new iam.PolicyStatement({
              effect: iam.Effect.ALLOW,
              actions: ["kinesis:*"],
              resources: ["*"],
            }),
          ],
        })
      );
    }

    const queryFunction = new NodejsFunction(this, "query-and-write-lambda", {
      runtime: lambda.Runtime.NODEJS_14_X,
      handler: "handler",
      functionName: "QueryAndWriteLambdaHandler",
      timeout: cdk.Duration.minutes(1),
      logRetention: logs.RetentionDays.ONE_WEEK,
      entry: path.join(
        __dirname,
        `../resources/lambda/query-and-write/main.ts`
      ),
    });

    // queryFunction.role

    const lambdaFunction = new NodejsFunction(this, "firehose-transform", {
      runtime: lambda.Runtime.NODEJS_14_X,
      handler: "handler",
      functionName: "FirehoseTransformHandler",
      timeout: cdk.Duration.minutes(1),
      logRetention: logs.RetentionDays.ONE_WEEK,
      entry: path.join(
        __dirname,
        `../resources/lambda/firehose-transform/main.ts`
      ),
    });

    const rootStream = new kinesis.Stream(this, "WorkerReturnStream");

    // Output the stream name so we can connect our script to this stream
    new cdk.CfnOutput(this, "WorkerReturnStreamName", {
      value: rootStream.streamName,
    });

    const batchSendMsgToSqsFunction = new NodejsFunction(
      this,
      "batch-send-msg-to-sqs",
      {
        runtime: lambda.Runtime.NODEJS_14_X,
        handler: "handler",
        functionName: "batchSendMsgToSqsHandler",
        timeout: cdk.Duration.minutes(1),
        logRetention: logs.RetentionDays.ONE_WEEK,
        entry: path.join(__dirname, `../resources/lambda/batch-msg/main.ts`),
      }
    );

    const scheduleResultBucket = new s3.Bucket(this, "ScheduleResultBucket", {
      removalPolicy: cdk.RemovalPolicy.DESTROY, // REMOVE FOR PRODUCTION
      autoDeleteObjects: true, // REMOVE FOR PRODUCTION
    });

    scheduleResultBucket.addEventNotification(
      s3.EventType.OBJECT_CREATED,
      new s3n.LambdaDestination(batchSendMsgToSqsFunction),
      { suffix: "csv" }
    );

    if (batchSendMsgToSqsFunction.role) {
      scheduleResultBucket.grantReadWrite(batchSendMsgToSqsFunction.role);
      batchSendMsgToSqsFunction.role.attachInlinePolicy(
        new iam.Policy(this, "sqs-policy", {
          statements: [
            new iam.PolicyStatement({
              effect: iam.Effect.ALLOW,
              actions: ["sqs:*"],
              resources: ["*"],
            }),
          ],
        })
      );
    }

    if (queryFunction.role) {
      scheduleResultBucket.grantReadWrite(queryFunction.role);
      queryFunction.role.attachInlinePolicy(
        new iam.Policy(this, "athena-policy", {
          statements: [
            new iam.PolicyStatement({
              effect: iam.Effect.ALLOW,
              actions: ["athena:*"],
              resources: ["*"],
            }),
            new iam.PolicyStatement({
              effect: iam.Effect.ALLOW,
              actions: ["glue:*"],
              resources: ["*"],
            }),
          ],
        })
      );
    }

    const rawDataBucket = new s3.Bucket(this, "ScheduleBucket", {
      removalPolicy: cdk.RemovalPolicy.DESTROY, // REMOVE FOR PRODUCTION
      autoDeleteObjects: true, // REMOVE FOR PRODUCTION
    });

    if (queryFunction.role) {
      rawDataBucket.grantReadWrite(queryFunction.role);
    }

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

    const glue_db_name = "schedule_db";
    const glue_db = new glue.CfnDatabase(this, "ScheduleDB", {
      catalogId: this.account,
      databaseInput: {
        name: glue_db_name,
      },
    });

    const glue_table_name = `schedule_db_table`;
    const glue_table = new glue.CfnTable(this, "ScheduleDBTable", {
      catalogId: this.account,
      databaseName: glue_db_name,
      tableInput: {
        partitionKeys: [{ name: "htime", type: "string" }],
        name: glue_table_name,
        parameters: {
          EXTERNAL: "TRUE",
        },
        // parameters: {
        //   classification: "parquet",
        // },
        storageDescriptor: {
          bucketColumns: [],
          location: rawDataBucket.s3UrlForObject("/"),
          columns: [
            { name: "asin", type: "string" },
            { name: "payload", type: "string" },
          ],
          inputFormat:
            "org.apache.hadoop.hive.ql.io.parquet.MapredParquetInputFormat",
          outputFormat:
            "org.apache.hadoop.hive.ql.io.parquet.MapredParquetOutputFormat",
          compressed: false,
          storedAsSubDirectories: false,
          serdeInfo: {
            serializationLibrary:
              "org.apache.hadoop.hive.ql.io.parquet.serde.ParquetHiveSerDe",
            parameters: { "serialization.format": 1 },
          },
        },
        tableType: "EXTERNAL_TABLE",
      },
    });

    const glueRole = new iam.Role(this, "GlueRole", {
      assumedBy: new iam.ServicePrincipal("firehose.amazonaws.com"),
    });
    glueRole.addToPolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions: ["glue:*"],
        resources: ["*"],
      })
    );
    // firehoseRole.addToPolicy(
    //   new iam.PolicyStatement({
    //     effect: iam.Effect.ALLOW,
    //     actions: ["glue:*"],
    //     resources: ["*"],
    //   })
    // );

    const firehoseStreamToS3 = new kinesisfirehose.CfnDeliveryStream(
      this,
      "FirehoseStreamToS3",
      {
        deliveryStreamName: "ScheduleStreamRawToS3OfTransform",
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
            "errors/!{firehose:error-output-type}/hour=!{timestamp:HH}/",
          prefix:
            // "raw/htime=!{partitionKeyFromQuery:htime}/mrandom=!{partitionKeyFromQuery:mrandom}/",
            "htime=!{partitionKeyFromLambda:htime}/",
          roleArn: firehoseRole.roleArn,
          dynamicPartitioningConfiguration: {
            enabled: true,
          },
          processingConfiguration: {
            enabled: true,
            processors: [
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
