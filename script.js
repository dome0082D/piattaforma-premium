const app = {
    user: localStorage.getItem('user') || 'utente_' + Math.floor(Math.random()*1000),
    
    upload: function() {
        const file = document.getElementById('up-file').files[0];
        const title = document.getElementById('up-title').value;
        if(!file) return alert("Seleziona un file!");

        const fd = new FormData();
        fd.append('file', file);
        fd.append('titolo', title);
        fd.append('owner', this.user);

        const pCont = document.getElementById('p-cont');
        const pBar = document.getElementById('p-bar');
        pCont.style.display = 'block';

        const xhr = new XMLHttpRequest();
        xhr.upload.onprogress = (e) => {
            const percent = Math.round((e.loaded / e.total) * 100);
            pBar.style.width = percent + '%';
            pBar.innerText = percent + '%';
        };

        xhr.onload = () => {
            alert("Caricato con successo!");
            location.reload();
        };
        xhr.open('POST', '/api/upload');
        xhr.send(fd);
    },

    loadMedia: async function(filter = 'all') {
        const res = await fetch('/api/media');
        const data = await res.json();
        const gallery = document.getElementById('gallery');
        gallery.innerHTML = '';

        data.forEach(item => {
            if(filter !== 'all' && item.tipo !== filter) return;

            const card = document.createElement('div');
            card.className = 'card';
            card.innerHTML = `
                ${item.tipo === 'video' ? `<video src="${item.url}" controls></video>` : `<img src="${item.url}">`}
                <h4>${item.titolo}</h4>
                <button onclick="app.like('${item._id}')">❤️ ${item.likes.length}</button>
            `;
            gallery.appendChild(card);
        });
    },

    like: async function(id) {
        await fetch(`/api/media/${id}/like`, {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({ user: this.user })
        });
        this.loadMedia();
    },

    sendChat: async function() {
        const msg = document.getElementById('chat-msg').value;
        await fetch('/api/chat', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({ user: this.user, msg })
        });
        document.getElementById('chat-msg').value = '';
        this.loadChat();
    },

    loadChat: async function() {
        const res = await fetch('/api/chat');
        const data = await res.json();
        const box = document.getElementById('chat-box');
        box.innerHTML = data.map(m => `<p><b>${m.user}:</b> ${m.msg}</p>`).join('');
    }
};

// Inizializzazione
app.loadMedia();
app.loadChat();
setInterval(() => app.loadChat(), 3000);