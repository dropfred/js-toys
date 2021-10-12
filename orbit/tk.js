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

const Tk = {
    opt     : opt,
    flat    : flat,
    combine : combine
};

export {Tk};
