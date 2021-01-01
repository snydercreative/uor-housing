const AWS = require('aws-sdk')
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
	
	AWS.config.update({region: 'us-west-2'})

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
	const todaySet = new Set(freshHouses)
	
	const yesterdaysFile = await s3.getObject(params).promise()
	const yesterdaysHouses = yesterdaysFile.Body.toString().split(/\r\n/).sort()
	const yesterdaySet = new Set(yesterdaysHouses)

	const drops = yesterdaysHouses.filter(house => !todaySet.has(house))
	const newHouses = freshHouses.filter(house => !yesterdaySet.has(house))

	const dropsString = JSON.stringify(drops)
	const newHousesString = JSON.stringify(newHouses)
	
	const todayPutParams = {
		Bucket: 'uor-housing',
		Key: 'house.txt',
		Body: freshDataText
	}

	const dropsPutParams = {
		Bucket: 'uor-housing',
		Key: 'drops.json',
		Body: dropsString
	}
	
	const newHousesPutParams = {
		Bucket: 'uor-housing',
		Key: 'new-houses.json',
		Body: newHousesString
	}
	
	const uoamDropsPutParams = {
		Bucket: 'uor-housing',
		Key: 'uoam-drops.map',
		Body: reformatForUOAM(dropsString)
	}

	const uoamNewHousesPutParams = {
		Bucket: 'uor-housing',
		Key: 'uoam-new-houses.map',
		Body: reformatForUOAM(newHousesString)
	}

	if (drops.length) {
		await s3.putObject(todayPutParams).promise()

		await s3.putObject(dropsPutParams).promise()
		
		await s3.putObject(newHousesPutParams).promise()

		await s3.putObject(uoamDropsPutParams).promise()

		await s3.putObject(uoamNewHousesPutParams).promise()
	
		var snsParams = {
			Message: 'UOR housing list updated', /* required */
			TopicArn: process.env.SNS_TOPIC_ARN
		};

		await new AWS.SNS({apiVersion: '2010-03-31'}).publish(snsParams).promise();
	}

	return dropsString
}
