class FileSystem {

    static _platform = null;

    getTempDirectory() {
        throw new Error("Not implemented");
    }

    async getTempFile() {
        let tempDirectory = this.getTempDirectory();
        for (let i = 0; i < 100; i++) {
            let ordinal = Math.floor(Math.random() * 1000000);
            let file = File.of(tempDirectory, ordinal);
            if (!await file.exists()) {
                return file;
            }
        }
        throw new Error("Failed to get temp file");
    }

    static getPlatform() {
        if (FileSystem._platform === null) {
            FileSystem._platform = isApp ? new AppFileSystem() : new WebFileSystem();
        }
        return FileSystem._platform;
    }

}