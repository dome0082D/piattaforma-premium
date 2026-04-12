const app = {
    email: localStorage.getItem('xxxd_mail') || null,
    token: localStorage.getItem('xxxd_token') || null,
    admin: "dome0082@gmail.com",
    db: [],
    draggedIdx: null,

    init: function() {
        this.updateClock();
        setInterval(() => this.updateClock(), 1000);
        
        if(this.token) {
            document.getElementById('auth-buttons').style.display = 'none';
            document.getElementById('user-info').style.display = 'flex';
            document.getElementById('user-email-display').innerText = this.email.split('@')[0];
            
            document.querySelectorAll('.auth-only').forEach(el => el.style.display = '');
            document.querySelectorAll('.auth-hidden').forEach(el => el.style.display = 'none');
            document.getElementById('set-email').innerText = this.email;
        } else {
            document.querySelectorAll('.auth-only').forEach(el => el.style.display = 'none');
            document.querySelectorAll('.auth-hidden').forEach(el => el.style.display = 'block');
        }

        this.load();
        this.startPolling();
    },

    updateClock: function() {
        const now = new Date();
        const options = { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit' };
        document.getElementById('clock-display').innerText = now.toLocaleDateString('it-IT', options);
    },

    // --- AUTHENTICATION ---
    login: async function() {
        const email = document.getElementById('log-email').value;
        const password = document.getElementById('log-pass').value;
        const res = await fetch('/api/auth/login', { method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({email, password}) });
        if(res.ok) {
            const data = await res.json();
            localStorage.setItem('xxxd_token', data.token); localStorage.setItem('xxxd_mail', data.email);
            location.reload();
        } else alert("Email o Password errata");
    },
    register: async function() {
        const email = document.getElementById('log-email').value;
        const password = document.getElementById('log-pass').value;
        if(!email || !password) return alert("Inserisci email e password");
        const res = await fetch('/api/auth/register', { method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({email, password}) });
        if(res.ok) {
            alert("Registrazione completata! Ora premi ACCEDI.");
            document.getElementById('log-pass').value = "";
        } else alert("Questa email esiste già nel sistema.");
    },
    changePass: async function() {
        const oldPass = document.getElementById('old-pass').value;
        const newPass = document.getElementById('new-pass').value;
        const res = await fetch('/api/auth/changepassword', { method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({email: this.email, oldPass, newPass}) });
        if(res.ok) { alert("Password modificata!"); this.closeModal('settings-modal'); }
        else alert("La vecchia password è errata.");
    },
    logout: function() { localStorage.clear(); location.reload(); },

    // --- CARICAMENTO E DRAG&DROP ---
    load: async function() {
        const res = await fetch('/api/media');
        this.db = await res.json();
        this.render(this.db);
        this.renderTopVideos();
    },

    upload: function() {
        const file = document.getElementById('up-file').files[0];
        if(!file) return alert("Seleziona un file!");
        const fd = new FormData();
        fd.append('file', file); 
        fd.append('titolo', document.getElementById('up-name').value || 'Senza titolo'); 
        fd.append('owner', this.email);
        
        document.getElementById('p-wrap').style.display = 'block';
        const xhr = new XMLHttpRequest();
        xhr.upload.onprogress = (e) => {
            let p = Math.round((e.loaded / e.total) * 100);
            document.getElementById('p-bar').style.width = p + '%';
            document.getElementById('p-bar').innerText = p + '%';
        };
        xhr.onload = () => { 
            this.load(); 
            document.getElementById('p-wrap').style.display = 'none';
            document.getElementById('up-file').value = '';
            document.getElementById('up-name').value = '';
            document.getElementById('p-bar').style.width = '0%';
        };
        xhr.open('POST', '/api/upload');
        xhr.send(fd);
    },

    render: function(data) {
        const grid = document.getElementById('grid');
        grid.innerHTML = data.map((f, i) => {
            let mediaHtml = '';
            if(f.tipo === 'video') mediaHtml = `<video src="${f.url}" class="preview"></video>`;
            else if(f.tipo === 'image') mediaHtml = `<img src="${f.url}" class="preview">`;
            else mediaHtml = `<div class="preview" style="display:flex;align-items:center;justify-content:center;color:#666"><i class="fa fa-file-alt fa-4x"></i></div>`;

            const canDelete = this.email && (this.email === this.admin || f.owner === this.email);

            return `
            <div class="card" draggable="true" ondragstart="app.dragStart(${i})" ondragover="event.preventDefault()" ondrop="app.drop(${i})">
                ${mediaHtml}
                <div class="card-bottom">
                    <b onclick="app.openPlayer(${i})" style="flex:1; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;" title="${f.titolo}">${f.titolo}</b>
                    <div class="card-icons">
                        <span style="font-size:11px; color:#aaa;"><i class="fa fa-eye"></i> ${f.views}</span>
                        <i class="fa fa-heart" style="color:${f.likes.includes(this.email) ? 'var(--red)' : '#fff'}" onclick="app.like('${f._id}')"></i>
                        ${canDelete ? `<i class="fa fa-trash" style="color:var(--red);" onclick="app.remove('${f._id}')"></i>` : ''}
                    </div>
                </div>
            </div>`;
        }).join('');
    },

    // Swap Logico: Impossibile sovrapporsi
    dragStart: function(i) { this.draggedIdx = i; },
    drop: function(targetIdx) {
        if(this.draggedIdx === null || this.draggedIdx === targetIdx) return;
        const item = this.db.splice(this.draggedIdx, 1)[0];
        this.db.splice(targetIdx, 0, item);
        this.render(this.db); 
    },

    remove: async function(id) {
        if(!confirm("Cancellare definitivamente questo file?")) return;
        await fetch(`/api/media/${id}`, { method: 'DELETE', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({ userEmail: this.email }) });
        this.load();
    },
    like: async function(id) {
        if(!this.token) return alert("Devi essere loggato.");
        await fetch(`/api/media/${id}/like`, { method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({ user: this.email }) });
        this.load();
    },

    // --- FILTRI E RICERCA ---
    renderTopVideos: function() {
        const sorted = [...this.db].filter(f => f.tipo === 'video').sort((a,b) => b.views - a.views).slice(0, 10);
        document.getElementById('top-videos-list').innerHTML = sorted.map((v, i) => `
            <div class="top-v-item" onclick="app.openPlayerByUrl('${v.url}', '${v._id}')">
                <b style="color:var(--red)">${i+1}.</b> <span style="flex:1; margin:0 5px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">${v.titolo}</span> 
                <span style="font-size:10px; color:#888;"><i class="fa fa-eye"></i> ${v.views}</span>
            </div>
        `).join('');
    },
    search: function() {
        const q = document.getElementById('q').value.toLowerCase();
        this.render(this.db.filter(f => f.titolo.toLowerCase().includes(q)));
    },
    filter: function(type) {
        if(type === 'all') this.render(this.db);
        else this.render(this.db.filter(f => f.tipo === type || (type==='raw' && f.tipo!=='video' && f.tipo!=='image' && f.tipo!=='audio') || (type==='audio' && f.formato==='mp3')));
    },
    showLikes: function() { this.render(this.db.filter(f => f.likes.includes(this.email))); },
    showMine: function() { this.render(this.db.filter(f => f.owner === this.email)); },

    // --- PLAYER REALE ---
    openPlayer: async function(idx) {
        const f = this.db[idx];
        await fetch(`/api/media/${f._id}/view`, { method: 'POST' }); 
        this.renderPlayerHtml(f.url, f.tipo);
        this.load(); 
    },
    openPlayerByUrl: async function(url, id) {
        await fetch(`/api/media/${id}/view`, { method: 'POST' });
        this.renderPlayerHtml(url, 'video');
        this.load();
    },
    renderPlayerHtml: function(url, type) {
        const v = document.getElementById('media-render');
        if(type === 'video') v.innerHTML = `<video id="active-media" src="${url}" style="max-width:100%; max-height:70vh;" controls autoplay></video>`;
        else if(type === 'audio') v.innerHTML = `<audio id="active-media" src="${url}" style="width:80%" controls autoplay></audio>`;
        else if(type === 'image') v.innerHTML = `<img src="${url}" style="max-width:100%; max-height:70vh; object-fit:contain;">`;
        else v.innerHTML = `<iframe id="active-media" src="${url}" style="width:100%; height:70vh; border:none; background:white;"></iframe>`;
        this.modal('player-modal');
    },

    pCtrl: function(cmd) {
        const m = document.getElementById('active-media');
        if(!m || m.tagName === 'IFRAME') return;
        if(cmd === 'play') m.play();
        if(cmd === 'pause') m.pause();
        if(cmd === 'stop') { m.pause(); m.currentTime = 0; }
        if(cmd === 'next') m.currentTime += 10; 
        if(cmd === 'prev') m.currentTime -= 10; 
        if(cmd === 'full' && m.requestFullscreen) m.requestFullscreen();
    },
    closePlayer: function() {
        this.closeModal('player-modal');
        const m = document.getElementById('active-media');
        if(m && m.pause) { m.pause(); m.removeAttribute('src'); m.load(); }
        document.getElementById('media-render').innerHTML = '';
    },

    // --- CHAT CON FILE E ONLINE ---
    sendChat: async function(customMsg) {
        const msg = customMsg || document.getElementById('chat-msg').value;
        if(!msg) return;
        await fetch('/api/chat', { method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({ user: this.email, msg }) });
        document.getElementById('chat-msg').value = '';
    },
    uploadToChat: function() {
        const file = document.getElementById('chat-file').files[0];
        if(!file) return;
        const fd = new FormData();
        fd.append('file', file); fd.append('titolo', 'File Chat'); fd.append('owner', this.email);
        
        const xhr = new XMLHttpRequest();
        xhr.onload = () => { 
            const data = JSON.parse(xhr.responseText);
            this.sendChat(`Ha condiviso un file: <a href="${data.url}" target="_blank" style="color:var(--red); font-weight:bold;">Apri File</a>`);
            this.load(); 
        };
        xhr.open('POST', '/api/upload');
        xhr.send(fd);
    },
    
    startPolling: function() {
        setInterval(async () => {
            // Online Users (Tempo di login calcolato)
            const pRes = await fetch('/api/ping', { method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({email: this.email}) });
            const online = await pRes.json();
            document.getElementById('online-box').innerHTML = online.map(u => {
                const isMe = u.email === this.email ? " <b style='color:var(--red)'>(Tu)</b>" : "";
                const mins = Math.floor((Date.now() - new Date(u.loginTime)) / 60000);
                const timeStr = mins < 1 ? 'Adesso' : (mins > 60 ? Math.floor(mins/60)+'h fa' : `${mins} min fa`);
                return `<div class="online-user-row">
                    <span><i class="fa fa-circle status-dot"></i> ${u.email.split('@')[0]}${isMe}</span>
                    <span style="color:#aaa; font-size:10px;">Loggato: ${timeStr}</span>
                </div>`;
            }).join('');
            
            // Chat Update
            const cRes = await fetch('/api/chat');
            const chat = await cRes.json();
            const box = document.getElementById('chat-box');
            const isScrolledToBottom = box.scrollHeight - box.clientHeight <= box.scrollTop + 10;
            
            box.innerHTML = chat.map(m => `
                <div class="chat-msg-row">
                    <b style="color:var(--dark)">${m.user.split('@')[0]}:</b> 
                    <span style="color:#333">${m.msg}</span>
                </div>`).join('');
                
            if(isScrolledToBottom) box.scrollTop = box.scrollHeight;
        }, 3000);
    },

    modal: (id) => { document.getElementById(id).style.display = 'flex'; },
    closeModal: (id) => { document.getElementById(id).style.display = 'none'; }
};

window.onload = () => app.init();
