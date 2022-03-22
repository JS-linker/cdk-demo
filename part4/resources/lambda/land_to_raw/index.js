const aws = require("aws-sdk");
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
exports.handler = async (event) => {
  const { invocationSchemaVersion, invocationId, job, tasks } = event;
  const results = [];
  for (const task of tasks) {
    const { taskId, s3Key, s3BucketArn } = task;
    try {
      const keygroups = s3Key.slice(1).split("/");
      const tagetKey = `report/date=${keygroups[0]}-${keygroups[1]}-${keygroups[2]}/${keygroups[3]}`;
      const copySource = s3BucketArn.split(':')[5] + "/" + s3Key.slice(1)
      const res = await new Promise((res) =>
        s3.copyObject(
          {
            // target bucket
            Bucket: ':TODO',
            // Bucket: "s3batchstack-rawdatabucket57f26c03-1640xid99yle1",
            // source bucket arn
            CopySource: copySource,
            Key: tagetKey,
          },
          (err, data) => {
            res({ err, data });
          }
        )
      );
      console.log("copy obj done:", copySource, res);
    } catch (error) {
      results.push({
        taskId,
        resultCode: "TemporaryFailure",
        resultString: error.err,
      });
      console.log("copy obj error:", error);
    }
  }
  return {
    invocationSchemaVersion,
    invocationId,
    treatMissingKeysAs: "PermanentFailure",
    results,
  };
};