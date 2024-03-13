class UpdateScansContext {

    constructor(document, region) {
        this.document = document;
        this.region = region;
    }

    update(renderArgs) {
        this.document.renderRegion(renderArgs, this.region);
    }

}