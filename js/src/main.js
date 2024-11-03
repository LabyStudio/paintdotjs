window.app = new AppWorkspace();
app.initialize();
app.performAction(new NewImageAction());

// Draw test image to background
let img = new Image();
img.src = "run/test.png";
img.onload = () => {
    let documentView = app.getActiveDocumentWorkspace();
    documentView.debugName = "Main";
    documentView.getDocument().getLayers().getAt(0).getSurface().context.drawImage(
        img,
        0, 0, 1920, 1017
    );
};

app.performAction(new NewImageAction());

let documentView = app.getActiveDocumentWorkspace();
documentView.debugName = "Secondary";