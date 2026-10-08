/*
 * paint.js, an unofficial JavaScript port of Paint.NET 3.36.7
 *
 * Original Paint.NET source:
 * Copyright (C) dotPDN LLC, Rick Brewster, and contributors.
 *
 * JavaScript port and port-specific changes:
 * Copyright (C) 2024-present LabyStudio.
 * https://github.com/LabyStudio
 *
 * The interface design and behavior target Paint.NET 5.1.12+.
 * Licensed under LICENSE.md. See NOTICE.md for full attribution.
 */

class ProjectInfoDialog {

    constructor(welcome) {
        this.welcome = welcome;
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
        this.backdrop.className = "app-dialog-backdrop project-info-dialog-backdrop";
        if (isApp) this.backdrop.classList.add("dialog-backdrop-app");

        this.dialog = document.createElement("section");
        this.dialog.className = "app-dialog project-info-dialog";
        this.dialog.classList.add(this.welcome ? "project-info-welcome" : "project-info-about");
        this.dialog.setAttribute("role", "dialog");
        this.dialog.setAttribute("aria-modal", "true");
        this.dialog.setAttribute("aria-labelledby", "project-info-dialog-title");
        this.dialog.tabIndex = -1;

        const titleBar = this.createTitleBar();
        const content = document.createElement("div");
        content.className = "project-info-dialog-content";
        content.append(this.createBanner(), this.createProjectInformation());
        const footer = this.createFooter();

        this.dialog.append(titleBar, content, footer);
        this.backdrop.appendChild(this.dialog);
        document.body.appendChild(this.backdrop);
        this.dialogMover = new DialogMover(this.dialog, titleBar, this.backdrop);
        document.addEventListener("keydown", this.onKeyDown, true);
        footer.querySelector("button").focus();
    }

    createTitleBar() {
        const titleBar = document.createElement("header");
        titleBar.className = "app-dialog-title-bar project-info-dialog-title-bar";
        const titleGroup = document.createElement("div");
        titleGroup.className = "app-dialog-title";
        const icon = document.createElement("img");
        icon.src = "assets/icons/menu_help_about_icon.png";
        icon.alt = "";
        const title = document.createElement("strong");
        title.id = "project-info-dialog-title";
        title.textContent = this.welcome ? "Welcome to paint.js" : "About paint.js";
        titleGroup.append(icon, title);

        const close = document.createElement("button");
        close.type = "button";
        close.className = "app-dialog-close";
        close.textContent = "×";
        close.title = "Close";
        close.setAttribute("aria-label", "Close " + (this.welcome ? "welcome" : "about") + " window");
        close.onclick = () => this.close();
        titleBar.append(titleGroup, close);
        return titleBar;
    }

    createBanner() {
        const banner = document.createElement("div");
        banner.className = "project-info-banner";
        banner.setAttribute("aria-label", "paint.js");
        const artwork = document.createElement("div");
        artwork.className = "project-info-banner-artwork";
        const icon = document.createElement("img");
        icon.src = "assets/icon.png";
        icon.alt = "";
        const wordmark = document.createElement("span");
        wordmark.textContent = "paint.js";
        artwork.append(icon, wordmark);
        banner.appendChild(artwork);
        return banner;
    }

