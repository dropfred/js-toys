"use strict";

import {Source} from './source.js';

class Pointer {
    #cbs = new Set();

    static TIMEOUT = 250;

    constructor(element, action = 'none') {
        if (action !== null) {
            element.style.touchAction = action;
        }
        for (const e of ['down', 'move', 'up', 'leave', 'cancel']) {
            element.addEventListener('pointer' + e, {handleEvent : (e) => {this.#listener(e);}});
        }
    }

    addListener(cb) {
        this.#cbs.add(cb);
    }

    removeListener(cb) {
        this.#cbs.delete(cb);
    }

    #listener(e) {
        for (const cb of this.#cbs) {
            cb(e);
        }
    }
}

class Gesture {
    #source = Source();

    constructor(pointer) {
        Object.defineProperty(this, 'source', {get : () => this.#source});
    }
}

function offset(e) {
    return {
        x : e.x - e.target.offsetLeft,
        y : e.y - e.target.offsetTop
    };
}

class Touch extends Gesture {
    static DELAY = 0;

    delay = Touch.DELAY;

    #touch = {
        x : 0,
        y : 0,
        active : false,
        timeout :null
    };

    constructor(pointer) {
        super(pointer);
        pointer.addListener((e) => {this.#listener(e);});
    }

    #cancel() {
        if (this.#touch.timeout !== null) {
            clearTimeout(this.#touch.timeout);
            this.#touch.timeout = null;
        }
        if (this.#touch.active) {
            this.#touch.active = false;
            this.source.notify(null);
        }
    }

    #listener(e) {
        if (e.type === 'pointerdown') {
        }
        if (e.isPrimary) {
            if (e.type === 'pointerdown') {
                Object.assign(this.#touch, offset(e));
                if (this.delay > 0) {
                    this.#touch.timeout = setTimeout(() => {
                        this.#touch.active = true;    
                        this.#touch.timeout = null;
                        this.source.notify({x : this.#touch.x, y : this.#touch.y});
                    }, this.delay);
                } else {
                    this.#touch.active = true;
                }
            } else if ((e.type === 'pointerup') || (e.type === 'pointercancel')) {
                this.#cancel();
            }
            if (this.#touch.active) {
                this.source.notify(offset(e));
            }
        } else {
            this.#cancel();
        }
    }
}

class Tap extends Gesture {
    #tap = {
        n : 0,
        repeat : 0,
        time : 0,
        x : 0,
        y : 0,
        timeout : null
    };

    static TIMEOUT = Pointer.TIMEOUT;
    static DISTANCE = 100;

    constructor(pointer) {
        super(pointer);
        pointer.addListener((e) => {this.#listener(e);});
    }

    #cancel(clear = false) {
        if (this.#tap.timeout !== null) {
            clearTimeout(this.#tap.timeout);
            this.#tap.timeout = null;
        }
        if (clear) {
            this.#tap.repeat = 0;
        }
    }

    #listener(e) {
        if (!e.isPrimary) {
            this.#cancel(true);
        } else if (e.type === 'pointerdown') {
            if (this.#tap.repeat === 0) {
                this.#tap.time = Date.now();
                this.#tap.x = e.x,
                this.#tap.y = e.y
            } else {
                this.#cancel();
            }
            ++this.#tap.repeat;
        } else if (e.type === 'pointerup') {
            if (this.#tap.repeat !== 0) {
                if (
                    ((Date.now() - this.#tap.time) < (Tap.TIMEOUT * this.#tap.repeat)) &&
                    (Math.abs(e.x - this.#tap.x) < Tap.DISTANCE) &&
                    (Math.abs(e.y - this.#tap.y) < Tap.DISTANCE)
                ) {
                    const tap = {repeat : this.#tap.repeat, x : this.#tap.x, y : this.#tap.y};
                    this.#tap.timeout = setTimeout(() => {
                        Object.assign(this.#tap, offset(e));
                        this.source.notify(tap);
                        this.#tap.repeat = 0;
                    }, Tap.TIMEOUT);
                } else {
                    this.#tap.repeat = 0;
                }
            }
        } else if (e.type === 'pointercancel') {
            this.#cancel(true);
        }
    }
}

class Swipe extends Gesture {
    #swipe = {
        time : 0,
        x : 0,
        y : 0
    };

    static TIMEOUT = Pointer.TIMEOUT * 2;
    static DISTANCE = 250;

    constructor(pointer) {
        super(pointer);
        pointer.addListener((e) => {this.#listener(e);});
    }

    #cancel() {
        this.#swipe.time = 0;
    }

    #listener(e) {
        if (!e.isPrimary) {
            this.#cancel();
        } else if (e.type === 'pointerdown') {
            this.#swipe.time = Date.now();
            this.#swipe.x = e.x;
            this.#swipe.y = e.y;
        } else if (e.type === 'pointerup') {
            if ((Date.now() - this.#swipe.time) < Swipe.TIMEOUT) {
                const [dx, dy] = [Math.abs(e.x - this.#swipe.x), Math.abs(e.y - this.#swipe.y)];
                if ((dx > Swipe.DISTANCE) && (dy < Swipe.DISTANCE / 2)) {
                    this.source.notify((e.x < this.#swipe.x) ? 'left' : 'right');
                } else if ((dx < Swipe.DISTANCE / 2) && (dy > Swipe.DISTANCE)) {
                    this.source.notify((e.y < this.#swipe.y) ? 'up' : 'down');
                }
            }
            this.#cancel();
        } else if (e.type === 'pointercancel') {
            this.#cancel();
        }
    }
}

class Box extends Gesture {
    #box = {
        p0 : null,
        p1 : null
    };

    constructor(pointer) {
        super(pointer);
        pointer.addListener((e) => {this.#listener(e);});
    }

    #cancel(primary = true) {
        if (this.#box.p0 !== null) {
            this.source.notify(null);
        }
        if (primary) {
            this.#box.p0 = null;
        }
        this.#box.p1 = null;
    }

    #listener(e) {
        if (e.type === 'pointerdown') {
            if (e.isPrimary) {
                this.#box.p0 = offset(e);
            } else if ((this.#box.p0 !== null) && (this.#box.p1 === null)) {
                this.#box.p1 = offset(e);
            } else {
                this.#cancel();
            }
        } else if (e.type === 'pointermove') {
            if ((this.#box.p0 !== null) && (this.#box.p1 !== null)) {
                Object.assign(e.isPrimary ? this.#box.p0 : this.#box.p1, offset(e));
                this.source.notify({
                    p0 : {x : this.#box.p0.x, y : this.#box.p0.y},
                    p1 : {x : this.#box.p1.x, y : this.#box.p1.y}
                });
            }
        } else if (e.type === 'pointerup') {
            this.#cancel(e.isPrimary);
        } else if (e.type === 'pointercancel') {
            this.#cancel();
        }
    }
}

export {Pointer, Touch, Tap, Swipe, Box};
