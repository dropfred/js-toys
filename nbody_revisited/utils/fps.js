"use strict";

import {CircularBuffer} from './cbuffer.js';
import * as Tk from './tk.js';

function Fps(size) {
    size = Tk.opt(size, 60);
    let time = 0;
    let last = 0;
    const deltas = new CircularBuffer(size);

    function tick() {
        const t = Date.now();
        if (time > 0) {
            deltas.push(t - time);
        } else {
            last = t;
        }
        time = t;
        return (deltas.full ? ((time - last) / 1000.0) : 0);
    }

    function get() {
        last = time;
        return (deltas.full ? ((1.0 / (Array.from(deltas).reduce((a, b) => a + b) / size)) * 1000.0) : 0);
    }

    return {
        tick,
        get
    }
}

export {Fps};
