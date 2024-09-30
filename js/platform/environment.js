const isApp = typeof require !== 'undefined';
const windowTop = () => document.getElementsByTagName("header")[0].getClientRects()[0].y;

const setTitle = (string) => {
    document.getElementById('title').innerHTML = string;
}

const loadScript = (path) => {
    document.write('<script src="' + path + '"></script>');
}

loadScript(isApp ? './js/platform/desktop/desktop.js' : './js/platform/web/web.js');