"use strict";

import {opt} from './tk.js';

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

class SourceValue {
    #source;
    #value;
    #map;

    constructor(value, map) {
        this.#source = Source();
        this.#map    = opt(map, x => x);
        this.#value  = this.#map(value);
    }

    get value() {
        return this.#value;
    }

    set value(value) {
        this.#value = this.#map(value);
        this.notify();
    }

    addListener(cb) {
        cb(this.#value);
        this.#source.addListener(cb);
    }

    removeListener(cb) {
        this.#source.removeListener(cb);
    }

    notify() {
        this.#source.notify(this.#value);
    }
}

export {Source, SourceValue};
