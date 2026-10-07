const {BrowserWindow, app} = require('electron');
const crypto = require('node:crypto');
const fs = require('node:fs');
const fsp = require('node:fs/promises');
const path = require('node:path');
const {downloadArchive: downloadVerifiedArchive, extractArchive} = require('../../../scripts/asset_archive');
const {installAssets} = require('../../../scripts/install_desktop_assets');

const packageJson = require('../../../package.json');
const assetManifestPath = app.isPackaged
    ? path.join(process.resourcesPath, 'desktop', 'asset-manifest.json')
    : path.join(app.getAppPath(), 'desktop-resources', 'asset-manifest.json');
const assetManifest = JSON.parse(fs.readFileSync(assetManifestPath, 'utf8'));
const paintDotNetVersion = packageJson.paintdotjs.paintDotNetVersion;
const paintDotNetSha256 = packageJson.paintdotjs.paintDotNetSha256;
const downloadUrl = `https://github.com/paintdotnet/release/releases/download/v${paintDotNetVersion}/paint.net.${paintDotNetVersion}.portable.x64.zip`;

function validAssetDirectory(directory) {
    try {
        const marker = JSON.parse(fs.readFileSync(path.join(directory, '.paintdotjs-assets.json'), 'utf8'));
        const hash = filename => crypto.createHash('sha256').update(fs.readFileSync(filename)).digest('hex');
        return marker.paintDotNetVersion === paintDotNetVersion
            && hash(path.join(directory, 'icon.png')) === assetManifest.icons.png
            && hash(path.join(directory, 'icon.ico')) === assetManifest.icons.ico
            && fs.existsSync(path.join(directory, 'lang', 'en.json'))
            && fs.existsSync(path.join(directory, 'icons', 'menu_file_open_icon.png'));
    } catch (_) {
        return false;
    }
}

function developmentAssets() {
    const directory = path.join(app.getAppPath(), 'assets');
    return validAssetDirectory(directory) ? directory : null;
}

function findInstalledAssets() {
    const external = process.env.PAINTDOTJS_ASSETS_DIR;
    if (external && validAssetDirectory(external)) return path.resolve(external);
    if (!app.isPackaged) return developmentAssets();
    const bundled = path.join(process.resourcesPath, 'assets');
    if (validAssetDirectory(bundled)) return bundled;
    const userAssets = path.join(app.getPath('userData'), 'assets');
    return validAssetDirectory(userAssets) ? userAssets : null;
}

function createSetupWindow() {
    const window = new BrowserWindow({
        width: 520,
        height: 310,
        resizable: false,
        maximizable: false,
        minimizable: false,
        show: false,
        title: 'Setting up paint.js',
        backgroundColor: '#15181f',
        webPreferences: {sandbox: true}
    });
    const html = `<!doctype html><meta charset="utf-8"><title>Setting up paint.js</title>
        <style>body{margin:0;background:#15181f;color:#eef3fb;font:15px system-ui;display:grid;place-items:center;height:100vh}
        main{width:420px}h1{font-size:24px;margin:0 0 14px}p{color:#b9c2d0;line-height:1.5}
        progress{width:100%;height:14px;margin-top:12px;accent-color:#24c8db}#status{font-size:13px}</style>
        <main><h1>Finishing installation</h1><p>paint.js downloads the required artwork and translations directly from the official Paint.NET release. They are stored only on this computer.</p>
        <progress id="progress" max="100"></progress><p id="status">Connecting…</p></main>`;
    window.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(html)}`);
    window.once('ready-to-show', () => window.show());
    return window;
}

function updateSetupWindow(window, percent, status) {
    if (!window || window.isDestroyed()) return;
    const script = `document.querySelector('progress').value=${Number(percent) || 0};document.querySelector('#status').textContent=${JSON.stringify(status)}`;
    void window.webContents.executeJavaScript(script).catch(() => {});
    window.setProgressBar(Math.max(0, Math.min(1, percent / 100)));
}

async function downloadArchive(destination, setupWindow) {
    return downloadVerifiedArchive({
        url: downloadUrl,
        destination,
        expectedSha256: paintDotNetSha256,
        onProgress: ({downloaded, total}) => {
            const percent = total ? Math.min(85, Math.round(downloaded / total * 85)) : 20;
            updateSetupWindow(setupWindow, percent, `Downloading official assets… ${Math.round(downloaded / 1024 / 1024)} MB`);
        }
    });
}

async function installDownloadedAssets() {
    const setupWindow = createSetupWindow();
    await fsp.mkdir(app.getPath('userData'), {recursive: true});
    const temporaryRoot = await fsp.mkdtemp(path.join(app.getPath('userData'), '.asset-install-'));
    const archive = path.join(temporaryRoot, 'paintdotnet.zip');
    const extracted = path.join(temporaryRoot, 'source');
    const generated = path.join(temporaryRoot, 'assets');
    const destination = path.join(app.getPath('userData'), 'assets');
    try {
        await downloadArchive(archive, setupWindow);
        updateSetupWindow(setupWindow, 88, 'Extracting official archive…');
        await extractArchive(archive, extracted);
        updateSetupWindow(setupWindow, 94, 'Installing artwork and translations…');
        installAssets({
            source: extracted,
            output: generated,
            manifestPath: path.join(process.resourcesPath, 'desktop', 'asset-manifest.json')
        });
        await fsp.rm(destination, {recursive: true, force: true});
        await fsp.mkdir(path.dirname(destination), {recursive: true});
        await fsp.rename(generated, destination);
        updateSetupWindow(setupWindow, 100, 'Installation complete');
        return destination;
    } finally {
        if (!setupWindow.isDestroyed()) setupWindow.close();
        await fsp.rm(temporaryRoot, {recursive: true, force: true});
    }
}

async function ensureDesktopAssets() {
    const existing = findInstalledAssets();
    if (existing) return existing;
    if (!app.isPackaged) throw new Error('Run npm run check-assets before starting the desktop app.');
    return installDownloadedAssets();
}

module.exports = {downloadUrl, ensureDesktopAssets, findInstalledAssets, paintDotNetVersion};
