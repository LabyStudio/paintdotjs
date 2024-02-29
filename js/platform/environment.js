const isApp = typeof require !== 'undefined';
const windowTop = () => document.getElementsByTagName("header")[0].getClientRects()[0].y;