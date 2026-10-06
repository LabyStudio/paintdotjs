class HelpMenu extends DropMenuItem {

    constructor() {
        const open = url => window.open(url, "_blank", "noopener,noreferrer");
        super("menu.help", [
            new DropEntry("menu.help.helpTopics", () => open("https://www.getpaint.net/doc/latest/index.html")),
            new DropEntry("menu.help.pdnWebsite", () => open("https://www.getpaint.net/")),
            new DropEntry("menu.help.pdnSearch", () => open("https://www.google.com/search?q=site%3Agetpaint.net+Paint.NET")),
            new VerticalSeparator(),
            new DropEntry("menu.help.donate", () => open("https://www.getpaint.net/donate.html")),
            new DropEntry("menu.help.forum", () => open("https://forums.getpaint.net/")),
            new DropEntry("menu.help.tutorials", () => open("https://forums.getpaint.net/forum/20-publishing-only/")),
            new DropEntry("menu.help.plugins", null),
            new DropEntry("menu.help.sendFeedback", () => open("https://github.com/LabyStudio/paintdotjs/issues")),
            new VerticalSeparator(),
            new DropEntry("menu.help.about", () => WelcomeDialog.open(true))
        ]);
        ActionRegistry.registerCallback(
            "menu.help",
            () => {
                if (this.isOpen()) this.close();
                else this.open();
            },
            "Help",
            () => this.isInitialized(),
            "Alt+H"
        );
    }

    buildElement() {
        const element = document.createElement("div");
        element.className = "menu-item clickable icon-item help-menu-button";
        element.id = this.id;
        const icon = document.createElement("img");
        icon.className = "icon";
        icon.src = "assets/icons/menu_help_icon.png";
        icon.title = this.getText();
        element.appendChild(icon);
        return element;
    }
}
