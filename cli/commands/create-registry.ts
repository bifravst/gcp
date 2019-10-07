import chalk from 'chalk'
import { ComandDefinition } from './CommandDefinition'
import { cloudiot_v1 } from 'googleapis'

export const createRegistryCommand = ({
	iotClient,
	region,
	project,
}: {
	iotClient: cloudiot_v1.Cloudiot
	region: string
	project: string
}): ComandDefinition => ({
	command: 'create-registry',
	action: async () => {
		try {
			const { data } = await (iotClient.projects.locations
				.registries as cloudiot_v1.Resource$Projects$Locations$Registries).create(
				{
					parent: `projects/${project}/locations/${region}`,
					requestBody: {
						id: 'bifravst',
						mqttConfig: {
							mqttEnabledState: 'MQTT_ENABLED',
						},
						httpConfig: {
							httpEnabledState: 'HTTP_ENABLED',
						},
						logLevel: 'ERROR',
						eventNotificationConfigs: [
							{
								pubsubTopicName: `projects/${project}/topics/deviceEvents`,
							},
						],
					},
				},
			)
			console.log(chalk.green(`Registry created!`))
			console.log(data)
		} catch (e) {
			throw new Error(`Failed to create registry: ${e.message}`)
		}
	},
	help: 'Create an IoT registry for devices.',
})
