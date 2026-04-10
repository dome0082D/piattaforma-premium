const app = {
    user: localStorage.getItem('user'),
    data: [],

    login: () => {
        const mail = document.getElementById('email').value;
        if(mail){
            app.user = mail;
            localStorage.setItem('user', mail);
            location.reload();
        }
    },

    init: async () => {
        if(app.user){
            document.getElementById('login-screen').style.display = 'none';
            document.getElementById('app-content').style.display = 'block';
            document.getElementById('user-tag').innerText = app.user;
            document.getElementById('set-email').innerText = app.user;
            app.loadMedia();
            setInterval(app.loadChat, 3000); // Aggiorna chat ogni 3 sec
        }
    },

    loadMedia: async () => {
        const res = await fetch('/api/media');
        app.data = await res.json();
        app.render(app.data);
    },

    render: (list) => {
        const grid = document.getElementById('video-grid');
        grid.innerHTML = '';
        list.forEach(item => {
            // ANTEPRIMA: Se è video, crea thumbnail automatica
            const thumb = item.tipo === 'video' ? item.url.replace(".mp4", ".jpg") : item.url;
            grid.innerHTML += `
                <div class="video-card">
                    <video src="${item.url}" poster="${thumb}" onmouseover="this.play()" onmouseout="this.pause()" controls muted></video>
                    <div style="padding:10px; display:flex; justify-content:space-between">
                        <span>${item.titolo}</span>
                        <i class="fa fa-trash" style="color:red; cursor:pointer" onclick="app.delete('${item._id}')"></i>
                    </div>
                </div>
            `;
        });
    },

    showSec: (type) => {
        if(type === 'all') app.render(app.data);
        if(type === 'mine') app.render(app.data.filter(x => x.owner === app.user));
        if(type === 'likes') alert("Sezione Like (In fase di popolamento)");
    },

    upload: async () => {
        const file = document.getElementById('up-file').files[0];
        const title = document.getElementById('up-title').value;
        if(!file) return alert("Scegli un file");
        
        const fd = new FormData();
        fd.append('file', file);
        fd.append('titolo', title);
        fd.append('owner', app.user);
        
        alert("Caricamento in corso...");
        await fetch('/api/upload', { method: 'POST', body: fd });
        app.loadMedia();
    },

    sendChat: async () => {
        const msg = document.getElementById('chat-msg').value;
        const file = document.getElementById('chat-file').files[0];
        const fd = new FormData();
        fd.append('user', app.user);
        fd.append('msg', msg);
        if(file) fd.append('file', file);
        
        await fetch('/api/chat/send', { method: 'POST', body: fd });
        document.getElementById('chat-msg').value = '';
        app.loadChat();
    },

    loadChat: async () => {
        const res = await fetch('/api/chat');
        const msgs = await res.json();
        const box = document.getElementById('chat-box');
        box.innerHTML = msgs.map(m => `
            <div style="margin-bottom:5px">
                <b style="color:red">${m.user}:</b> ${m.msg} 
                ${m.fileUrl ? `<a href="${m.fileUrl}" target="_blank">📎 Allegato</a>` : ''}
            </div>
        `).join('');
    },

    delete: async (id) => {
        if(confirm("Eliminare?")) {
            await fetch(`/api/media/${id}`, { method: 'DELETE' });
            app.loadMedia();
        }
    },

    toggleModal: (id) => {
        const m = document.getElementById(id);
        m.style.display = (m.style.display === 'block') ? 'none' : 'block';
    },

    setLight: (v) => document.body.style.opacity = v,
    setVol: (v) => document.querySelectorAll('video').forEach(vid => vid.volume = v)
};

app.init();
