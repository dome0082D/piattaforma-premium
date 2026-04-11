const app = {
    user: localStorage.getItem('user') || 'User_' + Math.floor(Math.random()*999),
    allMedia: [],

    upload: function() {
        const file = document.getElementById('up-file').files[0];
        const title = document.getElementById('up-title').value;
        if(!file) return alert("Scegli un file prima!");

        const fd = new FormData();
        fd.append('file', file);
        fd.append('titolo', title);
        fd.append('owner', this.user);

        const pWrap = document.getElementById('p-wrap');
        const pBar = document.getElementById('p-bar');
        pWrap.style.display = 'block';

        const xhr = new XMLHttpRequest();
        xhr.upload.onprogress = (e) => {
            const p = Math.round((e.loaded / e.total) * 100);
            pBar.style.width = p + '%';
            pBar.innerText = p + '%';
        };

        xhr.onload = () => {
            if(xhr.status === 200) {
                alert("File caricato nel vault!");
                location.reload();
            } else {
                alert("Errore Server. Controlla Render.");
                pWrap.style.display = 'none';
            }
        };
        xhr.open('POST', '/api/upload');
        xhr.send(fd);
    },

    load: async function() {
        const res = await fetch('/api/media');
        this.allMedia = await res.json();
        this.render(this.allMedia);
    },

    render: function(data) {
        const grid = document.getElementById('grid');
        grid.innerHTML = data.map(item => `
            <div class="card">
                ${item.tipo === 'video' 
                    ? `<video src="${item.url}" muted loop onmouseover="this.play()" onmouseout="this.pause()"></video>` 
                    : `<img src="${item.url}" alt="anteprima">`}
                <div class="card-info">
                    <span>${item.titolo}</span>
                    <div class="actions">
                        <i class="fa fa-heart" onclick="app.like('${item._id}')" style="cursor:pointer"></i> ${item.likes.length}
                        <i class="fa fa-trash" onclick="app.delete('${item._id}')" style="margin-left:15px; cursor:pointer; color:#ff4444"></i>
                    </div>
                </div>
            </div>
        `).join('');
    },

    search: function() {
        const query = document.getElementById('search-input').value.toLowerCase();
        const filtered = this.allMedia.filter(m => m.titolo.toLowerCase().includes(query));
        this.render(filtered);
    },

    updateVisual: function() {
        const b = document.getElementById('range-bright').value;
        const v = document.getElementById('range-vol').value / 100;
        document.getElementById('v-body').style.filter = `brightness(${b}%)`;
        document.querySelectorAll('video').forEach(vid => vid.volume = v);
    },

    showSec: function(mode, val) {
        if(mode === 'all') this.render(this.allMedia);
        if(mode === 'cat') this.render(this.allMedia.filter(m => m.categoria === val));
        if(mode === 'likes') this.render(this.allMedia.filter(m => m.likes.includes(this.user)));
        if(mode === 'mine') this.render(this.allMedia.filter(m => m.owner === this.user));
    },

    openModal: (id) => document.getElementById(id).style.display = 'block',
    closeModal: (id) => document.getElementById(id).style.display = 'none'
};

// Avvio
window.onload = () => app.load();
