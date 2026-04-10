require('dotenv').config();
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const cloudinary = require('cloudinary').v2;
const multer = require('multer');
const fs = require('fs');

const app = express();

// Middleware di base
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 1. Configurazione Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

// 2. Configurazione Multer (Gestione file in entrata)
// Crea la cartella 'uploads' se non esiste
if (!fs.existsSync('uploads')) {
    fs.mkdirSync('uploads');
}
const upload = multer({ dest: 'uploads/' });

// 3. Connessione a MongoDB
mongoose.connect(process.env.MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true
})
.then(() => console.log('✅ Connesso a MongoDB in modo sicuro!'))
.catch(err => console.error('❌ Errore MongoDB:', err));

// 4. Schema e Modello del Database per i contenuti (Video/Immagini)
const MediaSchema = new mongoose.Schema({
  titolo: { type: String, required: true },
  url: { type: String, required: true },
  tipo: { type: String }, // 'image' o 'video'
  dataCreazione: { type: Date, default: Date.now }
});

const Media = mongoose.model('Media', MediaSchema);

// ==========================================
// ROTTE DEL SERVER (API)
// ==========================================

// Endpoint per visualizzare tutti i file (Popola la Home del tuo sito)
app.get('/api/media', async (req, res) => {
  try {
    const mediaList = await Media.find().sort({ dataCreazione: -1 });
    res.status(200).json(mediaList);
  } catch (error) {
    console.error('Errore nel caricamento dei dati:', error);
    res.status(500).json({ error: 'Errore nel recupero dei contenuti dal Vault' });
  }
});

// Endpoint per l'Upload dei file (Foto e Video)
app.post('/api/upload', upload.single('file'), async (req, res) => {
  try {
    // Controllo sicurezza
    if (!req.file) {
      return res.status(400).json({ error: 'Nessun file ricevuto dal server' });
    }

    const titoloInserito = req.body.titolo || 'Senza Titolo';
    console.log(`⏳ Inizio upload per: ${titoloInserito}`);

    // Caricamento effettivo su Cloudinary
    const result = await cloudinary.uploader.upload(req.file.path, {
      folder: 'piattaforma', // La tua cartella corretta
      upload_preset: 'dome0082', // Il tuo preset Signed
      resource_type: 'auto' // Accetta magicamente sia foto che video
    });

    // Scrittura nel database MongoDB
    const nuovoMedia = new Media({
      titolo: titoloInserito,
      url: result.secure_url,
      tipo: result.resource_type
    });

    await nuovoMedia.save();
    console.log(`✅ Upload e salvataggio DB completati per: ${titoloInserito}`);

    // Pulizia del file temporaneo dal server per non intasare la memoria di Render
    fs.unlinkSync(req.file.path);

    // Risposta di successo al Frontend
    res.status(200).json({ 
        message: 'Upload completato con successo!', 
        data: nuovoMedia 
    });

  } catch (error) {
    console.error('Errore upload video:', error);
    
    // Pulizia di emergenza in caso di errore
    if (req.file && fs.existsSync(req.file.path)) {
        fs.unlinkSync(req.file.path);
    }

    res.status(500).json({ 
        error: 'Caricamento fallito. Verifica le credenziali Cloudinary o la dimensione del file.',
        dettagli: error.message 
    });
  }
});

// Endpoint di test per verificare che il server sia vivo
app.get('/', (req, res) => {
  res.send('D.PLATFORM Server è Online e Operativo!');
});

// Avvio del server
const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
  console.log(`🚀 Server sicuro attivo sulla porta ${PORT}`);
});
