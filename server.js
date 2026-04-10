require('dotenv').config(); // CARICA SUBITO LE CHIAVI
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const cloudinary = require('cloudinary').v2;
const multer = require('multer');
const fs = require('fs');

const app = express();

// --- AUTO-DIAGNOSI ---
console.log("🔍 Verifica variabili di ambiente...");
const requiredEnv = ['CLOUDINARY_CLOUD_NAME', 'CLOUDINARY_API_KEY', 'CLOUDINARY_API_SECRET', 'MONGO_URI'];
requiredEnv.forEach(key => {
  if (!process.env[key]) console.error(`❌ MANCA LA VARIABILE: ${key}`);
});

// Configurazione Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

app.use(cors());
app.use(express.json());

// Cartella temporanea per gli upload
const uploadDir = 'uploads/';
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir);
const upload = multer({ dest: uploadDir });

// Connessione MongoDB
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('✅ MongoDB Connesso con successo!'))
  .catch(err => console.error('❌ Errore critico MongoDB:', err.message));

// Schema Semplice
const Media = mongoose.model('Media', new mongoose.Schema({
  titolo: String,
  url: String,
  tipo: String,
  data: { type: Date, default: Date.now }
}));

// ROTTA CARICAMENTO (Immagini e Video)
app.post('/api/upload', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'Nessun file inviato' });

    console.log(`⏳ Caricamento in corso su Cloudinary: ${req.file.originalname}`);

    const result = await cloudinary.uploader.upload(req.file.path, {
      folder: 'piattaforma',
      resource_type: 'auto' // Rileva da solo se è foto o video
    });

    const nuovoMedia = new Media({
      titolo: req.body.titolo || 'Senza Titolo',
      url: result.secure_url,
      tipo: result.resource_type
    });

    await nuovoMedia.save();
    fs.unlinkSync(req.file.path); // Cancella file temporaneo

    console.log(`✅ File salvato! Titolo: ${nuovoMedia.titolo}`);
    res.status(200).json(nuovoMedia);

  } catch (error) {
    console.error('❌ Errore durante l\'upload:', error.message);
    if (req.file) fs.unlinkSync(req.file.path);
    res.status(500).json({ error: 'Errore interno: ' + error.message });
  }
});

// ROTTA VISUALIZZAZIONE (Per riempire il sito)
app.get('/api/media', async (req, res) => {
  try {
    const dati = await Media.find().sort({ data: -1 });
    res.json(dati);
  } catch (err) {
    res.status(500).json({ error: 'Errore recupero dati' });
  }
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
  console.log(`🚀 SERVER ONLINE SULLA PORTA ${PORT}`);
});
