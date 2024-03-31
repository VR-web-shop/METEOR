

export default {
	input: './index.js',
	output: {
		file: './dist/bundle.js',
		format: 'es'
	},
	external: ['express', 'fs', 'multer', '@aws-sdk/client-s3']
};
