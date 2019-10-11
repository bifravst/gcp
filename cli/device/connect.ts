import { promises as fs } from 'fs'
import { connect as mqttConnect } from 'mqtt'
import { deviceFileLocations } from '../iot/deviceFileLocations'
import chalk from 'chalk'
import * as jwt from 'jsonwebtoken'
import { URL } from 'url'
import { deviceTopics } from '../iot/deviceTopics'
import { defaultConfig } from './defaultConfig'
import { uiServer, WebSocketConnection } from '@bifravst/device-ui-server'
import * as merge from 'deepmerge'

/**
 * Connect to the AWS IoT broker using a generated device certificate
 */
export const connect = async ({
	deviceId,
	certsDir,
	endpoint,
	project,
	region,
	deviceUiUrl,
}: {
	deviceId: string
	endpoint: string
	project: string
	region: string
	certsDir: string
	deviceUiUrl: string
}) => {
	const deviceFiles = deviceFileLocations({ certsDir, deviceId })

	console.log(chalk.blue('Device ID:     '), chalk.yellow(deviceId))
	console.log(chalk.blue('endpoint:      '), chalk.yellow(endpoint))
	console.log(
		chalk.blue('Private key:   '),
		chalk.yellow(deviceFiles.privateKey),
	)
	console.log(
		chalk.blue('Certificate:   '),
		chalk.yellow(deviceFiles.publicKey),
	)

	const certFiles = [deviceFiles.privateKey, deviceFiles.publicKey]

	try {
		await Promise.all(
			certFiles.map(async f => {
				try {
					await fs.stat(f)
					console.log(chalk.green('✔'), chalk.magenta(f))
				} catch (e) {
					console.log(chalk.red('✖'), chalk.magenta(f))
					throw e
				}
			}),
		)
	} catch (error) {
		console.error(
			chalk.red(`Could not find certificates for device ${deviceId}!`),
		)
		process.exit(1)
	}

	const { hostname, port } = new URL(endpoint)

	const token = {
		iat: Math.round(Date.now() / 1000),
		exp: Math.round(Date.now() / 1000) + 20 * 60, // 20 minutes
		aud: project,
	}
	const privateKey = await fs.readFile(deviceFiles.privateKey)
	const password = jwt.sign(token, privateKey, { algorithm: 'RS256' })

	const topics = deviceTopics(deviceId)

	const connection = mqttConnect({
		host: hostname,
		port,
		clientId: `projects/${project}/locations/${region}/registries/bifravst/devices/${deviceId}`,
		username: 'unused',
		password,
		protocol: 'mqtts',
		secureProtocol: 'TLSv1_2_method',
		protocolId: 'MQTT',
		protocolVersion: 4,
		clean: true,
	})

	let wsConnection: WebSocketConnection
	let state: object = {}

	connection.on('connect', async () => {
		console.log(chalk.green(chalk.inverse(' connected ')))

		await uiServer({
			deviceUiUrl,
			deviceId: deviceId,
			onUpdate: update => {
				console.log(chalk.magenta('<'), chalk.cyan(JSON.stringify(update)))
				state = merge(state, update)
				console.log(chalk.blue('State:'))
				console.log(state)
				const s = JSON.stringify(state)
				console.log(chalk.magenta('>'), chalk.yellow(topics.state), chalk.blue(s))
				connection.publish(topics.state, s)
			},
			onWsConnection: c => {
				console.log(chalk.magenta('[ws]'), chalk.cyan('connected'))
				wsConnection = c
				connection.subscribe(topics.config, { qos: 1 })
			},
		})


	})

	connection.on('close', () => {
		console.error(chalk.red(chalk.inverse(' disconnected! ')))
	})

	connection.on('reconnect', () => {
		console.log(chalk.magenta('reconnecting...'))
	})

	connection.on('message', (topic, message) => {
		console.log(chalk.magenta('<'), chalk.yellow(topic))
		console.log(
			chalk.magenta('<'),
			chalk.cyan(JSON.stringify(message.toString())),
		)

		switch (topic) {
			case topics.config:
				const cfg = {
					...defaultConfig,
					...JSON.parse(message.toString())
				}
				console.log(chalk.blue('Config:'))
				console.log(cfg)
				if (wsConnection) {
					console.log(chalk.magenta('[ws>'), JSON.stringify(cfg))
					wsConnection.send(JSON.stringify(cfg))
				}
				break
			default:
				console.log(chalk.red(`Unexpected topic:`), chalk.yellow(topic))
		}
	})
}
