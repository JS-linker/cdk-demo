import boto3
import json
from pprint import pprint

data = [
    {"asin": "B08J4187FT", "report_date": "2022-03-06", "marketplace": "us", "user_id": 718033, "page_views": 210, "units_ordered": 11, "ordered_product_sales": "23089.0", "sales_currency": "USD",
        "order_item_session_percentage": "8.4", "sales_rank": 53782, "reviews_received": 0, "buy_box_precentage": "99.52", "units_ordered_b2b": 0, "ordered_product_sales_b2b": "0.0", "seller_central_id": "AU14D3X6BV3LH"},
    {"asin": "B08MKQ769W", "report_date": "2022-03-06", "marketplace": "us", "user_id": 718033, "page_views": 68, "units_ordered": 6, "ordered_product_sales": "10794.0", "sales_currency": "USD",
        "order_item_session_percentage": "10.34", "sales_rank": 53782, "reviews_received": 0, "buy_box_precentage": "92.65", "units_ordered_b2b": 0, "ordered_product_sales_b2b": "0.0", "seller_central_id": "AU14D3X6BV3LH"},
    {"asin": "B08J3VPW5M", "report_date": "2022-03-06", "marketplace": "us", "user_id": 718033, "page_views": 20, "units_ordered": 7, "ordered_product_sales": "5593.0", "sales_currency": "USD",
        "order_item_session_percentage": "58.33", "sales_rank": 87404, "reviews_received": 0, "buy_box_precentage": "100.0", "units_ordered_b2b": 0, "ordered_product_sales_b2b": "0.0", "seller_central_id": "AU14D3X6BV3LH"},
    {"asin": "B07STLM7WS", "report_date": "2022-03-06", "marketplace": "us", "user_id": 718033, "page_views": 46, "units_ordered": 4, "ordered_product_sales": "6396.0", "sales_currency": "USD",
        "order_item_session_percentage": "13.33", "sales_rank": 95620, "reviews_received": 0, "buy_box_precentage": "95.65", "units_ordered_b2b": 0, "ordered_product_sales_b2b": "0.0", "seller_central_id": "AU14D3X6BV3LH"},
    {"asin": "B087PY44XM", "report_date": "2022-03-06", "marketplace": "us", "user_id": 718033, "page_views": 10, "units_ordered": 2, "ordered_product_sales": "4398.0", "sales_currency": "USD",
        "order_item_session_percentage": "25.0", "sales_rank": 62246, "reviews_received": 0, "buy_box_precentage": "100.0", "units_ordered_b2b": 0, "ordered_product_sales_b2b": "0.0", "seller_central_id": "AU14D3X6BV3LH"},
    {"asin": "B09C7H4P1D", "report_date": "2022-03-06", "marketplace": "us", "user_id": 718033, "page_views": 13, "units_ordered": 2, "ordered_product_sales": "4398.0", "sales_currency": "USD",
        "order_item_session_percentage": "18.18", "sales_rank": 62246, "reviews_received": 0, "buy_box_precentage": "92.31", "units_ordered_b2b": 0, "ordered_product_sales_b2b": "0.0", "seller_central_id": "AU14D3X6BV3LH"},
    {"asin": "B07Y683C2L", "report_date": "2022-03-06", "marketplace": "us", "user_id": 718033, "page_views": 1, "units_ordered": 1, "ordered_product_sales": "1650.0", "sales_currency": "USD",
        "order_item_session_percentage": "100.0", "sales_rank": 308797, "reviews_received": 0, "buy_box_precentage": "100.0", "units_ordered_b2b": 0, "ordered_product_sales_b2b": "0.0", "seller_central_id": "AU14D3X6BV3LH"},
    {"asin": "B087N7QBBK", "report_date": "2022-03-06", "marketplace": "us", "user_id": 718033, "page_views": 8, "units_ordered": 1, "ordered_product_sales": "1999.0", "sales_currency": "USD",
        "order_item_session_percentage": "20.0", "sales_rank": 62246, "reviews_received": 0, "buy_box_precentage": "100.0", "units_ordered_b2b": 0, "ordered_product_sales_b2b": "0.0", "seller_central_id": "AU14D3X6BV3LH"},
    {"asin": "B08L6D2LB3", "report_date": "2022-03-06", "marketplace": "us", "user_id": 718033, "page_views": 58, "units_ordered": 1, "ordered_product_sales": "1699.0", "sales_currency": "USD",
        "order_item_session_percentage": "1.92", "sales_rank": 53782, "reviews_received": 0, "buy_box_precentage": "100.0", "units_ordered_b2b": 0, "ordered_product_sales_b2b": "0.0", "seller_central_id": "AU14D3X6BV3LH"},
    {"asin": "B098DVRSF6", "report_date": "2022-03-06", "marketplace": "us", "user_id": 718033, "page_views": 3, "units_ordered": 1, "ordered_product_sales": "1099.0", "sales_currency": "USD",
        "order_item_session_percentage": "33.33", "sales_rank": 0, "reviews_received": 0, "buy_box_precentage": "100.0", "units_ordered_b2b": 0, "ordered_product_sales_b2b": "0.0", "seller_central_id": "AU14D3X6BV3LH"},
    {"asin": "B09C7ZM6GT", "report_date": "2022-03-06", "marketplace": "us", "user_id": 718033, "page_views": 8, "units_ordered": 1, "ordered_product_sales": "2199.0", "sales_currency": "USD",
        "order_item_session_percentage": "16.67", "sales_rank": 62246, "reviews_received": 0, "buy_box_precentage": "87.5", "units_ordered_b2b": 0, "ordered_product_sales_b2b": "0.0", "seller_central_id": "AU14D3X6BV3LH"},
    {"asin": "B07FKY6HNP", "report_date": "2022-03-06", "marketplace": "us", "user_id": 718033, "page_views": 14, "units_ordered": 0, "ordered_product_sales": "0.0", "sales_currency": "USD",
        "order_item_session_percentage": "0.0", "sales_rank": 216358, "reviews_received": 0, "buy_box_precentage": "100.0", "units_ordered_b2b": 0, "ordered_product_sales_b2b": "0.0", "seller_central_id": "AU14D3X6BV3LH"},
    {"asin": "B07RV1PSMC", "report_date": "2022-03-06", "marketplace": "us", "user_id": 718033, "page_views": 3, "units_ordered": 0, "ordered_product_sales": "0.0", "sales_currency": "USD",
        "order_item_session_percentage": "0.0", "sales_rank": 266641, "reviews_received": 0, "buy_box_precentage": "100.0", "units_ordered_b2b": 0, "ordered_product_sales_b2b": "0.0", "seller_central_id": "AU14D3X6BV3LH"},
    {"asin": "B07SC78GVQ", "report_date": "2022-03-06", "marketplace": "us", "user_id": 718033, "page_views": 4, "units_ordered": 0, "ordered_product_sales": "0.0", "sales_currency": "USD",
        "order_item_session_percentage": "0.0", "sales_rank": 308797, "reviews_received": 0, "buy_box_precentage": "100.0", "units_ordered_b2b": 0, "ordered_product_sales_b2b": "0.0", "seller_central_id": "AU14D3X6BV3LH"},
    {"asin": "B07X525PVF", "report_date": "2022-03-06", "marketplace": "us", "user_id": 718033, "page_views": 1, "units_ordered": 0, "ordered_product_sales": "0.0", "sales_currency": "USD",
        "order_item_session_percentage": "0.0", "sales_rank": 266641, "reviews_received": 0, "buy_box_precentage": "100.0", "units_ordered_b2b": 0, "ordered_product_sales_b2b": "0.0", "seller_central_id": "AU14D3X6BV3LH"},
    {"asin": "B08C4P8N2H", "report_date": "2022-03-06", "marketplace": "us", "user_id": 718033, "page_views": 7, "units_ordered": 0, "ordered_product_sales": "0.0", "sales_currency": "USD",
        "order_item_session_percentage": "0.0", "sales_rank": 813634, "reviews_received": 0, "buy_box_precentage": "100.0", "units_ordered_b2b": 0, "ordered_product_sales_b2b": "0.0", "seller_central_id": "AU14D3X6BV3LH"},
    {"asin": "B08J3QD4RT", "report_date": "2022-03-06", "marketplace": "us", "user_id": 718033, "page_views": 51, "units_ordered": 0, "ordered_product_sales": "0.0", "sales_currency": "USD",
        "order_item_session_percentage": "0.0", "sales_rank": 53782, "reviews_received": 0, "buy_box_precentage": "98.04", "units_ordered_b2b": 0, "ordered_product_sales_b2b": "0.0", "seller_central_id": "AU14D3X6BV3LH"},
    {"asin": "B08KVY9BYD", "report_date": "2022-03-06", "marketplace": "us", "user_id": 718033, "page_views": 8, "units_ordered": 0, "ordered_product_sales": "0.0", "sales_currency": "USD",
        "order_item_session_percentage": "0.0", "sales_rank": 813634, "reviews_received": 0, "buy_box_precentage": "100.0", "units_ordered_b2b": 0, "ordered_product_sales_b2b": "0.0", "seller_central_id": "AU14D3X6BV3LH"},
    {"asin": "B08L7DDZBL", "report_date": "2022-03-06", "marketplace": "us", "user_id": 718033, "page_views": 1, "units_ordered": 0, "ordered_product_sales": "0.0", "sales_currency": "USD",
        "order_item_session_percentage": "0.0", "sales_rank": 279042, "reviews_received": 0, "buy_box_precentage": "100.0", "units_ordered_b2b": 0, "ordered_product_sales_b2b": "0.0", "seller_central_id": "AU14D3X6BV3LH"},
    {"asin": "B08M3749N8", "report_date": "2022-03-06", "marketplace": "us", "user_id": 718033, "page_views": 1, "units_ordered": 0, "ordered_product_sales": "0.0", "sales_currency": "USD",
        "order_item_session_percentage": "0.0", "sales_rank": 266641, "reviews_received": 0, "buy_box_precentage": "100.0", "units_ordered_b2b": 0, "ordered_product_sales_b2b": "0.0", "seller_central_id": "AU14D3X6BV3LH"},
    {"asin": "B08NT5VJ21", "report_date": "2022-03-06", "marketplace": "us", "user_id": 718033, "page_views": 3, "units_ordered": 0, "ordered_product_sales": "0.0", "sales_currency": "USD",
        "order_item_session_percentage": "0.0", "sales_rank": 629823, "reviews_received": 0, "buy_box_precentage": "100.0", "units_ordered_b2b": 0, "ordered_product_sales_b2b": "0.0", "seller_central_id": "AU14D3X6BV3LH"},
    {"asin": "B08P3152F8", "report_date": "2022-03-06", "marketplace": "us", "user_id": 718033, "page_views": 6, "units_ordered": 0, "ordered_product_sales": "0.0", "sales_currency": "USD",
        "order_item_session_percentage": "0.0", "sales_rank": 813634, "reviews_received": 0, "buy_box_precentage": "100.0", "units_ordered_b2b": 0, "ordered_product_sales_b2b": "0.0", "seller_central_id": "AU14D3X6BV3LH"},
    {"asin": "B08P8GXMDM", "report_date": "2022-03-06", "marketplace": "us", "user_id": 718033, "page_views": 7, "units_ordered": 0, "ordered_product_sales": "0.0", "sales_currency": "USD",
        "order_item_session_percentage": "0.0", "sales_rank": 216358, "reviews_received": 0, "buy_box_precentage": "100.0", "units_ordered_b2b": 0, "ordered_product_sales_b2b": "0.0", "seller_central_id": "AU14D3X6BV3LH"},
    {"asin": "B08RMMKBLP", "report_date": "2022-03-06", "marketplace": "us", "user_id": 718033, "page_views": 4, "units_ordered": 0, "ordered_product_sales": "0.0", "sales_currency": "USD",
        "order_item_session_percentage": "0.0", "sales_rank": 266641, "reviews_received": 0, "buy_box_precentage": "100.0", "units_ordered_b2b": 0, "ordered_product_sales_b2b": "0.0", "seller_central_id": "AU14D3X6BV3LH"},
    {"asin": "B08RN154GG", "report_date": "2022-03-06", "marketplace": "us", "user_id": 718033, "page_views": 1, "units_ordered": 0, "ordered_product_sales": "0.0", "sales_currency": "USD",
        "order_item_session_percentage": "0.0", "sales_rank": 266641, "reviews_received": 0, "buy_box_precentage": "100.0", "units_ordered_b2b": 0, "ordered_product_sales_b2b": "0.0", "seller_central_id": "AU14D3X6BV3LH"},
    {"asin": "B091F6GQD9", "report_date": "2022-03-06", "marketplace": "us", "user_id": 718033, "page_views": 1, "units_ordered": 0, "ordered_product_sales": "0.0", "sales_currency": "USD",
        "order_item_session_percentage": "0.0", "sales_rank": 600766, "reviews_received": 0, "buy_box_precentage": "100.0", "units_ordered_b2b": 0, "ordered_product_sales_b2b": "0.0", "seller_central_id": "AU14D3X6BV3LH"},
    {"asin": "B091PPM1CZ", "report_date": "2022-03-06", "marketplace": "us", "user_id": 718033, "page_views": 1, "units_ordered": 0, "ordered_product_sales": "0.0", "sales_currency": "USD",
        "order_item_session_percentage": "0.0", "sales_rank": 266641, "reviews_received": 0, "buy_box_precentage": "100.0", "units_ordered_b2b": 0, "ordered_product_sales_b2b": "0.0", "seller_central_id": "AU14D3X6BV3LH"},
    {"asin": "B091PR3BVP", "report_date": "2022-03-06", "marketplace": "us", "user_id": 718033, "page_views": 4, "units_ordered": 0, "ordered_product_sales": "0.0", "sales_currency": "USD",
        "order_item_session_percentage": "0.0", "sales_rank": 266641, "reviews_received": 0, "buy_box_precentage": "100.0", "units_ordered_b2b": 0, "ordered_product_sales_b2b": "0.0", "seller_central_id": "AU14D3X6BV3LH"},
    {"asin": "B091TVWG55", "report_date": "2022-03-06", "marketplace": "us", "user_id": 718033, "page_views": 1, "units_ordered": 0, "ordered_product_sales": "0.0", "sales_currency": "USD",
        "order_item_session_percentage": "0.0", "sales_rank": 266641, "reviews_received": 0, "buy_box_precentage": "100.0", "units_ordered_b2b": 0, "ordered_product_sales_b2b": "0.0", "seller_central_id": "AU14D3X6BV3LH"},
    {"asin": "B0967WQRCW", "report_date": "2022-03-06", "marketplace": "us", "user_id": 718033, "page_views": 6, "units_ordered": 0, "ordered_product_sales": "0.0", "sales_currency": "USD",
        "order_item_session_percentage": "0.0", "sales_rank": 87404, "reviews_received": 0, "buy_box_precentage": "100.0", "units_ordered_b2b": 0, "ordered_product_sales_b2b": "0.0", "seller_central_id": "AU14D3X6BV3LH"},
    {"asin": "B096S2F1BZ", "report_date": "2022-03-06", "marketplace": "us", "user_id": 718033, "page_views": 1, "units_ordered": 0, "ordered_product_sales": "0.0", "sales_currency": "USD",
        "order_item_session_percentage": "0.0", "sales_rank": 5591301, "reviews_received": 0, "buy_box_precentage": "100.0", "units_ordered_b2b": 0, "ordered_product_sales_b2b": "0.0", "seller_central_id": "AU14D3X6BV3LH"},
    {"asin": "B098DV4841", "report_date": "2022-03-06", "marketplace": "us", "user_id": 718033, "page_views": 3, "units_ordered": 0, "ordered_product_sales": "0.0", "sales_currency": "USD",
        "order_item_session_percentage": "0.0", "sales_rank": 0, "reviews_received": 0, "buy_box_precentage": "100.0", "units_ordered_b2b": 0, "ordered_product_sales_b2b": "0.0", "seller_central_id": "AU14D3X6BV3LH"},
    {"asin": "B09CLZQZ3Y", "report_date": "2022-03-06", "marketplace": "us", "user_id": 718033, "page_views": 7, "units_ordered": 0, "ordered_product_sales": "0.0", "sales_currency": "USD",
        "order_item_session_percentage": "0.0", "sales_rank": 813634, "reviews_received": 0, "buy_box_precentage": "85.71", "units_ordered_b2b": 0, "ordered_product_sales_b2b": "0.0", "seller_central_id": "AU14D3X6BV3LH"},
    {"asin": "B09D91Q9BT", "report_date": "2022-03-06", "marketplace": "us", "user_id": 718033, "page_views": 1, "units_ordered": 0, "ordered_product_sales": "0.0", "sales_currency": "USD",
        "order_item_session_percentage": "0.0", "sales_rank": 629823, "reviews_received": 0, "buy_box_precentage": "100.0", "units_ordered_b2b": 0, "ordered_product_sales_b2b": "0.0", "seller_central_id": "AU14D3X6BV3LH"},
    {"asin": "B09DS4LP23", "report_date": "2022-03-06", "marketplace": "us", "user_id": 718033, "page_views": 5, "units_ordered": 0, "ordered_product_sales": "0.0", "sales_currency": "USD",
        "order_item_session_percentage": "0.0", "sales_rank": 266641, "reviews_received": 0, "buy_box_precentage": "100.0", "units_ordered_b2b": 0, "ordered_product_sales_b2b": "0.0", "seller_central_id": "AU14D3X6BV3LH"},
    {"asin": "B09H3XRP5R", "report_date": "2022-03-06", "marketplace": "us", "user_id": 718033, "page_views": 4, "units_ordered": 0, "ordered_product_sales": "0.0", "sales_currency": "USD",
        "order_item_session_percentage": "0.0", "sales_rank": 813634, "reviews_received": 0, "buy_box_precentage": "100.0", "units_ordered_b2b": 0, "ordered_product_sales_b2b": "0.0", "seller_central_id": "AU14D3X6BV3LH"},
    {"asin": "B09STYRFHY", "report_date": "2022-03-06", "marketplace": "us", "user_id": 718033, "page_views": 1, "units_ordered": 0, "ordered_product_sales": "0.0", "sales_currency": "USD",
        "order_item_session_percentage": "0.0", "sales_rank": 0, "reviews_received": 0, "buy_box_precentage": "100.0", "units_ordered_b2b": 0, "ordered_product_sales_b2b": "0.0", "seller_central_id": "AU14D3X6BV3LH"},
]

