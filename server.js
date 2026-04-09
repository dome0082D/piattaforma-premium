const express = require('express');
const mongoose = require('mongoose');
const cloudinary = require('cloudinary').v2;
const multer = require('multer');
const fs = require('fs');
const path = require('path');

const app = express();
app.use(express.json());
app.use(express.static('.'));

// ==========================================
// 1. CONFIGURAZIONE CHIAVI (mongodb+srv://dome0082:<db_password>@cluster0.ewsgm7f.mongodb.net/?appName=Cluster0)
// ==========================================

// --- DATI CLOUDINARY ---
cloudinary.config({
    cloud_name: 'IL_TUO_CLOUD_NAME', 
    api_key: 'LA_TUA_API_KEY',
    api_secret: 'IL_TUO_API_SECRET'
});

// --- STRINGA MONGODB ATLAS ---
// Incolla quella che hai visto nell'ultima foto, mettendo la tua password
const MONGO_URI = 'mongodb+srv://admin:TUA_PASSWORD@cluster0.xxxx.mongodb.net/piattaforma?retryWrites=true&w=majority';

mongoose.connect(MONGO_URI)
    .then(() => console.log("✅ Connesso a MongoDB con successo!"))
    .catch(err => console.error("❌ Errore MongoDB:", err));

// ==========================================
// 2. SCHEMI DEL DATABASE
// ==========================================

const Utente = mongoose.model('Utente', new mongoose.Schema({
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    nome: String
}));

