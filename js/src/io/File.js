class File {

    constructor(...path) {
        if (!(this instanceof WebFile || this instanceof AppFile)) {
            throw new Error("Use File.create() to create an instance.");
        }

        let segments = [];
        let relative = false
        for (let i = 0; i < path.length; i++) {
            let segment = path[i];
            if (segment instanceof File) {
                for (let s of segment.getSegments()) {
                    segments.push(s);
                }
                if (i === 0) {
                    relative = segment.isRelative();
                }
            } else {
                let segmentString = String(segment);
                let parts = segmentString.split("/");
                for (let part of parts) {
                    if (part.length > 0) {
                        segments.push(part);
                    }
                }
                if (i === 0) {
                    relative = segmentString.length > 0 && segmentString[0] !== "/";
                }
            }
        }
        this.relative = relative;
        this.segments = segments;
    }

    getSegments() {
        return this.segments;
    }

    isRelative() {
        return this.relative;
    }

    getPath() {
        return (this.relative ? "" : "/") + this.segments.join("/");
    }

    async exists() {
        throw new Error("Not implemented");
    }

    async write(data) {
        throw new Error("Not implemented");
    }

    async read() {
        throw new Error("Not implemented");
    }

    getParent() {
        if (this.segments.length === 0) {
            return null;
        }
        let parentSegments = this.segments.slice(0, this.segments.length - 1);
        return File.of(...parentSegments);
    }

    getName() {
        if (this.segments.length === 0) {
            return "";
        }
        return this.segments[this.segments.length - 1];
    }

    static of(...path) {
        return isApp ? new AppFile(...path) : new WebFile(...path);
    }

}