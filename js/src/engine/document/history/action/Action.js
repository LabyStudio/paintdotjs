class Action {

    constructor(
        actionId,
        nameTranslationId,
        descriptionTranslationId,
        shortcutKeyCombo
    ) {
        this.actionId = actionId;
        this.nameTranslationId = nameTranslationId;
        this.descriptionTranslationId = descriptionTranslationId;
        this.shortcutKey = ShortcutKey.fromCombo(shortcutKeyCombo);
    }

    runPerformAction() {
        throw new Error("No action implementation provided for " + this.getActionId());
    }

    createIconItem() {
        let item = new IconItem(this.getActionId(), () => {
            this.runPerformAction();
        });
        item.withTranslationKey(this.getDescriptionTranslationId());
        return item;
    }

    createDropEntry() {
        let item = new DropEntry(this.getActionId(), () => {
            this.runPerformAction();
        });
        item.withTranslationKey(this.getNameTranslationId());
        return item;
    }

    getActionId() {
        return this.actionId;
    }

    getNameTranslationId() {
        return this.nameTranslationId;
    }

    getDescriptionTranslationId() {
        return this.descriptionTranslationId;
    }

    getShortcutKey() {
        return this.shortcutKey;
    }

}