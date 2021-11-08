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

function remap(x, tb, te, fb = 0, fe = 1) {
    return (tb + (x - fb) * (fe - fb) * (te - tb));
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

function choice(... cws) {
    const cs = [];
    for (let wc of cws) {
        if (!(wc instanceof (Array))) {
            wc = [wc, 1];
        }
        for (let i = 0; i < wc[1]; ++i) {
            cs.push(wc[0]);
        }
    }
    return ((cws.length !== 0) ? cs[Math.trunc(Math.random() * cs.length)] : undefined);
}

function mix(m, a, b) {
    if (a instanceof (Array) && b instanceof (Array)) {
        return (((a.length !== 0) && (b.length !== 0)) ? [... zip(a, b)].map(([a, b]) => mix(m, a, b)) : undefined);
    } else if (a instanceof (Array)) {
        return mix(m, a, Array(a.length).fill(b));
    } else if (b instanceof (Array)) {
        return mix(m, Array(b.length).fill(a), b);
    }
    return (((1 - m) * a) + (m * b));
}

export {opt, flat, combine, remap, range, zip, choice, mix};
