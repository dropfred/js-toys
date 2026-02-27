"use strict";

window.addEventListener("load", async () => {
    const MAGIC = "🔒";

    const SALT_OFFSET = 0;
    const SALT_SIZE = 16;

    const IV_OFFSET = SALT_OFFSET + SALT_SIZE;
    const IV_SIZE = 12;

    const DATA_OFFSET = IV_OFFSET + IV_SIZE;

    const TEXT = document.getElementById("txt");
    const [PASSWORD, ERROR] = document.querySelectorAll("dialog");


    const FORMAT = 40;

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

    function get_password(confirm = false) {
        return new Promise((resolve, reject) => {
            const [pwe, pwc] = PASSWORD.querySelectorAll("input");
            const [bto, btc] = PASSWORD.querySelectorAll("button");
            const grpc = PASSWORD.querySelectorAll("div > div")[1];
            const pwbk = pwe.value;

            const clear = () => {
                PASSWORD.close();
                PASSWORD.removeEventListener("cancel", cancel);
                pwe.removeEventListener("keyup", keyup);
                pwc.removeEventListener("keyup", keyup);
                bto.removeEventListener("click", ok);
                btc.removeEventListener("click", cancel);
            }

            const ok = () => {
                clear();
                resolve(pwe.value);
            };

            const cancel = () => {
                clear();
                pwe.value = pwbk;
                reject();
            };

            const keyup = evt => {
                const valid = (pwe.value.length === 0) ? false : confirm ? (pwe.value === pwc.value) : true;
                bto.disabled = !valid;
                if (valid && (evt.key == "Enter")) ok();
            };

            if (!confirm) pwe.value = "";
            pwc.value = "";
            grpc.style.display = confirm? "" : "none";
            bto.disabled = true;
            PASSWORD.addEventListener("cancel", cancel);
            pwe.addEventListener("keyup", keyup);
            pwc.addEventListener("keyup", keyup);
            bto.addEventListener("click", ok);
            btc.addEventListener("click", cancel);
            PASSWORD.showModal();
        });
    }

    async function update(data, clear = true) {
        if (data.startsWith(MAGIC)) {
            get_password().then(pw =>
                decrypt(pw, data.slice(MAGIC.length))
            ).then(data => {
                if (clear) TEXT.value = "";
                TEXT.value = TEXT.value.slice(0, TEXT.selectionStart) + data + TEXT.value.slice(TEXT.selectionEnd);
            }).catch(e => {
                if (e !== undefined) {
                    ERROR.querySelector("div > div").innerHTML = "Invalid password or<br />corrupted data.";
                    ERROR.showModal();
                }
            });
        } else {
            TEXT.value = data;
        }
    }

    {
        const drop = document.body;

        drop.addEventListener("dragover", (evt) => {
            evt.preventDefault();
        });

        drop.addEventListener("drop", (evt) => {
            evt.preventDefault();
            const data = evt.dataTransfer;
            const txt = data.getData("text/plain");
            (
                (txt.length > 0)         ? Promise.resolve(txt) :
                (data.files.length === 1)? data.files.item(0).text() :
                                           Promise.reject("unhandled drop")
            ).then(txt => {update(txt);}).catch(e => {console.error(e);});
        });
    }

    function format(txt, length) {
        if (length != 0) {
            let ftxt = "";
            for (let b = 0, e = length; b < txt.length; b = e, e += length) {
                if (b != 0) ftxt += "\n";
                ftxt += txt.slice(b, e);
            }
            txt = ftxt;
        }
        return txt;
    }

    document.getElementById("save").addEventListener("click", () => {
        get_password(true).then(pw =>
            encrypt(pw, TEXT.value)
        ).then(data64 => {
            const blob = new Blob([format(MAGIC + data64, FORMAT)], {type: "text/plain"});
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = "ez-lock.txt";
            document.body.appendChild(a);
            a.click();
            a.remove();
            URL.revokeObjectURL(url);
        }).catch(e => {console.log(e);});
    });

    document.getElementById("clipboard").addEventListener("click", () => {
        get_password(true).then(pw =>
            encrypt(pw, TEXT.value)
        ).then(data64 => {
            navigator.clipboard.writeText(format(MAGIC + data64, FORMAT));
        }).catch(e => {console.log(e);});
    });

    TEXT.value = "";
    TEXT.addEventListener("paste", evt => {
        const data = evt.clipboardData.getData("text/plain");
        if (data.startsWith(MAGIC)) {
            evt.preventDefault();
            update(data, false).catch(e => {console.error(e);});
        }
    });

    ERROR.querySelector("button").addEventListener("click", () => {ERROR.close();});
});
