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

    // land zone
    const LandDataBucket = new s3.Bucket(this, "LandDataBucket", {
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      versioned: true,
    });

    // data steam => firehose
    const landZoneStream = new kinesis.Stream(this, "LL-SC-Stream");

    // Output the stream name so we can connect our script to this stream
    new cdk.CfnOutput(this, "LL-SC-Stream-Name", {
      value: landZoneStream.streamName,
    });

    const firehoseRole = new iam.Role(this, "LL-SC-FirehoseRole", {
      assumedBy: new iam.ServicePrincipal("firehose.amazonaws.com"),
    });

    landZoneStream.grantRead(firehoseRole);
    landZoneStream.grant(firehoseRole, "kinesis:DescribeStream");
    LandDataBucket.grantWrite(firehoseRole);

    // firehose => land zone
    const firehoseStreamToS3 = new kinesisfirehose.CfnDeliveryStream(
      this,
      "LL-SC-FirehoseStreamToS3",
      {
        deliveryStreamName: "LL-SC-StreamRawToS3",
        deliveryStreamType: "KinesisStreamAsSource",
        kinesisStreamSourceConfiguration: {
          kinesisStreamArn: landZoneStream.streamArn,
          roleArn: firehoseRole.roleArn,
        },
        s3DestinationConfiguration: {
          bucketArn: LandDataBucket.bucketArn,
          bufferingHints: {
            sizeInMBs: 64,
            intervalInSeconds: 60,
          },
          compressionFormat: "GZIP",
          encryptionConfiguration: {
            noEncryptionConfig: "NoEncryption",
          },
          prefix:
            "extension_collector/buybox/seller_central/date/!{timestamp:yyyy/MM/dd}/",
          errorOutputPrefix:
            "errors/extension_collector/buybox/seller_central/result=!{firehose:error-output-type}/date=!{timestamp:yyyy-MM-dd}/",
          roleArn: firehoseRole.roleArn,
        },
      }
    );

    firehoseStreamToS3.node.addDependency(firehoseRole);

    // standard zone
    const RawDataBucket = new s3.Bucket(this, "RawDataBucket", {
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      versioned: true,
    });

    new cdk.CfnOutput(this, "LandDataBucket.bucketName", {
      value: LandDataBucket.bucketName,
    });

    new cdk.CfnOutput(this, "RawDataBucket.bucketName", {
      value: RawDataBucket.bucketName,
    });

    // s3 batch operations => lambda => move land to raw
    const landToRawFunction = new lambda.Function(this, "land_to_raw", {
      code: lambda.Code.fromAsset("resources/lambda/land_to_raw"),
      handler: "index.handler",
      functionName: "BucketPutHandler",
      runtime: lambda.Runtime.NODEJS_14_X,
      memorySize: 512,
      timeout: Duration.minutes(5)
    });

    landToRawFunction.role?.attachInlinePolicy(
      new iam.Policy(this, "move-land-to-raw-policy", {
        statements: [
          new iam.PolicyStatement({
            effect: iam.Effect.ALLOW,
            actions: ["s3:GetObject", "s3:GetObjectVersion"],
            resources: [LandDataBucket.arnForObjects("*")],
          }),
          new iam.PolicyStatement({
            effect: iam.Effect.ALLOW,
            actions: ["s3:PutObject"],
            resources: [RawDataBucket.arnForObjects("*")],
          }),
        ],
      })
    );

    new cdk.CfnOutput(this, "landToRawFunction.functionArn", {
      value: landToRawFunction.functionArn,
    });

    // create s3 batch operations role
    const bucketBatchPolicy = new iam.Policy(
      this,
      "AllowBatchOperationsInvokeFunction",
      {
        statements: [
          new iam.PolicyStatement({
            effect: iam.Effect.ALLOW,
            actions: ["lambda:InvokeFunction"],
            resources: [
              // `${landToRawFunction.functionArn}:$LATES`,
              ':TODO'
              // "arn:aws:lambda:us-east-1:270222400520:function:BucketPutHandler:$LATEST",
            ],
          }),
          new iam.PolicyStatement({
            effect: iam.Effect.ALLOW,
            actions: ["s3:GetObject", "s3:GetObjectVersion"],
            resources: [LandDataBucket.arnForObjects("manifest.csv")],
          }),
          new iam.PolicyStatement({
            effect: iam.Effect.ALLOW,
            actions: ["s3:PutObject"],
            resources: [LandDataBucket.arnForObjects("*")],
          }),
        ],
      }
    );

    const bucketBatchRole = new iam.Role(
      this,
      "AllowBatchOperationsInvokeFunctionRole",
      {
        assumedBy: new iam.ServicePrincipal("batchoperations.s3.amazonaws.com"),
      }
    );

    bucketBatchRole.attachInlinePolicy(bucketBatchPolicy);

    new cdk.CfnOutput(this, "bucketBatchRole.roleArn", {
      value: bucketBatchRole.roleArn,
    });

    // raw zone => create glue database
    const glue_db_name = "ll-sc-db";
    const glue_db = new glue.CfnDatabase(this, "ll-sc-db", {
      catalogId: this.account,
      databaseInput: {
        name: glue_db_name,
      },
    });

    const glue_table_name = `ll-sc-report-table`;
    const glue_table = new glue.CfnTable(this, glue_table_name, {
      catalogId: this.account,
      databaseName: glue_db_name,
      tableInput: {
        partitionKeys: [],
        name: glue_table_name,
        parameters: {
          classification: "parquet",
        },
        storageDescriptor: {
          bucketColumns: [],
          location: RawDataBucket.s3UrlForObject("/parquet-files/"),
          columns: [
            { name: "asin", type: "string" },
            { name: "report_date", type: "string" },
            { name: "marketplace", type: "string" },
            { name: "user_id", type: "int" },
            { name: "page_views", type: "int" },
            { name: "units_ordered", type: "int" },
            { name: "ordered_product_sales", type: "double" },
            { name: "sales_currency", type: "string" },
            { name: "order_item_session_percentage", type: "double" },
            { name: "sales_rank", type: "int" },
            { name: "reviews_received", type: "int" },
            { name: "buy_box_precentage", type: "double" },
            { name: "units_ordered_b2b", type: "int" },
            { name: "ordered_product_sales_b2b", type: "double" },
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
  }
}
