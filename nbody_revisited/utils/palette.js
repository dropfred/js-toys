"use strict";

import * as Tk from './tk.js';

const hsv_rgb = (h, s, v, a) => {
    const h_i = Math.trunc(h * 6);
    const f = h * 6 - h_i;
    const p = v * (1 - s);
    const q = v * (1 - f * s);
    const t = v * (1 - (1 - f) * s);
    let r, g, b;
    if      (h_i === 0) {r = v; g = t; b = p;}
    else if (h_i === 1) {r = q; g = v; b = p;}
    else if (h_i === 2) {r = p; g = v; b = t;}
    else if (h_i === 3) {r = p; g = q; b = v;}
    else if (h_i === 4) {r = t; g = p; b = v;}
    else if (h_i === 5) {r = v; g = p; b = q;}
    return (a ? [r, g, b] : {r, g, b});
};

// https://martin.ankerl.com/2009/12/09/how-to-create-random-colors-programmatically/
const gr_i = 0.618033988749895;

function Palette(hue, saturation = 0.75, value = 0.95, array = true) {
    hue = Tk.opt(hue, Math.random());
    return (n) => {
        const cs = [];
        for (let i = 0; i < n; ++i) {
            hue = (hue + gr_i) % 1;
            cs.push(hsv_rgb(hue, saturation, value, array));
        }
        return cs;
    };
}

export {Palette};
