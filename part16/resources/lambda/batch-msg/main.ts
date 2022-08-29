"use strict";
const aws = require("aws-sdk");
const s3 = new aws.S3();
const sqs = new aws.SQS();
const sqs_url =
  "https://sqs.us-west-2.amazonaws.com/136259734886/DataLoopStack-SnsSqsQueue19DDF2ACF-82pcsoznVqce";

// asset-input/resources/lambda/batch-msg/main.ts
exports.handler = async (event) => {
  for (const record of event.Records) {
    // console.log("batch-msg", record.s3.bucket.name, record.s3.object.key);
    const fileKey = record.s3.object.key;
    const bucketKey = record.s3.bucket.name;
    // download file
    if (fileKey.includes("metadata")) {
      console.log("batch-msg", fileKey, "no work");
      continue;
    }
    console.log("s3.getObject", bucketKey, unescape(fileKey));
    const res = await new Promise((res, rej) => {
      s3.getObject({ Bucket: bucketKey, Key: unescape(fileKey) }, (err, data) =>
        err ? rej(err) : res(data)
      );
    });
    // parse file
    // console.log('res', res.Body.toString())
    const lines = res.Body.toString().split("\n").slice(1);
    for (const line of lines) {
      if (!line) continue;
      const [asin, payload, htime] = line.split(",");
      const smres = await new Promise((res, rej) => {
        sqs.sendMessage(
          {
            QueueUrl: sqs_url,
            MessageBody: line,
            MessageAttributes: {
              asin: {
                DataType: "String",
                StringValue: asin,
              },
            },
          },
          (err, data) => (err ? rej(err) : res(data))
        );
      });
      console.log("send sqs", asin, smres);
    }
    // done
  }
};
