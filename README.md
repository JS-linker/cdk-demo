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
    
### Part7 - Mock S3 history migration and with 2parquet


    +---------+      +----------+      +-----------+
    |         |      |          |      |           |
    | Stream  +----->+ Firehose +----->+ Land Zone |
    |         |      |          |      |           |
    +---------+      +----------+      +-----------+

    +----------+      +------------------+      +------------+
    |          |      |                  |      |            |
    |Land Zone +----->+ lambda+2paraquet +----->+  Raw Zone  |
    |          |      |                  |      |            |
    +----------+      +------------------+      +------------+

    Constructs:
    IAM Role:
        - Kinesis Data Stream -> Kinesis Firehose(Role allow write s3 bucket) -> LandZone
        - LandZone -> S3 batch + lambda(Role allow s3 read/write and batch InvokeFunction) -> Raw Zone
    Bucket:
        - LandZone Bucket and Raw Bucket
    Gulp.DataBase:
        - CfnDatabase
    Gulp.Tabel:
        - CfnTable -> From Raw Bucket , parquet formate
        
### Part8 - Mock S3 history migration and with 2parquet

                                                                                 +---------------+
                                              +----------+        +------+       |               |
                                    +-------->| firehose +--------+ gzip +------>|land zone bucke|
                                    |         +----------+        +------+       |               |
                                    |                                            +---------------+
    +-----------------------+       |
    |                       |       |
    |  kinesis data stream  +-------+
    |                       |       |
    +-----------------------+       |                                            +---------------+
                                    |         +----------+       +---------+     |               |
                                    +-------->| firehose +-------+ parquet +---->|raw zone bucket|
                                              +----------+       +---------+     |               |
                                                                                 +---------------+
    Constructs:
    IAM Role:
        - Kinesis Data Stream -> Kinesis Firehose A(Role allow write s3 bucket) -> Land Zone
        - Kinesis Data Stream -> Kinesis Firehose B(Role allow write s3 bucket) -> Raw Zone
        - Kinesis Firehose B(Role use Gulp.Tabel for parquet formate)
    Bucket:
        - LandZone Bucket and RawZone Bucket
    Gulp.DataBase:
        - CfnDatabase
    Gulp.Tabel:
        - CfnTable -> From Raw Bucket , parquet formate

### Part9 - Mock S3 history migration and with 2parquet (python)


    +---------+      +----------+      +-----------+
    |         |      |          |      |           |
    | Stream  +----->+ Firehose +----->+ Land Zone |
    |         |      |          |      |           |
    +---------+      +----------+      +-----------+

    +----------+      +------------------+      +------------+
    |          |      |                  |      |            |
    |Land Zone +----->+ lambda+2paraquet +----->+  Land Zone |
    |          |      |                  |      |            |
    +----------+      +------------------+      +------------+

    Constructs:
    IAM Role:
        - Kinesis Data Stream -> Kinesis Firehose(Role allow write s3 bucket) -> LandZone
        - LandZone -> S3 batch + lambda(Role allow s3 read/write and batch InvokeFunction) -> Raw Zone
    Bucket:
        - Only LandZone Bucket
        - Diff path
    Gulp.DataBase:
        - CfnDatabase
    Gulp.Tabel:
        - CfnTable -> From Raw Bucket , parquet formate

### Part11 - simple aws emr


    +---------+      +----------+      +-----------+
    |         |      |          |      |           |
    | Stream  +----->+ Firehose +----->+    Zone   |
    |         |      |          |      |           |
    +---------+      +----------+      +-----------+

    +----------+      +------------------+      +-------------+
    |          |      |                  |      |             |
    |   Zone   +----->+   lambda + EMR   +----->+ target Zone |
    |          |      |                  |      |             |
    +----------+      +------------------+      +-------------+

    Constructs:
    IAM Role:
        - Kinesis Data Stream -> Kinesis Firehose(Role allow write s3 bucket) -> Zone
        - Zone -> lambda(Role allow elasticmapreduce:RunJobFlow) -> Zone
    Bucket:
        - Only KinesisEmrStreamBucket
        - Diff path


### Part14 - Messages are sent to different sqs by sns




                                    ┌──────────────────────────────────────────┐
                                    │                                          │                 ┌────────────────────────────────────┐
                                    │   firehose                               │                 │                                    │
                                    │                                          │                 │   s3 bucket                        │
                                    │                                          │                 │                                    │
                                    │    ┌───────────────────────────────┐     │                 │                                    │
    ┌────────────────┐              │    │                               │     │                 │                                    │
    │                │              │    │                               │     │                 │       1. /a=xxx/yyy1.file          │
    │                │              │    │                               │     │                 │       2. /b-xxx/yyy2.file          │
    │     stream     │              │    │                               │     │                 │       3. /c-xxx/yyy3.file          │
    │                ├──────────────┼────►       firehose buffer         ├─────┼─────────────────►                                    │
    │                │              │    │                               │     │                 │                                    │
    │                │              │    │                               │     │                 │                                    │
    └────────────────┘              │    │                               │     │                 │                                    │
                                    │    └────────┬──────────────────────┘     │                 │                                    │
                                    │             │             ▲              │                 │                                    │
                                    │             ▼             │              │                 │                                    │
                                    │         ┌─────────────────┴────┐         │                 │                                    │
                                    │         │                      │         │                 │                                    │
                                    │         │                      │         │                 └────────────────────────────────────┘
                                    │         │        lambda        │         │
                                    │         │                      │         │
                                    │         └──────────────────────┘         │
                                    │                                          │
                                    └──────────────────────────────────────────┘



### Part15 - Messages are sent to different sqs by sns



                                    ┌──────────────────────────────┐               ┌──────────────┐              ┌───────────────┐
                                    │                              │               │              │              │               │
                                    │                              │               │              │              │               │
                            ┌───────┤  filterPolicy.type = ['q2']  ├───────────────►     sqs      ├──────────────►    worker     │
                            │       │                              │               │              │              │               │
         ┌───────────┐      │       │                              │               │              │              │               │
         │           │      │       └──────────────────────────────┘               └──────────────┘              └───────────────┘
         │    sns    ├──────┤
         │           │      │       ┌──────────────────────────────┐               ┌──────────────┐              ┌───────────────┐
         └───────────┘      │       │                              │               │              │              │               │
                            │       │                              │               │              │              │               │
                            └───────┤  filterPolicy.type = ['q1']  ├───────────────►     sqs      ├──────────────►    worker     │
                                    │                              │               │              │              │               │
                                    │                              │               │              │              │               │
                                    └──────────────────────────────┘               └──────────────┘              └───────────────┘








