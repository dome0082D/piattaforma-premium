const app = {
    user: localStorage.getItem('user'),
    data: [],

    login: () => {
        const mail = document.getElementById('email').value;
        if(mail) { localStorage.setItem('user', mail); location.reload(); }
    },

    init: async () => {
        if(app.user) {
            document.getElementById('login-screen').style.display = 'none';
            document.getElementById('app-content').style.display = 'block';
            document.getElementById('user-display').innerText = app.user;
            app.loadMedia();
            setInterval(app.loadChat, 3000);
        }
    },

    loadMedia: async () => {
        const res = await fetch('/api/media');
        app.data = await res.json();
        app.render(app.data);
    },

    render: (list) => {
        const grid = document.getElementById('video-grid');
        grid.innerHTML = list.map(item => `
            <div class="video-card">
                <video src="${item.url}" onmouseover="this.play()" onmouseout="this.pause()" controls muted></video>
                <div style="padding:12px; display:flex; justify-content:space-between; align-items:center;">
                    <span style="font-weight:bold;">${item.titolo}</span>
                    <div>
                        <i class="fa fa-heart" style="cursor:pointer; margin-right:15px;" onclick="alert('Aggiunto ai Like')"></i>
                        <i class="fa fa-trash" style="color:red; cursor:pointer;" onclick="app.delete('${item._id}')"></i>
                    </div>
                </div>
            </div>
        `).join('');
    },

    upload: () => {
        const file = document.getElementById('up-file').files[0];
        if(!file) return alert("Seleziona un file!");
        const fd = new FormData();
        fd.append('file', file);
        fd.append('titolo', document.getElementById('up-title').value || 'Video Vault');
        fd.append('owner', app.user);

        const pCont = document.getElementById('p-cont');
        const pBar = document.getElementById('p-bar');
        pCont.style.display = 'block';

        const xhr = new XMLHttpRequest();
        xhr.upload.onprogress = (e) => {
            const perc = Math.round((e.loaded / e.total) * 100);
            pBar.style.width = perc + '%'; pBar.innerText = perc + '%';
        };
        xhr.onload = () => { 
            alert("Upload Completato!"); pCont.style.display='none'; app.loadMedia(); 
        };
        xhr.open('POST', '/api/upload');
        xhr.send(fd);
    },

    delete: async (id) => {
        if(confirm("Vuoi eliminare definitivamente questo video?")) {
            await fetch(`/api/media/${id}`, { method: 'DELETE' });
            app.loadMedia();
        }
    },

    sendChat: async () => {
        const fd = new FormData();
        fd.append('user', app.user);
        fd.append('msg', document.getElementById('chat-msg').value);
        const f = document.getElementById('chat-file').files[0];
        if(f) fd.append('file', f);
        await fetch('/api/chat', { method: 'POST', body: fd });
        document.getElementById('chat-msg').value = '';
        app.loadChat();
    },

    loadChat: async () => {
        const res = await fetch('/api/chat');
        const msgs = await res.json();
        document.getElementById('chat-box').innerHTML = msgs.map(m => `
            <div style="margin-bottom:10px; border-bottom:1px solid #eee;">
                <b style="color:red">${m.user}:</b> ${m.msg} 
                ${m.fileUrl ? `<br><a href="${m.fileUrl}" target="_blank" style="font-size:11px; color:blue;">📎 Vedi allegato</a>`:''}
            </div>
        `).join('');
    },

    toggleModal: (id) => {
        const m = document.getElementById(id);
        m.style.display = (m.style.display === 'block') ? 'none' : 'block';
    },

    showSec: (type) => {
        if(type === 'all') app.render(app.data);
        if(type === 'mine') app.render(app.data.filter(x => x.owner === app.user));
        if(type === 'likes') alert("Sezione Preferiti Caricata");
    }
};

window.onload = app.init;