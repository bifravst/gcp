import { ComandDefinition } from './CommandDefinition'
import { connect } from '../device/connect'

const DEFAULT_ENDPOINT = 'mqtts://mqtt.googleapis.com:8883'

export const connectCommand = ({
	certsDir,
	project,
	region,
	deviceUiFirebaseProject,
}: {
	certsDir: string
	project: string
	region: string
	deviceUiFirebaseProject: string
}): ComandDefinition => ({
	command: 'connect <deviceId>',
	options: [
		{
			flags: '-e, --endpoint <endpoint>',
			description: 'MQTT endpoint',
			defaultValue: DEFAULT_ENDPOINT,
		},
	],
	action: async (deviceId: string, { endpoint }) => {
		await
			connect({
				deviceId,
				endpoint,
				project,
				certsDir,
				region,
				deviceUiUrl: `https://${deviceUiFirebaseProject}.web.app`
			})
	},
	help: 'Connect to the GCP IoT broker using a generated device certificate.',
})
