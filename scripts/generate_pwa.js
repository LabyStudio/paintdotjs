const workbox = require('workbox-build');
const fs = require('fs');
const path = require('path');
const packageJson = require('../package.json');

// This file deliberately stays out of the precache. An already-installed
// version must be able to ask the server which build is currently deployed.
fs.writeFileSync(
	path.resolve(__dirname, '../assets/update.json'),
	JSON.stringify({version: packageJson.version}) + '\n'
);

workbox.generateSW({
	cacheId: 'paintdotjs',
	// Leave a downloaded update waiting until the user accepts the update
	// prompt. Workbox adds a SKIP_WAITING message handler in this mode.
	skipWaiting: false,
	clientsClaim: false,
	cleanupOutdatedCaches: true,
	// v is used by index.html to force an old worker to fetch the current
	// bootstrap. The current worker may ignore it so deployed PWAs stay offline.
	ignoreURLParametersMatching: [/^utm_/, /^fbclid$/, /^v$/],
	globDirectory: './',
	globPatterns: [
		'./index.html',
		'./favicon.png',
		'./icon_maskable.png',

		'./js/**/*',
		'./*.bundle.js',
		'./lib/**/*',
		'./css/**/*',
		'./assets/**/*',
		'./font/*',
		'./run/test.png',
	],
	globIgnores: ['./assets/update.json'],
	swDest: './service_worker.js',
	// The image codec is deliberately lazy-loaded, but must still be available
	// to installed/offline PWAs once it has shipped with the app.
	maximumFileSizeToCacheInBytes: 20_000_000,
	sourcemap: false
}).then(({count, size}) => {
	console.log(`Generated service-worker, which will precache ${count} files, totaling ${(size/1e6).toFixed(2)} MB.`);
});
