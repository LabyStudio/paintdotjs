/*
 * paint.js, an unofficial JavaScript port of Paint.NET 3.36.7
 *
 * Original Paint.NET source:
 * Copyright (C) dotPDN LLC, Rick Brewster, and contributors.
 *
 * JavaScript port and port-specific changes:
 * Copyright (C) 2024-present LabyStudio.
 * https://github.com/LabyStudio
 *
 * The interface design and behavior target Paint.NET 5.1.12+.
 * Licensed under LICENSE.md. See NOTICE.md for full attribution.
 */

const workbox = require('workbox-build');
const fs = require('fs');
const path = require('path');
const packageJson = require('../package.json');
const root = path.resolve(__dirname, '..');
const output = path.join(root, 'pages-dist');

if (!fs.existsSync(path.join(output, 'index.html'))) {
	throw new Error('Missing Pages build. Run scripts/build_pages.js before generating the PWA.');
}

// Keep the public social-card URL stable while using the official project icon.
// Social crawlers do not execute the application JavaScript.
fs.copyFileSync(
	path.join(root, 'assets/icon.png'),
	path.join(output, 'assets/social-preview.png')
);

// This file deliberately stays out of the precache. An already-installed
// version must be able to ask the server which build is currently deployed.
fs.writeFileSync(
	path.join(output, 'assets/update.json'),
	JSON.stringify({version: packageJson.version}) + '\n'
);

workbox.generateSW({
	cacheId: 'paintdotjs',
	// Normal updates remain waiting until the user accepts the update prompt.
	// The targeted migration below only activates immediately when it detects
	// the broken built-in-assets release in the existing precache.
	skipWaiting: false,
	clientsClaim: false,
	cleanupOutdatedCaches: true,
	// v is used by index.html to force an old worker to fetch the current
	// bootstrap. The current worker may ignore it so deployed PWAs stay offline.
	ignoreURLParametersMatching: [/^utm_/, /^fbclid$/, /^v$/],
	globDirectory: output,
	globPatterns: [
		'./index.html',

		'./build/web/**/*',
		'./css/**/*',
		'./assets/**/*',
		'./font/*',
		'./run/test.png',
	],
	globIgnores: ['./assets/update.json'],
	swDest: path.join(output, 'service_worker.js'),
	// The image codec is deliberately lazy-loaded, but must still be available
	// to installed/offline PWAs once it has shipped with the app.
	maximumFileSizeToCacheInBytes: 20_000_000,
	sourcemap: false
}).then(({count, size}) => {
	let serviceWorkerPath = path.join(output, 'service_worker.js');
	let generatedServiceWorker = fs.readFileSync(serviceWorkerPath, 'utf8');
	let assetPackDetection = `
// Detect the broken web asset guard before Workbox updates the existing cache.
let paintDotJsAssetRecoveryCache = 'pdj-asset-recovery';
let paintDotJsAssetRecoveryMarker = new Request(new URL('/.paintdotjs-migrations/built-in-assets-v2', self.location.origin));
self.addEventListener('install', event => {
	event.waitUntil((async () => {
		await caches.delete('paintdotjs-migration-state');
		await caches.delete(paintDotJsAssetRecoveryCache);
		let cacheNames = await caches.keys();
		for (let cacheName of cacheNames) {
			let cache = await caches.open(cacheName);
			let requests = await cache.keys();
			for (let request of requests) {
				let pathname = new URL(request.url).pathname;
				if (!pathname.endsWith('/build/web/app.bundle.js')) {
					continue;
				}

				let response = await cache.match(request);
				if (response === undefined) {
					continue;
				}

				let source = await response.text();
				let isBrokenAssetRelease = source.includes('This paint.js checkout is missing its built-in asset pack.')
					&& !source.includes('paintDotJsBundledWebAssets');
				if (!isBrokenAssetRelease) {
					continue;
				}

				let recoveryCache = await caches.open(paintDotJsAssetRecoveryCache);
				await recoveryCache.put(paintDotJsAssetRecoveryMarker, new Response('pending'));
				await self.skipWaiting();
				return;
			}
		}
	})());
});
`;
	let assetPackMigration = `

// Reload only clients whose existing precache contained the broken release.
self.addEventListener('activate', event => {
	event.waitUntil((async () => {
		let recoveryCache = await caches.open(paintDotJsAssetRecoveryCache);
		if (!await recoveryCache.match(paintDotJsAssetRecoveryMarker)) {
			await caches.delete(paintDotJsAssetRecoveryCache);
			return;
		}

		await caches.delete(paintDotJsAssetRecoveryCache);
		await self.clients.claim();
		let windowClients = await self.clients.matchAll({type: 'window', includeUncontrolled: true});
		await Promise.all(windowClients.map(client => client.navigate(client.url)));
	})());
});
`;
	fs.writeFileSync(serviceWorkerPath, assetPackDetection + generatedServiceWorker + assetPackMigration);
	console.log(`Generated service-worker, which will precache ${count} files, totaling ${(size/1e6).toFixed(2)} MB.`);
});
