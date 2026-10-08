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

class TaskDialog {

    static show(options) {
        return new Promise(resolve => {
            const backdrop = document.createElement("div");
            backdrop.className = "app-dialog-backdrop task-dialog-backdrop";
            if (isApp) {
                backdrop.classList.add("dialog-backdrop-app");
            }
            let titleBar = null;
            let mover = null;
            let closed = false;
            const finish = value => {
                if (closed) {
                    return;
                }
                closed = true;
                document.removeEventListener("keydown", onKeyDown, true);
                if (mover !== null) {
                    mover.destroy();
                }
                backdrop.remove();
                resolve(value);
            };
            const cancelValue = options.cancelValue === undefined ? null : options.cancelValue;
            const onKeyDown = event => {
                if (event.key === "Escape") {
                    event.preventDefault();
                    finish(cancelValue);
                }
            };

            // Dialog
            const dialog = document.createElement("section");
            dialog.className = "app-dialog task-dialog " + (options.className || "");
            dialog.setAttribute("role", "dialog");
            dialog.setAttribute("aria-modal", "true");
            {
                // Title bar
                titleBar = document.createElement("header");
                titleBar.className = "app-dialog-title-bar";
                {
                    // Title
                    const titleGroup = document.createElement("div");
                    titleGroup.className = "app-dialog-title";
                    {
                        if (options.icon) {
                            const icon = document.createElement("img");
                            icon.src = options.icon;
                            icon.alt = "";
                            titleGroup.appendChild(icon);
                        }

                        const title = document.createElement("strong");
                        title.textContent = options.title;
                        titleGroup.appendChild(title);
                    }

                    // Close button
                    const close = document.createElement("button");
                    close.type = "button";
                    close.className = "app-dialog-close";
                    close.textContent = "×";
                    close.title = "Close";
                    close.onclick = () => finish(cancelValue);

                    titleBar.append(titleGroup, close);
                }

                // Content
                const content = document.createElement("div");
                content.className = "task-dialog-content";
                {
                    if (options.preview) {
                        content.appendChild(options.preview);
                    }

                    // Message
                    if (options.message) {
                        const message = document.createElement("p");
                        message.className = "task-dialog-message";
                        message.textContent = options.message;
                        content.appendChild(message);
                    }

                    // Choices
                    const choices = document.createElement("div");
                    choices.className = "task-dialog-choices";
                    {
                        for (const choice of options.choices || []) {
                            const button = document.createElement("button");
                            button.type = "button";
                            button.className = "task-dialog-choice";
                            {
                                if (choice.icon) {
                                    const icon = document.createElement("img");
                                    icon.src = choice.icon;
                                    icon.alt = "";
                                    button.appendChild(icon);
                                }

                                const copy = document.createElement("span");
                                {
                                    const heading = document.createElement("strong");
                                    heading.textContent = choice.title;
                                    copy.appendChild(heading);

                                    if (choice.description) {
                                        const description = document.createElement("span");
                                        description.textContent = choice.description;
                                        copy.appendChild(description);
                                    }
                                }

                                button.appendChild(copy);
                            }
                            button.onclick = () => finish(choice.value);
                            choices.appendChild(button);
                        }
                    }
                    content.appendChild(choices);
                }

                dialog.append(titleBar, content);
            }

            backdrop.onclick = event => {
                if (event.target === backdrop) {
                    finish(cancelValue);
                }
            };
            backdrop.appendChild(dialog);
            document.body.appendChild(backdrop);
            mover = new DialogMover(dialog, titleBar, backdrop);
            document.addEventListener("keydown", onKeyDown, true);
        });
    }
}
