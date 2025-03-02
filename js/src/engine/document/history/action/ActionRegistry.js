class ActionRegistry {

    static {
        this.actions = new Map();
    }

    static initialize() {
        // File
        this.register(new NewFileAction());

        // Edit
        this.register(new HistoryUndoAction());
        this.register(new HistoryRedoAction());

        // Layer
        this.register(new AddNewLayerAction());
        this.register(new DeleteLayerAction());
        this.register(new DuplicateLayerAction());
        this.register(new MergeLayerDownAction());
        this.register(new LayerPropertiesAction());
        this.register(new ToggleLayerVisibilityAction());

        this.register(new MoveLayerToTopAction());
        this.register(new MoveActiveLayerUpAction());
        this.register(new MoveActiveLayerDownAction());
        this.register(new MoveLayerToBottomAction());

    }

    static register(action) {
        this.actions.set(action.getActionId(), action);
    }

    static get(actionId) {
        let action = this.actions.get(actionId);
        return action !== undefined ? action : null;
    }

    static getActions() {
        return this.actions;
    }
}