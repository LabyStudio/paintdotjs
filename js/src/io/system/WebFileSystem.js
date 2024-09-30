class WebFileSystem extends FileSystem {

    getTempDirectory() {
        return File.of("temp");
    }

}