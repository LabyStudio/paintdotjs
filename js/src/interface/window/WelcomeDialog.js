class WelcomeDialog {

    static open(force = false) {
        if (WelcomeDialog.instance !== null || (!force && WelcomeDialog.isDismissed())) {
            return;
        }

        WelcomeDialog.instance = new WelcomeDialog();
        WelcomeDialog.instance.show();
    }

    static isDismissed() {
        try {
            return localStorage.getItem(WelcomeDialog.storageKey) === "true";
        } catch (_) {
            return false;
        }
    }

    constructor() {
        this.backdrop = null;
        this.dialog = null;
        this.dontShowAgain = null;
        this.dialogMover = null;
        this.previousFocus = null;
        this.onKeyDown = event => {
            if (event.key === "Escape") {
                event.preventDefault();
                this.close();
            }
        };
    }

    show() {
        this.previousFocus = document.activeElement;

        this.backdrop = document.createElement("div");
        this.backdrop.className = "app-dialog-backdrop welcome-dialog-backdrop";
        if (isApp) {
            this.backdrop.classList.add("dialog-backdrop-app");
        }

        this.dialog = document.createElement("section");
        this.dialog.className = "app-dialog welcome-dialog";
        this.dialog.setAttribute("role", "dialog");
        this.dialog.setAttribute("aria-modal", "true");
        this.dialog.setAttribute("aria-labelledby", "welcome-dialog-title");
        this.dialog.tabIndex = -1;

        const titleBar = document.createElement("header");
        titleBar.className = "app-dialog-title-bar welcome-dialog-title-bar";

        const titleGroup = document.createElement("div");
        titleGroup.className = "app-dialog-title welcome-dialog-title-group";
        const icon = document.createElement("img");
        icon.src = "assets/icon.png";
        icon.alt = "";
        const title = document.createElement("strong");
        title.id = "welcome-dialog-title";
        title.textContent = "Welcome to paint.js";
        titleGroup.append(icon, title);

        const close = document.createElement("button");
        close.type = "button";
        close.className = "app-dialog-close welcome-dialog-close";
        close.textContent = "×";
        close.title = "Close";
        close.setAttribute("aria-label", "Close welcome window");
        close.onclick = () => this.close();
        titleBar.append(titleGroup, close);

        const content = document.createElement("div");
        content.className = "welcome-dialog-content";

        const intro = document.createElement("p");
        intro.className = "welcome-dialog-intro";
        intro.textContent = "paint.js is an experimental JavaScript port of Paint.NET, built to explore bringing a desktop-style raster image editor to any operating system and the web.";

        const proofOfConcept = document.createElement("section");
        proofOfConcept.className = "welcome-dialog-section";
        const proofTitle = document.createElement("h2");
        proofTitle.textContent = "Proof of concept";
        const proofText = document.createElement("p");
        proofText.textContent = "This is an independent, unofficial project under active development. Features may be incomplete, change without notice, or behave differently from the original application.";
        proofOfConcept.append(proofTitle, proofText);

        const compatibility = document.createElement("div");
        compatibility.className = "welcome-dialog-notice";
        const compatibilityTitle = document.createElement("strong");
        compatibilityTitle.textContent = "Browser compatibility";
        const compatibilityText = document.createElement("span");
        compatibilityText.textContent = "This build is currently optimized only for Google Chrome on desktop computers. Mobile and other browsers are not officially supported yet.";
        compatibility.append(compatibilityTitle, compatibilityText);

        const credits = document.createElement("section");
        credits.className = "welcome-dialog-section welcome-dialog-credits";
        const creditsTitle = document.createElement("h2");
        creditsTitle.textContent = "Credits";
        const creditsText = document.createElement("p");
        creditsText.append("Paint.NET was created by ", this.createLink("Rick Brewster", "https://www.getpaint.net/"), ". All credit for the original application, its design, and its concepts goes to Rick Brewster and the Paint.NET contributors. paint.js is not affiliated with or endorsed by Paint.NET.");
        const links = document.createElement("p");
        links.className = "welcome-dialog-links";
        links.append(
            this.createLink("Visit the original Paint.NET website", "https://www.getpaint.net/"),
            document.createTextNode("  •  "),
            this.createLink("View the paint.js source", "https://github.com/LabyStudio/paintdotjs")
        );
        credits.append(creditsTitle, creditsText, links);

        content.append(intro, proofOfConcept, compatibility, credits);

        const footer = document.createElement("footer");
        footer.className = "app-dialog-footer welcome-dialog-footer";

        const preference = document.createElement("label");
        preference.className = "welcome-dialog-preference";
        this.dontShowAgain = document.createElement("input");
        this.dontShowAgain.type = "checkbox";
        preference.append(this.dontShowAgain, document.createTextNode("Don't show this again"));

        const continueButton = document.createElement("button");
        continueButton.type = "button";
        continueButton.className = "welcome-dialog-continue";
        continueButton.textContent = "Continue";
        continueButton.onclick = () => this.close();
        footer.append(preference, continueButton);

        this.dialog.append(titleBar, content, footer);
        this.backdrop.appendChild(this.dialog);
        document.body.appendChild(this.backdrop);
        this.dialogMover = new DialogMover(this.dialog, titleBar, this.backdrop);
        document.addEventListener("keydown", this.onKeyDown, true);
        continueButton.focus();
    }

    createLink(label, href) {
        const link = document.createElement("a");
        link.href = href;
        link.target = "_blank";
        link.rel = "noopener noreferrer";
        link.textContent = label;
        return link;
    }

    close() {
        if (this.backdrop === null) {
            return;
        }

        if (this.dontShowAgain !== null && this.dontShowAgain.checked) {
            try {
                localStorage.setItem(WelcomeDialog.storageKey, "true");
            } catch (_) {
                // Storage is optional; the dialog can still be closed normally.
            }
        }

        document.removeEventListener("keydown", this.onKeyDown, true);
        if (this.dialogMover !== null) {
            this.dialogMover.destroy();
            this.dialogMover = null;
        }
        this.backdrop.remove();
        this.backdrop = null;
        this.dialog = null;
        this.dontShowAgain = null;
        WelcomeDialog.instance = null;

        if (this.previousFocus !== null && typeof this.previousFocus.focus === "function") {
            this.previousFocus.focus();
        }
    }
}

WelcomeDialog.storageKey = "paintdotjs.welcome.dismissed";
WelcomeDialog.instance = null;
