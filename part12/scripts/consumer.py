from time import sleep
import boto3

# Create SQS client
sqs = boto3.session.Session(
    profile_name='clound-sandbox', region_name='us-west-2').client('sqs')

# :TODO
queue_url = 'https://sqs.us-west-2.amazonaws.com/661308776255/msg-sqs'

# Receive message from SQS queue
while True:
    response = sqs.receive_message(
        QueueUrl=queue_url,
        AttributeNames=[
            'SentTimestamp'
        ],
        MaxNumberOfMessages=1,
        MessageAttributeNames=[
            'All'
        ],
        VisibilityTimeout=0,
        WaitTimeSeconds=0
    )

    print(('Messages' in response) != True)
    if ('Messages' in response) != True:
        sleep(3)
        continue
    # print(response and 'Messages' not in response and len(response['Messages']) != 0)
    # # print('request mss:', response!=n ? len(response['Messages']): 0)
    # if 'Messages' not in response and len(response['Messages']) != 0:
    #     continue

    message = response['Messages'][0]
    receipt_handle = message['ReceiptHandle']

    # Delete received message from queue
    sqs.delete_message(
        QueueUrl=queue_url,
        ReceiptHandle=receipt_handle
    )
    print('Received and deleted message: %s' % message)
