class Matrix {
    constructor() {
        // Initialize matrix values as an identity matrix (default state)
        this.values = [
            [1, 0, 0],
            [0, 1, 0],
            [0, 0, 1]
        ];
    }

    // Check if the matrix is an identity matrix
    isIdentity() {
        return this._isEqual(this.values, [
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

        const result = this._multiplyMatrices(this.values, matrix.values);

        if (order === MatrixOrder.APPEND) {
            this.values = result;
        } else if (order === MatrixOrder.PREPEND) {
            this.values = this._multiplyMatrices(matrix.values, this.values);
        } else {
            throw new Error("Invalid order. Use 'append' or 'prepend'.");
        }
    }

    translate(x, y, order) {
        const translationMatrix = new Matrix();
        translationMatrix.values = [
            [1, 0, x],
            [0, 1, y],
            [0, 0, 1]
        ];

        this.multiply(translationMatrix, order);
    }

    // Reset to identity matrix
    reset() {
        this.values = [
            [1, 0, 0],
            [0, 1, 0],
            [0, 0, 1]
        ];
    }

    // Dispose the matrix
    dispose() {
        this.values = null;
    }

    // Clone the matrix
    clone() {
        const clonedMatrix = new Matrix();
        clonedMatrix.values = this.values.map(row => [...row]);
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