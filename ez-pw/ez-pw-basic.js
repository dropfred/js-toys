// drag'n'drop to your bookmarks: javascript:(e=>{(e=Object.assign({},{size:16,copy:!1,fill:!1,hide:!1,syms:'&#@$*=!_+-',salt:''},e)).size=Math.min(Math.max(e.size,4),26);let t=e=>document.getElementById(e),n=t('ezpw');if(null===n){let l=[];e.hide&&Array.from(document.body.children).forEach(e=>{l.push([e,e.style.display]),e.style.display='none'}),(n=document.createElement('div')).id='ezpw',n.innerHTML='<div id=#ezpw-top#><div><input id=#ezpw-name# type=#text# placeholder=#name#/></div><div><input id=#ezpw-password# type=#text# placeholder=#password#/></span></div><div><input id=#ezpw-hash# type=#text# placeholder=#secure# readonly/></div></div>'.replaceAll('#',String.fromCharCode(34)),document.body.insertBefore(n,document.body.firstChild);const i='abcdefghijklmnopqrstuvwxyz',d='0123456789',s=e.syms,a=(e,t)=>{let n=t%e.length,l=n>0?e.length-n:-n;return e.substr(l,e.length)+e.substr(0,l)},r=()=>{const n=i.toUpperCase(),l=i+n+d+s,r=t('ezpw-name').value,o=t('ezpw-password').value;(r.length>0&&o.length>0?crypto.subtle.digest('SHA-256',(new TextEncoder).encode(r+o+e.salt)).then(e=>Array.from(new Uint8Array(e))).then(t=>{let r=t[27]%256,o='';for(let n=4;n<e.size;++n)o+=l[(t[n]+r)%l.length],r=(r+256%l.length)%256;return o=a(o+i[t[0]%i.length],t[31]),o=a(o+n[t[1]%n.length],t[30]),o=a(o+d[t[2]%d.length],t[29]),o=a(o+s[t[3]%s.length],t[28])}):Promise.resolve('')).then(n=>{if(t('ezpw-hash').value=n,e.copy&&navigator.clipboard.writeText(n),e.fill){let e=Array.from(document.getElementsByTagName('input')).filter(e=>'password'==e.type);1===e.length&&(e[0].value=n)}})},o=e=>{void 0!==e&&'Escape'!==e.key||(document.removeEventListener('keydown',o),n.parentNode.removeChild(n),l.forEach(e=>{e[0].style.display=e[1]}))};n.ezpw_escape=o,document.addEventListener('keydown',o,!1);const p=(e,t)=>{t(e);for(let n=0;n<e.children.length;++n)p(e.children[n],t)};p(n,e=>{e.style.all='initial';let t=e.tagName.toLowerCase();'div'===t?e.style.display='block':'input'===t&&(e.autocomplete='off',Object.assign(e.style,{width:'200px',height:'20px',border:'1px solid',padding:'2px 2px',fontFamily:'Arial',textAlign:'center'}))}),Object.assign(n.style,{backgroundColor:'white',display:'flex',justifyContent:'center'}),Object.assign(t('ezpw-top').style,{display:'grid',gridGap:'5px',gridAutoFlow:'row',padding:'5px'}),void 0!==crypto.subtle?(t('ezpw-name').addEventListener('input',r),t('ezpw-password').addEventListener('input',r)):(t('ezpw-name').disabled=!0,t('ezpw-password').disabled=!0,t('ezpw-hash').value='insecure context',t('ezpw-hash').style.color='red')}else n.ezpw_escape()})({})
((options) => {
    const ezpw_root = 'ezpw';
    const ezpw_top = 'ezpw-top';
    const ezpw_name = 'ezpw-name';
    const ezpw_password = 'ezpw-password';
    const ezpw_hash = 'ezpw-hash';

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
			<div><input id=#${ezpw_name}# type=#text# placeholder=#name#/></div>
			<div><input id=#${ezpw_password}# type=#text# placeholder=#password#/></span></div>
			<div><input id=#${ezpw_hash}# type=#text# placeholder=#secure# readonly/></div>
		</div>`.replaceAll('#', String.fromCharCode(0x22));

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
                eid(ezpw_hash).value = h;
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

        if (crypto.subtle !== undefined) {
            eid(ezpw_name).addEventListener('input', hash);
            eid(ezpw_password).addEventListener('input', hash);
        } else {
            eid(ezpw_name).disabled = true;
            eid(ezpw_password).disabled = true;
            eid(ezpw_hash).value = 'insecure context';
            eid(ezpw_hash).style.color = 'red';
        }
    } else {
        w.ezpw_escape();
    }
})({});
