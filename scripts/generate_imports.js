const fs = require('fs');
const path = require('path');

const srcDir = './js/src/';
const indexFile = './index.html';

const files = [];
const imports = [];

function walk(dir) {
    fs.readdirSync(dir).forEach(file => {
        const filePath = path.join(dir, file);
        const stat = fs.statSync(filePath);
        if (stat.isDirectory()) {
            walk(filePath);
        } else {
            if (file.endsWith('.js')) {
                files.push(filePath);
            }
        }
    });
}

walk(srcDir);

files.forEach(file => {
    const relativePath = path.relative(srcDir, file);
    imports.push(`<script src="${srcDir}${relativePath}"></script>`);
});

const index = fs.readFileSync(indexFile, 'utf8');
const start = '<!-- Sources$start -->';
const end = '<!-- Sources$end -->';

const startIndex = index.indexOf(start) + start.length;
const endIndex = index.indexOf(end);

let prevImports = index.substring(startIndex, endIndex).split('\n');
const newImports = imports.filter(i => !prevImports.includes(i));

prevImports = prevImports.filter(i => imports.includes(i));

const newContent = index.substring(0, startIndex) + '\n'
    + prevImports.join('\n') + (prevImports.length === 0 ? '' : '\n')
    + newImports.join('\n') + (newImports.length === 0 ? '' : '\n')
    + index.substring(endIndex);
fs.writeFileSync(indexFile, newContent);