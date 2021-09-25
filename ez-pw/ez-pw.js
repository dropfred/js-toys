// drag'n'drop to your bookmarks: javascript:(e=>{(e=Object.assign({},{size:16,copy:!1,fill:!1,hide:!1,syms:'&#@$*=!_+-',salt:''},e)).size=Math.min(Math.max(e.size,4),26);let t=e=>document.getElementById(e),n=t('ezpw');if(null===n){let l=[];e.hide&&Array.from(document.body.children).forEach(e=>{l.push([e,e.style.display]),e.style.display='none'}),(n=document.createElement('div')).id='ezpw',n.innerHTML='<div id=#ezpw-top#><div><input id=#ezpw-name# type=#text# placeholder=#name#/><span id=#ezpw-name-view#></span></div><div><input id=#ezpw-password# type=#text# placeholder=#password#/><span id=#ezpw-password-view#></span></div><div><input id=#ezpw-hash# type=#text# placeholder=#secure# readonly/><span id=#ezpw-hash-view#></span></div></div>'.replaceAll('#',String.fromCharCode(34)),s=document.createElement('style'),s.innerHTML='@font-face {font-family: ezpw-dot; src: url(data:font/woff2;base64,d09GMgABAAAAAAMYAAoAAAAACAAAAALQAAEAAAAAAAAAAAAAAAAAAAAAAAAAAAAABmAAggAKcHILBgABNgIkAwYEIAWJSAcvG0gHEZWclBRfHdjGjMcejbPCigr7qKDg+LsxTTX9VG5KeuqFcjx8v9//1r7nuaWPuDZPLvFHJDE0PDGdlmhE8fgjeHpzA+CczabTdOmsNonoSPlDXgqBo5LlgFtuMgST01LLq68RXbX3Wf296rtJSNpS6Lv+9ynp1A7w4QdLa4DhBDzWC6UDB6h0sgTEY9uSeuhnjUEPkSNkiMjRElKai5cokj2WB468fyYu2egzAPzPzf+W5+3v9sGBwwdP2E+ep9kc0qy7V9ZFDmA+CEkNDU3wB+gD73KC75i+RTD9kU8JgTCQIUNCQgEFFFFECSWUUUYFFVRRRQ011FFHAw000UQLLbTRRged3wkZKCDDfCwGFECITqdz60++42Fd7fGE2eLEg6WXLF3q0tJZwNoaBBKr3vzqcnv3X01pDj7ff2pjWc+d9DNuZWUkGQhohuIlIlaGxbCS/qdPCmQ6AtBVoO5xEoUqtmIgLLYVmZZzSHa6k114UHTD6+ySi4pJlFB3KmbQzF6R1mvZXKg5JIGxf6elIqhXt9ODvU+Y07Az1jLCH5U88uA0/UuR9vyEMqTMNcpVuffBdX3fDcLodq7z2rxBzcoQ99UHatq/XKt1BxlLENUI/CHVqVW/dqtdbZSNKhKyrv1KRU5W4VXmJqu8j0qv1LJdlGaYaWOCsxH0zUJoYN+Zao5vjxGEd4QOSCGclxvYW3zH525iqBi3V1GTW/kgn1GpFTn9CpRSBsfYri0Mz7BUBRiZulCx8X15Weyvl6Ednk7DnVpOz8Uan2C8302Wvm4YS8zkkfkJ6yWo/+BDXozOsv2sY++TklM6sz0rjMqFK4/Ybi0IQ4a9vQPWAh8FKXvLwCQRi6Us4Ln4fIu+6Ap0pJoYqZLmEyDeMloLfxOcLyRjIyRFtoHyxRvCnvM1W/LlhJyWi7Ks9H/UTR7kj+o5AQCQiaxyXUfVz10D) format(#woff2#);}'.replaceAll('#',String.fromCharCode(34)),document.head.appendChild(s),document.body.insertBefore(n,document.body.firstChild);const a='abcdefghijklmnopqrstuvwxyz',d='0123456789',i=e.syms,o=(e,t)=>{let n=t%e.length,l=n>0?e.length-n:-n;return e.substr(l,e.length)+e.substr(0,l)},p=()=>{const n=a.toUpperCase(),l=a+n+d+i,s=t('ezpw-name').value,p=t('ezpw-password').value;(s.length>0&&p.length>0?crypto.subtle.digest('SHA-256',(new TextEncoder).encode(s+p+e.salt)).then(e=>Array.from(new Uint8Array(e))).then(t=>{let s=t[27]%256,p='';for(let n=4;n<e.size;++n)p+=l[(t[n]+s)%l.length],s=(s+256%l.length)%256;return p=o(p+a[t[0]%a.length],t[31]),p=o(p+n[t[1]%n.length],t[30]),p=o(p+d[t[2]%d.length],t[29]),p=o(p+i[t[3]%i.length],t[28])}):Promise.resolve('')).then(n=>{let l=t('ezpw-hash'),a=t('ezpw-hash-view');if(l.value=n,c(l,a),e.copy&&navigator.clipboard.writeText(n),e.fill){let e=Array.from(document.getElementsByTagName('input')).filter(e=>'password'==e.type);1===e.length&&(e[0].value=n)}})},r=e=>{void 0!==e&&'Escape'!==e.key||(document.removeEventListener('keydown',r),n.parentNode.removeChild(n),l.forEach(e=>{e[0].style.display=e[1]}))};n.ezpw_escape=r,document.addEventListener('keydown',r,!1);const A=(e,t)=>{t(e);for(let n=0;n<e.children.length;++n)A(e.children[n],t)};A(n,e=>{e.style.all='initial';let t=e.tagName.toLowerCase();'div'===t?e.style.display='block':'input'===t?(e.autocomplete='off',Object.assign(e.style,{width:'200px',height:'20px',border:'1px solid',padding:'2px 2px',fontFamily:'Arial',textAlign:'center'})):'span'===t&&(e.innerHTML='&#x1f441',e.draggable=!1,Object.assign(e.style,{userSelect:'none',border:'1px solid',padding:'2px 2px'}))}),Object.assign(n.style,{backgroundColor:'white',display:'flex',justifyContent:'center'}),Object.assign(t('ezpw-top').style,{display:'grid',gridGap:'5px',gridAutoFlow:'row',padding:'5px'});const c=(e,t,n)=>{void 0===n&&(n=t.style.backgroundColor.length>0),t.style.backgroundColor=n?'#00adef':'',e.style.fontFamily=n||0===e.value.length?'Arial':'ezpw-dot'},h=(e,n)=>{let l=t(e),a=t(e+'-view'),d=n,s=e=>{void 0!==e&&'click'===e.type&&(d=!d),c(l,a,d)};l.addEventListener('input',s),a.addEventListener('click',s),c(l,a,d)};h('ezpw-name',!0),h('ezpw-password',!1),h('ezpw-hash',!1),void 0!==crypto.subtle?(t('ezpw-name').addEventListener('input',p),t('ezpw-password').addEventListener('input',p)):(t('ezpw-name').disabled=!0,t('ezpw-password').disabled=!0,t('ezpw-hash').value='insecure context',t('ezpw-hash').style.color='red',c(t('ezpw-hash'),t('ezpw-hash-view'),!0))}else n.ezpw_escape()})({})
((options) => {
    const ezpw_root = 'ezpw';
    const ezpw_top = 'ezpw-top';
    const ezpw_name = 'ezpw-name';
    const ezpw_name_view = 'ezpw-name-view';
    const ezpw_password = 'ezpw-password';
    const ezpw_password_view = 'ezpw-password-view';
    const ezpw_hash = 'ezpw-hash';
    const ezpw_hash_view = 'ezpw-hash-view';

    const defaults = {
        size: 16,
        copy: false,
        fill: false,
        hide: false,
        syms: '&#@$*=!_+-',
        salt: ''
    };

    options = Object.assign({}, defaults, options);
    options.size = Math.min(Math.max(options.size, 4), 26);

    let eid = id => document.getElementById(id);

    let w = eid(ezpw_root);
    if (w === null) {
        let bk = [];
        if (options.hide) {
            Array.from(document.body.children).forEach((e) => {
                bk.push([e, e.style.display]);
                e.style.display = 'none';
            });
        }

        w = document.createElement('div');
        w.id = ezpw_root;
        w.innerHTML = `
		<div id=#${ezpw_top}#>
			<div><input id=#${ezpw_name}# type=#text# placeholder=#name#/><span id=#${ezpw_name_view}#></span></div>
			<div><input id=#${ezpw_password}# type=#text# placeholder=#password#/><span id=#${ezpw_password_view}#></span></div>
			<div><input id=#${ezpw_hash}# type=#text# placeholder=#secure# readonly/><span id=#${ezpw_hash_view}#></span></div>
		</div>`.replaceAll('#', String.fromCharCode(0x22));

        s = document.createElement('style');
        s.innerHTML = `@font-face {font-family: ezpw-dot; src: url(data:font/woff2;base64,d09GMgABAAAAAAMYAAoAAAAACAAAAALQAAEAAAAAAAAAAAAAAAAAAAAAAAAAAAAABmAAggAKcHILBgABNgIkAwYEIAWJSAcvG0gHEZWclBRfHdjGjMcejbPCigr7qKDg+LsxTTX9VG5KeuqFcjx8v9//1r7nuaWPuDZPLvFHJDE0PDGdlmhE8fgjeHpzA+CczabTdOmsNonoSPlDXgqBo5LlgFtuMgST01LLq68RXbX3Wf296rtJSNpS6Lv+9ynp1A7w4QdLa4DhBDzWC6UDB6h0sgTEY9uSeuhnjUEPkSNkiMjRElKai5cokj2WB468fyYu2egzAPzPzf+W5+3v9sGBwwdP2E+ep9kc0qy7V9ZFDmA+CEkNDU3wB+gD73KC75i+RTD9kU8JgTCQIUNCQgEFFFFECSWUUUYFFVRRRQ011FFHAw000UQLLbTRRged3wkZKCDDfCwGFECITqdz60++42Fd7fGE2eLEg6WXLF3q0tJZwNoaBBKr3vzqcnv3X01pDj7ff2pjWc+d9DNuZWUkGQhohuIlIlaGxbCS/qdPCmQ6AtBVoO5xEoUqtmIgLLYVmZZzSHa6k114UHTD6+ySi4pJlFB3KmbQzF6R1mvZXKg5JIGxf6elIqhXt9ODvU+Y07Az1jLCH5U88uA0/UuR9vyEMqTMNcpVuffBdX3fDcLodq7z2rxBzcoQ99UHatq/XKt1BxlLENUI/CHVqVW/dqtdbZSNKhKyrv1KRU5W4VXmJqu8j0qv1LJdlGaYaWOCsxH0zUJoYN+Zao5vjxGEd4QOSCGclxvYW3zH525iqBi3V1GTW/kgn1GpFTn9CpRSBsfYri0Mz7BUBRiZulCx8X15Weyvl6Ednk7DnVpOz8Uan2C8302Wvm4YS8zkkfkJ6yWo/+BDXozOsv2sY++TklM6sz0rjMqFK4/Ybi0IQ4a9vQPWAh8FKXvLwCQRi6Us4Ln4fIu+6Ap0pJoYqZLmEyDeMloLfxOcLyRjIyRFtoHyxRvCnvM1W/LlhJyWi7Ks9H/UTR7kj+o5AQCQiaxyXUfVz10D) format(#woff2#);}`.replaceAll('#', String.fromCharCode(0x22));

        document.head.appendChild(s);
        document.body.insertBefore(w, document.body.firstChild);

        const alpha = 'abcdefghijklmnopqrstuvwxyz';
        const digits = '0123456789';
        const syms = options.syms;

        const rotate = (s, n) => {
            let a = n % s.length;
            let b = (a > 0) ? (s.length - a) : -a;
            return (s.substr(b, s.length) + s.substr(0, b));
        };

        const hash = () => {
            const ALPHA = alpha.toUpperCase();
            const chars = alpha + ALPHA + digits + syms;
            const name = eid(ezpw_name).value;
            const password = eid(ezpw_password).value;
            (
                ((name.length > 0) && (password.length > 0)) ?
                    crypto.subtle.digest('SHA-256', new TextEncoder().encode(name + password + options.salt)).then((b) => {
                        return Array.from(new Uint8Array(b));
                    }).then((bs) => {
                        let s = bs[27] % 256;
                        let h = '';
                        for (let i = 4; i < options.size; ++i) {
                            h += chars[(bs[i] + s) % chars.length];
                            s = (s + (256 % chars.length)) % 256;
                        }
                        h = rotate(h + alpha[(bs[0]) % alpha.length], bs[31]);
                        h = rotate(h + ALPHA[(bs[1]) % ALPHA.length], bs[30]);
                        h = rotate(h + digits[(bs[2]) % digits.length], bs[29]);
                        h = rotate(h + syms[(bs[3]) % syms.length], bs[28]);
                        return h;
                    })
                    :
                    Promise.resolve('')
            ).then((h) => {
                let i = eid(ezpw_hash);
                let b = eid(ezpw_hash_view);
                i.value = h;
                update(i, b);
                if (options.copy) {
                    navigator.clipboard.writeText(h);
                }
                if (options.fill) {
                    let ps = Array.from(document.getElementsByTagName('input')).filter(e => (e.type == 'password'));
                    if (ps.length === 1) {
                        ps[0].value = h;
                    }
                }
            });
        };

        const escape = (e) => {
            if ((e === undefined) || (e.key === 'Escape')) {
                document.removeEventListener('keydown', escape);
                w.parentNode.removeChild(w);
                bk.forEach((ed) => {
                    ed[0].style.display = ed[1];
                });
            }
        };
        w.ezpw_escape = escape;

        document.addEventListener('keydown', escape, false);

        const traverse = (n, f) => {
            f(n);
            for (let i = 0; i < n.children.length; ++i) {
                traverse(n.children[i], f);
            }
        };

        traverse(w, (n) => {
            n.style.all = 'initial';
            let t = n.tagName.toLowerCase();
            if (t === 'div') {
                n.style.display = 'block';
            } else if (t === 'input') {
                n.autocomplete = 'off';
                Object.assign(n.style, {
                    width: '200px',
                    height: '20px',
                    border: '1px solid',
                    padding: '2px 2px',
                    fontFamily: 'Arial',
                    textAlign: 'center'
                });
            } else if (t === 'span') {
                n.innerHTML = '&#x1f441';
                n.draggable = false;
                Object.assign(n.style, {
                    userSelect: 'none',
                    border: '1px solid',
                    padding: '2px 2px'
                });
            }
        });
        Object.assign(w.style, {
            backgroundColor: 'white',
            display: 'flex',
            justifyContent: 'center'
        });
        Object.assign(eid(ezpw_top).style, {
            display: 'grid',
            gridGap: '5px',
            gridAutoFlow: 'row',
            padding: '5px'
        });

        const update = (i, b, visible) => {
            if (visible === undefined) {
                visible = b.style.backgroundColor.length > 0;
            }
            b.style.backgroundColor = visible ? '#00adef' : '';
            i.style.fontFamily = (visible || (i.value.length === 0)) ? 'Arial' : 'ezpw-dot';
        };

        const toggle = (id, init) => {
            let i = eid(id);
            let b = eid(id + '-view');
            let v = init;
            let cb = (e) => {
                if ((e !== undefined) && (e.type === 'click')) { v = !v; }
                update(i, b, v);
            };
            i.addEventListener('input', cb);
            b.addEventListener('click', cb);
            update(i, b, v);
        };

        toggle(ezpw_name, true);
        toggle(ezpw_password, false);
        toggle(ezpw_hash, false);

        if (crypto.subtle !== undefined) {
            eid(ezpw_name).addEventListener('input', hash);
            eid(ezpw_password).addEventListener('input', hash);
        } else {
            eid(ezpw_name).disabled = true;
            eid(ezpw_password).disabled = true;
            eid(ezpw_hash).value = 'insecure context';
            eid(ezpw_hash).style.color = 'red';
            update(eid(ezpw_hash), eid(ezpw_hash_view), true);
        }
    } else {
        w.ezpw_escape();
    }
})({});
