const app = {
    user: 'User_' + Math.floor(Math.random()*999),
    allFiles: [],

    upload: function() {
        const file = document.getElementById('up-file').files[0];
        if(!file) return alert("Scegli un file!");

        const fd = new FormData();
        fd.append('file', file);
        fd.append('titolo', document.getElementById('up-title').value);
        fd.append('owner', this.user);

        document.getElementById('p-wrap').style.display = 'block';
        const xhr = new XMLHttpRequest();
        xhr.upload.onprogress = (e) => {
            const p = Math.round((e.loaded / e.total) * 100);
            document.getElementById('p-bar').style.width = p + '%';
            document.getElementById('p-bar').innerText = p + '%';
        };

        xhr.onload = () => { alert("Caricato!"); location.reload(); };
        xhr.open('POST', '/api/upload');
        xhr.send(fd);
    },

    load: async function() {
        const res = await fetch('/api/media');
        this.allFiles = await res.json();
        this.render(this.allFiles);
    },

    render: function(arr) {
        const grid = document.getElementById('grid');
        grid.innerHTML = arr.map(i => `
            <div class="card">
                ${i.tipo === 'video' 
                    ? `<video src="${i.url}" muted loop onmouseover="this.play()" onmouseout="this.pause()"></video>` 
                    : `<img src="${i.url}">`}
                <div class="card-info">
                    <span>${i.titolo}</span>
                    <i class="fa fa-heart" onclick="app.like('${i._id}')" style="cursor:pointer"></i> ${i.likes.length}
                </div>
            </div>
        `).join('');
    },

    search: function() {
        const q = document.getElementById('search-input').value.toLowerCase();
        const filtered = this.allFiles.filter(f => f.titolo.toLowerCase().includes(q));
        this.render(filtered);
    },

    updateVisual: function() {
        const b = document.getElementById('bright').value;
        const v = document.getElementById('vol').value / 100;
        document.getElementById('v-body').style.filter = `brightness(${b}%)`;
        document.querySelectorAll('video').forEach(vid => vid.volume = v);
    },

    like: async function(id) {
        await fetch(`/api/media/${id}/like`, { 
            method: 'POST', 
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({ user: this.user }) 
        });
        this.load();
    },

    openChat: () => document.getElementById('chat-modal').style.display = 'block',
    closeChat: () => document.getElementById('chat-modal').style.display = 'none'
};

window.onload = () => app.load();