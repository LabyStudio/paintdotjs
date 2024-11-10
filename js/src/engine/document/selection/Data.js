class Data {

    constructor() {
        this.basePath = new GraphicsPath();
        this.continuation = new GraphicsPath();
        this.continuationCombineMode = CombineMode.XOR;
        this.cumulativeTransform = new Matrix();
        this.cumulativeTransform.reset();
        this.interimTransform = new Matrix();
        this.interimTransform.reset();
    }

    clone() {
        let clone = new Data();
        clone.basePath = this.basePath.clone();
        clone.continuation = this.continuation.clone();
        clone.continuationCombineMode = this.continuationCombineMode;
        clone.cumulativeTransform = this.cumulativeTransform.clone();
        clone.interimTransform = this.interimTransform.clone();
        return clone;
    }

    dispose() {
        if (this.basePath !== null) {
            this.basePath.dispose();
            this.basePath = null;
        }

        if (this.continuation !== null) {
            this.continuation.dispose();
            this.continuation = null;
        }

        if (this.cumulativeTransform !== null) {
            this.cumulativeTransform.dispose();
            this.cumulativeTransform = null;
        }

        if (this.interimTransform !== null) {
            this.interimTransform.dispose();
            this.interimTransform = null;
        }
    }
}