import boto3

s3 = boto3.session.Session(
    profile_name='js-data-engineering-prod', region_name='us-west-2').resource('s3')

s3c = boto3.session.Session(
    profile_name='js-data-engineering-prod', region_name='us-west-2').client('s3')

BUCKET_NAME = 'js-extension-scraper-production-monitor'
path = 'extension-scraper/summary/date=2022-05-16'
for item in s3.Bucket(BUCKET_NAME).objects.filter(Prefix="%s/" % path):
    # filter contains target path and item is file no folder
    itemKey = item.key.split('/')[-1]
    print(itemKey, item.key)
    s3c.download_file(BUCKET_NAME, item.key, itemKey)


# s3c = boto3.session.Session(
#     profile_name='js-pipeline', region_name='us-west-2').client('s3')


# s3c.download_file('cobalt-market-segments-dev', 'KeepaData/raw/us/1659312000000/B09YLL9NXG.json', 'B09YLL9NXG.json')