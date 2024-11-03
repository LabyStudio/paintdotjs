class CompoundHistoryMemento extends HistoryMemento {

    constructor(name, image, actions) {
        super(name, image);

        this.actions = actions;
    }

    push(action) {
        this.actions.push(action);
    }

    onUndo() {
        let mementos = [];

        for (let i = this.actions.length - 1; i >= 0; i--) {
            let action = this.actions[i];
            let memento = action.performUndo();

            if (memento !== null) {
                mementos.push(memento);
            }
        }

        return new CompoundHistoryMemento(
            this.name,
            this.image,
            mementos
        );
    }

}