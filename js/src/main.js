window.app = new AppWorkspace();
app.initialize();
app.performAction(new NewFileAction());

let mainView = app.getActiveDocumentWorkspace();
mainView.debugName = "Main";

// Draw test image to background
let img = new Image();
img.src = "run/test.png";
img.onload = () => {
    let document = mainView.getDocument();
    document.getLayers().getAt(0).getSurface().context.drawImage(
        img,
        0, 0, 1920, 1017
    );
    document.invalidate();
};

app.performAction(new NewFileAction());

let secondaryView = app.getActiveDocumentWorkspace();
secondaryView.debugName = "Secondary";

app.setActiveDocumentWorkspace(mainView);


mainView.executeFunction(new SelectAllFunction());

let mainSelection = mainView.getSelection();
console.log(mainSelection.getBounds().toString())