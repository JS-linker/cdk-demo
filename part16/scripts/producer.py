import json
import time
import uuid
import random
from datetime import datetime
from pprint import pprint

import boto3

from faker import Faker


def putRecord():
    rootSteamName = 'DataLoopStack-WorkerReturnStream2F77B093-FfAP18Rzm9Ym'
    kinesis = boto3.session.Session(
        profile_name='js-data-lake-sandbox', region_name='us-west-2').client("kinesis")
    fake = Faker()

    # Base table, GUID with transaction key, GSI with a bank id (of 5 notes) pick one of the five bank IDs. Group by bank ID. sorted by etc

    # banks = []
    # for _ in range(10):
    #     banks.append(fake.swift())

    # while True:
    payload = {
        "asin": str(uuid.uuid4()),
        # "payload": '{"type":"5min"}',
        "payload": str(uuid.uuid4()),
        # "age": fake.random_int(min=18, max=85, step=1),
        # "address": fake.address(),
        # "city": fake.city(),
        # "state": fake.state(),
        # "transaction": fake.random_int(min=1000, max=10000, step=1),
        # "bankId": banks[random.randrange(0, len(banks))],
        # "createdAt": str(datetime.now()),
    }
    response = kinesis.put_record(
        StreamName=rootSteamName, Data=json.dumps(payload), PartitionKey="htime"
    )
    pprint(response)
    time.sleep(1)


putRecord()
