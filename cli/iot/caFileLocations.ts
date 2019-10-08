import * as path from 'path'

export const caFileLocations = (certsDir: string) => ({
	cert: path.resolve(certsDir, 'CA.pem'),
	privateKey: path.resolve(certsDir, 'privateKey.key'),
})
