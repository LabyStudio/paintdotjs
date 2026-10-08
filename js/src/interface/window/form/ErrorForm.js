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

class ErrorForm extends Form {

    constructor(report) {
        super("errorForm");
        this.report = report;
        this.copyButton = null;
        this.saveButton = null;
        this.ignoreButton = null;
        this.saveStatus = null;
    }

    getTitle() {
        return "paint.js Error";
    }

    initializeDefault(window) {
        const width = Math.min(680, Math.max(360, document.documentElement.clientWidth - 40));
        const height = Math.min(460, Math.max(260, document.documentElement.clientHeight - 80));
        window.setSize(width, height);
        window.setAnchor(0.5, 0.5);
    }

    postInitialize() {
        if (this.ignoreButton !== null) {
            requestAnimationFrame(() => this.ignoreButton.focus());
        }
    }

    buildContent() {
        const root = document.createElement("div");
        root.className = "error-form";

        const content = document.createElement("div");
        content.className = "error-form-content";

        const heading = document.createElement("strong");
        heading.className = "error-form-heading";
        heading.textContent = "paint.js encountered an unexpected error.";

        const explanation = document.createElement("p");
        explanation.className = "error-form-explanation";
        explanation.textContent = "You can ignore this error and continue working. Some actions may not have completed.";

        const source = document.createElement("div");
        source.className = "error-form-source";
        source.textContent = this.report.source;

        const errorLabel = document.createElement("label");
        errorLabel.textContent = "Error";
        const message = document.createElement("pre");
        message.className = "error-form-message";
        message.textContent = this.report.message;

        const stackLabel = document.createElement("label");
        stackLabel.textContent = "Stack trace";
        const stack = document.createElement("pre");
        stack.className = "error-form-stack";
        stack.textContent = this.report.stack || "No stack trace is available.";

        content.append(heading, explanation, source, errorLabel, message, stackLabel, stack);

        const footer = document.createElement("div");
        footer.className = "error-form-footer";
        this.saveStatus = document.createElement("span");
        this.saveStatus.className = "error-form-save-status";
        this.saveStatus.setAttribute("role", "status");

        const actions = document.createElement("div");
        actions.className = "error-form-actions";
        this.copyButton = document.createElement("button");
        this.copyButton.type = "button";
        this.copyButton.textContent = "Copy Error";
        this.copyButton.onclick = () => this.copyError();
        this.saveButton = document.createElement("button");
        this.saveButton.type = "button";
        this.saveButton.textContent = "Save All";
        this.saveButton.disabled = this.app.getDocumentWorkspaces().length === 0;
        this.saveButton.onclick = () => this.saveAll();
        this.ignoreButton = document.createElement("button");
        this.ignoreButton.type = "button";
        this.ignoreButton.textContent = "Ignore";
        this.ignoreButton.onclick = () => this.ignore();
        actions.append(this.saveButton, this.ignoreButton);
        footer.append(this.copyButton, this.saveStatus, actions);

        root.append(content, footer);
        return root;
    }

    ignore() {
        if (this.window !== null && this.window.isOpen()) this.window.close();
    }

    async copyError() {
        const text = [
            "paint.js Error",
            "Source: " + this.report.source,
            "Error: " + this.report.message,
            "Stack trace:",
            this.report.stack || "No stack trace is available."
        ].join("\n\n");
        try {
            if (navigator.clipboard !== undefined && typeof navigator.clipboard.writeText === "function") {
                await navigator.clipboard.writeText(text);
            } else {
                const textarea = document.createElement("textarea");
                textarea.value = text;
                textarea.style.position = "fixed";
                textarea.style.opacity = "0";
                document.body.appendChild(textarea);
                textarea.select();
                const copied = document.execCommand("copy");
                textarea.remove();
                if (!copied) throw new Error("The browser rejected the clipboard request.");
            }
            this.saveStatus.textContent = "Error copied to clipboard.";
        } catch (error) {
            this.saveStatus.textContent = "Could not copy the error: " + (error.message || String(error));
        }
    }

    async saveAll() {
        if (this.saveButton === null || this.saveButton.disabled) return;
        this.saveButton.disabled = true;
        this.saveStatus.textContent = "Saving…";
        try {
            const documentCount = this.app.getDocumentWorkspaces().length;
            const saved = await DocumentIO.saveAll(true);
            this.saveStatus.textContent = saved
                ? `${documentCount} image${documentCount === 1 ? "" : "s"} saved. Check the selected folder or Downloads.`
                : "Saving stopped or was canceled.";
        } catch (error) {
            ErrorForm.report(error, "Could not save all images");
        } finally {
            if (this.saveButton !== null && this.saveButton.isConnected) {
                this.saveButton.disabled = this.app.getDocumentWorkspaces().length === 0;
            }
        }
    }

    static install() {
        if (this.installed) return;
        this.installed = true;
        this.originalConsoleError = console.error.bind(console);

        console.error = (...args) => {
            this.originalConsoleError(...args);
            this.show(this.fromConsoleArguments(args, "Console error"));
        };

        window.addEventListener("error", event => {
            this.report(event.error || event.message, "Uncaught error");
            event.preventDefault();
        });
        window.addEventListener("unhandledrejection", event => {
            this.report(event.reason, "Unhandled promise rejection");
            event.preventDefault();
        });
    }

    static report(error, source = "Application error") {
        if (this.originalConsoleError !== null) this.originalConsoleError(error);
        this.show(this.fromError(error, source));
    }

    static show(report) {
        if (this.showing) return;
        const fingerprint = report.message + "\n" + report.stack;
        const now = Date.now();
        if (fingerprint === this.lastFingerprint && now - this.lastReportTime < 1000) return;
        this.lastFingerprint = fingerprint;
        this.lastReportTime = now;

        this.showing = true;
        try {
            if (this.instance !== null && this.instance.getWindow().isOpen()) {
                this.instance.report = report;
                this.instance.initialize(this.instance.getWindow());
                this.instance.postInitialize();
                return;
            }

            const form = new ErrorForm(report);
            const errorWindow = new WebWindow();
            form.initialize(errorWindow);
            form.initializeDefault(errorWindow);
            errorWindow.create();
            form.postInitialize();
            this.instance = form;
        } catch (formError) {
            if (this.originalConsoleError !== null) {
                this.originalConsoleError("Could not display the error form", formError, report);
            }
        } finally {
            this.showing = false;
        }
    }

    static fromConsoleArguments(args, source) {
        const errors = args.filter(value => value instanceof Error);
        const message = args.map(value => this.stringify(value)).join(" ") || "Unknown console error";
        return {
            source,
            message,
            stack: errors.map(error => error.stack || String(error)).join("\n\n")
        };
    }

    static fromError(value, source) {
        if (value instanceof Error) {
            return {
                source,
                message: value.message || value.name || "Unknown error",
                stack: value.stack || ""
            };
        }
        return {
            source,
            message: this.stringify(value) || "Unknown error",
            stack: ""
        };
    }

    static stringify(value) {
        if (value instanceof Error) return value.message || String(value);
        if (typeof value === "string") return value;
        try {
            const json = JSON.stringify(value);
            if (json !== undefined) return json;
        } catch (_) {
            // Fall back to String for circular or otherwise unserializable values.
        }
        return String(value);
    }
}

ErrorForm.installed = false;
ErrorForm.showing = false;
ErrorForm.instance = null;
ErrorForm.originalConsoleError = null;
ErrorForm.lastFingerprint = null;
ErrorForm.lastReportTime = 0;
