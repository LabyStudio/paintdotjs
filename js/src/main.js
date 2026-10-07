if (window.paintDotJsAssetsReady !== false) {
    FontManager.initialize();
    window.app = new AppWorkspace();
    ErrorForm.install();
    app.initialize();
    DocumentIO.initialize(app);

    const skipWelcome = new URLSearchParams(window.location.search).has("skipWelcome");
    if (!(isApp && skipWelcome)) app.createBlankDocumentInNewWorkspace(800, 600, 96, true);
    if (!skipWelcome) {
        WelcomeDialog.open();
    }
}
