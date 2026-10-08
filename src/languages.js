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

import en from '../assets/lang/en.json';
import manifest from '../assets/lang/languages.json';

const codes = manifest.locales.filter(code => typeof code === 'string');

const findSupportedCode = requested => {
    if (!requested) {
        return null;
    }
    const normalized = requested.replace('_', '-');
    return codes.find(code => code.toLowerCase() === normalized.toLowerCase())
        || codes.find(code => code.split('-')[0].toLowerCase() === normalized.split('-')[0].toLowerCase())
        || null;
};

let preference = 'auto';
try {
    preference = JSON.parse(localStorage.getItem('paintdotjs.settings.v1') || '{}').ui?.language || 'auto';
} catch (_) {
    // Use the browser language when local storage is unavailable.
}

const requestedCode = preference === 'auto' ? navigator.language : preference;
const selectedCode = findSupportedCode(requestedCode) || 'en';

const loadLanguage = code => {
    if (code === 'en') {
        return en;
    }
    try {
        // Loading one small local dictionary synchronously keeps i18n available
        // to the classic source scripts that execute immediately after bundle.js.
        const request = new XMLHttpRequest();
        const url = new URL(`assets/lang/${encodeURIComponent(code)}.json`, document.baseURI);
        request.open('GET', url.href, false);
        request.send();
        if ((request.status >= 200 && request.status < 300)
            || (request.status === 0 && request.responseText)) {
            return JSON.parse(request.responseText);
        }
    } catch (error) {
        console.warn(`Could not load the ${code} language; using English.`, error);
    }
    return en;
};

const selectedData = loadLanguage(selectedCode);
const resolve = (object, path) => {
    let current = object;
    for (const segment of path.split('.')) {
        if (current === null || typeof current !== 'object' || current[segment] === undefined) {
            return undefined;
        }
        current = current[segment];
    }
    return current;
};

window.i18n = function (path, variables) {
    let translation = resolve(Language.data, path) ?? resolve(en, path) ?? path;
    if (variables) {
        if (!Array.isArray(variables)) {
            variables = [variables];
        }
        for (let i = 0; i < variables.length; i++) {
            translation = translation.split('{' + i + '}').join(variables[i]);
        }
    }
    return translation;
};

const displayNames = typeof Intl.DisplayNames === 'function'
    ? new Intl.DisplayNames([navigator.language || 'en'], {type: 'language'})
    : null;

window.Language = {
    data: selectedData,
    fallbackData: en,
    code: selectedData === en && selectedCode !== 'en' ? 'en' : selectedCode,
    preference,
    options: Object.fromEntries(codes.map(code => [code, displayNames?.of(code) || code])),
    toString: () => Language.code
};

document.documentElement.lang = Language.code;
document.documentElement.dir = ['ar', 'fa', 'he', 'ur'].includes(Language.code.split('-')[0]) ? 'rtl' : 'ltr';
