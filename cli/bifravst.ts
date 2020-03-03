import * as program from 'commander'
import chalk from 'chalk'
import * as path from 'path'
import { registerCaCommand } from './commands/register-ca'
import { createRegistryCommand } from './commands/create-registry'
import { google } from 'googleapis'
import { createDeviceCertCommand } from './commands/create-device-cert'
import { connectCommand } from './commands/connect'

const region = process.env?.GCP_REGION ?? 'europe-west1'
const deviceUiFirebaseProject =
	process.env.DEVICE_UI_FIREBASE_PROJECT ?? 'bifravst-device-ui'

const bifravstCLI = async () => {
	const certsDir = path.resolve(process.cwd(), 'certificates')

	const auth = new google.auth.GoogleAuth({
		keyFile: path.resolve(process.cwd(), 'gcp.json'),
		scopes: [
			'https://www.googleapis.com/auth/cloud-platform',
			'https://www.googleapis.com/auth/cloudiot',
			'https://www.googleapis.com/auth/firebase.readonly',
			'https://www.googleapis.com/auth/firebase',
		],
	})
	const authClient = await auth.getClient()

	// obtain the current project Id
	const project = await auth.getProjectId()
	console.log(chalk.grey('Project:'), chalk.magenta(project))

	const iotClient = google.cloudiot({
		version: 'v1',
		auth: authClient,
	})

	program.description('Bifravst Command Line Interface')

	const commands = [
		registerCaCommand({
			certsDir,
			iotClient,
			region,
			project,
		}),
		createRegistryCommand({
			iotClient,
			region,
			project,
		}),
		createDeviceCertCommand({
			iotClient,
			region,
			project,
		}),
		connectCommand({
			deviceUiFirebaseProject,
			certsDir,
			project,
			region,
		}),
	]

	let ran = false
	commands.forEach(({ command, action, help, options }) => {
		const cmd = program.command(command)
		cmd
			.action(async (...args) => {
				try {
					ran = true
					await action(...args)
				} catch (error) {
					console.error(
						chalk.red.inverse(' ERROR '),
						chalk.red(`${command} failed!`),
					)
					console.error(chalk.red.inverse(' ERROR '), chalk.red(error))
					process.exit(1)
				}
			})
			.on('--help', () => {
				console.log('')
				console.log(chalk.yellow(help))
				console.log('')
			})
		if (options) {
			options.forEach(({ flags, description, defaultValue }) =>
				cmd.option(flags, description, defaultValue),
			)
		}
	})

	program.parse(process.argv)

	if (!ran) {
		program.outputHelp(chalk.yellow)
		throw new Error('No command selected!')
	}
}

bifravstCLI().catch(err => {
	console.error(chalk.red(err))
	process.exit(1)
})
