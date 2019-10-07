import chalk from 'chalk'
import { ComandDefinition } from './CommandDefinition'
import { generateCA } from '../iot/generateCA'

export const registerCaCommand = ({
	certsDir,
}: {
	certsDir: string
}): ComandDefinition => ({
	command: 'register-ca',
	action: async () => {
		const { certificate } = await generateCA({
			certsDir,
			log: (...message: any[]) => {
				console.log(...message.map(m => chalk.magenta(m)))
			},
			debug: (...message: any[]) => {
				console.log(...message.map(m => chalk.cyan(m)))
			},
		})
		console.log(chalk.green(`CA certificate genrated.`))
		console.log(chalk.white(certificate))
		console.log(chalk.green('You can now generate device certificates.'))
	},
	help: 'Create a CA for devices.',
})
