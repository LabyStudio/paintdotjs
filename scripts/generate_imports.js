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

function getSortedPositionIndex(list, item) {
    let sortedList = list.slice();
    sortedList.push(item);
    sortedList.sort();
    let indexInSorted = sortedList.indexOf(item);
    let itemAboveInOriginal = sortedList[indexInSorted - 1];
    return list.indexOf(itemAboveInOriginal) + 1;
}

walk(srcDir);

files.forEach(file => {
    const relativePath = path.relative(srcDir, file);
    imports.push(`<script src="${srcDir}${relativePath}"></script>`.replaceAll('\\', '/'));
});

const index = fs.readFileSync(indexFile, 'utf8').replaceAll('\r\n', '\n');
const start = '<!-- Sources$start -->';
const end = '<!-- Sources$end -->';

const startIndex = index.indexOf(start) + start.length;
const endIndex = index.indexOf(end);

let prevImports = index.substring(startIndex, endIndex).split('\n');
const newImports = imports.filter(i => !prevImports.includes(i));

prevImports = prevImports.filter(i => imports.includes(i));

let mergedImports = prevImports.slice();
for (let item of newImports) {
    let index = getSortedPositionIndex(mergedImports, item);
    mergedImports.splice(index, 0, item); // Add the new import in sorted order
}

const newContent = index.substring(0, startIndex) + '\n'
    + mergedImports.join('\n') + (mergedImports.length === 0 ? '' : '\n')
    + index.substring(endIndex);
fs.writeFileSync(indexFile, newContent);