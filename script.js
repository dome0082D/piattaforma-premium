const app = {
    email: localStorage.getItem('xxxd_email') || null,
    token: localStorage.getItem('xxxd_token') || null,
    media: [],
    currentMediaIndex: 0,

    init: function() {
        if(this.token) {
            document.getElementById('login-view').style.display = 'none';
            document.getElementById('app-view').style.display = 'block';
            this.loadMedia();
            this.loadChat();
            this.updateOnlineStatus();
            setInterval(() => this.loadChat(), 3000);
            setInterval(() => this.updateOnlineStatus(), 10000);
        } else {
            document.getElementById('login-view').style.display = 'block';
            document.getElementById('app-view').style.display = 'none';
        }
    },

    // --- AUTENTICAZIONE ---
    login: async function() {
        const email = document.getElementById('log-email').value;
        const password = document.getElementById('log-pass').value;
        const res = await fetch('/api/login', {
            method: 'POST', headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({email, password})
        });
        const data = await res.json();
        if(data.token) {
            localStorage.setItem('xxxd_token', data.token);
            localStorage.setItem('xxxd_email', data.email);
            this.email = data.email; this.token = data.token;
            this.init();
        } else alert(data.error);
    },

    register: async function() {
        const email = document.getElementById('log-email').value;
        const password = document.getElementById('log-pass').value;
        const res = await fetch('/api/register', {
            method: 'POST', headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({email, password})
        });
        if(res.ok) { alert("Registrato! Ora accedi."); } else alert("Errore");
    },

    // --- MEDIA & UPLOAD ---
    upload: function() {
        const file = document.getElementById('up-file').files[0];
        if(!file) return alert("Scegli un file");
        const fd = new FormData();
        fd.append('file', file); fd.append('titolo', document.getElementById('up-title').value); fd.append('owner', this.email);
        
        document.getElementById('p-wrap').style.display = 'block';
        const xhr = new XMLHttpRequest();
        xhr.upload.onprogress = (e) => {
            const p = Math.round((e.loaded / e.total) * 100);
            document.getElementById('p-bar').style.width = p + '%';
            document.getElementById('p-bar').innerText = p + '%';
        };
        xhr.onload = () => { alert("Caricato!"); this.loadMedia(); document.getElementById('p-wrap').style.display = 'none'; };
        xhr.open('POST', '/api/upload');
        xhr.send(fd);
    },

    loadMedia: async function() {
        const res = await fetch('/api/media');
        this.media = await res.json();
        this.render(this.media);
    },

    render: function(arr) {
        const grid = document.getElementById('grid');
        grid.innerHTML = arr.map((i, index) => {
            let preview = '';
            if(i.tipo === 'video') preview = `<video src="${i.url}" class="preview" muted onmouseover="this.play()" onmouseout="this.pause()" onclick="app.openPlayer(${index})"></video>`;
            else if(i.tipo === 'image') preview = `<img src="${i.url}" class="preview" onclick="app.openPlayer(${index})">`;
            else if(i.tipo === 'audio') preview = `<div class="preview" style="background:#222; display:flex; align-items:center; justify-content:center;" onclick="app.openPlayer(${index})"><i class="fa fa-music fa-3x"></i></div>`;
            else preview = `<div class="preview" style="background:#222; display:flex; align-items:center; justify-content:center;" onclick="app.openPlayer(${index})"><i class="fa fa-file-alt fa-3x"></i></div>`;

            return `
            <div class="card">
                ${preview}
                <div class="card-info">
                    <b>${i.titolo}</b>
                    <div class="card-actions">
                        <span class="btn-icon" onclick="app.like('${i._id}')"><i class="fa fa-heart"></i> ${i.likes.length}</span>
                        ${i.owner === this.email ? `<span class="btn-icon" onclick="app.del('${i._id}')"><i class="fa fa-trash"></i></span>` : ''}
                    </div>
                </div>
            </div>`;
        }).join('');
    },

    search: function() {
        const q = document.getElementById('search-input').value.toLowerCase();
        const t = document.getElementById('filter-type').value;
        const filtered = this.media.filter(m => 
            m.titolo.toLowerCase().includes(q) && (t === 'all' || m.tipo === t)
        );
        this.render(filtered);
    },

    showLikes: function() { this.render(this.media.filter(m => m.likes.includes(this.email))); },
    showMine: function() { this.render(this.media.filter(m => m.owner === this.email)); },

    like: async function(id) {
        await fetch(`/api/media/${id}/like`, { method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({ user: this.email }) });
        this.loadMedia();
    },

    del: async function(id) {
        if(confirm('Cancellare?')) {
            await fetch(`/api/media/${id}`, { method: 'DELETE' });
            this.loadMedia();
        }
    },

    // --- PLAYER MULTIMEDIALE REALE ---
    openPlayer: function(index) {
        this.currentMediaIndex = index;
        const item = this.media[index];
        const cont = document.getElementById('media-container');
        cont.innerHTML = '';

        if(item.tipo === 'video') cont.innerHTML = `<video id="active-media" src="${item.url}" style="width:100%; max-height:60vh;" controls autoplay></video>`;
        else if(item.tipo === 'image') cont.innerHTML = `<img id="active-media" src="${item.url}" style="width:100%; max-height:60vh; object-fit:contain;">`;
        else if(item.tipo === 'audio') cont.innerHTML = `<audio id="active-media" src="${item.url}" controls autoplay style="width:100%; margin-top:50px;"></audio>`;
        else cont.innerHTML = `<iframe id="active-media" src="${item.url}" style="width:100%; height:60vh; border:none;"></iframe>`;
        
        this.openModal('player-modal');
    },

    playerAction: function(action) {
        const el = document.getElementById('active-media');
        if(action === 'next') {
            if(this.currentMediaIndex < this.media.length - 1) this.openPlayer(this.currentMediaIndex + 1);
        } else if(action === 'prev') {
            if(this.currentMediaIndex > 0) this.openPlayer(this.currentMediaIndex - 1);
        } else if(el && el.play) {
            if(action === 'play') el.play();
            if(action === 'pause') el.pause();
            if(action === 'stop') { el.pause(); el.currentTime = 0; }
        }
        if(action === 'fullscreen' && el) {
            if(el.requestFullscreen) el.requestFullscreen();
        }
    },

    stopPlayer: function() {
        const el = document.getElementById('active-media');
        if(el && el.pause) el.pause();
    },

    // --- CHAT E ONLINE ---
    sendChat: async function() {
        const msg = document.getElementById('chat-msg').value;
        if(!msg) return;
        await fetch('/api/chat', { method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({ user: this.email, msg }) });
        document.getElementById('chat-msg').value = '';
        this.loadChat();
    },

    loadChat: async function() {
        const res = await fetch('/api/chat');
        const data = await res.json();
        const box = document.getElementById('chat-box');
        box.innerHTML = data.map(m => `<div class="msg ${m.user === this.email ? 'me' : ''}"><b>${m.user.split('@')[0]}</b>: ${m.msg}</div>`).join('');
        box.scrollTop = box.scrollHeight;
    },

    updateOnlineStatus: async function() {
        await fetch('/api/ping', { method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({ email: this.email }) });
        const res = await fetch('/api/online');
        const data = await res.json();
        document.getElementById('online-list').innerHTML = data.map(u => `<div class="online-user"><div class="dot"></div> ${u.email.split('@')[0]}</div>`).join('');
    },

    openModal: (id) => document.getElementById(id).style.display = 'block',
    closeModal: (id) => document.getElementById(id).style.display = 'none'
};

window.onload = () => app.init();
