const aws = require("aws-sdk");
const fs = require("fs");
const path = require("path");
const zlib = require("zlib");
const parquet = require("parquetjs");
const ndjson = require("ndjson");
const s3 = new aws.S3();

/**
 * s3 batch, will called for copy to tagetBucket with change path : /YYYY/MM/DD/file => /date=YYYY-MM-DD/file
 */

// !!! Input !!!
/**
event :
{
"invocationSchemaVersion": "1.0",
    "invocationId": "YXNkbGZqYWRmaiBhc2RmdW9hZHNmZGpmaGFzbGtkaGZza2RmaAo",
    "job": {
        "id": "f3cc4f60-61f6-4a2b-8a21-d07600c373ce"
    },
    "tasks": [
        {
            "taskId": "dGFza2lkZ29lc2hlcmUK",
            "s3Key": "customerImage1.jpg",
            "s3VersionId": "1",
            "s3BucketArn": "arn:aws:s3:us-east-1:0123456788:examplebucket"
        }
    ]  
}
 */

// !!! OutPut !!!
/**
{
  "invocationSchemaVersion": "1.0",
  "treatMissingKeysAs" : "PermanentFailure",
  "invocationId" : "YXNkbGZqYWRmaiBhc2RmdW9hZHNmZGpmaGFzbGtkaGZza2RmaAo",
  "results": [
    {
      "taskId": "dGFza2lkZ29lc2hlcmUK",
      "resultCode": "Succeeded",
      "resultString": "["Alice", "Bob"]"
    }
  ]
}
 */

// download s3 and save gunzip file
const ungzip = async (s3SourceKey, targetPath) => {
  return await new Promise((res) => {
    s3.getObject({
      // source
      Bucket: "ll-sc-s3batchstack-landdatabucket757be0cf-mwcysc7m148d",
      // source key
      Key: s3SourceKey,
    })
      .createReadStream()
      .pipe(zlib.createGunzip())
      .pipe(fs.createWriteStream(targetPath))
      .on("finish", res);
  });
};

const createParquet = async (sourcePath, targetPath) => {
  const reader = fs.createReadStream(sourcePath);
  const destination = fs.createWriteStream(targetPath);
  const schema = new parquet.ParquetSchema({
    asin: { type: "UTF8", compression: "SNAPPY" },
    report_date: { type: "UTF8", compression: "SNAPPY" },
    marketplace: { type: "UTF8", compression: "SNAPPY" },
    user_id: { type: "INT64", compression: "SNAPPY" },
    page_views: { type: "INT64", compression: "SNAPPY" },
    units_ordered: { type: "INT64", compression: "SNAPPY" },
    ordered_product_sales: { type: "DOUBLE", compression: "SNAPPY" },
    sales_currency: { type: "UTF8", compression: "SNAPPY" },
    order_item_session_percentage: {
      type: "DOUBLE",
      compression: "SNAPPY",
    },
    sales_rank: { type: "INT64", compression: "SNAPPY", optional: true },
    reviews_received: { type: "INT64", compression: "SNAPPY", optional: true },
    buy_box_precentage: { type: "DOUBLE", compression: "SNAPPY", optional: true },
    units_ordered_b2b: { type: "INT64", compression: "SNAPPY" },
    ordered_product_sales_b2b: { type: "DOUBLE", compression: "SNAPPY" },
    seller_central_id: { type: "UTF8", compression: "SNAPPY" },
  });
  return await new Promise((res) => {
    reader
      .pipe(ndjson.parse())
      .pipe(new parquet.ParquetTransformer(schema, { useDataPageV2: false }))
      .pipe(destination)
      .on("finish", res);
  });
};

const saveParquet = async (localFilePath, bucketKey) => {
  return await s3
    .putObject({
      Body: fs.createReadStream(localFilePath),
      // target
      Bucket: "ll-sc-s3batchstack-rawdatabucket57f26c03-17gn3157obl3e",
      // target key
      Key: bucketKey,
    })
    .promise();
};

exports.handler = async (event) => {
  console.log("lambda event:", event);
  const { invocationSchemaVersion, invocationId, job, tasks } = event;
  const results = [];
  for (const task of tasks) {
    const { taskId, s3Key } = task;
    // const { taskId, s3Key, s3BucketArn } = task;
    try {
      // console.log("s3Key", s3Key);
      const kgrs = s3Key.slice(1).split("/");
      const klen = kgrs.length;
      const yyyyMMdd = `${kgrs[klen - 4]}-${kgrs[klen - 3]}-${kgrs[klen - 2]}`;
      const fileName = kgrs[klen - 1].replace(".gz", ".parquet");
      // merge taget file key
      const tagetKey = `parquet-files/date=${yyyyMMdd}/${fileName}`;
      // const copySourceKey = s3BucketArn.split(":")[5] + "/" + s3Key;
      // temp json path
      const tempJsonPath = path.join("/tmp", "temp.json");
      const tempParquetPath = path.join("/tmp", "temp.parquet");

      // if file exist, will remove files
      // pre-remove
      if (fs.existsSync(tempJsonPath)) {
        fs.unlinkSync(tempJsonPath);
      }
      if (fs.existsSync(tempParquetPath)) {
        fs.unlinkSync(tempParquetPath);
      }

      // ungzip s3 file
      await ungzip(s3Key, tempJsonPath);
      // console.log("tagetKey", tagetKey);
      // console.log("copySourceKey", copySourceKey);
      // create parquet file
      await createParquet(tempJsonPath, tempParquetPath);
      // put object to s3 buckt
      const saveRes = await saveParquet(tempParquetPath, tagetKey);
      // after-remove
      if (fs.existsSync(tempJsonPath)) {
        fs.unlinkSync(tempJsonPath);
      }
      if (fs.existsSync(tempParquetPath)) {
        fs.unlinkSync(tempParquetPath);
      }
      results.push({
        taskId,
        resultCode: "Succeeded",
        resultString: "Save Bucket ETag:" + saveRes?.ETag,
      });
    } catch (error) {
      results.push({
        taskId,
        resultCode: "TemporaryFailure",
        resultString: error?.toString(),
      });
      console.log("(guzip + 2parquet + s3push) error:", error);
    }
  }
  return {
    invocationSchemaVersion,
    invocationId,
    treatMissingKeysAs: "PermanentFailure",
    results,
  };
};
