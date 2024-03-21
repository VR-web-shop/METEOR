

export default {
	input: './index.js',
	output: {
		file: './dist/bundle.mjs',
		format: 'mjs'
	},
	external: ['express']
};
