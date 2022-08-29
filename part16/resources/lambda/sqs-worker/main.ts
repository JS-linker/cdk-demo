"use strict";

const aws = require("aws-sdk");
const kinesis = new aws.Kinesis();
const streamName = "DataLoopStack-WorkerReturnStream2F77B093-FfAP18Rzm9Ym";
// asset-input/resources/lambda/sqs-worker/main.ts
exports.handler = async (event) => {
  // console.log('event', event)
  for (const record of event.Records) {
    const { body } = record;
    const [asin, payload, htime] = body.split(",");

    // mock call api
    // mock put kinesis data stream
    const params = {
      Data: Buffer.from(JSON.stringify({ asin, payload, htime })),
      PartitionKey: "htime",
      StreamName: streamName,
    };
    const putRes = await new Promise((res, rej) => {
      kinesis.putRecord(params, (err, data) => {
        if (err) rej(err);
        else res(data);
      });
    });
    console.log(asin, putRes);
  }
};
