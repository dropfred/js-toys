"use strict";

(_ => {
    //
    // options
    //

    const MAGIC = "🔒"; // encrypted data magic prefix

    const BOOKMARKLET = true;  // exit button
    const DOTS        = true;  // use password inputs
    const FMT         = true;  // format encrypted data
    const DND         = true;  // handle drag and drop
    const KBD         = true;  // handle ctrl-c and ctrl-s
    const DBG         = false; // log errors

    const SETTINGS = {
        cols: 40,
        rows: 30,
        fmt: 80
    };

    //
    // help minifier
    //

    const DOC = document;
    const BODY = DOC.body;
    const DIV = "div";
    const BUTTON = "button";
    const DIALOG = "dialog";
    const TEXTAREA = "textarea";
    const INPUT = `<input size="20" ${DOTS? 'type="password"' : ''} />`;
    const CLICK = "click";
    const KEYUP = "keyup";
    const CANCEL = "cancel";
    const COLUMN = "flex-direction: column;";
    const createElement = (t, c) => {
        const e = DOC.createElement(t);
        if (c) e.innerHTML = c;
        return e;
    }
    // const createElement = (t, c) => {
    //     const e = DOC.createElement(t);
    //     if (c) {
    //         if (c.id   ) e.id = c.id;
    //         if (c.class) e.classList.add(c.class);
    //         if (c.style) e.style.cssText += c.style;
    //         if (c.inner) e.innerHTML = c.inner;
    //     }
    //     return e;
    // };
    const append = (e, ...cs) => {for (const c of cs) e.appendChild(c); return e;};
    const remove = (e, ...cs) => {for (const c of cs) e.removeChild(c); return e;};
    const addListener = (e, t, h) => {e.addEventListener(t, h);};
    const removeListener = (e, t, h) => e.removeEventListener(t, h);
    const querySelectors = (e, s) => e.querySelectorAll(s);
    const preventDefault = e => e.preventDefault();
    const log = (...xs) => console.log(...xs);
    // const length = xs => xs.length;

    //
    // encrypt/decrypt stuff
    //

    const SALT_OFFSET = 0;
    const SALT_SIZE = 16;

    const IV_OFFSET = SALT_OFFSET + SALT_SIZE;
    const IV_SIZE = 12;

    const DATA_OFFSET = IV_OFFSET + IV_SIZE;

    async function get_key(password, salt) {
        let key = await crypto.subtle.importKey(
            "raw",
            (new TextEncoder()).encode(password),
            {name: "PBKDF2"},
            false,
            ["deriveKey"]
        );
        return crypto.subtle.deriveKey(
            {
                name: "PBKDF2",
                salt: salt,
                iterations: 600000,
                hash: "SHA-256"
            },
            key,
            {name: "AES-GCM", length: 256},
            false,
            ["encrypt", "decrypt"]
        );
    }

    async function encrypt(password, txt) {
        const salt = crypto.getRandomValues(new Uint8Array(SALT_SIZE));
        const iv = crypto.getRandomValues(new Uint8Array(IV_SIZE));
        return get_key(password, salt).then(key =>
            crypto.subtle.encrypt({name: "AES-GCM", iv: iv}, key, (new TextEncoder()).encode(txt))
        ).then(data => {
            const buffer = new Uint8Array(SALT_SIZE + IV_SIZE + data.byteLength);
            buffer.set(salt, SALT_OFFSET);
            buffer.set(iv, IV_OFFSET);
            buffer.set(new Uint8Array(data), DATA_OFFSET);
            return buffer.toBase64();
        });
    }

    async function decrypt(password, data64) {
        const buffer = Uint8Array.fromBase64(data64);
        const salt = buffer.slice(SALT_OFFSET, SALT_OFFSET + SALT_SIZE);
        const iv = buffer.slice(IV_OFFSET, IV_OFFSET + IV_SIZE);
        const data = buffer.slice(DATA_OFFSET);
        return get_key(password, salt).then(key =>
            crypto.subtle.decrypt({name: "AES-GCM", iv: iv}, key, data)
        ).then(data =>
            (new TextDecoder()).decode(data)
        );
    }

    //
    // ui
    //

    // save and hide host page
    const BK = {ss: [], cs: []};
    for (const e of BODY.children) {
        BK.cs.push({e: e, d: e.style.display});
        e.style.display = "none";
    }
    for (const s of DOC.styleSheets) {
        BK.ss.push({s: s, d: s.disabled});
        s.disabled = true;
    }

    const close = () => {
        remove(DOC.head, STYLE);
        for (const e of [TOP, DLG_PASSWORD, DLG_ERROR, DLG_LINK]) remove(BODY, e);

        for (const b of BK.ss) {
            b.s.disabled = b.d;
        }
        for (const b of BK.cs) {
            b.e.style.display = b.d;
        }
    };

    const STYLE = createElement("style", `* {font-family: sans-serif;} dialog {margin-top: 2em;} p {margin: 0;} div {display: flex; gap: 1em;} dialog ${BUTTON} {width: 100%;}`);
    append(DOC.head, STYLE);

    const TOP = createElement(DIV);
    TOP.style.justifyContent = "center";
    append(BODY, TOP);

    const MAIN = createElement(DIV);
    MAIN.style.cssText = `${COLUMN} max-width: 100%;`
    append(MAIN, createElement(DIV, `<${BUTTON}>📋</${BUTTON}><${BUTTON}>🔗</${BUTTON}><${BUTTON}>📄</${BUTTON}><${BUTTON}>💾</${BUTTON}>${BOOKMARKLET ? `<span style="flex-grow: 1;"></span><${BUTTON}>❌</${BUTTON}>`: ''}`));
    append(MAIN, createElement(DIV, `<${TEXTAREA} rows="${SETTINGS.rows}" cols="${SETTINGS.cols}" placeholder="Edit/Drop" wrap="off" spellcheck="false"></${TEXTAREA}>`));
    append(TOP, MAIN);

    const DLG_PASSWORD = createElement(
        DIALOG,
        `<${DIV} style="${COLUMN}">` +
          `<p>Enter password:<br />${INPUT}</p>` +
          (DOTS? `<p>Confirm password:<br />${INPUT}</p>` : '') +
          `<${DIV}><${BUTTON}>Ok</${BUTTON}><${BUTTON}>Cancel</${BUTTON}></${DIV}>` +
        `</${DIV}>`
    );
    append(BODY, DLG_PASSWORD);

    const DLG_ERROR = createElement(
        DIALOG,
        `<${DIV} style="${COLUMN}">` +
          '<p>Invalid password or<br />corrupted data.</p>' +
          `<p><${BUTTON}>Close</${BUTTON}></p>` +
        `</${DIV}>`
    );
    DLG_ERROR.style.borderColor = "red";
    append(BODY, DLG_ERROR);

    const DLG_LINK = createElement(
        DIALOG,
        `<${DIV} style="${COLUMN}">` +
          '<span>Save data:</span>' +
          '<a href="/">bookmark</a>' +
          `<${BUTTON}>Close</${BUTTON}>` +
        `</${DIV}>`
    );
    append(BODY, DLG_LINK);

    const [MENU_COPY, MENU_LINK, MENU_PAGE, MENU_SAVE, MENU_QUIT] = querySelectors(MAIN, BUTTON);
    const [TEXT] = querySelectors(MAIN, TEXTAREA);
    const [PW_OK, PW_CANCEL] = querySelectors(DLG_PASSWORD, BUTTON);
    const [PW_ENTER, PW_CONFIRM] = querySelectors(DLG_PASSWORD, "input");

    const [LINK] = querySelectors(DLG_LINK, "a");

    const format = (txt, length) => {
        if (FMT) if (length != 0) {
            let ftxt = "";
            for (let b = 0, e = length; b < txt.length; b = e, e += length) {
                if (b != 0) ftxt += "\n";
                ftxt += txt.slice(b, e);
            }
            txt = ftxt;
        }
        return txt;
    };

    const get_password = (confirm=true) => {
        return new Promise((resolve, reject) => {
            const clear = () => {
                removeListener(DLG_PASSWORD, CANCEL, cancel);
                removeListener(PW_ENTER, KEYUP, keyup);
                if (DOTS) if (confirm) removeListener(PW_CONFIRM, KEYUP, keyup);
                removeListener(PW_OK, CLICK, ok);
                removeListener(PW_CANCEL, CLICK, cancel);
                DLG_PASSWORD.close();
            };

            const ok = () => {
                clear();
                resolve(PW_ENTER.value);
            };

            const cancel = () => {
                clear();
                reject();
            };

            const keyup = evt => {
                let valid = PW_ENTER.value.length > 0;
                if (DOTS) if (confirm) {
                    valid &&= PW_ENTER.value == PW_CONFIRM.value;
                }
                PW_OK.disabled = !valid;
                if (valid && evt.key === "Enter") ok();
            };

            addListener(DLG_PASSWORD, CANCEL, cancel);
            addListener(PW_ENTER, KEYUP, keyup);
            if (DOTS) {
                if (confirm) addListener(PW_CONFIRM, KEYUP, keyup);
                PW_CONFIRM.parentElement.style.display = confirm? "" : "none";
            }
            addListener(PW_OK, CLICK, ok);
            addListener(PW_CANCEL, CLICK, cancel);

            PW_ENTER.value = "";
            if (DOTS) PW_CONFIRM.value = "";
            PW_OK.disabled = true;

            DLG_PASSWORD.showModal();
        });
    };

    async function update(data, clear) {
        const update = txt => {
            if (clear) TEXT.value = "";
            const position = TEXT.selectionStart;
            TEXT.value = TEXT.value.slice(0, position) + txt + TEXT.value.slice(TEXT.selectionEnd);
            TEXT.selectionStart = TEXT.selectionEnd = position + txt.length;
        };

        const items = [...data.items];
        (
            (items.some(i => i.kind === "string"))? Promise.resolve(data.getData("text/plain")) :
            (items.some(i => i.kind === "file"))  ? data.files.item(0).text() :
                                                    Promise.reject(/*ignore*/)
        ).then(data => {
            if (data.startsWith(MAGIC)) {
                get_password(false).then(pw =>
                    decrypt(pw, data.slice(MAGIC.length))
                ).then(txt => {
                    update(txt);
                }).catch(e => {
                    if (e) {
                        DLG_ERROR.showModal();
                    }
                });
            } else {
                update(data);
            }
        }).catch(e => DBG && e && log(e));
    }

    //
    // callbacks
    //

    const copy = () => {
        get_password().then(pw => {
            const b = TEXT.selectionStart, e = TEXT.selectionEnd;
            return encrypt(pw, (b == e) ? TEXT.value : TEXT.value.slice(b, e));
        }
        ).then(data64 => {
            navigator.clipboard.writeText(format(MAGIC + data64, SETTINGS.fmt));
        }).catch(e => DBG && e && log(e));
    };

    const link = () => {
        get_password().then(pw => {
            const b = TEXT.selectionStart, e = TEXT.selectionEnd;
            return encrypt(pw, (b == e) ? TEXT.value : TEXT.value.slice(b, e));
        }
        ).then(data64 => {
            LINK.href = "javascript:" + encodeURIComponent('navigator.clipboard.writeText("' + MAGIC + data64 + '");');
            DLG_LINK.showModal();
        }).catch(e => DBG && e && log(e));
    };

    const page = () => {
        get_password().then(pw => {
            const b = TEXT.selectionStart, e = TEXT.selectionEnd;
            return encrypt(pw, (b == e) ? TEXT.value : TEXT.value.slice(b, e));
        }
        ).then(data64 => {
            LINK.href = "data:text/plain;charset=utf-8," + encodeURIComponent(MAGIC + data64);
            DLG_LINK.showModal();
        }).catch(e => DBG && e && log(e));
    };

    const save = () => {
        get_password().then(pw =>
            encrypt(pw, TEXT.value)
        ).then(data64 => {
            const blob = new Blob([format(MAGIC + data64, SETTINGS.fmt)], {type: "text/plain"});
            const url = URL.createObjectURL(blob);
            const a = createElement("a");
            a.href = url;
            a.download = "ez-lock.txt";
            append(BODY, a);
            a.click();
            a.remove();
            URL.revokeObjectURL(url);
        }).catch(e => DBG && e && log(e));
    };

    if (BOOKMARKLET) {
        addListener(MENU_QUIT, CLICK, close);
    }

    addListener(querySelectors(DLG_ERROR, BUTTON)[0], CLICK, _ => {DLG_ERROR.close();});

    addListener(querySelectors(DLG_LINK, BUTTON)[0], CLICK, _ => {DLG_LINK.close();});

    addListener(MENU_COPY, CLICK, copy);

    addListener(MENU_LINK, CLICK, link);

    addListener(MENU_PAGE, CLICK, page);

    addListener(LINK, "click", preventDefault);

    addListener(MENU_SAVE, CLICK, save);

    addListener(TEXT, "paste", evt => {
        preventDefault(evt);
        update(evt.clipboardData, false);
    });

    if (DND) {
        addListener(BODY, "dragover", preventDefault);

        addListener(BODY, "drop", evt => {
            preventDefault(evt);
            update(evt.dataTransfer, true);
        });
    }

    if (KBD) {
        addListener(TEXT, "keydown", evt => {
            if (evt.ctrlKey && (evt.key == "s")) {
                preventDefault(evt);
                save();
            }
            if (evt.ctrlKey && (evt.key == "C")) {
                preventDefault(evt);
                copy();
            }
        });
    }

    //
    // check if crypto is available, disable everything otherwise
    //

    if (!crypto.subtle) {
        [MENU_COPY, MENU_SAVE, TEXT].forEach(e => e.disabled = true);
        TEXT.placeholder = "Insecure context"
        TEXT.style.color = "red";
    }
})();
