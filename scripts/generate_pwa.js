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
		'./bundle.js',
		'./lib/**/*',
		'./css/**/*',
		'./assets/**/*',
		'./font/*',
	],
	swDest: './service_worker.js',
	maximumFileSizeToCacheInBytes: 4_096_000,
	sourcemap: false
}).then(({count, size}) => {
	console.log(`Generated service-worker, which will precache ${count} files, totaling ${(size/1e6).toFixed(2)} MB.`);
});