    createProjectInformation() {
        const information = document.createElement("div");
        information.className = "project-info-copy project-info-summary-copy";

        const heading = document.createElement("div");
        heading.className = "project-info-summary-heading";
        const version = document.createElement("strong");
        version.textContent = "Version " + PdjInfo.version();
        const tagline = document.createElement("span");
        tagline.textContent = "An unofficial Paint.NET port for Linux, macOS, and the web";
        heading.append(version, tagline);

        const details = document.createElement("div");
        details.className = "project-info-summary-details";
        const project = document.createElement("section");
        const projectHeading = document.createElement("h3");
        projectHeading.textContent = "Why porting it to the web?";
        const projectCopy = document.createElement("p");
        projectCopy.append(
            "Paint.NET is one of the best image editors available on Windows, combining powerful features with a simple, intuitive interface. After switching to Linux, it became the application I missed most and one I had relied on every day.",
            document.createElement("br"),
            document.createElement("br"),
            "I have been developing paint.js since February 2024, with the goal of bringing that familiar editing experience to Linux, macOS, and the web."
        );
        const contact = this.createLink("contact@paintjs.net", "mailto:contact@paintjs.net");
        contact.className = "project-info-detail-contact";

        project.append(projectHeading, projectCopy, contact);
        details.append(project);

        const credits = document.createElement("p");
        credits.className = "project-info-highlight-credit";
        const creditsLabel = document.createElement("strong");
        creditsLabel.textContent = "Credits: ";
        credits.append(
            creditsLabel,
            "Paint.NET was created by ",
            this.createLink("Rick Brewster", "https://www.getpaint.net/"),
            ". All credit for the original application, its design, concepts, and behavior belongs to him and the Paint.NET contributors.",
            document.createElement("br"),
            document.createElement("br"),
            "The port paint.js by ",
            this.createLink("LabyStudio", "https://github.com/LabyStudio"),
            " is unofficial and is not affiliated with or endorsed by Paint.NET."
        );

        const links = document.createElement("div");
        links.className = "project-info-links project-info-summary-links";
        links.append(
            this.createLink("Downloads", "https://github.com/LabyStudio/paintdotjs/releases"),
            this.createLink("Source code", "https://github.com/LabyStudio/paintdotjs"),
            this.createLink("Report a problem", "https://github.com/LabyStudio/paintdotjs/issues")
        );

        information.append(heading, credits, details, links);
        return information;
    }

    createFooter() {
        const footer = document.createElement("footer");
        footer.className = "app-dialog-footer project-info-dialog-footer";
        if (this.welcome) {
            const preference = document.createElement("label");
            preference.className = "project-info-preference";
            this.dontShowAgain = document.createElement("input");
            this.dontShowAgain.type = "checkbox";
            preference.append(this.dontShowAgain, document.createTextNode("Don't show this again"));
            footer.appendChild(preference);
        }

        const button = document.createElement("button");
        button.type = "button";
        button.className = "project-info-primary-button";
        button.textContent = this.welcome ? "Continue" : "Close";
        button.onclick = () => this.close();
        footer.appendChild(button);
        return footer;
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
        if (this.backdrop === null) return;
        if (this.welcome && this.dontShowAgain !== null && this.dontShowAgain.checked) {
            try {
                localStorage.setItem(WelcomeDialog.storageKey, "true");
            } catch (_) {
                // Local storage is optional; closing the window must always work.
            }
        }

        document.removeEventListener("keydown", this.onKeyDown, true);
        if (this.dialogMover !== null) this.dialogMover.destroy();
        this.backdrop.remove();
        this.backdrop = null;
        this.dialog = null;
        this.dialogMover = null;
        this.dontShowAgain = null;
        ProjectInfoDialog.instance = null;
        if (this.previousFocus !== null && typeof this.previousFocus.focus === "function") {
            this.previousFocus.focus();
        }
    }
}

ProjectInfoDialog.instance = null;

class WelcomeDialog {

    static open(force = false) {
        //if (ProjectInfoDialog.instance !== null || (!force && this.isDismissed())) return;
        ProjectInfoDialog.instance = new ProjectInfoDialog(true);
        ProjectInfoDialog.instance.show();
    }

    static isDismissed() {
        try {
            return localStorage.getItem(this.storageKey) === "true";
        } catch (_) {
            return false;
        }
    }
}

WelcomeDialog.storageKey = "paintdotjs.welcome.dismissed";

class AboutDialog {

    static open() {
        if (ProjectInfoDialog.instance !== null) return;
        ProjectInfoDialog.instance = new ProjectInfoDialog(false);
        ProjectInfoDialog.instance.show();
    }
}
