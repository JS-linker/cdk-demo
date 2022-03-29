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

    // rootStream is a raw kinesis stream in which we build other modules on top of.
    const rootStream = new kinesis.Stream(this, "LL-SC-Stream");

    // Output the stream name so we can connect our script to this stream
    new cdk.CfnOutput(this, "LL-SC-Stream-Name", {
      value: rootStream.streamName,
    });

    // S3 bucket that will serve as the destination for our raw compressed data
    // const rawDataBucket = new s3.Bucket(this, "RawDataBucket", {
    //   removalPolicy: cdk.RemovalPolicy.DESTROY, // REMOVE FOR PRODUCTION
    //   autoDeleteObjects: true, // REMOVE FOR PRODUCTION
    // });
    // Prepare the data warehouse in advance
    const untrustedDataBucket = new s3.Bucket(
      this,
      "LL-SC-Untrusted-DataBucket",
      {
        removalPolicy: cdk.RemovalPolicy.DESTROY,
      }
    );

    const firehoseRole = new iam.Role(this, "LL-SC-FirehoseRole", {
      assumedBy: new iam.ServicePrincipal("firehose.amazonaws.com"),
    });

    rootStream.grantRead(firehoseRole);
    rootStream.grant(firehoseRole, "kinesis:DescribeStream");
    untrustedDataBucket.grantWrite(firehoseRole);

    const firehoseStreamToS3 = new kinesisfirehose.CfnDeliveryStream(
      this,
      "LL-SC-FirehoseStreamToS3",
      {
        deliveryStreamName: "LL-SC-StreamRawToS3",
        deliveryStreamType: "KinesisStreamAsSource",
        kinesisStreamSourceConfiguration: {
          kinesisStreamArn: rootStream.streamArn,
          roleArn: firehoseRole.roleArn,
        },
        s3DestinationConfiguration: {
          bucketArn: untrustedDataBucket.bucketArn,
          bufferingHints: {
            sizeInMBs: 64,
            intervalInSeconds: 60,
          },
          compressionFormat: "GZIP",
          encryptionConfiguration: {
            noEncryptionConfig: "NoEncryption",
          },
          prefix:
            "extension_collector/buybox/seller_central/seller_central_ad/date=!{timestamp:yyyy-MM-dd}/",
          errorOutputPrefix:
            "errors/extension_collector/buybox/seller_central/result=!{firehose:error-output-type}/date=!{timestamp:yyyy-MM-dd}/",
          roleArn: firehoseRole.roleArn,
        },
      }
    );

    // Ensures our role is created before we try to create a Kinesis Firehose
    firehoseStreamToS3.node.addDependency(firehoseRole);

    // const athenaQueryBucket = new s3.Bucket(
    //   this,
    //   "LL-SC-athena-query-Bucket",
    //   {
    //     removalPolicy: cdk.RemovalPolicy.DESTROY,
    //   }
    // );

    //create glue database
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
          location: untrustedDataBucket.s3UrlForObject(
            "/extension_collector/buybox/seller_central/seller_central_ad/"
          ),
          columns: [
            { name: "asin", type: "string" },
            // { name: "report_date" },
            // { name: "marketplace" },
            // { name: "user_id" },
            // { name: "page_views" },
            // { name: "units_ordered" },
            // { name: "ordered_product_sales" },
            // { name: "sales_currency" },
            // { name: "order_item_session_percentage" },
            // { name: "sales_rank" },
            // { name: "reviews_received" },
            // { name: "buy_box_precentage" },
            // { name: "units_ordered_b2b" },
            // { name: "ordered_product_sales_b2b" },
            { name: "seller_central_id", type: "string" },
          ],
          inputFormat: "org.apache.hadoop.mapred.TextInputFormat",
          outputFormat:
            "org.apache.hadoop.hive.ql.io.HiveIgnoreKeyTextOutputFormat",
          compressed: false,
          storedAsSubDirectories: false,
          serdeInfo: {
            serializationLibrary: "org.openx.data.jsonserde.JsonSerDe",
          },
        },
        tableType: "EXTERNAL_TABLE",
      },
    });

    new cdk.CfnOutput(this, "untrustedDataBucket.s3UrlForObject", {
      value: untrustedDataBucket.s3UrlForObject(
        "/extension_collector/buybox/seller_central/seller_central_ad/"
      ),
    });

    // glue_table.addDependsOn(glue_db);

    // //create glue cralwer role to access S3 bucket
    // const glue_crawler_role = new iam.Role(this, "glue-crawler-role", {
    //   roleName: "LL-SC-AWSGlueServiceRole-AccessS3Bucket",
    //   description:
    //     "Assigns the managed policy AWSGlueServiceRole to AWS Glue Crawler so it can crawl S3 buckets",
    //   assumedBy: new iam.ServicePrincipal("glue.amazonaws.com"),
    // });

    // //add policy to role to grant access to S3 asset bucket and public buckets
    // const iam_policy_forAssets = new iam.Policy(this, "iam-policy-forAssets", {
    //   force: true,
    //   policyName: "glue-policy-workflowAssetAccess",
    //   roles: [glue_crawler_role],
    //   statements: [
    //     new iam.PolicyStatement({
    //       effect: iam.Effect.ALLOW,
    //       actions: ["s3:GetObject"],
    //       resources: [untrustedDataBucket.arnForObjects("*")],
    //     }),
    //   ],
    // });

    // //create glue crawler to crawl csv files in S3
    // const glue_crawler_s3 = new glue.CfnCrawler(this, "ll-sc-glue-crawler-s3", {
    //   name: "s3-csv-crawler",
    //   role: glue_crawler_role.roleName,
    //   targets: {
    //     s3Targets: [
    //       {
    //         path: untrustedDataBucket.s3UrlForObject("/"),
    //       },
    //     ],
    //   },
    //   databaseName: glue_db_name,
    //   schemaChangePolicy: {
    //     updateBehavior: "UPDATE_IN_DATABASE",
    //     deleteBehavior: "DEPRECATE_IN_DATABASE",
    //   },
    // });

    // // standard zone
    // const RawDataBucket = new s3.Bucket(this, "LL-SC-RawDataBucket", {
    //   removalPolicy: cdk.RemovalPolicy.DESTROY,
    // });

    // new cdk.CfnOutput(this, "LL-SC-Untrusted-DataBucket.bucketName", {
    //   value: UntrustedDataBucket.bucketName,
    // });

    // new cdk.CfnOutput(this, "LL-SC-RawDataBucket.bucketName", {
    //   value: RawDataBucket.bucketName,
    // });

    // // create
    // const landToRawFunction = new lambda.Function(
    //   this,
    //   "ll_sc_untrusted_to_raw",
    //   {
    //     code: lambda.Code.fromAsset("resources/lambda/untrusted_to_raw"),
    //     handler: "index.handler",
    //     functionName: "UntrustedToRawHandler",
    //     runtime: lambda.Runtime.NODEJS_12_X,
    //   }
    // );

    // landToRawFunction.role?.attachInlinePolicy(
    //   new iam.Policy(this, "move-untrusted_-to-raw-policy", {
    //     statements: [
    //       new iam.PolicyStatement({
    //         effect: iam.Effect.ALLOW,
    //         actions: ["s3:GetObject", "s3:GetObjectVersion"],
    //         resources: [UntrustedDataBucket.arnForObjects("*")],
    //       }),
    //       new iam.PolicyStatement({
    //         effect: iam.Effect.ALLOW,
    //         actions: ["s3:PutObject"],
    //         resources: [RawDataBucket.arnForObjects("*")],
    //       }),
    //     ],
    //   })
    // );

    // new cdk.CfnOutput(this, "landToRawFunction.functionArn", {
    //   value: landToRawFunction.functionArn,
    // });
    // new cdk.CfnOutput(this, "landToRawFunction.role.roleArn", {
    //   value: landToRawFunction.role?.roleArn || "",
    // });

    // // create batch role
    // const bucketBatchPolicy = new iam.Policy(
    //   this,
    //   "AllowBatchOperationsInvokeFunction",
    //   {
    //     statements: [
    //       new iam.PolicyStatement({
    //         effect: iam.Effect.ALLOW,
    //         actions: ["lambda:InvokeFunction"],
    //         resources: [
    //           // landToRawFunction.functionArn
    //           // landToRawFunction.functionArn
    //           "arn:aws:lambda:us-west-2:136259734886:function:UntrustedToRawHandler:$LATEST",
    //           // "arn:aws:lambda:us-east-1:270222400520:function:BucketPutHandler:$LATEST",
    //         ],
    //       }),
    //       new iam.PolicyStatement({
    //         effect: iam.Effect.ALLOW,
    //         actions: ["s3:GetObject", "s3:GetObjectVersion"],
    //         resources: [UntrustedDataBucket.arnForObjects("manifest.csv")],
    //       }),
    //       new iam.PolicyStatement({
    //         effect: iam.Effect.ALLOW,
    //         actions: ["s3:PutObject"],
    //         resources: [UntrustedDataBucket.arnForObjects("*")],
    //       }),
    //     ],
    //   }
    // );

    // bucketBatchPolicy.node.addDependency(landToRawFunction)

    // const bucketBatchRole = new iam.Role(
    //   this,
    //   "AllowBatchOperationsInvokeFunctionRole",
    //   {
    //     assumedBy: new iam.ServicePrincipal("batchoperations.s3.amazonaws.com"),
    //   }
    // );

    // bucketBatchRole.attachInlinePolicy(bucketBatchPolicy);

    // new cdk.CfnOutput(this, "bucketBatchRole.roleArn", {
    //   value: bucketBatchRole.roleArn,
    // });
  }
}
