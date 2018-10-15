const aws = require('aws-sdk')
const diff = require('diff')
const fetch = require('node-fetch')

let differences = ''
let lastUploadContent = ''

const handleBucketObject = (err, freshData) => {
	const options = {
		newlineIsToken: true,
	}

	differences = diff.diffTrimmedLines(lastUploadContent, freshData, options)
}

exports.handler = async (event) => {
	const s3options = {
		accessKeyId: process.env.AWS_KEY,
		secretAccessKey: process.env.AWS_SECRET,
	}

	const params = {
		Bucket: event.Records[0].s3.bucket.name,
		Key: event.Records[0].s3.object.key,
	}

	const lastUpload = await fetch('http://www.uorenaissance.com/map/house.txt')
	lastUploadContent = await lastUpload.text()

	const s3 = new aws.S3(s3options)

	s3.getObject(params, handleBucketObject)

	return differences
}
