class ModalDialogController {
    static initialize() {
        if (this.observer !== null) return;
        this.observer = new MutationObserver(() => this.sync());
        this.observer.observe(document.body, {childList: true, subtree: true});
        this.sync();

        // Events targeted outside the active modal must not reach application
        // controls that may still have focus from before the dialog opened.
        document.addEventListener("keydown", event => this.blockBackgroundEvent(event), true);
        document.addEventListener("wheel", event => this.blockBackgroundEvent(event), {
            capture: true,
            passive: false
        });
        document.addEventListener("pointerdown", event => this.blockBackgroundEvent(event), true);
        document.addEventListener("click", event => this.blockBackgroundEvent(event), true);
    }

    static getActiveBackdrop() {
        const backdrops = document.querySelectorAll(".app-dialog-backdrop");
        return backdrops.length === 0 ? null : backdrops[backdrops.length - 1];
    }

    static isActive() {
        return this.getActiveBackdrop() !== null;
    }

    static blockBackgroundEvent(event) {
        const active = this.getActiveBackdrop();
        if (active === null) return false;
        const dialog = active.querySelector(".app-dialog");
        if (dialog !== null && dialog.contains(event.target)) return false;
        event.preventDefault();
        event.stopImmediatePropagation();
        this.signalAttention(dialog);
        return true;
    }

    static signalAttention(dialog) {
        if (dialog === null) return;
        const now = performance.now();
        if (now - this.lastAttention < 250) return;
        this.lastAttention = now;
        dialog.classList.remove("modal-dialog-attention");
        // Restart the animation when the user tries the background again.
        void dialog.offsetWidth;
        dialog.classList.add("modal-dialog-attention");
        clearTimeout(this.attentionTimer);
        this.attentionTimer = setTimeout(() => {
            dialog.classList.remove("modal-dialog-attention");
        }, 850);
    }

    static sync() {
        const active = this.getActiveBackdrop();
        const content = document.getElementById("content");
        if (content !== null) content.inert = active !== null;
        document.body.classList.toggle("modal-dialog-active", active !== null);

        if (active !== null && !active.contains(document.activeElement)) {
            const focusTarget = active.querySelector(
                "[autofocus], select, input:not([type=hidden]), textarea, button, [tabindex]:not([tabindex='-1'])"
            );
            focusTarget?.focus({preventScroll: true});
        }
    }
}

ModalDialogController.observer = null;
ModalDialogController.lastAttention = Number.NEGATIVE_INFINITY;
ModalDialogController.attentionTimer = null;
ModalDialogController.initialize();
