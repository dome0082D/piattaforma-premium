const app = {
    email: localStorage.getItem('xxxd_mail') || null,
    token: localStorage.getItem('xxxd_token') || null,
    admin: "dome0082@gmail.com",
    db: [],
    draggedIdx: null,

    init: function() {
        this.updateClock();
        setInterval(() => this.updateClock(), 1000);
        
        // Setup UI per Loggati vs Anonimi
        if(this.token) {
            document.getElementById('auth-buttons').style.display = 'none';
            document.getElementById('user-info').style.display = 'block';
            document.getElementById('user-email-display').innerText = this.email;
            document.getElementById('upload-zone').style.display = 'flex';
            document.getElementById('chat-input-area').style.display = 'flex';
            document.getElementById('chat-guest-msg').style.display = 'none';
            document.getElementById('set-email').innerText = this.email;
        } else {
            // Nascondi funzioni protette agli anonimi
            document.querySelectorAll('.requires-auth').forEach(el => el.style.display = 'none');
        }

        this.load();
        this.startSync();
    },

    updateClock: function() {
        const now = new Date();
        document.getElementById('clock-display').innerText = now.toLocaleString('it-IT');
    },

    // --- AUTENTICAZIONE E IMPOSTAZIONI ---
    login: async function() {
        const email = document.getElementById('log-email').value;
        const password = document.getElementById('log-pass').value;
        const res = await fetch('/api/auth/login', { method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({email, password}) });
        if(res.ok) {
            const data = await res.json();
            localStorage.setItem('xxxd_token', data.token); localStorage.setItem('xxxd_mail', data.email);
            location.reload();
        } else alert("Dati errati");
    },
    register: async function() {
        const email = document.getElementById('log-email').value;
        const password = document.getElementById('log-pass').value;
        if(!email || !password) return alert("Inserisci email e password");
        const res = await fetch('/api/auth/register', { method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({email, password}) });
        if(res.ok) alert("Registrato! Ora premi Login.");
        else alert("Email forse già usata");
    },
    changePass: async function() {
        const oldPass = document.getElementById('old-pass').value;
        const newPass = document.getElementById('new-pass').value;
        const res = await fetch('/api/auth/changepassword', { method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({email: this.email, oldPass, newPass}) });
        if(res.ok) { alert("Password aggiornata!"); this.closeModal('settings-modal'); }
        else alert("Password vecchia errata");
    },
    logout: function() { localStorage.clear(); location.reload(); },

    // --- CARICAMENTO DATI ---
    load: async function() {
        const res = await fetch('/api/media');
        this.db = await res.json();
        this.render(this.db);
        this.renderTopVideos();
    },

    upload: function() {
        const file = document.getElementById('up-file').files[0];
        if(!file) return;
        const fd = new FormData();
        fd.append('file', file); fd.append('titolo', document.getElementById('up-name').value || 'Senza Titolo'); fd.append('owner', this.email);
        
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

    // --- RENDERING GRIGLIA E DRAG&DROP ---
    render: function(data) {
        const grid = document.getElementById('grid');
        grid.innerHTML = data.map((f, i) => {
            let mediaHtml = '';
            if(f.tipo === 'video') mediaHtml = `<video src="${f.url}" class="preview"></video>`;
            else if(f.tipo === 'image') mediaHtml = `<img src="${f.url}" class="preview">`;
            else mediaHtml = `<div class="preview" style="display:flex;align-items:center;justify-content:center;color:#666"><i class="fa fa-file fa-3x"></i></div>`;

            // Mostra cestino solo se è Admin O proprietario
            const canDelete = this.email && (this.email === this.admin || f.owner === this.email);

            return `
            <div class="card" draggable="true" ondragstart="app.dragStart(${i})" ondragover="event.preventDefault()" ondrop="app.drop(${i})">
                ${mediaHtml}
                <div class="card-bottom">
                    <b onclick="app.openPlayer(${i})" style="cursor:pointer; flex:1; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;" title="${f.titolo}">${f.titolo}</b>
                    <span style="font-size:10px; margin-right:5px;"><i class="fa fa-eye"></i> ${f.views}</span>
                    <i class="fa fa-heart" style="cursor:pointer; color:${f.likes.includes(this.email) ? 'red' : 'white'}" onclick="app.like('${f._id}')"></i>
                    ${canDelete ? `<i class="fa fa-trash" style="color:red; margin-left:8px; cursor:pointer;" onclick="app.remove('${f._id}')"></i>` : ''}
                </div>
            </div>`;
        }).join('');
    },

    dragStart: function(i) { this.draggedIdx = i; },
    drop: function(targetIdx) {
        if(this.draggedIdx === null || this.draggedIdx === targetIdx) return;
        const item = this.db.splice(this.draggedIdx, 1)[0];
        this.db.splice(targetIdx, 0, item);
        this.render(this.db); // Riordina graficamente senza sovrapporsi
    },

    remove: async function(id) {
        if(!confirm("Cancellare file?")) return;
        await fetch(`/api/media/${id}`, { method: 'DELETE', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({ userEmail: this.email }) });
        this.load();
    },
    like: async function(id) {
        if(!this.token) return alert("Devi loggarti per mettere like");
        await fetch(`/api/media/${id}/like`, { method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({ user: this.email }) });
        this.load();
    },

    // --- FILTRI, TOP VIDEO, RICERCA ---
    renderTopVideos: function() {
        const sorted = [...this.db].filter(f => f.tipo === 'video').sort((a,b) => b.views - a.views).slice(0, 5);
        document.getElementById('top-videos-list').innerHTML = sorted.map((v, i) => `
            <div class="top-v-item" onclick="app.openPlayerByUrl('${v.url}', '${v._id}')">
                <b>${i+1}. ${v.titolo}</b> <span><i class="fa fa-eye"></i> ${v.views}</span>
            </div>
        `).join('');
    },

    search: function() {
        const q = document.getElementById('q').value.toLowerCase();
        this.render(this.db.filter(f => f.titolo.toLowerCase().includes(q)));
    },
    filter: function(type) {
        if(type === 'all') this.render(this.db);
        else this.render(this.db.filter(f => f.tipo === type || (type==='audio' && f.tipo==='video' && f.formato==='mp3')));
    },
    showLikes: function() { this.render(this.db.filter(f => f.likes.includes(this.email))); },
    showMine: function() { this.render(this.db.filter(f => f.owner === this.email)); },

    // --- PLAYER REALE ---
    openPlayer: async function(idx) {
        const f = this.db[idx];
        await fetch(`/api/media/${f._id}/view`, { method: 'POST' }); // Aumenta visualizzazione
        this.renderPlayerHtml(f.url, f.tipo);
        this.load(); // Aggiorna views in UI
    },
    openPlayerByUrl: async function(url, id) {
        await fetch(`/api/media/${id}/view`, { method: 'POST' });
        this.renderPlayerHtml(url, 'video');
        this.load();
    },
    renderPlayerHtml: function(url, type) {
        const v = document.getElementById('media-render');
        if(type === 'video') v.innerHTML = `<video id="active-media" src="${url}" style="width:100%; max-height:70vh;" controls autoplay></video>`;
        else if(type === 'audio') v.innerHTML = `<audio id="active-media" src="${url}" style="width:100%" controls autoplay></audio>`;
        else if(type === 'image') v.innerHTML = `<img src="${url}" style="max-width:100%; max-height:70vh;">`;
        else v.innerHTML = `<iframe src="${url}" style="width:100%; height:70vh; border:none; background:white;"></iframe>`;
        this.modal('player-modal');
    },

    pCtrl: function(cmd) {
        const m = document.getElementById('active-media');
        if(!m) return;
        if(cmd === 'play') m.play();
        if(cmd === 'pause') m.pause();
        if(cmd === 'stop') { m.pause(); m.currentTime = 0; }
        if(cmd === 'full' && m.requestFullscreen) m.requestFullscreen();
    },
    closePlayer: function() {
        this.closeModal('player-modal');
        const m = document.getElementById('active-media');
        if(m) { m.pause(); m.removeAttribute('src'); m.load(); }
        document.getElementById('media-render').innerHTML = '';
    },

    // --- CHAT E ONLINE (Pulsazione ogni 5 sec) ---
    sendChat: async function() {
        const msg = document.getElementById('chat-msg').value;
        if(!msg) return;
        await fetch('/api/chat', { method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({ user: this.email, msg }) });
        document.getElementById('chat-msg').value = '';
    },
    startSync: function() {
        setInterval(async () => {
            // Online
            const pRes = await fetch('/api/ping', { method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({email: this.email}) });
            const online = await pRes.json();
            document.getElementById('online-box').innerText = `Utenti Online: ${online.length}`;
            
            // Chat
            const cRes = await fetch('/api/chat');
            const chat = await cRes.json();
            const box = document.getElementById('chat-box');
            const isScrolledToBottom = box.scrollHeight - box.clientHeight <= box.scrollTop + 1;
            box.innerHTML = chat.map(m => `<div><b style="color:var(--red)">${m.user.split('@')[0]}:</b> ${m.msg}</div>`).join('');
            if(isScrolledToBottom) box.scrollTop = box.scrollHeight;
        }, 3000);
    },

    modal: (id) => { document.getElementById(id).style.display = 'flex'; },
    closeModal: (id) => { document.getElementById(id).style.display = 'none'; }
};

window.onload = () => app.init();
