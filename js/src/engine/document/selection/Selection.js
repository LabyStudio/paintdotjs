class Selection {

    constructor() {
        this.data = new Data();
        this.depth = 0;

        this.changing = new EventHandler();
        this.changed = new EventHandler();
    }

    performChanging() {
        // TODO notify?
    }

    performChanged() {
        // TODO notify?
    }

    push() {
        // On changing
        if (this.depth === 0) {
            this.changing.fire(this);
        }
        this.depth++;
    }

    reset() {
        this.push();
        this.data.basePath.dispose();
        this.data.basePath = new GraphicsPath();
        this.data.continuation.dispose();
        this.data.continuation = new GraphicsPath();
        this.data.cumulativeTransform.reset();
        this.data.interimTransform.reset();
        this.pop();
    }

    resetContinuation() {
        this.push();
        this.commitInterimTransform();
        this.resetCumulativeTransform();
        this.data.continuation.reset();
        this.pop();
    }

    setContinuationPath(path, combineMode) {
        if (!this.data.basePath.isEmpty()) {
            throw new Error("base path must be empty to use this overload of SetContinuation");
        }

        this.push();
        this.commitInterimTransform();
        this.resetCumulativeTransform();
        this.data.continuationCombineMode = combineMode;
        this.data.continuation.dispose();
        this.data.continuation = path;
        this.pop();
    }

    setContinuationPoints(points, combineMode) {
        this.push();

        this.commitInterimTransform();
        this.resetCumulativeTransform();
        this.data.continuationCombineMode = combineMode;
        this.data.continuation.reset();
        this.data.continuation.addLines(points);
        this.pop();
    }

    setContinuation(rectangle, combineMode) {
        this.push();
        this.commitInterimTransform();
        this.resetCumulativeTransform();
        this.data.continuationCombineMode = combineMode;
        this.data.continuation.reset();
        this.data.continuation.addRectangle(rectangle);
        this.pop();
    }

    commitContinuation() {
        this.push();
        this.data.continuation.closeAllFigures();
        let newBasePath = this.createPath();
        this.data.basePath.dispose();
        this.data.basePath = newBasePath;
        this.data.continuation.reset();
        this.data.continuationCombineMode = CombineMode.XOR;
        this.pop();
    }

    commitInterimTransform() {
        if (!this.data.interimTransform.isIdentity()) {
            this.push();
            this.data.basePath.transform(this.data.interimTransform);
            this.data.continuation.transform(this.data.interimTransform);
            this.data.cumulativeTransform.multiply(this.data.interimTransform, MatrixOrder.APPEND);
            this.data.interimTransform.reset();
            this.pop();
        }
    }

    resetCumulativeTransform() {
        if (this.data.cumulativeTransform === null) {
            this.data.cumulativeTransform = new Matrix();
        }
        this.data.cumulativeTransform.reset();
    }

    pop() {
        // On changed
        if (this.depth === 0) {
            throw new Error("Cannot pop selection when depth is 0");
        }
        this.depth--;
        if (this.depth === 0) {
            this.changed.fire(this);
        }
    }

    createPath(applyInterimTransform = true) {
        let returnPath = GraphicsPath.combine(
            this.data.basePath,
            this.data.continuationCombineMode,
            this.data.continuation
        );
        if (applyInterimTransform) {
            returnPath.transform(this.data.interimTransform);
        }
        return returnPath;
    }

    save() {
        return this.data.clone();
    }

    restore(state) {
        this.push();
        this.data.dispose();
        this.data = state.clone();
        this.pop();
    }

    getBounds(applyInterimTransformation = true) {
        let path = this.createPath(applyInterimTransformation);
        return path.getBounds();
    }

    isEmpty() {
        return this.data.basePath.isEmpty() && this.data.continuation.isEmpty();
    }

    getInterimTransform() {
        return this.data.interimTransform;
    }

    getInterimTransformCopy() {
        if (this.data.interimTransform === null) {
            let m = new Matrix();
            m.reset();
            return m;
        } else {
            return this.data.interimTransform.clone();
        }
    }

    getCumulativeTransformCopy() {
        if (this.data.cumulativeTransform === null) {
            let m = new Matrix();
            m.reset();
            return m;
        } else {
            return this.data.cumulativeTransform.clone();
        }
    }

    setInterimTransform(matrix) {
        this.push();
        this.data.interimTransform.dispose();
        this.data.interimTransform = matrix.clone();
        this.pop();
    }

}