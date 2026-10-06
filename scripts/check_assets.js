const fs = require('fs');
const path = require('path');

const projectRoot = path.resolve(__dirname, '..');
const requiredAssets = [
    'assets/icon.png',
    'assets/lang/en.json',
    'assets/lang/languages.json',
    'assets/icons/menu_file_new_icon.png',
    'assets/images/pdn_banner_logo_dark.png'
];

const missingAssets = requiredAssets.filter(relativePath => {
    return !fs.existsSync(path.join(projectRoot, relativePath));
});

if (missingAssets.length > 0) {
    console.error([
        '',
        'Required Paint.NET assets are missing.',
        '',
        'This usually means the asset download step was skipped after cloning paint.js.',
        'Run this command from the project directory:',
        '',
        '  python3 scripts/download_assets.py',
        '',
        'Then start paint.js again.',
        '',
        'Missing files:',
        ...missingAssets.map(relativePath => '  - ' + relativePath),
        ''
    ].join('\n'));
    process.exit(1);
}
