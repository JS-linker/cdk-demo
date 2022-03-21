import json
import time
import uuid
import random
from datetime import datetime
from pprint import pprint

import boto3

from faker import Faker


def putRecord():
    rootSteamName = 'KinesisMultipleDataStack-RootStream89352062-c7d7a924'
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


def readRecord():
    as3 = boto3.resource('s3', endpoint_url="http://localhost:4566")
    buckbt1 = 'kinesismultipledatastack-brawdatabucketf0fb9de9-8466f741'
    print('a', len(list(as3.Bucket(buckbt1).objects.all())))
    for item in as3.Bucket(buckbt1).objects.all():
        pprint(item.key)
    buckbt2 = 'kinesismultipledatastack-arawdatabucketa89fb02e-907ca61c'
    print('b', len(list(as3.Bucket(buckbt2).objects.all())))
    for item in as3.Bucket(buckbt2).objects.all():
        pprint(item.key)


putRecord()
time.sleep(3)
readRecord()
