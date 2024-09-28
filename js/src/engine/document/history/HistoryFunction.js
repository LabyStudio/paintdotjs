class HistoryFunction {

    constructor() {
        this.executed = false;
    }

    onExecute(documentWorkspace) {
        throw new Error("Not implemented");
    }

    execute(documentWorkspace) {
        if (this.executed) {
            throw new Error("Already executed this HistoryFunction");
        }

        // Execute the function
        let memento = this.onExecute(documentWorkspace);
        this.executed = true;

        return memento;
    }

}