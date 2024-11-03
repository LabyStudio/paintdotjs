class HistoryForm extends Form {

    constructor() {
        super("historyForm");

        this.historyListItem = null;
        this.stripPanel = null;

        this.scrollSession = new ScrollSession();

        this.app.on("document:history_changed", (documentWorkspace) => {
            this.reinitialize();
        });
    }

    initializeDefaultPosition(window) {
        let viewBounds = this.app.getViewBounds();
        window.setSize(180, 200);
        window.setPosition(
            viewBounds.getRight() - window.getWidth() - 20,
            85
        );
    }

    postInitialize() {
        super.postInitialize();

        this.historyListItem.postInitialize();
        this.historyListItem.scrollToSelected();
    }

    buildContent() {
        let element = super.buildContent();
        element.id = "historyForm";

        // Layer list
        this.historyListItem = new ScrollList("historyList", this.scrollSession);
        this.historyListItem.setScrollSpeed(0.4);
        this.historyListItem.setSelectCallback((item) => {
            let activeDocumentWorkspace = this.app.getActiveDocumentWorkspace();
            if (activeDocumentWorkspace !== null) {
                let history = activeDocumentWorkspace.getHistory();
                history.stepTo(item.getMemento());
            }
        });
        {
            let selectedItem = null;

            let activeDocumentWorkspace = this.app.getActiveDocumentWorkspace();
            if (activeDocumentWorkspace !== null) {
                let history = activeDocumentWorkspace.getHistory();

                // Undo stack
                let undoStack = history.getUndoStack();
                for (let i = 0; i < undoStack.length; i++) {
                    let memento = undoStack[i];
                    let item = new HistoryMementoItem(ItemType.UNDO, memento);
                    this.historyListItem.add(item);

                    selectedItem = item;
                }

                // Redo stack
                let redoStack = history.getRedoStack();
                for (let i = 0; i < redoStack.length; i++) {
                    let memento = redoStack[i];
                    let item = new HistoryMementoItem(ItemType.REDO, memento);
                    this.historyListItem.add(item);
                }
            }

            this.historyListItem.setSelected(selectedItem, true);
        }
        this.historyListItem.appendTo(element, this);

        // Footer strip panel
        this.stripPanel = new StripPanel("historyStripPanel", {
            items: [
                this.create("undo", "undoButton", (documentWorkspace) => {
                    documentWorkspace.performAction(new HistoryUndoAction());
                }),
                this.create("redo", "redoButton", (documentWorkspace) => {
                    documentWorkspace.performAction(new HistoryRedoAction());
                })
            ]
        });
        this.stripPanel.appendTo(element, this);

        this.updateActionEnabledStates();

        return element;
    }

    updateActionEnabledStates() {
        let activeDocumentWorkspace = app.getActiveDocumentWorkspace();
        if (activeDocumentWorkspace !== null) {
            let history = activeDocumentWorkspace.getHistory();
            let undoStack = history.getUndoStack();
            let redoStack = history.getRedoStack();

            this.stripPanel.get("menu.edit.undo").setEnabled(undoStack.length > 1);
            this.stripPanel.get("menu.edit.redo").setEnabled(redoStack.length > 0);
        }
    }

    create(id, toolTip, callback) {
        let item = new IconItem("menu.edit." + id, () => {
            let activeDocumentWorkspace = this.app.getActiveDocumentWorkspace();
            if (activeDocumentWorkspace !== null && item.isEnabled()) {
                callback(activeDocumentWorkspace);
            }
        });
        item.setEnabled(false);
        item.withTranslationKey("historyForm." + toolTip + ".toolTipText");
        return item;
    }
}