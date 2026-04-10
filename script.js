const app = {
    user: null,
    brightness: 1,
    volume: 0.5,

    // --- AUTENTICAZIONE ---
    login: () => {
        const email = document.getElementById('log-email').value;
        const pass = document.getElementById('log-pass').value;
        if (email && pass) {
            app.user = { email: email };
            localStorage.setItem('xxxD_user', email);
            document.getElementById('login-screen').style.display = 'none';
            document.getElementById('main-app').style.display = 'block';
            document.getElementById('user-name').innerText = email;
            app.loadMedia();
        } else {
            alert("Inserisci email e password!");
        }
    },

    logout: () => {
        localStorage.removeItem('xxxD_user');
        location.reload();
    },

    // --- GESTIONE VIDEO E FILE ---
    loadMedia: async () => {
        try {
            const res = await fetch('/api/media');
            const data = await res.json();
            const grid = document.getElementById('video-grid');
            grid.innerHTML = '';

            data.forEach(item => {
                const card = document.createElement('div');
                card.className = 'video-card';
                card.innerHTML = `
                    <video src="${item.url}" preload="metadata" onmouseover="this.play()" onmouseout="this.pause()" muted></video>
                    <div class="card-tools">
                        <span>${item.titolo}</span>
                        <div>
                            <i class="fa fa-heart" onclick="app.toggleLike('${item._id}')"></i>
                            <i class="fa fa-trash" style="color:red; margin-left:10px" onclick="app.deleteMedia('${item._id}')"></i>
                        </div>
                    </div>
                `;
                grid.appendChild(card);
            });
        } catch (err) {
            console.error("Errore caricamento:", err);
        }
    },

    upload: async () => {
        const fileInput = document.getElementById('up-file');
        const titleInput = document.getElementById('up-title');
        
        if (!fileInput.files[0]) return alert("Seleziona un file!");

        const formData = new FormData();
        formData.append('file', fileInput.files[0]);
        formData.append('titolo', titleInput.value || 'Senza titolo');

        alert("Caricamento avviato... attendi il completamento.");

        try {
            const res = await fetch('/api/upload', { method: 'POST', body: formData });
            if (res.ok) {
                alert("Caricato con successo!");
                titleInput.value = '';
                app.loadMedia();
            }
        } catch (err) {
            alert("Errore durante l'upload.");
        }
    },

    deleteMedia: async (id) => {
        if (confirm("Vuoi eliminare definitivamente questo file?")) {
            await fetch(`/api/media/${id}`, { method: 'DELETE' });
            app.loadMedia();
        }
    },

    // --- CONTROLLI SITO ---
    setLight: (val) => {
        document.body.style.opacity = val;
    },

    setVol: (val) => {
        const videos = document.querySelectorAll('video');
        videos.forEach(v => v.volume = val);
    },

    toggleModal: (id) => {
        const modal = document.getElementById(id);
        modal.style.display = (modal.style.display === 'block') ? 'none' : 'block';
    },

    goHome: () => {
        app.loadMedia();
        document.querySelector('main').style.display = 'block';
    }
};

// Controllo sessione esistente
window.onload = () => {
    const savedUser = localStorage.getItem('xxxD_user');
    if (savedUser) {
        document.getElementById('log-email').value = savedUser;
        document.getElementById('log-pass').value = "******";
        app.login();
    }
};
