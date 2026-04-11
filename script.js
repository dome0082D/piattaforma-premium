const app = {
    user: localStorage.getItem('user'),
    data: [],

    login: function(tipo) {
        const email = document.getElementById('email').value;
        if (tipo === 'anonimo') {
            localStorage.setItem('user', 'anonimo');
        } else if (email) {
            localStorage.setItem('user', email);
        } else {
            return alert("Inserisci email o entra come anonimo");
        }
        location.reload();
    },

    init: async function() {
        if (!this.user) return;
        document.getElementById('login-screen').style.display = 'none';
        document.getElementById('app-content').style.display = 'block';
        document.getElementById('user-email').innerText = this.user;

        if (this.user === 'anonimo') {
            document.getElementById('upload-zone').style.display = 'none';
        }

        this.loadMedia();
        this.updateOnline();
        setInterval(() => this.updateOnline(), 10000);
    },

    loadMedia: async function() {
        const res = await fetch('/api/media');
        this.data = await res.json();
        this.render(this.data);
    },

    render: function(list) {
        const grid = document.getElementById('video-grid');
        grid.innerHTML = list.map(item => `
            <div class="video-card">
                <video src="${item.url}" onmouseover="this.play()" onmouseout="this.pause()" controls muted></video>
                <div class="card-info">
                    <span>${item.titolo}</span>
                    <div>
                        <i class="fa fa-heart" onclick="app.like('${item._id}')"></i>
                        ${this.user !== 'anonimo' ? `<i class="fa fa-trash" style="margin-left:10px" onclick="app.delete('${item._id}')"></i>` : ''}
                    </div>
                </div>
            </div>
        `).join('');
    },

    upload: function() {
        const file = document.getElementById('up-file').files[0];
        const title = document.getElementById('up-title').value;
        if (!file) return;

        const fd = new FormData();
        fd.append('file', file);
        fd.append('titolo', title || 'Senza titolo');
        fd.append('owner', this.user);

        const xhr = new XMLHttpRequest();
        document.getElementById('p-cont').style.display = 'block';
        xhr.upload.onprogress = (e) => {
            const p = Math.round((e.loaded / e.total) * 100);
            document.getElementById('p-bar').style.width = p + '%';
        };
        xhr.onload = () => location.reload();
        xhr.open('POST', '/api/upload');
        xhr.send(fd);
    },

    delete: async function(id) {
        if (confirm("Vuoi cancellare questo file?")) {
            await fetch(`/api/media/${id}`, { method: 'DELETE' });
            this.loadMedia();
        }
    },

    updateStyle: function() {
        const b = document.getElementById('bright-range').value;
        document.body.style.filter = `brightness(${b}%)`;
        // Il volume viene gestito dai video individualmente tramite querySelector
        const v = document.getElementById('vol-range').value / 100;
        document.querySelectorAll('video').forEach(vid => vid.volume = v);
    },

    search: function() {
        const val = document.getElementById('search').value.toLowerCase();
        const filtered = this.data.filter(i => i.titolo.toLowerCase().includes(val));
        this.render(filtered);
    },

    updateOnline: async function() {
        // Simulazione online o chiamata a /api/online se implementata nel server
        document.getElementById('online-list').innerHTML = `● ${this.user.split('@')[0]} (Tu)<br>● Admin`;
    },

    showSec: function(mode, val) {
        if (mode === 'all') this.render(this.data);
        if (mode === 'mine') this.render(this.data.filter(i => i.owner === this.user));
        if (mode === 'cat') this.render(this.data.filter(i => i.categoria === val));
    },

    toggleModal: function(id) {
        const m = document.getElementById(id);
        m.style.display = m.style.display === 'block' ? 'none' : 'block';
    }
};

window.onload = () => app.init();