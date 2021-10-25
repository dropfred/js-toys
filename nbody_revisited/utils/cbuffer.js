"use strict";

import * as Tk from './tk.js';

class CircularBuffer {
    #capacity;
    #size;
    #offset;
    #buffer;

    constructor(capacity) {
        this.#capacity = Tk.opt(capacity, 60);
        this.#size     = 0;
        this.#offset   = 0;
        this.#buffer   = [];
    }

    get length() {
        return this.#size;
    }

    // how to disable setters ? throw or ignore ?
    set length(v) {
        throw 'read only';
    }

    get full() {
        return (this.#size === this.#capacity);
    }

    set full(v) {
        throw 'read only';
    }

    push(... vs) {
        for (const v of vs) {
            this.#buffer[(this.#offset + this.#size) % this.#capacity] = v;
            if (this.#size === this.#capacity) {
                this.#offset = (this.#offset + 1) % this.#capacity;
            } else {
                ++this.#size;
            }
        }
    }

    pop() {
        return ((this.#size === 0) ? undefined : this.#buffer[(this.#offset + --this.#size) % this.#capacity]);
    }

    shift() {
        if (this.#size === 0) {
            return undefined;
        }
        const v = this.#buffer[this.#offset % this.#capacity];
        this.#offset = (this.#offset + 1) % this.#capacity;
        --this.#size;
        return v;
    }

    clear() {
        this.#buffer = [];
        this.#size   = 0;
        this.#offset = 0;
    }

    // * values() {
    //     for (let i = 0; i < this.#size; ++i) {
    //         yield this.#buffer[(this.#offset + i) % this.#capacity];
    //     }
    // }

    [Symbol.iterator]() {
        let i = 0;
        return {
            next : () => (i === this.#size) ? {done : true} : {done : false, value : this.#buffer[(this.#offset + i++) % this.#capacity]}
        };
    }
}

export {CircularBuffer};
