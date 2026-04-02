"use strict";

(() => {
    const SETTINGS = {
        cols: 40,
        rows: 15,
        fmt: 80
    };

    const MAGIC       = "🔒";  // encrypted data magic prefix
    const BOOKMARKLET = true;  // exit button
    const DOTS        = true;  // use password inputs
    const DND         = true;  // handle drag and drop
    const KBD         = true;  // handle ctrl-c and ctrl-s
    const DBG         = false; // log errors

    const DOC = document;
    const BODY = DOC.body;
    const COLUMN = "flex-direction: column;";

    const append = (e, ...cs) => {for (const c of cs) e.appendChild(c); return e;};
    const remove = (e, ...cs) => {for (const c of cs) e.removeChild(c); return e;};
    const createElement = (t, c/*, p*/) => {
        const e = DOC.createElement(t);
        if (c) {
            if (c.id   ) e.id = c.id;
            if (c.class) e.classList.add(c.class);
            if (c.style) e.style.cssText += c.style;
            if (c.inner) e.innerHTML = c.inner;
        }
        // if (p) append(p, e);
        return e;
    };
    const addListener = (e, t, h) => {e.addEventListener(t, h);};
    const removeListener = (e, t, h) => e.removeEventListener(t, h);
    const querySelectors = (e, s) => e.querySelectorAll(s);
    const preventDefault = e => e.preventDefault();
    const log = (...xs) => console.log(...xs);

    //
    // encrypt/decrypt
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
    // restore host page
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

    const STYLE = createElement("style", {inner: "* {font-family: sans-serif;} dialog {margin-top: 2em;} p {margin: 0;} div {display: flex; gap: 1em;} dialog button {width: 100%;}"}/*, DOC.head*/);
    append(DOC.head, STYLE);
 
    const TOP = createElement("div", {style: "justify-content: center;"}/*, BODY*/);
    append(BODY, TOP);

    const MAIN = append(createElement("div", {style: `${COLUMN} max-width: 100%;`}/*, MAIN*/),
        createElement("div", {inner: `${["📋", "🔗", "📄", "💾"].reduce(((a, c) => a + "<button>" + c + "</button>"), "")}${BOOKMARKLET ? `<span style="flex-grow: 1;"></span><button>❌</button>`: ''}`}),
        createElement("div", {inner: `<textarea rows="${SETTINGS.rows}" cols="${SETTINGS.cols}" placeholder="Edit/Drop" wrap="off" spellcheck="false"></textarea>`})
    );
    append(TOP, MAIN);

    const DLG_PASSWORD = createElement(
        "dialog", {
            inner:
                `<div style="${COLUMN}">` +
                    `<p>Enter password:<br /><input ${DOTS? 'type="password"' : ''} /></p>` +
                    (DOTS? `<p>Confirm password:<br /><input ${DOTS? 'type="password"' : ''} /></p>` : '') +
                    "<div><button>Ok</button><button>Cancel</button></div>" +
                "</div>"
        }
    );

    const DLG_ERROR = createElement(
        "dialog", {
            inner:
                `<div style="${COLUMN}">` +
                    "<p>Invalid password or<br />corrupted data.</p>" +
                    "<p><button>Close</button></p>" +
                "</div>",
            style: "border-color: red;"
        }
    );

    const DLG_LINK = createElement(
        "dialog", {
            inner:
                `<div style="${COLUMN}">` +
                    "<span>Save data:</span>" +
                    '<a href="/">bookmark</a>' +
                    "<button>Close</button>" +
                "</div>"
        }
    );

    append(BODY, DLG_PASSWORD, DLG_ERROR, DLG_LINK);

    const [MENU_COPY, MENU_LINK, MENU_PAGE, MENU_SAVE, MENU_QUIT] = querySelectors(MAIN, "button");
    const [TEXT] = querySelectors(MAIN, "textarea");
    const [PW_OK, PW_CANCEL] = querySelectors(DLG_PASSWORD, "button");
    const [PW_ENTER, PW_CONFIRM] = querySelectors(DLG_PASSWORD, "input");

    const [BOOKMARK] = querySelectors(DLG_LINK, "a");

    const format = (txt, length) => {
        if (length != 0) {
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
                removeListener(DLG_PASSWORD, "cancel", cancel);
                removeListener(PW_ENTER, "keyup", keyup);
                if (DOTS) if (confirm) removeListener(PW_CONFIRM, "keyup", keyup);
                removeListener(PW_OK, "click", ok);
                removeListener(PW_CANCEL, "click", cancel);
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

            addListener(DLG_PASSWORD, "cancel", cancel);
            addListener(PW_ENTER, "keyup", keyup);
            if (DOTS) {
                if (confirm) addListener(PW_CONFIRM, "keyup", keyup);
                PW_CONFIRM.parentElement.style.display = confirm? "" : "none";
            }
            addListener(PW_OK, "click", ok);
            addListener(PW_CANCEL, "click", cancel);

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

    const ui_encrypt = h => {
        get_password().then(pw => {
            const b = TEXT.selectionStart, e = TEXT.selectionEnd;
            return encrypt(pw, (b == e) ? TEXT.value : TEXT.value.slice(b, e));
        }).then(h);
    };

    const copy = () => {
        ui_encrypt(data64 => {
            navigator.clipboard.writeText(format(MAGIC + data64, SETTINGS.fmt));
        }).catch(e => DBG && e && log(e));
    };

    const link = () => {
        ui_encrypt(data64 => {
            BOOKMARK.href = "javascript:" + encodeURIComponent(`navigator.clipboard.writeText("${MAGIC + data64}");`);
            DLG_LINK.showModal();
        }).catch(e => DBG && e && log(e));
    };

    const page = () => {
        ui_encrypt(data64 => {
            BOOKMARK.href = "data:text/plain;charset=utf-8," + encodeURIComponent(MAGIC + data64);
            DLG_LINK.showModal();
        }).catch(e => DBG && e && log(e));
    };

    const save = () => {
        ui_encrypt(data64 => {
            const blob = new Blob([format(MAGIC + data64, SETTINGS.fmt)], {type: "text/plain"});
            const url = URL.createObjectURL(blob);
            const a = createElement("a"/*, undefined, BODY*/);
            a.href = url;
            a.download = "ez-lock.txt";
            append(BODY, a);
            a.click();
            a.remove();
            URL.revokeObjectURL(url);
        }).catch(e => DBG && e && log(e));
    };

    if (BOOKMARKLET) {
        addListener(MENU_QUIT, "click", close);
    }

    for (const d of [DLG_ERROR, DLG_LINK]) {addListener(querySelectors(d, "button")[0], "click", () => {d.close();});}

    for (const [m, h] of [[MENU_COPY, copy], [MENU_LINK, link], [MENU_PAGE, page], [MENU_SAVE, save]]) addListener(m, "click", h);

    addListener(BOOKMARK, "click", preventDefault);

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
