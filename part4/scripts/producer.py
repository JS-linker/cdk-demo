import boto3
from pprint import pprint

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