class BitmapEffectAction extends DocumentWorkspaceAction {

    constructor(definition, shortcut = null) {
        super(
            definition.actionId || "adjustment." + definition.id,
            definition.translationKey || definition.id + ".name",
            null,
            shortcut
        );
        this.definition = definition;
    }

    async performAction(documentWorkspace) {
        const layer = documentWorkspace.getActiveLayer();
        if (!(layer instanceof BitmapLayer)) return null;

        const app = documentWorkspace.getApp();
        const layerIndex = documentWorkspace.getActiveLayerIndex();
        const surface = layer.getSurface();
        const source = surface.context.getImageData(0, 0, surface.getWidth(), surface.getHeight());
        const memento = new BitmapHistoryMemento(
            i18n(this.definition.translationKey || this.definition.id + ".name"),
            "assets/icons/" + this.definition.icon,
            documentWorkspace,
            layerIndex
        );
        const apply = values => {
            const pixels = values === null ? source : BitmapEffectEngine.apply(
                source, surface.getWidth(), surface.getHeight(), this.definition, values,
                documentWorkspace.getSelection()
            );
            surface.context.putImageData(pixels, 0, 0);
            layer.invalidate();
        };

        if (this.definition.controls.length === 0) {
            apply({});
            return memento;
        }

        const values = await EffectConfigDialog.open({
            title: this.definition.dialogTitle
                || i18n(this.definition.translationKey || this.definition.id + ".name"),
            icon: "assets/icons/" + this.definition.icon,
            layout: this.definition.dialog,
            controls: this.definition.controls,
            values: BitmapEffectEngine.defaults(this.definition),
            source,
            onPreview: apply
        });
        if (values === null) {
            apply(null);
            return null;
        }
        apply(values);
        app.fire("document:effect_applied", this.definition.id);
        return memento;
    }

    isActionExecutable(documentWorkspace) {
        return documentWorkspace.getActiveLayer() instanceof BitmapLayer;
    }
}
