const AWS = require('aws-sdk')
const fetch = require('node-fetch')
const _ = require('lodash')

let differences = ''
let freshData = ''

const handleBucketObject = (err, lastUpload, callback) => {
	const freshHouses = freshData.split(/\r\n/).sort()
	const lastUploadHouses = lastUpload.Body.toString().split(/\r\n/).sort()

	differences = _.difference(lastUploadHouses, freshHouses)

	callback(null, differences)
}

exports.handler = (event, context, callback) => {
	const s3options = {
		accessKeyId: process.env.AWS_KEY,
		secretAccessKey: process.env.AWS_SECRET,
		apiVersion: '2006-03-01',
		region: 'us-west-2',
	}

	const s3 = new AWS.S3(s3options)

	const params = {
		Bucket: 'uor-housing',
		Key: 'house.txt',
	}

	fetch('http://www.uorenaissance.com/map/house.txt')
		.then(freshDataResponse => freshDataResponse.text())
		.then((freshDataBody) => {
			freshData = freshDataBody

			s3.getObject(params, (err, body) => handleBucketObject(err, body, callback))
		})
}
