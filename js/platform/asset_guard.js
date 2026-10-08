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

(function checkRequiredAssets() {
    const assetUrl = new URL('assets/lang/en.json', document.baseURI);
    let assetsReady = false;

    try {
        const request = new XMLHttpRequest();
        request.open('GET', assetUrl.href, false);
        request.send();
        assetsReady = (request.status >= 200 && request.status < 300)
            || (request.status === 0 && request.responseText.length > 0);
    } catch (_) {
        assetsReady = false;
    }

    window.paintDotJsAssetsReady = assetsReady;
    if (assetsReady) return;

    const showSetupMessage = () => {
        const content = document.getElementById('content');
        const overlay = document.getElementById('windowOverlay');
        if (content !== null) content.remove();
        if (overlay !== null) overlay.remove();

        const page = document.createElement('main');
        page.className = 'missing-assets-page';

        const dialog = document.createElement('section');
        dialog.className = 'missing-assets-dialog';

        const title = document.createElement('h1');
        title.textContent = 'Required assets are missing';

        const explanation = document.createElement('p');
        explanation.textContent = 'This paint.js checkout has not prepared the Paint.NET assets yet.';

        const instruction = document.createElement('p');
        instruction.textContent = 'Run this command from the project directory, then reload the page:';

        const command = document.createElement('code');
        command.textContent = 'npm run check-assets';

        const note = document.createElement('p');
        note.className = 'missing-assets-note';
        note.textContent = 'The assets are downloaded separately because they cannot be included in the repository.';

        dialog.append(title, explanation, instruction, command, note);
        page.appendChild(dialog);
        document.body.appendChild(page);
    };

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', showSetupMessage, {once: true});
    } else {
        showSetupMessage();
    }
})();
