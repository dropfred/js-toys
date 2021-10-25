"use strict";

function opt(v, d) {
    return ((v !== undefined) ? v : d);
}

function * flat(... as) {
    for (const a of as) {
        if (typeof a[Symbol.iterator] === 'function') {
            for (const aa of flat(... a)) {
                yield aa;
            }    
        } else {
            yield a;
        }
    }
}

function * combine(... xs) {
    if (xs.length > 0) {
        for (const x of xs[0]) {
            for (const c of combine(... xs.slice(1))) {
                yield [x].concat(c);
            }
        }
    } else {
        yield [];        
    }
}

function remap(x, ba, ea, bb, eb) {
    return (((x - ba) * (eb - bb)) / (ea - ba)) + bb;
}

function * range(... bes) {
    let b, e, s;
    if (bes.length === 3) {
        b = bes[0];
        e = bes[1];
        s = bes[2];
    } else if (bes.length === 2) {
        b = bes[0];
        e = bes[1];
        s = (b < e) ? 1 : -1;
    } else if (bes.length === 1) {
        b = 0;
        e = bes[0];
        s = (b < e) ? 1 : -1;
    }
    const cmp = (b < e) ? ((x, y) => (x < y)) : ((x, y) => (x > y));
    for (let i = b; cmp(i, e); i += s) {
        yield i;
    }
}

function * zip(a, b) {
    const s = Math.min(a.length, b.length);
    for (let i = 0; i < s; ++i) {
        yield [a[i], b[i]];
    }
}

export {opt, flat, combine, remap, range, zip};
