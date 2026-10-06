const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const output = path.join(root, 'pages-dist');
const requiredPaths = [
    'index.html',
    'bundle.js',
    'service_worker.js',
    'assets',
    'css',
    'js',
    'lib',
    'run/test.png',
];

fs.rmSync(output, { recursive: true, force: true });
fs.mkdirSync(output, { recursive: true });

for (const relativePath of requiredPaths) {
    const source = path.join(root, relativePath);
    if (!fs.existsSync(source)) {
        throw new Error(`Missing required Pages asset: ${relativePath}`);
    }

    const destination = path.join(output, relativePath);
    fs.mkdirSync(path.dirname(destination), { recursive: true });
    fs.cpSync(source, destination, { recursive: true });
}

for (const filename of fs.readdirSync(root)) {
    if (/^workbox-[a-f0-9]+\.js$/.test(filename)) {
        fs.copyFileSync(path.join(root, filename), path.join(output, filename));
    } else if (/^\d+\.bundle\.js$/.test(filename)) {
        fs.copyFileSync(path.join(root, filename), path.join(output, filename));
    }
}

// GitHub Pages should serve files exactly as generated, including underscore paths.
fs.writeFileSync(path.join(output, '.nojekyll'), '');

console.log(`Prepared GitHub Pages artifact in ${path.relative(root, output)}/`);
