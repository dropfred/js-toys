"use strict";

class CircularBuffer {
    #capacity;
    #size;
    #offset;
    #buffer;

    constructor(capacity = 60) {
        this.#capacity = capacity;
        this.#size     = 0;
        this.#offset   = 0;
        this.#buffer   = [];
        // read only properties
        Object.defineProperty(this, 'length', {get : () => this.#size});
        Object.defineProperty(this, 'full'  , {get : () => (this.#size === this.#capacity)});
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
