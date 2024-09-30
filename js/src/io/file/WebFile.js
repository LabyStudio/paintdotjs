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