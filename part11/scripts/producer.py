from awswrangler import config
import boto3
import json
from pprint import pprint

# kinesis

rootSteamName = 'KinesisEmrStream'
kinesis = boto3.session.Session(
    profile_name='js-data-lake-sandbox', region_name='us-west-2').client("kinesis")


def putRecord(payload):
    response = kinesis.put_record(
        StreamName=rootSteamName, Data="%s\n" % (payload), PartitionKey="asin"
    )
    pprint(response)


putRecord(
    'This was a welcome set for the 4 kiddos. 4 GLASS jar cups with lids, metal straws & metal straw brushes for each cup. Packaged with care, easy to hold and not too wide for and 8 year old boba drinker. The glass makes it easier to clean - I do ask the kids to rinse after the drink is gone to keep down sticky residue even if they do not wash thrm until later. A straw washer for each straw makes it easier for all to have and be responsible for their own. Recommended for families, gifting, or singles who use one glass daily.'
)
