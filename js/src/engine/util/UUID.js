class UUID {

    constructor(mostSigBits, leastSigBits) {
        this.mostSigBits = BigInt(mostSigBits);
        this.leastSigBits = BigInt(leastSigBits);
    }

    toString() {
        return this.mostSigBits.toString(16).padStart(16, '0') + "-" +
            this.leastSigBits.toString(16).padStart(16, '0');
    }

    static randomUUID() {
        let mostSigBits = BigInt(Math.floor(Math.random() * Number.MAX_SAFE_INTEGER));
        let leastSigBits = BigInt(Math.floor(Math.random() * Number.MAX_SAFE_INTEGER));
        return new UUID(mostSigBits, leastSigBits);
    }
}