import json
import time
import uuid
import random
from datetime import datetime
from pprint import pprint

import boto3

from faker import Faker

def putRecord():
    rootSteamName = 'KinesisDataStack-RootStream89352062-74a0a044'
    kinesis = boto3.client("kinesis", region_name="us-east-1",
                           endpoint_url="http://localhost:4566")
    fake = Faker()

    # Base table, GUID with transaction key, GSI with a bank id (of 5 notes) pick one of the five bank IDs. Group by bank ID. sorted by etc

    banks = []
    for _ in range(10):
        banks.append(fake.swift())

    # while True:
    payload = {
        "transactionId": str(uuid.uuid4()),
        "name": fake.name(),
        "age": fake.random_int(min=18, max=85, step=1),
        "address": fake.address(),
        "city": fake.city(),
        "state": fake.state(),
        "transaction": fake.random_int(min=1000, max=10000, step=1),
        "bankId": banks[random.randrange(0, len(banks))],
        "createdAt": str(datetime.now()),
    }
    response = kinesis.put_record(
        StreamName=rootSteamName, Data=json.dumps(payload), PartitionKey="abc"
    )
    pprint(response)
    time.sleep(1)

def readRecord():
    s3 = boto3.resource('s3', endpoint_url="http://localhost:4566")
    BUCKET_NAME = 'kinesisdatastack-rawdatabucket57f26c03-3934027d'
    for item in s3.Bucket(BUCKET_NAME).objects.all():
        pprint(item.key)


putRecord()
readRecord()