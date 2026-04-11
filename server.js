require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cloudinary = require('cloudinary').v2;
const multer = require('multer');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

const appServer = express();
appServer.use(cors());
appServer.use(express.json());
appServer.use(express.static(__dirname));

// Configurazione Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

const upload = multer({ dest: 'uploads/' });

// SCHEMI DATABASE
// Media: supporta Video, Foto e Documenti grazie a resource_type: 'auto'
const Media = mongoose.model('Media', new mongoose.Schema({
  titolo: String,
  url: String,
  public_id: String,
  tipo: String, // video, image, raw
  owner: String,
  categoria: { type: String, default: 'all' },
  likes: { type: Array, default: [] },
  data: { type: Date, default: Date.now }
}));

// Chat e Allegati
const Chat = mongoose.model('Chat', new mongoose.Schema({
  user: String,
  msg: String,
  fileUrl: String,
  data: { type: Date, default: Date.now }
}));

// Stato Utenti Online
const UserStatus = mongoose.model('UserStatus', new mongoose.Schema({
  email: { type: String, unique: true },
  lastSeen: { type: Date, default: Date.now }
}));

// CONNESSIONE DB
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('✅ Connesso al Database xxxD'))
  .catch(err => console.error('❌ Errore DB:', err));

// --- ROTTE API ---

// 1. Upload File (Qualsiasi tipo)
appServer.post('/api/upload', upload.single('file'), async (req, res) => {
  try {
    // resource_type: 'auto' permette di caricare video, pdf, immagini, ecc.
    const result = await cloudinary.uploader.upload(req.file.path, { 
      resource_type: 'auto',
      folder: 'xxxd_vault'
    });
    
    const nuovoMedia = new Media({
      titolo: req.body.titolo,
      url: result.secure_url,
      public_id: result.public_id,
      tipo: result.resource_type,
      owner: req.body.owner,
      categoria: req.body.categoria || 'all'
    });

    await nuovoMedia.save();
    if (fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
    res.json(nuovoMedia);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 2. Recupero Media
appServer.get('/api/media', async (req, res) => {
  const media = await Media.find().sort({ data: -1 });
  res.json(media);
});

// 3. Cancellazione (Solo se non anonimo gestito lato client)
appServer.delete('/api/media/:id', async (req, res) => {
  try {
    const item = await Media.findById(req.params.id);
    if (item && item.public_id) {
      await cloudinary.uploader.destroy(item.public_id, { resource_type: item.tipo });
    }
    await Media.findByIdAndDelete(req.params.id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 4. Gestione Online (Ping)
appServer.post('/api/ping', async (req, res) => {
  const { email } = req.body;
  if (email && email !== 'anonimo') {
    await UserStatus.findOneAndUpdate(
      { email }, 
      { lastSeen: new Date() }, 
      { upsert: true }
    );
  }
  res.json({ ok: true });
});

appServer.get('/api/online', async (req, res) => {
  const threshold = new Date(Date.now() - 2 * 60 * 1000); // 2 minuti
  const onlineUsers = await UserStatus.find({ lastSeen: { $gte: threshold } });
  res.json(onlineUsers);
});

// 5. Chat
appServer.post('/api/chat', async (req, res) => {
  const msg = new Chat(req.body);
  await msg.save();
  res.json(msg);
});

appServer.get('/api/chat', async (req, res) => {
  const messaggi = await Chat.find().sort({ data: -1 }).limit(50);
  res.json(messaggi);
});

// Avvio Server
const PORT = process.env.PORT || 10000;
appServer.get('*', (req, res) => res.sendFile(path.join(__dirname, 'index.html')));
appServer.listen(PORT, () => console.log(`🚀 Server attivo su porta ${PORT}`));