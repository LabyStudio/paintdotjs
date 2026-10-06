window.app = new AppWorkspace();
app.initialize();
app.createBlankDocumentInNewWorkspace(800, 600);
DocumentIO.initialize(app);

if (!new URLSearchParams(window.location.search).has("skipWelcome")) {
    WelcomeDialog.open();
}
