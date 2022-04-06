import { Stack, StackProps } from "aws-cdk-lib";
import * as cdk from "aws-cdk-lib";
import * as s3 from "aws-cdk-lib/aws-s3";
import * as iam from "aws-cdk-lib/aws-iam";
import * as glue from "aws-cdk-lib/aws-glue";
import * as kinesis from "aws-cdk-lib/aws-kinesis";
import * as kinesisfirehose from "aws-cdk-lib/aws-kinesisfirehose";
import { Construct } from "constructs";

export class S3BatchStack extends Stack {
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    const rootStream = new kinesis.Stream(this, "LL-SC-Stream");

    const LandDataBucket = new s3.Bucket(this, "LandDataBucket", {
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    const firehoseRole = new iam.Role(this, "LL-SC-FirehoseRole", {
      assumedBy: new iam.ServicePrincipal("firehose.amazonaws.com"),
    });

    rootStream.grantRead(firehoseRole);
    rootStream.grant(firehoseRole, "kinesis:DescribeStream");
    LandDataBucket.grantWrite(firehoseRole);

    // firehose => land zone
    const firehoseStreamToLandZone = new kinesisfirehose.CfnDeliveryStream(
      this,
      "LL-SC-FirehoseStreamToLandZone",
      {
        deliveryStreamName: "LL-SC-FirehoseStreamToLandZone",
        deliveryStreamType: "KinesisStreamAsSource",
        kinesisStreamSourceConfiguration: {
          kinesisStreamArn: rootStream.streamArn,
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
    firehoseStreamToLandZone.node.addDependency(firehoseRole);

    // standard zone
    const RawDataBucket = new s3.Bucket(this, "RawDataBucket", {
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    new cdk.CfnOutput(this, "LandDataBucket.bucketName", {
      value: LandDataBucket.bucketName,
    });

    new cdk.CfnOutput(this, "RawDataBucket.bucketName", {
      value: RawDataBucket.bucketName,
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

    // firehose => raw zone
    const firehoseStreamToRawZone = new kinesisfirehose.CfnDeliveryStream(
      this,
      "LL-SC-FirehoseStreamToRawZone",
      {
        deliveryStreamName: "LL-SC-FirehoseStreamToRawZone",
        deliveryStreamType: "KinesisStreamAsSource",
        kinesisStreamSourceConfiguration: {
          kinesisStreamArn: rootStream.streamArn,
          roleArn: firehoseRoleB.roleArn,
        },
        extendedS3DestinationConfiguration: {
          bucketArn: RawDataBucket.bucketArn,
          bufferingHints: {
            sizeInMBs: 64,
            intervalInSeconds: 60,
          },
          dataFormatConversionConfiguration: {
            inputFormatConfiguration: {
              deserializer: {
                hiveJsonSerDe: {},
              },
            },
            schemaConfiguration: {
              databaseName: "ll-sc-db",
              tableName: "ll-sc-report-table",
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
          prefix: "parquet-files/date=!{timestamp:yyyy-MM-dd}/",
          errorOutputPrefix:
            "errors/result=!{firehose:error-output-type}/date=!{timestamp:yyyy-MM-dd}/",
          roleArn: firehoseRoleB.roleArn,
        },
      }
    );
    firehoseStreamToRawZone.node.addDependency(firehoseRoleB);
    firehoseStreamToRawZone.node.addDependency(glueRole);

    // raw zone => create glue database
    const glue_db_name = "ll-sc-db";
    const glue_table_name = `ll-sc-report-table`;
    const glue_db = new glue.CfnDatabase(this, "ll-sc-db", {
      catalogId: this.account,
      databaseInput: {
        name: glue_db_name,
      },
    });

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
          location: RawDataBucket.s3UrlForObject("/parquet-files/"),
          columns: [
            { name: "asin", type: "string" },
            { name: "report_date", type: "string" },
            { name: "marketplace", type: "string" },
            { name: "user_id", type: "string" },
            { name: "page_views", type: "string" },
            { name: "units_ordered", type: "string" },
            { name: "ordered_product_sales", type: "string" },
            { name: "sales_currency", type: "string" },
            { name: "order_item_session_percentage", type: "string" },
            { name: "sales_rank", type: "string" },
            { name: "reviews_received", type: "string" },
            { name: "buy_box_precentage", type: "string" },
            { name: "units_ordered_b2b", type: "string" },
            { name: "ordered_product_sales_b2b", type: "string" },
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

    glue_table.node.addDependency(RawDataBucket);
  }
}
