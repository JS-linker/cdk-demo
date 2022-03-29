# kinesis-data

### Part1 - simple kinesis demo
    
    The Module reads raw data from the stream, compresses it, and sends it to S3

    +---------+      +----------+      +-----------+
    |         |      |          |      |           |
    | Stream  +----->+ Firehose +----->+ S3 Bucket |
    |         |      |          |      |           |
    +---------+      +----------+      +-----------+

    Constructs:
    IAM Role:
        - Kinesis firehose to kinesis stream and to S3
    Stream:
        - Firehose that pulls from rootStream, buffers, compresses, and puts raw data to S3
    Bucket:
        - An S3 bucket to store the compressed, raw data


### Part2 - Write kinesis data stream to multiple Data Stores
    
    +---------+      +-----------+      +-----------+
    |         |      |           |      |           |
    | Stream D+----->+ FirehoseA +----->+ S3 BucketA|
    |         |      |           |      |           |
    +---------+      +-----------+      +-----------+

    +---------+      +-----------+      +------------+
    |         |      |           |      |            |
    | Stream D+----->+ FirehoseB +----->+ S3 BucketB |
    |         |      |           |      |            |
    +---------+      +-----------+      +------------+

    Constructs:
    IAM Role:
        - Kinesis firehose to kinesis stream and to S3
    Stream:
        - Firehose that pulls from rootStream, buffers, compresses, and puts raw data to S3
    Bucket:
        - An S3 bucket to store the compressed, raw data

    Code:

    >> kinesis.Stream prop => {shardCount:2}

    >> diff `iam.Role`

    >> diff `deliveryStreamName`

### Part3 - Write kinesis data stream to multiple Data Stores
    
    +----------+      +-----------+      +------------+
    |          |      |           |      |            |
    | Stream A +----->+ FirehoseA +----->+ S3 BucketA |
    |          |      |           |      |            |
    +----------+      +-----------+      +------------+

    +----------+      +-----------+      +------------+
    |          |      |           |      |            |
    |S3 BucketA+----->+   lambda  +----->+ S3 BucketB |
    |          |      |           |      |            |
    +----------+      +-----------+      +------------+

    Constructs:
    IAM Role:
        - lambda access Taget S3 Bucket A
    Bucket:
        - Taget S3 Bucket A
        - Source S3 Bucket B


    Code:

    >>  sourcesBucket.addEventNotification(
            s3.EventType.OBJECT_CREATED_PUT,
            new s3n.LambdaDestination(lambdaFunction)
        );

### Part4 - s3 batch copy data to another bucket using lamdba


    +----------+      +---------------------+      +------------+
    |          |      |                     |      |            |
    |S3 BucketA+----->+  s3 batch + lambda  +----->+ S3 BucketB |
    |          |      |                     |      |            |
    +----------+      +---------------------+      +------------+

    Constructs:
    IAM Role:
        - lambda access 
            S3 Bucket A - getObject
            S3 Bucket B - putObject
    Bucket:
        - Taget S3 Bucket A
        - Source S3 Bucket B

    Core:

    >> S3 Batch Job can only be performed in [s3.console](https://docs.aws.amazon.com/AmazonS3/latest/userguide/replication-walkthrough1.html) or using the AWS - SDK Call API.

    >> Create buckets, roles, and lambda using CDK.
 
    >> if use lambda, we need xxx.csv, content: `bucketName, key`

    >> https://aws.amazon.com/blogs/aws/new-replicate-existing-objects-with-amazon-s3-batch-replication/


### Part5 - Creating a serverless application: read or write s3 bucket.


    +----------+      +----------+      +------------+
    |          |      |          |      |            |
    |    s3    +----->+  lambda  +----->+ apigateway |
    |          |      |          |      |            |
    +----------+      +----------+      +------------+

    Constructs:
    IAM Role:
        - lambda access 
            lambda - read s3 bucket
            lambda - write s3 bucket
    Bucket:
        - S3 Bucket A

    Core:

    >> apigateway.RestApi -> root.addMethod
    >> apigateway.RestApi -> root.addResource("{id}")

### Part6 - Creating Gulp


    +---------+      +----------+      +-----------+
    |         |      |          |      |           |
    | Stream  +----->+ Firehose +----->+ S3 Bucket |
    |         |      |          |      |           |
    +---------+      +----------+      +-----------+

    +----------+      +----------+      +------------+
    |          |      |          |      |            |
    |s3 Bucket +----->+  catelog +----->+   athena   |
    |          |      |          |      |            |
    +----------+      +----------+      +------------+

    Constructs:
    IAM Role:
        - Kinesis firehose to kinesis stream and to S3
    Stream:
        - Firehose that pulls from rootStream, buffers, compresses, and puts raw data to S3
    Bucket:
        - An S3 bucket to store the compressed, raw data
    Gulp.DataBase:
        - CfnDatabase
    Gulp.Tabel:
        - CfnTable