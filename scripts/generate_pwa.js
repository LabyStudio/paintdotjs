const workbox = require('workbox-build');

workbox.generateSW({
	cacheId: 'paintdotjs',
	// Activate a newly-built worker immediately. Otherwise an already-open
	// PaintDotJS tab can keep serving an old tool implementation until every
	// tab using the previous worker has been closed.
	skipWaiting: true,
	clientsClaim: true,
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
	swDest: './service_worker.js',
	// The image codec is deliberately lazy-loaded, but must still be available
	// to installed/offline PWAs once it has shipped with the app.
	maximumFileSizeToCacheInBytes: 20_000_000,
	sourcemap: false
}).then(({count, size}) => {
	console.log(`Generated service-worker, which will precache ${count} files, totaling ${(size/1e6).toFixed(2)} MB.`);
});