# kinesis

rootSteamName = ':TODO'
kinesis = boto3.client("kinesis")


def putRecord(payload):
    response = kinesis.put_record(
        StreamName=rootSteamName, Data="%s\n" % (json.dumps(payload)), PartitionKey="asin"
    )
    pprint(response)


index = 0
length = len(data)

while True:
    putRecord(data[index])
    index += 1
    if index >= length:
        break

# dataFile = open('data', 'r')
# count = 0
# for line in dataFile.readlines():
#     response = kinesis.put_record(
#         StreamName=rootSteamName, Data=line, PartitionKey="asin"
#     )
#     count += 1
#     print('count: %s' % count)
#     pprint(response)

# athena client
# ac = boto3.client('athena')
# res = ac.start_query_execution(
#     QueryString='SELECT * FROM "ll-sc-db"."ll-sc-report-tbbb" limit 10',
#     QueryExecutionContext={"Database": "ll-sc-db"},
#     ResultConfiguration={
#         "OutputLocation": 's3://ll-sc-s3batchstack-llscuntrusteddatabucketb852240-1qxevl2mc3u36/athena_report'}
# )
# res = ac.get_query_results(
#     QueryExecutionId='9fc9d535-4f45-4241-80d5-815d4e1c119b')
# pprint(res)


