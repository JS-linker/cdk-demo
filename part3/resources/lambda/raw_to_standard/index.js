const aws = require("aws-sdk");
const s3 = new aws.S3();
const sourceBucket = ":TODO";
const targetBucket = ":TODO";

exports.handler = async (event) => {
  const allPromise = event.Records.map((record) => {
    if (record.eventName === "ObjectCreated:Put") {
      const { object, bucket } = record.s3;
      const source_bucket = bucket.name;
      const source_key = object.key;
      const tagetKey = source_key.replace("raw", "standard");
      console.log(
        "move ",
        source_key,
        "from",
        source_bucket,
        "to",
        targetBucket
      );
      return new Promise((res) =>
        s3.copyObject(
          {
            Bucket: targetBucket,
            CopySource: sourceBucket + "/" + source_key,
            Key: tagetKey,
          },
          (err, data) => {
            res({ err, data });
          }
        )
      );
    }
  });
  console.log("results:", await Promise.all(allPromise));
};
