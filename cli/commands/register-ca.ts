import chalk from 'chalk'
import { ComandDefinition } from './CommandDefinition'
import { generateCA } from '../iot/generateCA'
import { cloudiot_v1 } from 'googleapis'

export const registerCaCommand = ({
	certsDir,
	iotClient,
	region,
	project,
}: {
	certsDir: string
	iotClient: cloudiot_v1.Cloudiot
	region: string
	project: string
}): ComandDefinition => ({
	command: 'register-ca',
	action: async () => {
		const registryName = `projects/${project}/locations/${region}/registries/bifravst`
		const {
			data: registry,
		} = await iotClient.projects.locations.registries.get({
			name: registryName,
		})

		console.log(chalk.grey('Registry:'), chalk.magenta(registryName))

		const { certificate } = await generateCA({
			certsDir,
			log: (...message: any[]) => {
				console.log(...message.map(m => chalk.magenta(m)))
			},
			debug: (...message: any[]) => {
				console.log(...message.map(m => chalk.cyan(m)))
			},
		})
		console.log(chalk.magenta(`CA certificate generated.`))

		await iotClient.projects.locations.registries.patch({
			name: registryName,
			updateMask: 'credentials',
			requestBody: {
				credentials: [
					...(registry.credentials || []),
					{
						publicKeyCertificate: {
							certificate,
							format: 'X509_CERTIFICATE_PEM',
						},
					},
				],
			},
		})

		console.log(
			chalk.magenta(`Added CA certificate to registry ${registryName}.`),
		)

		console.log(chalk.green('You can now generate device certificates.'))
	},
	help: 'Creates a CA for devices and adds it to the registry',
})
