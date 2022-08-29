"use strict";

const aws = require("aws-sdk");
const athena = new aws.Athena();
const s3_result =
  "s3://dataloopstack-scheduleresultbucket53b4dfc7-byonnlcrmroc/";

// asset-input/resources/lambda/query-and-write/main.ts
exports.handler = async () => {
  const day = new Date();
  const h = day.getHours();
  const m = day.getMinutes();
  const end = m + (m % 5 == 0 ? 0 : (m % 5) * -1 + 5);
  const htime = (end > 60 ? h + 1 : h) + "-" + (end > 60 ? "00" : end);
  console.log("htime=", htime);

  // load partitions
  const loadRes = await new Promise((res, rej) => {
    athena.startQueryExecution(
      {
        QueryExecutionContext: {
          Database: "schedule_db",
        },
        QueryString: "MSCK REPAIR TABLE `schedule_db_table`",
        ResultConfiguration: {
          OutputLocation: s3_result + "htime=" + htime + "/",
        },
      },
      (err, data) => {
        if (err) rej(err);
        else res(data);
      }
    );
  });
  while (true) {
    // loadRes.QueryExecutionId
    const queryResult = await new Promise((res, rej) => {
      athena.getQueryExecution(loadRes, (err, data) => {
        if (err) rej(err);
        else res(data);
      });
    });
    const state = queryResult.QueryExecution.Status.State;
    console.log("load state", state);
    if (["SUCCEEDED", "FAILED", "CANCELLED"].includes(state)) break;
  }
  const params = {
    QueryExecutionContext: {
      Database: "schedule_db",
    },
    QueryString: `SELECT * FROM "schedule_db"."schedule_db_table" WHERE htime='${htime}'`,
    ResultConfiguration: {
      OutputLocation: s3_result + "htime=" + htime + "/",
    },
  };
  const res = await new Promise((res, rej) => {
    athena.startQueryExecution(params, (err, data) => {
      if (err) rej(err);
      else res(data);
    });
  });
  console.log("res", res);
};
