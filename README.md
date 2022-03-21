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

