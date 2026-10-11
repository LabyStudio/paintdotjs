#!/usr/bin/env node

const fs = require('node:fs');
const path = require('node:path');

const projectDirectory = path.resolve(__dirname, '..');
const packageMetadata = require(path.join(projectDirectory, 'package.json'));
const templatePath = path.join(__dirname, 'net.paintjs.Paintjs.metainfo.xml.in');
const outputPath = path.join(__dirname, 'net.paintjs.Paintjs.metainfo.xml');
const sourceDateEpoch = Number(process.env.SOURCE_DATE_EPOCH);

if (!Number.isInteger(sourceDateEpoch) || sourceDateEpoch < 0) {
    throw new Error('SOURCE_DATE_EPOCH must contain a non-negative Unix timestamp');
}

const repositoryUrl = packageMetadata.repository.url.replace(/\.git$/, '').replace(/\/$/, '');
const releaseDate = new Date(sourceDateEpoch * 1000).toISOString().slice(0, 10);
const releaseUrl = `${repositoryUrl}/releases/tag/v${packageMetadata.version}`;
const release = [
    `    <release version="${packageMetadata.version}" date="${releaseDate}">`,
    `      <url type="details">${releaseUrl}</url>`,
    '    </release>'
].join('\n');
const template = fs.readFileSync(templatePath, 'utf8');

if (!template.includes('@RELEASE@')) {
    throw new Error(`Release placeholder not found in ${templatePath}`);
}

fs.writeFileSync(outputPath, template.replace('@RELEASE@', release));
console.log(`Generated Flatpak metadata for ${packageMetadata.version} (${releaseDate})`);
