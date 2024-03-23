window.app = new AppWorkspace();
app.initialize();
let documentView = app.createBlankDocumentInNewWorkspace(1920, 1017);

// Draw test image to background
let img = new Image();
img.src = "run/test.png";
img.onload = () => {
    documentView.document.layers.layers[0].surface.context.drawImage(
        img,
        0, 0, 1920, 1017
    );
};