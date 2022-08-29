"use strict";

// asset-input/resources/lambda/firehose-transform/main.ts
// must use async
exports.handler = async (event) => {
  const records = [];
  const day = new Date();
  const h = day.getHours();
  const m = day.getMinutes();
  const end = m + (m % 5 == 0 ? 0 : (m % 5) * -1 + 5);
  for (const item of event.records) {
    const nItem = {};
    const partitionKeys = {
      htime: (end > 60 ? h + 1 : h) + "-" + (end > 60 ? "00" : end),
      // htime: h.toString()
    };
    nItem.recordId = item.recordId;
    nItem.data = item.data;
    nItem.result = "Ok";
    nItem.metadata = { partitionKeys: partitionKeys };
    records.push(nItem);
  }
  console.log(records, records[0]);
  return { records };
};
