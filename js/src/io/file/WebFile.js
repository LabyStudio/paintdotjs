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

class WebFile extends File {

    async exists() {
        let store = await getObjectStore('readonly');
        let request = store.get(this.getPath());
        return new Promise((resolve, reject) => {
            request.onsuccess = (event) => {
                resolve(request.result !== undefined);
            };
            request.onerror = (event) => {
                reject(event.target.error);
            };
        });
    }

    async write(data) {
        let store = await getObjectStore('readwrite');
        let request = store.put({
            id: this.getPath(),
            data: data
        });

        return new Promise((resolve, reject) => {
            request.onsuccess = () => {
                resolve();
            };
            request.onerror = (event) => {
                reject(event.target.error);
            };
        });
    }

    async read() {
        let store = await getObjectStore('readonly');
        let request = store.get(this.getPath());

        return new Promise((resolve, reject) => {
            request.onsuccess = (event) => {
                if (request.result) {
                    resolve(request.result.data);
                } else {
                    reject(new Error("File not found: " + this.getPath()));
                }
            };
            request.onerror = (event) => {
                reject(event.target.error);
            };
        });
    }
}