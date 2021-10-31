"use strict";

function Source() {
    const listeners = [];

    function addListener(cb) {
        listeners.push(cb);
    }

    function removeListener(cb) {
        listeners = listeners.filter(c => c !== cb);
    }

    function notify(... xs) {
        for (const cb of listeners) {
            cb(... xs);
        }
    }

    return {addListener, removeListener, notify};
}

export {Source};
