import * as path from 'path'

export const caFileLocations = (certsDir: string) => ({
	cert: path.resolve(certsDir, 'rootCA.pem'),
	privateKey: path.resolve(certsDir, 'privateKeyVerification.key'),
})
