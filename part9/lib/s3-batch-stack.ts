import { Duration, Stack, StackProps } from "aws-cdk-lib";
import * as cdk from "aws-cdk-lib";
import * as s3 from "aws-cdk-lib/aws-s3";
import * as iam from "aws-cdk-lib/aws-iam";
import * as glue from "aws-cdk-lib/aws-glue";
import * as kinesis from "aws-cdk-lib/aws-kinesis";
import * as kinesisfirehose from "aws-cdk-lib/aws-kinesisfirehose";
import * as lambda from "aws-cdk-lib/aws-lambda";
import { Construct } from "constructs";

export class S3BatchStack extends Stack {
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    const rootStream = new kinesis.Stream(this, "LL-SC-Stream");

    // standard zone
    const RawDataBucket = new s3.Bucket(this, "RawDataBucket", {
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    const firehoseRoleB = new iam.Role(this, "LL-SC-FirehoseRoleB", {
      assumedBy: new iam.ServicePrincipal("firehose.amazonaws.com"),
    });

    rootStream.grantRead(firehoseRoleB);
    rootStream.grant(firehoseRoleB, "kinesis:DescribeStream");
    RawDataBucket.grantWrite(firehoseRoleB);

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
    glueRole.addToPolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions: ["s3:*"],
        resources: ["*"],
      })
    );
    rootStream.grantRead(glueRole);

    // // raw zone => create glue database
    const glue_db_name = "ll_sc_db";
    const glue_table_gz_name = `ll_sc_report_table_gz`;
    // const glue_table_json_gz_name = `ll_sc_report_table_gz_json`;
    // const glue_table_snap_name = `ll_sc_report_table_snap`;
    const glue_db = new glue.CfnDatabase(this, "ll_sc_db", {
      catalogId: this.account,
      databaseInput: {
        name: glue_db_name,
      },
    });

    const glue_table_gz = new glue.CfnTable(this, glue_table_gz_name, {
      catalogId: this.account,
      databaseName: glue_db_name,
      tableInput: {
        partitionKeys: [{ name: "date", type: "string" }],
        name: glue_table_gz_name,
        parameters: {
          classification: "parquet",
        },
        storageDescriptor: {
          bucketColumns: [],
          location: RawDataBucket.s3UrlForObject("/lambda-files/json-files/gz/"),
          columns: [
            { name: "asin", type: "string" },
            { name: "report_date", type: "string" },
            { name: "marketplace", type: "string" },
            { name: "user_id", type: "string" },
            { name: "page_views", type: "int" },
            { name: "units_ordered", type: "int" },
            { name: "ordered_product_sales", type: "int" },
            { name: "sales_currency", type: "string" },
            { name: "order_item_session_percentage", type: "string" },
            { name: "sales_rank", type: "int" },
            { name: "reviews_received", type: "int" },
            { name: "buy_box_precentage", type: "int" },
            { name: "units_ordered_b2b", type: "int" },
            { name: "ordered_product_sales_b2b", type: "int" },
            { name: "seller_central_id", type: "string" },
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

    glue_table_gz.node.addDependency(RawDataBucket);

    const firehoseStreamJsonGzip = new kinesisfirehose.CfnDeliveryStream(
      this,
      "LL-SC-FirehoseStreamJsonGzip",
      {
        deliveryStreamName: "LL-SC-FirehoseStreamJsonGzip",
        deliveryStreamType: "KinesisStreamAsSource",
        kinesisStreamSourceConfiguration: {
          kinesisStreamArn: rootStream.streamArn,
          roleArn: firehoseRoleB.roleArn,
        },
        s3DestinationConfiguration: {
          bucketArn: RawDataBucket.bucketArn,
          bufferingHints: {
            sizeInMBs: 128,
            intervalInSeconds: 120,
          },
          compressionFormat: "GZIP",
          encryptionConfiguration: {
            noEncryptionConfig: "NoEncryption",
          },
          prefix: "json-files/gz/date=!{timestamp:yyyy-MM-dd}/",
          errorOutputPrefix:
            "errors/json/result=!{firehose:error-output-type}/date=!{timestamp:yyyy-MM-dd}/",
          roleArn: firehoseRoleB.roleArn,
        },
      }
    );
    firehoseStreamJsonGzip.node.addDependency(firehoseRoleB);

    const firehoseStreamToGZip = new kinesisfirehose.CfnDeliveryStream(
      this,
      "LL-SC-FirehoseStreamToGZip",
      {
        deliveryStreamName: "LL-SC-FirehoseStreamToGZip",
        deliveryStreamType: "KinesisStreamAsSource",
        kinesisStreamSourceConfiguration: {
          kinesisStreamArn: rootStream.streamArn,
          roleArn: firehoseRoleB.roleArn,
        },
        extendedS3DestinationConfiguration: {
          bucketArn: RawDataBucket.bucketArn,
          bufferingHints: {
            sizeInMBs: 128,
            intervalInSeconds: 120,
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
              tableName: glue_table_gz_name,
              roleArn: glueRole.roleArn,
            },
            outputFormatConfiguration: {
              serializer: {
                parquetSerDe: {
                  compression: "GZIP",
                },
              },
            },
          },
          encryptionConfiguration: {
            noEncryptionConfig: "NoEncryption",
          },
          prefix: "parquet-files/gz/date=!{timestamp:yyyy-MM-dd}/",
          errorOutputPrefix:
            "errors/gz/result=!{firehose:error-output-type}/date=!{timestamp:yyyy-MM-dd}/",
          roleArn: firehoseRoleB.roleArn,
        },
      }
    );
    firehoseStreamToGZip.node.addDependency(firehoseRoleB);
    firehoseStreamToGZip.node.addDependency(glueRole);

    const lambdaRole = new iam.Role(this, "LL-SC-lambda-role", {
      assumedBy: new iam.ServicePrincipal("lambda.amazonaws.com"),
    });
    // s3 batch operations => lambda => move land to raw
    const landToRawFunction = new lambda.Function(this, "land_to_raw", {
      code: lambda.Code.fromAsset("resources/lambda/transfer"),
      handler: "main.lambda_handler",
      functionName: "BucketPutHandler",
      runtime: lambda.Runtime.PYTHON_3_8,
      memorySize: 512,
      timeout: Duration.minutes(5),
      role: lambdaRole,
    });

    lambdaRole.attachInlinePolicy(
      new iam.Policy(this, "move-land-to-raw-policy", {
        statements: [
          new iam.PolicyStatement({
            effect: iam.Effect.ALLOW,
            actions: ["glue:*"],
            resources: ["*"],
          }),
          new iam.PolicyStatement({
            effect: iam.Effect.ALLOW,
            actions: ["s3:*"],
            resources: ["*"],
          }),
        ],
      })
    );

    landToRawFunction.node.addDependency(lambdaRole);

    new cdk.CfnOutput(this, "landToRawFunction.functionArn", {
      value: landToRawFunction.functionArn,
    });

  }
}
