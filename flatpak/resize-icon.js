const fs = require('fs');
const {
    ImageMagick,
    MagickFormat,
    initializeImageMagick
} = require('@imagemagick/magick-wasm');

const [input, output] = process.argv.slice(2);

if (!input || !output) {
    throw new Error('Usage: node resize-icon.js INPUT OUTPUT');
}

initializeImageMagick(fs.readFileSync(require.resolve('@imagemagick/magick-wasm/magick.wasm')))
    .then(() => ImageMagick.read(fs.readFileSync(input), MagickFormat.Png, image => {
        image.resize(512, 512);
        image.write(MagickFormat.Png, data => fs.writeFileSync(output, data));
    }));
