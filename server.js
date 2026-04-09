const express = require('express');
const multer = require('multer');
const fs = require('fs');
const path = require('path');

const app = express();
app.use(express.json());
app.use(express.static('.'));

// Crea cartella upload se manca
if (!fs.existsSync('./uploads')) fs.mkdirSync('./uploads');
app.use('/uploads', express.static('uploads'));

// DATABASE IN MEMORIA
let db = {
    utenti: [],
    video: [{ id: 1, titolo: "Benvenuto", url: "https://www.w3schools.com/html/mov_bbb.mp4", autore: "Admin", likes: 0, thumbnail: "https://via.placeholder.com/300" }],
    chat: []
};

// --- ROTTE API ---
app.get('/api/dati', (req, res) => res.json(db));

app.post('/api/auth', (req, res) => {
    const { email, password, azione } = req.body;
    if (azione === 'registrati') {
        if (db.utenti.find(u => u.email === email)) return res.json({ success: false, msg: "Email già registrata!" });
        const nuovo = { email, password, nome: email.split('@')[0] };
        db.utenti.push(nuovo);
        return res.json({ success: true, utente: nuovo });
    }
    const utente = db.utenti.find(u => u.email === email && u.password === password);
    if (utente) return res.json({ success: true, utente });
    res.json({ success: false, msg: "Credenziali errate." });
});

app.listen(3000, () => console.log("🚀 PIATTAFORMA ONLINE: http://localhost:3000"));