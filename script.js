const app = {
    email: localStorage.getItem('xxxd_mail') || null,
    token: localStorage.getItem('xxxd_token') || null,
    admin: "dome0082@gmail.com",
    db: [],

    init: function() {
        if(this.token) {
            document.getElementById('login-view').style.display = 'none';
            document.getElementById('main-view').style.display = 'block';
            this.load();
            this.startSync();
        }
    },

    login: async function() {
        const email = document.getElementById('log-email').value;
        const password = document.getElementById('log-pass').value;
        const res = await fetch('/api/auth/login', { method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({email, password}) });
        if(res.ok) {
            const data = await res.json();
            localStorage.setItem('xxxd_token', data.token);
            localStorage.setItem('xxxd_mail', data.email);
            location.reload();
        } else alert("Accesso negato");
    },

    upload: function() {
        const file = document.getElementById('up-file').files[0];
        if(!file) return;
        const fd = new FormData();
        fd.append('file', file); fd.append('titolo', document.getElementById('up-name').value); fd.append('owner', this.email);
        
        document.getElementById('p-wrap').style.display = 'block';
        const xhr = new XMLHttpRequest();
        xhr.upload.onprogress = (e) => {
            let p = Math.round((e.loaded / e.total) * 100);
            document.getElementById('p-bar').style.width = p + '%';
            document.getElementById('p-bar').innerText = p + '%';
        };
        xhr.onload = () => { this.load(); document.getElementById('p-wrap').style.display = 'none'; };
        xhr.open('POST', '/api/upload');
        xhr.send(fd);
    },

    load: async function() {
        const res = await fetch('/api/media');
        this.db = await res.json();
        this.render(this.db);
    },

    render: function(data) {
        const grid = document.getElementById('grid');
        grid.innerHTML = data.map((f, i) => `
            <div class="card" draggable="true" id="f-${i}">
                ${f.tipo === 'video' ? `<video src="${f.url}" class="thumb"></video>` : `<img src="${f.url}" class="thumb">`}
                <div class="card-meta">
                    <b onclick="app.openPlayer(${i})">${f.titolo}</b>
                    <div>
                        <i class="fa fa-heart" onclick="app.like('${f._id}')"></i>
                        ${(this.email === this.admin || f.owner === this.email) ? 
                          `<i class="fa fa-trash" style="color:red; margin-left:10px" onclick="app.remove('${f._id}')"></i>` : ''}
                    </div>
                </div>
            </div>
        `).join('');
    },

    remove: async function(id) {
        if(!confirm("Cancellare definitivamente?")) return;
        await fetch(`/api/media/${id}`, { 
            method: 'DELETE', 
            headers: {'Content-Type': 'application/json'}, 
            body: JSON.stringify({ userEmail: this.email }) 
        });
        this.load();
    },

    openPlayer: function(idx) {
        const f = this.db[idx];
        const v = document.getElementById('player-render');
        if(f.tipo === 'video') v.innerHTML = `<video id="v-play" src="${f.url}" style="width:100%" controls autoplay></video>`;
        else v.innerHTML = `<img src="${f.url}" style="width:100%; max-height:70vh; object-fit:contain">`;
        document.getElementById('modal-player').style.display = 'flex';
    },

    pCtrl: function(cmd) {
        const v = document.getElementById('v-play');
        if(!v) return;
        if(cmd === 'play') v.play();
        if(cmd === 'pause') v.pause();
        if(cmd === 'stop') { v.pause(); v.currentTime = 0; }
        if(cmd === 'full') v.requestFullscreen();
    },

    search: function() {
        const q = document.getElementById('q').value.toLowerCase();
        this.render(this.db.filter(f => f.titolo.toLowerCase().includes(q)));
    },

    startSync: function() {
        setInterval(async () => {
            const res = await fetch('/api/ping', { method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({email: this.email}) });
            const online = await res.json();
            document.getElementById('online-ui').innerHTML = `Online: ${online.length} utenti`;
            
            const cres = await fetch('/api/chat');
            const cdata = await cres.json();
            document.getElementById('chat-box').innerHTML = cdata.map(m => `<div><b>${m.user.split('@')[0]}:</b> ${m.msg}</div>`).join('');
        }, 5000);
    },

    logout: function() { localStorage.clear(); location.reload(); },
    modal: (id) => document.getElementById('modal-'+id).style.display = 'flex',
    closePlayer: () => { document.getElementById('modal-player').style.display = 'none'; document.getElementById('player-render').innerHTML = ''; }
};

window.onload = () => app.init();
