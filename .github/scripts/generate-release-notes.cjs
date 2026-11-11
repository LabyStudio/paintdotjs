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

'use strict';

const fs = require('fs');
const {execFileSync} = require('child_process');

const [, , commitRange, changelogUrl, outputPath = 'release-notes.md'] = process.argv;
const repository = process.env.GITHUB_REPOSITORY;
const token = process.env.GITHUB_TOKEN;

if (!commitRange || !changelogUrl) {
    throw new Error('Usage: generate-release-notes.cjs <commit-range> <changelog-url> [output]');
}

function readCommits() {
    let output = execFileSync(
        'git',
        [
            'log',
            '--reverse',
            '--no-merges',
            '--format=%H%x1f%h%x1f%s%x1f%B%x1e',
            commitRange
        ],
        {encoding: 'utf8'}
    );

    return output
        .split('\x1e')
        .map(record => record.trim())
        .filter(Boolean)
        .map(record => {
            let [sha, shortSha, subject, message] = record.split('\x1f');
            return {sha, shortSha, subject, message};
        });
}

function findReferences(text) {
    let references = new Set();
    let pattern = /#([1-9]\d*)/g;
    let match;

    while ((match = pattern.exec(text)) !== null) {
        references.add(Number(match[1]));
    }

    return references;
}

async function findPullRequests(sha) {
    if (!repository) {
        return [];
    }

    let headers = {
        Accept: 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28'
    };
    if (token) {
        headers.Authorization = `Bearer ${token}`;
    }

    let response = await fetch(
        `https://api.github.com/repos/${repository}/commits/${sha}/pulls`,
        {headers}
    );
    if (!response.ok) {
        console.warn(`Could not find pull requests for ${sha}: ${response.status}`);
        return [];
    }

    return response.json();
}

function issueUrl(number) {
    return `https://github.com/${repository}/issues/${number}`;
}

function linkSubject(subject, references) {
    return subject.replace(/#([1-9]\d*)/g, (match, value) => {
        let number = Number(value);
        let url = references.get(number);
        return url ? `[#${number}](${url})` : match;
    });
}

async function formatCommit(commit) {
    let pullRequests = await findPullRequests(commit.sha);
    let subjectReferences = findReferences(commit.subject);
    let references = new Map();

    for (let number of findReferences(commit.message)) {
        references.set(number, issueUrl(number));
    }

    for (let pullRequest of pullRequests) {
        references.set(pullRequest.number, pullRequest.html_url);

        let pullRequestText = `${pullRequest.title || ''}\n${pullRequest.body || ''}`;
        for (let number of findReferences(pullRequestText)) {
            if (!references.has(number)) {
                references.set(number, issueUrl(number));
            }
        }
    }

    let links = [];
    for (let pullRequest of pullRequests) {
        if (!subjectReferences.has(pullRequest.number)) {
            links.push(`[#${pullRequest.number}](${pullRequest.html_url})`);
        }
    }

    for (let [number, url] of references) {
        let isPullRequest = pullRequests.some(pullRequest => pullRequest.number === number);
        if (!isPullRequest && !subjectReferences.has(number)) {
            links.push(`[#${number}](${url})`);
        }
    }

    let suffix = links.length > 0 ? ` (${links.join(', ')})` : '';
    return `- ${linkSubject(commit.subject, references)}${suffix} (\`${commit.shortSha}\`)`;
}

async function main() {
    let lines = [];
    for (let commit of readCommits()) {
        lines.push(await formatCommit(commit));
    }

    let notes = [
        '## What changed',
        '',
        ...lines,
        '',
        `**Full Changelog**: ${changelogUrl}`,
        ''
    ].join('\n');
    fs.writeFileSync(outputPath, notes);
}

main().catch(error => {
    console.error(error);
    process.exitCode = 1;
});
