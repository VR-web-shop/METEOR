

export default {
	input: './index.js',
	output: {
		file: './dist/bundle.cjs',
		format: 'cjs'
	},
	external: ['express']
};
