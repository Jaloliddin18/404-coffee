module.exports = {
	apps: [
		{
			name: '404-coffee',
			cwd: './',
			script: './dist/server.js',
			watch: false,
			env_production: {
				NODE_ENV: 'production',
			},
			env_development: {
				NODE_ENV: 'development',
			},
			instances: 1,
			exec_mode: 'cluster',
		},
	],
};