# BUCKET = 'll-sc-s3batchstack-rawdatabucket57f26c03-17gn3157obl3e'
# # get bucket all key
# s3 = boto3.resource('s3')
# s3.Bucket(BUCKET).object_versions.delete()
# for item in s3.Bucket(BUCKET).objects.all():
#     if item.key.endswith('/') == False:
#         print("%s,%s" % (BUCKET, item.key))


# if you want to delete the now-empty bucket as well, uncomment this line:
# bucket.delete()

# !!! create put_bucket_replication for copy to another bucket !!!
# as3 = boto3.client('s3')
# # as3.Bucket('s3batchstack-landdatabucket757be0cf-wisfxa68g4al').pu
# as3.put_bucket_replication(
#     Bucket='s3batchstack-landdatabucket757be0cf-wisfxa68g4al',
#     ReplicationConfiguration={
#         'Role': 'arn:aws:iam::760952806674:role/S3BatchStack-ReplicationRoleCE149CEC-1FBN1DV8Y19DX',
#         'Rules': [
#             {
#                 'ID': 'move_land_to_raw',
#                 # 'Priority': 123,
#                 # 'Prefix': '*',
#                 # 'Filter': {
#                 #     'Prefix': 'string',
#                 #     'Tag': {
#                 #         'Key': 'string',
#                 #         'Value': 'string'
#                 #     },
#                 #     'And': {
#                 #         'Prefix': 'string',
#                 #         'Tags': [
#                 #             {
#                 #                 'Key': 'string',
#                 #                 'Value': 'string'
#                 #             },
#                 #         ]
#                 #     }
#                 # },
#                 'Status': 'Enabled',
#                 # 'SourceSelectionCriteria': {
#                 #     'SseKmsEncryptedObjects': {
#                 #         'Status': 'Enabled' | 'Disabled'
#                 #     },
#                 #     'ReplicaModifications': {
#                 #         'Status': 'Enabled' | 'Disabled'
#                 #     }
#                 # },
#                 # 'ExistingObjectReplication': {
#                 #     'Status': 'Enabled' | 'Disabled'
#                 # },
#                 'Destination': {
#                     'Bucket': 'arn:aws:s3:::s3batchstack-rawdatabucket57f26c03-1ctyn53mycpch',
#                     # 'Account': 'string',
#                     # 'StorageClass': 'STANDARD'|'REDUCED_REDUNDANCY'|'STANDARD_IA'|'ONEZONE_IA'|'INTELLIGENT_TIERING'|'GLACIER'|'DEEP_ARCHIVE'|'OUTPOSTS'|'GLACIER_IR',
#                     # 'AccessControlTranslation': {
#                     #     'Owner': 'Destination'
#                     # },
#                     # 'EncryptionConfiguration': {
#                     #     'ReplicaKmsKeyID': 'string'
#                     # },
#                     # 'ReplicationTime': {
#                     #     'Status': 'Enabled'|'Disabled',
#                     #     'Time': {
#                     #         'Minutes': 123
#                     #     }
#                     # },
#                     # 'Metrics': {
#                     #     'Status': 'Enabled'|'Disabled',
#                     #     'EventThreshold': {
#                     #         'Minutes': 123
#                     #     }
#                     # }
#                 },
#                 # 'DeleteMarkerReplication': {
#                 #     'Status': 'Enabled'|'Disabled'
#                 # }
#             },
#         ]
#     }
# )
