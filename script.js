upload: async () => {
    const file = document.getElementById('up-file').files[0];
    const title = document.getElementById('up-title').value;
    const progressContainer = document.getElementById('progress-container');
    const progressBar = document.getElementById('progress-bar');
    
    if (!file) return alert("Seleziona un file!");

    const fd = new FormData();
    fd.append('file', file);
    fd.append('titolo', title);
    fd.append('owner', app.user);

    // Mostra la barra e resetta il progresso
    progressContainer.style.display = 'block';
    progressBar.style.width = '0%';
    progressBar.innerText = '0%';

    const xhr = new XMLHttpRequest();

    // Gestore del progresso
    xhr.upload.onprogress = (event) => {
        if (event.lengthComputable) {
            const percent = Math.round((event.loaded / event.total) * 100);
            progressBar.style.width = percent + '%';
            progressBar.innerText = percent + '%';
        }
    };

    // Quando il caricamento è finito
    xhr.onload = () => {
        if (xhr.status === 200) {
            alert("Caricato con successo!");
            progressContainer.style.display = 'none';
            app.loadMedia(); // Ricarica la griglia
        } else {
            alert("Errore durante l'upload: " + xhr.statusText);
            progressContainer.style.display = 'none';
        }
    };

    xhr.onerror = () => {
        alert("Errore di rete o connessione persa.");
        progressContainer.style.display = 'none';
    };

    xhr.open('POST', '/api/upload', true);
    xhr.send(fd);
}
