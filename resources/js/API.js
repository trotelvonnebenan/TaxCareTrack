class API {
    constructor() {
        this.loadCredentials()
    }

    loadCredentials() {
        this.host = "";
        this.username = "";
        this.token = "";
        this.use_only_token = "";

        if (setting) {
            this.host = setting.host;
            this.username = setting.username;
            this.token = setting.token;
            this.use_only_token = setting.use_only_token;
        }
        else {

        }
    }

    setCredentials(host, username, token, use_only_token) {
        this.host = host;
        this.username = username;
        this.token = token;
        this.use_only_token = use_only_token;
    }


    async makeAPICallAsync(type, method, data) {
        if (this.host == "") return false;

        var result = {};
        var headers = {};
        if (this.use_only_token) {
            headers = {
                'Authorization': 'Bearer ' + this.token,
            };
        }
        else {
            headers = {
                'X-AUTH-USER': this.username,
                'X-AUTH-TOKEN': this.token,
            };
        }

        // Retry Offline Queue first if online
        if (navigator.onLine && localStorage.getItem('offlineQueue')) {
            await this.processOfflineQueue();
        }

        await $.ajax({
            async: true, // Switched to true for Async function
            url: this.host + method,
            type: type.toUpperCase(),
            crossDomain: true,
            headers: headers,
            contentType: 'application/json; charset=utf-8;',
            data: JSON.stringify(data),
            success: function (resp) {
                result = resp;
            },
            error: (xhr, status, error) => {
                console.log(JSON.stringify(xhr), JSON.stringify(error));
                // Offline Logic
                if (xhr.status === 0 || xhr.readyState === 0 || !navigator.onLine) {
                    if (['POST', 'PATCH', 'DELETE', 'PUT'].includes(type.toUpperCase())) {
                        this.addToOfflineQueue({ type, method, data });
                        Neutralino.os.showNotification('Offline', 'Action saved to offline queue.', 'INFO');
                        result = { id: 999999, offline: true }; // Fake success for UI
                    }
                }
            }
        });
        return result;
    }

    makeAPICall(type, method, data) {
        if (this.host == "") return false;

        var result = {};

        var headers = {};
        if (this.use_only_token) {
            headers = {
                'Authorization': 'Bearer ' + this.token,
            };
        }
        else {
            headers = {
                'X-AUTH-USER': this.username,
                'X-AUTH-TOKEN': this.token,
            };
        }

        $.ajax({
            async: false,
            url: this.host + method,
            type: type.toUpperCase(),
            crossDomain: true,
            headers: headers,
            contentType: 'application/json; charset=utf-8;',
            data: JSON.stringify(data),
            success: function (resp) {
                result = resp;
            },
            error: (xhr, status, error) => {
                console.log(JSON.stringify(xhr), JSON.stringify(error));
                // Offline Logic (Sync)
                if (xhr.status === 0 || xhr.readyState === 0 || !navigator.onLine) {
                    if (['POST', 'PATCH', 'DELETE', 'PUT'].includes(type.toUpperCase())) {
                        this.addToOfflineQueue({ type, method, data });
                        Neutralino.os.showNotification('Offline', 'Action saved to offline queue.', 'INFO');
                        result = { id: 999999, offline: true };
                    }
                }
            }
        });
        return result;
    }

    addToOfflineQueue(item) {
        var queue = JSON.parse(localStorage.getItem('offlineQueue') || '[]');
        queue.push(item);
        localStorage.setItem('offlineQueue', JSON.stringify(queue));
    }

    async processOfflineQueue() {
        var queue = JSON.parse(localStorage.getItem('offlineQueue') || '[]');
        if (queue.length === 0) return;

        console.log("Processing offline queue...", queue.length);

        var newQueue = [];
        for (let item of queue) {
            try {
                // We use simple ajax here to avoid infinite loop
                await $.ajax({
                    async: true,
                    url: this.host + item.method,
                    type: item.type.toUpperCase(),
                    crossDomain: true,
                    headers: this.getHeaders(),
                    contentType: 'application/json; charset=utf-8;',
                    data: JSON.stringify(item.data)
                });
            } catch (e) {
                console.log("Failed to process queue item", e);
                newQueue.push(item); // Keep in queue if still failing
            }
        }

        if (newQueue.length < queue.length) {
            Neutralino.os.showNotification('Online', 'Offline changes synced.', 'SUCCESS');
        }

        if (newQueue.length > 0) localStorage.setItem('offlineQueue', JSON.stringify(newQueue));
        else localStorage.removeItem('offlineQueue');
    }

    getHeaders() {
        if (this.use_only_token) {
            return { 'Authorization': 'Bearer ' + this.token };
        } else {
            return { 'X-AUTH-USER': this.username, 'X-AUTH-TOKEN': this.token };
        }
    }

    testConnection() {
        if (this.host == "") return false;

        var ret = '';
        var result = this.makeAPICall("get", "/api/version")
        if (typeof (result.version) !== "undefined") ret = result.version;
        return ret;
    }

}