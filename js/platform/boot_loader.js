
if (typeof isApp !== 'undefined' && !isApp && 'serviceWorker' in navigator) {
    const isLocalDevelopment = location.hostname === 'localhost'
        || location.hostname === '127.0.0.1'
        || location.hostname === '[::1]';

    async function configureServiceWorker() {
        try {
            if (isLocalDevelopment) {
                // A precaching worker is useful for the deployed PWA, but it
                // makes IDE/live-reload pages serve stale source files. Remove
                // any worker left behind by an older build on this local origin.
                const registrations = await navigator.serviceWorker.getRegistrations();
                const controlled = navigator.serviceWorker.controller !== null;

                await Promise.all(registrations.map((registration) => registration.unregister()));

                if (controlled && sessionStorage.getItem('paintdotjs-sw-cleared') !== '1') {
                    sessionStorage.setItem('paintdotjs-sw-cleared', '1');
                    location.reload();
                } else {
                    sessionStorage.removeItem('paintdotjs-sw-cleared');
                }

                return;
            }

            let isRefreshing = false;
            navigator.serviceWorker.addEventListener('controllerchange', () => {
                if (isRefreshing) {
                    return;
                }

                isRefreshing = true;
                location.reload();
            });

            const registration = await navigator.serviceWorker.register('./service_worker.js', {
                updateViaCache: 'none'
            });
            await registration.update();
        } catch (err) {
            console.log(err);
        }
    }

    void configureServiceWorker();
}
