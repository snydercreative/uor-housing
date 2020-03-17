const AWS = require('aws-sdk')
const diff = require('diff')
const fetch = require('node-fetch')
const _ = require('lodash')

const reformatForUOAM = (dataString) => {
	let diff = '3\n'

	const dataArr = JSON.parse(dataString)

	dataArr.forEach(item => {
		diff = diff + item + '\n'
	})

	return diff
}

exports.handler = async (event) => {
	
	const s3options = {
		accessKeyId: process.env.AWS_KEY,
		secretAccessKey: process.env.AWS_SECRET,
		apiVersion: '2006-03-01',
		region: 'us-west-2'
	}

	const s3 = new AWS.S3(s3options)

	const params = {
		Bucket: 'uor-housing',
		Key: 'house.txt'
	}
	
	const freshDataResponse = await fetch('http://www.uorenaissance.com/map/house.txt')
	const freshDataText = await freshDataResponse.text()
	const freshHouses = freshDataText.split(/\r\n/).sort()
	
	const yesterdaysFile = await s3.getObject(params).promise()
	const yesterdaysHouses = yesterdaysFile.Body.toString().split(/\r\n/).sort()
	
	const todaySet = new Set(freshHouses)
	
	const differences = yesterdaysHouses.filter(house => !todaySet.has(house))
	
	const differencesString = JSON.stringify(differences)
	
	const todayPutParams = {
		Bucket: 'uor-housing',
		Key: 'house.txt',
		Body: freshDataText
	}

	const differencePutParams = {
		Bucket: 'uor-housing',
		Key: 'diff.json',
		Body: differencesString
	}
	
	const rawPutParams = {
		Bucket: 'uor-housing',
		Key: 'diff-uoam.map',
		Body: reformatForUOAM(differencesString)
	}
	
	await s3.putObject(todayPutParams).promise()

	await s3.putObject(differencePutParams).promise()

	await s3.putObject(rawPutParams).promise()

	return differencesString
}
