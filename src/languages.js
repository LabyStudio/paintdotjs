import en from '../assets/lang/en.json';

const data = {
    en: en,
};

window.i18n = function (path, variables) {
    let segments = path.split('.');

    function resolve(object, segments) {
        if (segments.length === 0) {
            return object;
        }

        let current = segments.shift();
        if (object[current] === undefined) {
            return path;
        }

        return resolve(object[current], segments);
    }

    let translation = resolve(Language.data, segments);
    if (variables) {
        if (!Array.isArray(variables)) {
            variables = [variables];
        }

        for (let i = 0; i < variables.length; i++) {
            translation = translation.replace('{' + i + '}', variables[i]);
        }
    }
    return translation;
}

window.Language = {
    data: {},
    code: 'en',
    options: {
        en: 'English',
    },
    toString: () => Language.code
}


// Get language code
let code = navigator.language.replace(/-\w+/, '');
if (code && Language.options[code]) {
    Language.code = code
}

Language.data = data[Language.code];