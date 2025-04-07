class Matrix {
    constructor() {
        // Initialize matrix values as an identity matrix (default state)
        this.elements = [
            [1, 0, 0],
            [0, 1, 0],
            [0, 0, 1]
        ];
    }

    // Check if the matrix is an identity matrix
    isIdentity() {
        return this._isEqual(this.elements, [
            [1, 0, 0],
            [0, 1, 0],
            [0, 0, 1]
        ]);
    }

    // Multiply this matrix with another matrix
    multiply(matrix, order = MatrixOrder.APPEND) {
        if (!(matrix instanceof Matrix)) {
            throw new Error("Input must be an instance of Matrix");
        }

        if (order === MatrixOrder.APPEND) {
            this.elements = this._multiplyMatrices(matrix.elements, this.elements);
        } else if (order === MatrixOrder.PREPEND) {
            this.elements = this._multiplyMatrices(this.elements, matrix.elements);
        } else {
            throw new Error("Invalid order. Use 'append' or 'prepend'.");
        }
    }

    translate(x, y, order) {
        const translationMatrix = new Matrix();
        translationMatrix.elements = [
            [1, 0, x],
            [0, 1, y],
            [0, 0, 1]
        ];

        this.multiply(translationMatrix, order);
    }

    scale(x, y, order) {
        const scaleMatrix = new Matrix();
        scaleMatrix.elements = [
            [x, 0, 0],
            [0, y, 0],
            [0, 0, 1]
        ];

        this.multiply(scaleMatrix, order);
    }

    transformPoints(points) {
        if (!Array.isArray(points)) {
            throw new Error("Input must be an array of points");
        }

        for (let i = 0; i < points.length; i++) {
            const point = points[i];
            const x = point.x;
            const y = point.y;

            point.x = this.elements[0][0] * x + this.elements[0][1] * y + this.elements[0][2];
            point.y = this.elements[1][0] * x + this.elements[1][1] * y + this.elements[1][2];
        }
    }

    transformVectors(vectors) {
        if (!Array.isArray(vectors)) {
            throw new Error("Input must be an array of vectors");
        }

        for (let i = 0; i < vectors.length; i++) {
            const vector = vectors[i];
            const x = vector.x;
            const y = vector.y;

            vector.x = this.elements[0][0] * x + this.elements[0][1] * y;
            vector.y = this.elements[1][0] * x + this.elements[1][1] * y;
        }
    }

    rotateAt(angle, point, order) {
        const rotationMatrix = new Matrix();
        const cos = Math.cos(angle);
        const sin = Math.sin(angle);

        let x = point.x;
        let y = point.y;

        rotationMatrix.elements = [
            [cos, -sin, x - x * cos + y * sin],
            [sin, cos, y - x * sin - y * cos],
            [0, 0, 1]
        ];

        this.multiply(rotationMatrix, order);
    }

    getElements() {
        return this.elements;
    }

    // Reset to identity matrix
    reset() {
        this.elements = [
            [1, 0, 0],
            [0, 1, 0],
            [0, 0, 1]
        ];
    }

    // Dispose the matrix
    dispose() {
        this.elements = null;
    }

    // Clone the matrix
    clone() {
        const clonedMatrix = new Matrix();
        clonedMatrix.elements = this.elements.map(row => [...row]);
        return clonedMatrix;
    }

    // Private helper to multiply two matrices
    _multiplyMatrices(a, b) {
        const result = Array.from({length: 3}, () => Array(3).fill(0));

        for (let i = 0; i < 3; i++) {
            for (let j = 0; j < 3; j++) {
                for (let k = 0; k < 3; k++) {
                    result[i][j] += a[i][k] * b[k][j];
                }
            }
        }

        return result;
    }

    // Private helper to check if two matrices are equal
    _isEqual(a, b) {
        for (let i = 0; i < 3; i++) {
            for (let j = 0; j < 3; j++) {
                if (a[i][j] !== b[i][j]) {
                    return false;
                }
            }
        }
        return true;
    }
}