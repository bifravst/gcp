import chalk from 'chalk'
import { ComandDefinition } from './CommandDefinition'
import { randomWords } from '@bifravst/random-words'
import * as path from 'path'
import { generateDeviceCertificate } from '../iot/generateDeviceCertificate'
import { deviceFileLocations } from '../iot/deviceFileLocations'
import { cloudiot_v1 } from 'googleapis'
import { promises as fs } from 'fs'
import * as os from 'os'
import { defaultConfig } from '../device/defaultConfig';

export const registerDeviceCommand = ({
	iotClient,
	region,
	project,

}: {
	iotClient: cloudiot_v1.Cloudiot, region: string
	project: string
}): ComandDefinition => ({
	command: 'register-device',
	options: [
		{
			flags: '-d, --deviceId <deviceId>',
			description: 'Device ID, if left blank a random ID will be generated',
		},
	],
	action: async ({ deviceId }: { deviceId: string }) => {
		const id = deviceId || (await randomWords({ numWords: 3 })).join('-')

		const certsDir = path.resolve(process.cwd(), 'certificates')
		const { expires } = await generateDeviceCertificate({
			deviceId: id,
			certsDir,
			log: (...message: any[]) => {
				console.log(...message.map(m => chalk.magenta(m)))
			},
			debug: (...message: any[]) => {
				console.log(...message.map(m => chalk.cyan(m)))
			},
		})
		console.log(
			chalk.green(`Certificate for device ${chalk.yellow(id)} generated.`),
		)

		const certificate = deviceFileLocations({
			certsDir,
			deviceId: id
		})

		const registryName = `projects/${project}/locations/${region}/registries/bifravst`

		const key = await fs.readFile(path.resolve(certsDir, certificate.publicKey), 'utf-8')

		await iotClient.projects.locations.registries.devices.create({
			parent: registryName,
			requestBody: {
				id,
				credentials: [
					{
						publicKey: {
							format: 'RSA_X509_PEM',
							key
						},
						expirationTime: expires.toISOString()
					},
				],
				config: {
					binaryData: Buffer.from(JSON.stringify(defaultConfig)).toString('base64')
				}
			}
		})

		// Writes a self-contained JSON file
		// This setup uses the long-term MQTT domain
		// See https://cloud.google.com/iot/docs/how-tos/mqtt-bridge#downloading_mqtt_server_certificates
		await fs.writeFile(
			certificate.json,
			JSON.stringify(
				{
					caCert: (await Promise.all([
						fs.readFile(path.resolve(process.cwd(), 'data', 'gtsltsr.crt'), 'utf-8'),
						fs.readFile(path.resolve(process.cwd(), 'data', 'GSR4.crt'), 'utf-8')
					])).map(buffer => buffer.toString()).join(os.EOL),
					privateKey: await fs.readFile(certificate.privateKey, 'utf-8'),
					publicKey: key,
					clientId: deviceId,
					brokerHostname: 'mqtt.2030.ltsapis.goog',
				},
				null,
				2,
			),
			'utf-8',
		)

		console.log()
		console.log(chalk.green('You can now connect to the broker.'))
	},
	help: 'Generate a device certificate and register a device in the registry.',
})