const Video = mongoose.model('Video', new mongoose.Schema({
    id: { type: Number, default: () => Date.now() },
    titolo: String,
    url: String, // Link di Cloudinary
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

// Setup cartella temporanea per i caricamenti
const upload = multer({ dest: 'temp/' });
if (!fs.existsSync('temp')) fs.mkdirSync('temp');

// ==========================================
// 3. ROTTE API (IL MOTORE)
// ==========================================

// Prendi tutti i dati all'avvio
app.get('/api/dati', async (req, res) => {
    try {
        const video = await Video.find().sort({ _id: -1 });
        const chat = await Messaggio.find().sort({ data: 1 });
        res.json({ video, chat });
    } catch (e) { res.status(500).send("Errore caricamento dati"); }
});

// Auth (Login e Registrazione)
app.post('/api/auth', async (req, res) => {
    const { email, password, azione } = req.body;
    try {
        if (azione === 'registrati') {
            const esiste = await Utente.findOne({ email });
            if (esiste) return res.json({ success: false, msg: "Email già registrata." });
            const nuovo = new Utente({ email, password, nome: email.split('@')[0] });
            await nuovo.save();
            return res.json({ success: true, utente: nuovo });
        }
        const utente = await Utente.findOne({ email, password });
        if (utente) return res.json({ success: true, utente });
        res.json({ success: false, msg: "Credenziali errate." });
    } catch (e) { res.json({ success: false, msg: "Errore login." }); }
});

// Caricamento Video su Cloudinary
app.post('/api/upload-video', upload.single('videoFile'), async (req, res) => {
    if (!req.file) return res.json({ success: false });
    try {
        const result = await cloudinary.uploader.upload(req.file.path, { resource_type: "video", folder: "piattaforma_video" });
        fs.unlinkSync(req.file.path); // Cancella file temporaneo sul server

        const nuovoVideo = new Video({
            titolo: req.body.titolo || "Nuovo Video",
            url: result.secure_url,
            autore: req.body.autore,
            thumbnail: result.secure_url.replace('.mp4', '.jpg')
        });
        await nuovoVideo.save();
        res.json({ success: true, video: nuovoVideo });
    } catch (e) { res.json({ success: false, msg: "Errore Cloudinary" }); }
});

// Chat con salvataggio su MongoDB
app.post('/api/chat', upload.single('allegato'), async (req, res) => {
    try {
        let fileUrl = null;
        let fileName = null;
        if (req.file) {
            const result = await cloudinary.uploader.upload(req.file.path, { resource_type: "auto", folder: "chat_files" });
            fileUrl = result.secure_url;
            fileName = req.file.originalname;
            fs.unlinkSync(req.file.path);
        }
        const msg = new Messaggio({
            autore: req.body.autore,
            testo: req.body.testo,
            fileUrl: fileUrl,
            fileName: fileName,
            orario: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        });
        await msg.save();
        const chatAggiornata = await Messaggio.find().sort({ data: 1 });
        res.json({ success: true, chat: chatAggiornata });
    } catch (e) { res.json({ success: false }); }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 Piattaforma attiva sulla porta ${PORT}`));

const Video = mongoose.model('Video', new mongoose.Schema({
    id: { type: Number, default: () => Date.now() },
    titolo: String,
    url: String, // Link eterno di Cloudinary
    autore: String,
    likes: { type: Number, default: 0 },
    thumbnail: String
}));

const Messaggio = mongoose.model('Messaggio', new mongoose.Schema({
const express = require('express');
const mongoose = require('mongoose');
const cloudinary = require('cloudinary').v2;
const multer = require('multer');
const fs = require('fs');
const path = require('path');

const app = express();
app.use(express.json());
app.use(express.static('.'));

// ==========================================
// 1. CONFIGURAZIONE SICURA (VARIABILI D'AMBIENTE)
// ==========================================

// Le chiavi reali NON sono qui, sono salvate su Render!
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
// 2. MODELLI E LOGICA (IL RESTO RIMANE UGUALE)
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
    autore: String, testo: String, fileUrl: String, fileName: String, orario: String,
    data: { type: Date, default: Date.now }
}));

const upload = multer({ dest: 'temp/' });
if (!fs.existsSync('temp')) fs.mkdirSync('temp');

// --- ROTTE API ---
app.get('/api/dati', async (req, res) => {
    try {
        const video = await Video.find().sort({ _id: -1 });
        const chat = await Messaggio.find().sort({ data: 1 });
        res.json({ video, chat });
    } catch (e) { res.status(500).send("Errore"); }
});

app.post('/api/auth', async (req, res) => {
    const { email, password, azione } = req.body;
    try {
        if (azione === 'registrati') {
            const esiste = await Utente.findOne({ email });
            if (esiste) return res.json({ success: false, msg: "Email già in uso." });
            const nuovo = new Utente({ email, password, nome: email.split('@')[0] });
            await nuovo.save();
            return res.json({ success: true, utente: nuovo });
        }
        const utente = await Utente.findOne({ email, password });
        if (utente) return res.json({ success: true, utente });
        res.json({ success: false, msg: "Errore login." });
    } catch (e) { res.json({ success: false }); }
});

app.post('/api/upload-video', upload.single('videoFile'), async (req, res) => {
    if (!req.file) return res.json({ success: false });
    try {
        const result = await cloudinary.uploader.upload(req.file.path, { resource_type: "video", folder: "piattaforma" });
        fs.unlinkSync(req.file.path);
        const nuovoVideo = new Video({
            titolo: req.body.titolo, url: result.secure_url, autore: req.body.autore,
            thumbnail: result.secure_url.replace('.mp4', '.jpg')
        });
        await nuovoVideo.save();
        res.json({ success: true, video: nuovoVideo });
    } catch (e) { res.json({ success: false }); }
});

app.post('/api/chat', upload.single('allegato'), async (req, res) => {
    try {
        let fileUrl = null;
        if (req.file) {
            const result = await cloudinary.uploader.upload(req.file.path, { resource_type: "auto" });
            fileUrl = result.secure_url;
            fs.unlinkSync(req.file.path);
        }
        const msg = new Messaggio({
            autore: req.body.autore, testo: req.body.testo, fileUrl: fileUrl,
            orario: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        });
        await msg.save();
        const chat = await Messaggio.find().sort({ data: 1 });
        res.json({ success: true, chat });
    } catch (e) { res.json({ success: false }); }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 Server sicuro attivo sulla porta ${PORT}`));