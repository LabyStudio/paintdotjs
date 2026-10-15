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

class PluginBrowserDialog {

    static instance = null;

    static open() {
        if (this.instance) {
            this.instance.panel.search.focus();
            return;
        }
        this.instance = new PluginBrowserDialog();
    }

    constructor() {
        this.previousFocus = document.activeElement;
        this.backdrop = document.createElement("div");
        this.backdrop.className = "app-dialog-backdrop plugin-browser-backdrop";
        if (isApp) {
            this.backdrop.classList.add("dialog-backdrop-app");
        }
        document.body.appendChild(this.backdrop);
        let dialog = document.createElement("section");
        dialog.className = "app-dialog plugin-browser-dialog";
        dialog.setAttribute("role", "dialog");
        dialog.setAttribute("aria-modal", "true");
        dialog.setAttribute("aria-labelledby", "plugin-browser-title");
        this.backdrop.appendChild(dialog);
        let titleBar;
        {
            // Title bar
            titleBar = document.createElement("header");
            titleBar.className = "app-dialog-title-bar";
            dialog.appendChild(titleBar);
            {
                let title = document.createElement("strong");
                title.id = "plugin-browser-title";
                title.textContent = "Browse plugins";
                titleBar.appendChild(title);
                let close = document.createElement("button");
                close.type = "button";
                close.className = "app-dialog-close";
                close.textContent = "×";
                close.setAttribute("aria-label", "Close plugin browser");
                close.onclick = () => this.close();
                titleBar.appendChild(close);
            }
            // Catalog
            let content = document.createElement("div");
            content.className = "plugin-browser-content";
            dialog.appendChild(content);
            this.panel = new PluginCatalogPanel(content, message => { this.panel.message.textContent = message; });
        }
        this.mover = new DialogMover(dialog, titleBar, this.backdrop);
        this.onKeyDown = event => {
            let backdrops = document.querySelectorAll(".app-dialog-backdrop");
            if (backdrops[backdrops.length - 1] !== this.backdrop) {
                return;
            }
            if (event.key === "Escape") {
                event.preventDefault();
                event.stopImmediatePropagation();
                this.close();
            } else if (event.key === "Tab") {
                let controls = Array.from(dialog.querySelectorAll("button:not(:disabled), input, a[href]"));
                let first = controls[0], last = controls[controls.length - 1];
                if (event.shiftKey && document.activeElement === first) {
                    event.preventDefault();
                    last.focus();
                } else if (!event.shiftKey && document.activeElement === last) {
                    event.preventDefault();
                    first.focus();
                }
            }
        };
        document.addEventListener("keydown", this.onKeyDown, true);
        this.panel.search.focus();
        void this.panel.load();
    }

    close() {
        document.removeEventListener("keydown", this.onKeyDown, true);
        this.mover.destroy();
        this.backdrop.remove();
        PluginBrowserDialog.instance = null;
        if (this.previousFocus?.isConnected) {
            this.previousFocus.focus();
        }
    }
}
