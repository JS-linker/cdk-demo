"use strict";

// asset-input/resources/lambda/firehose-transform/main.ts
exports.handler = async (event) => {
  console.log("event:", event.records);
  const records = [];
  for (const item of event.records) {
    const partitionKeys = {
      htime: 'day2'
    };
    item.data = Buffer.from(
      JSON.stringify({ ...JSON.parse(Buffer.from(item.data, 'base64').toString()), ...partitionKeys })
    ).toString('base64')
    item.result = "Ok";
    item.metadata = {
      partitionKeys
    };
    records.push(item);
  }
  console.log(records)
  return {
    records
  };
};
