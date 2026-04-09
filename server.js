const express = require('express');
const mongoose = require('mongoose');
const cloudinary = require('cloudinary').v2;
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs'); // Aggiunto per l'hashing delle password

const app = express();
app.use(express.json());
app.use(express.static('.'));

// ==========================================
// 1. CONFIGURAZIONE SICURA
// ==========================================

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME, 
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
});

const MONGO_URI = process.env.MONGO_URI;

mongoose.connect(MONGO_URI)
    .then(() => console.log("✅ Connesso a MongoDB in modo sicuro!"))
    .catch(err => console.error("❌ Errore MongoDB:", err));

// ==========================================
// 2. MODELLI DATABASE
// ==========================================

const Utente = mongoose.model('Utente', new mongoose.Schema({
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    nome: String
}));

const Video = mongoose.model('Video', new mongoose.Schema({
    id: { type: Number, default: () => Date.now() },
    titolo: String,
    url: String,
    autore: String,
    likes: { type: Number, default: 0 },
    thumbnail: String
}));

const Messaggio = mongoose.model('Messaggio', new mongoose.Schema({
    autore: String, 
    testo: String, 
    fileUrl: String, 
    fileName: String, 
    orario: String,
    data: { type: Date, default: Date.now }
}));

// Configurazione cartella temporanea per multer
const upload = multer({ dest: 'temp/' });
if (!fs.existsSync('temp')) fs.mkdirSync('temp');

// ==========================================
// 3. ROTTE API
// ==========================================

// --- Ottenere Dati ---
app.get('/api/dati', async (req, res) => {
    try {
        const video = await Video.find().sort({ _id: -1 });
        const chat = await Messaggio.find().sort({ data: 1 });
        res.json({ video, chat });
    } catch (e) { 
        console.error("Errore recupero dati:", e);
        res.status(500).send("Errore del server"); 
    }
});

// --- Autenticazione e Registrazione ---
app.post('/api/auth', async (req, res) => {
    const { email, password, azione } = req.body;
    try {
        if (azione === 'registrati') {
            const esiste = await Utente.findOne({ email });
            if (esiste) return res.json({ success: false, msg: "Email già in uso." });

            // Cripta la password prima di salvarla
            const salt = await bcrypt.genSalt(10);
            const hashedPassword = await bcrypt.hash(password, salt);

            const nuovo = new Utente({ 
                email, 
                password: hashedPassword, 
                nome: email.split('@')[0] 
            });
            await nuovo.save();
            
            // Rimuoviamo la password dall'oggetto restituito al frontend per sicurezza
            nuovo.password = undefined; 
            return res.json({ success: true, utente: nuovo });
        }

        // Logica di Login
        const utente = await Utente.findOne({ email });
        if (!utente) return res.json({ success: false, msg: "Utente non trovato." });

        // Confronta la password inserita con quella criptata nel database
        const isMatch = await bcrypt.compare(password, utente.password);
        if (!isMatch) return res.json({ success: false, msg: "Password errata." });

        utente.password = undefined; // Nasconde la password prima di inviare la risposta
        return res.json({ success: true, utente });

    } catch (e) { 
        console.error("Errore Auth:", e);
        res.status(500).json({ success: false, msg: "Errore interno del server." }); 
    }
});

// --- Upload Video ---
app.post('/api/upload-video', upload.single('videoFile'), async (req, res) => {
    if (!req.file) return res.status(400).json({ success: false, msg: "Nessun file fornito" });
    
    try {
        const result = await cloudinary.uploader.upload(req.file.path, { 
            resource_type: "video", 
            folder: "piattaforma" 
        });
        
        const nuovoVideo = new Video({
            titolo: req.body.titolo, 
            url: result.secure_url, 
            autore: req.body.autore,
            thumbnail: result.secure_url.replace('.mp4', '.jpg')
        });
        
        await nuovoVideo.save();
        res.json({ success: true, video: nuovoVideo });
        
    } catch (e) { 
        console.error("Errore upload video:", e);
        res.status(500).json({ success: false, msg: "Errore durante l'upload del video." }); 
    } finally {
        // Garantisce che il file temporaneo venga eliminato in caso di successo E in caso di errore
        if (req.file && fs.existsSync(req.file.path)) {
            fs.unlinkSync(req.file.path);
        }
    }
});

// --- Invia Messaggio in Chat (con eventuale allegato) ---
app.post('/api/chat', upload.single('allegato'), async (req, res) => {
    try {
        let fileUrl = null;
        if (req.file) {
            const result = await cloudinary.uploader.upload(req.file.path, { 
                resource_type: "auto" 
            });
            fileUrl = result.secure_url;
        }
        
        const msg = new Messaggio({
            autore: req.body.autore, 
            testo: req.body.testo, 
            fileUrl: fileUrl,
            orario: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        });
        
        await msg.save();
        const chat = await Messaggio.find().sort({ data: 1 });
        res.json({ success: true, chat });
        
    } catch (e) { 
        console.error("Errore chat:", e);
        res.status(500).json({ success: false, msg: "Errore durante l'invio del messaggio." }); 
    } finally {
        // Pulizia file temporaneo
        if (req.file && fs.existsSync(req.file.path)) {
            fs.unlinkSync(req.file.path);
        }
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 Server sicuro attivo sulla porta ${PORT}`));