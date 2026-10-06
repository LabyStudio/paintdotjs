import './languages'
import {deserialize as deserializeNrbf} from 'ms-nrbf-js'

let portableImageCodecPromise = null;
const getPortableImageCodec = () => {
    if (portableImageCodecPromise === null) portableImageCodecPromise = import('./portableImageCodec');
    return portableImageCodecPromise;
};

window.portableImageCodec = {
    decode: (...args) => getPortableImageCodec().then(codec => codec.decode(...args)),
    encode: (...args) => getPortableImageCodec().then(codec => codec.encode(...args))
};

window.PDJVERSION = PDJVERSION;
window.Nrbf = {
    deserialize: deserializeNrbf
};
