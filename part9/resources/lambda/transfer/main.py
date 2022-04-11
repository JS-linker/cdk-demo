from lib2to3.pytree import convert
import boto3

import gzip
import os
import json
import logging
import os
import urllib.parse

import awswrangler
import pandas as pd


logger = logging.getLogger()
logger.setLevel(logging.INFO)

# event input
# {
#   "invocationSchemaVersion": "1.0",
#   "invocationId": "YXNkbGZqYWRmaiBhc2RmdW9hZHNmZGpmaGFzbGtkaGZza2RmaAo",
#   "job": {
#     "id": "f3cc4f60-61f6-4a2b-8a21-d07600c373ce"
#   },
#   "tasks": [
#     {
#       "taskId": "dGFza2lkZ29lc2hlcmUK",
#       "s3Key": "json-files/gz/date=2022-04-11/LL-SC-FirehoseStreamJsonGzip-2-2022-04-11-02-32-17-0fc333f9-842a-46a4-9eac-a2f2411b4aaa.gz",
#       "s3VersionId": "1",
#       "s3BucketArn": "arn:aws:s3:::ll-sc-s3batchstack-rawdatabucket57f26c03-yg9jd4dxj8r3"
#     }
#   ]
# }
def lambda_handler(event, context):
    logger.info({'event': event})

    for record in event['tasks']:
        s3_bucket = 'll-sc-s3batchstack-rawdatabucket57f26c03-yg9jd4dxj8r3'
        # s3_key = urllib.parse.unquote_plus(
        #     record['s3']['object']['key'], encoding='utf-8')
        s3_key = record['s3Key']
        s3 = boto3.client('s3')
        obj = s3.get_object(Bucket=s3_bucket, Key=s3_key)

        if os.path.exists('/tmp/temp.json'):
            os.remove('/tmp/temp.json')

        try:
            with gzip.GzipFile(fileobj=obj['Body']) as gz:
                with open('/tmp/temp.json', 'w') as f_out:
                    f_out.write(gz.read().decode())
        except Exception as e:
            logger.error({'error': str(e), 'message': 'failed gzip decoding'})
            raise e

        # filename, _ = os.path.splitext(os.path.split(s3_key)[-1])

        df = pd.read_json('/tmp/temp.json', lines=True)

        s3_path = 's3://{}/lambda-files/{}.parquet'.format(
            s3_bucket, s3_key.replace('.gz', ''))

        try:
            awswrangler.s3.to_parquet(
                df, dataset=False, path=s3_path, index=False, compression='gzip')
        except Exception as e:
            logger.error(
                {'error': str(e), 'message': 'Failed saving Parquet to S3'})
            raise e
        
        if os.path.exists('/tmp/temp.json'):
            os.remove('/tmp/temp.json')

        print('finish')
