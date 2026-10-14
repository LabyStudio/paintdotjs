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
	// This release replaces the separately downloaded assets with a built-in
	// pack. Activate it immediately so an older worker cannot keep serving the
	// obsolete asset guard and app shell.
	skipWaiting: true,
	clientsClaim: true,
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
	let assetPackMigration = `

// One-time recovery for clients controlled by the pre-2.2 asset worker.
let paintDotJsHadPreviousWorker = self.registration.active !== null;
self.addEventListener('activate', event => {
	event.waitUntil((async () => {
		if (!paintDotJsHadPreviousWorker) {
			return;
		}

		let migrationCache = await caches.open('paintdotjs-migration-state');
		let marker = new Request(new URL('/.paintdotjs-migrations/built-in-assets-v1', self.location.origin));
		if (await migrationCache.match(marker)) {
			return;
		}

		await migrationCache.put(marker, new Response('complete'));
		await self.clients.claim();
		let windowClients = await self.clients.matchAll({type: 'window', includeUncontrolled: true});
		await Promise.all(windowClients.map(client => client.navigate(client.url)));
	})());
});
`;
	fs.appendFileSync(serviceWorkerPath, assetPackMigration);
	console.log(`Generated service-worker, which will precache ${count} files, totaling ${(size/1e6).toFixed(2)} MB.`);
});
