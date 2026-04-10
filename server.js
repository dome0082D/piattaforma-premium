require('dotenv').config();
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const cloudinary = require('cloudinary').v2;
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const app = express();

// Configurazione Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

app.use(cors());
app.use(express.json());
app.use(express.static(__dirname)); // Serve index.html dalla cartella principale

const upload = multer({ dest: 'uploads/' });

// Database Schemas
const Media = mongoose.model('Media', new mongoose.Schema({
  titolo: String, url: String, public_id: String, tipo: String, 
  owner: String, likes: { type: Array, default: [] }, data: { type: Date, default: Date.now }
}));

const Chat = mongoose.model('Chat', new mongoose.Schema({
  user: String, msg: String, fileUrl: String, data: { type: Date, default: Date.now }
}));

// Connessione MongoDB
mongoose.connect(process.env.MONGO_URI).then(() => console.log('✅ DB Connesso'));

// --- ROTTE MEDIA ---
app.get('/api/media', async (req, res) => {
  const dati = await Media.find().sort({ data: -1 });
  res.json(dati);
});

app.post('/api/upload', upload.single('file'), async (req, res) => {
  try {
    const result = await cloudinary.uploader.upload(req.file.path, { resource_type: 'auto', folder: 'piattaforma' });
    const nuovo = new Media({ 
        titolo: req.body.titolo, url: result.secure_url, public_id: result.public_id, 
        tipo: result.resource_type, owner: req.body.owner 
    });
    await nuovo.save();
    fs.unlinkSync(req.file.path);
    res.json(nuovo);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.delete('/api/media/:id', async (req, res) => {
  const item = await Media.findById(req.params.id);
  if(item.public_id) await cloudinary.uploader.destroy(item.public_id, { resource_type: item.tipo });
  await Media.findByIdAndDelete(req.params.id);
  res.json({ ok: true });
});

// --- ROTTE CHAT ---
app.get('/api/chat', async (req, res) => {
  const msg = await Chat.find().sort({ data: 1 }).limit(50);
  res.json(msg);
});

app.post('/api/chat/send', upload.single('file'), async (req, res) => {
  let fileUrl = "";
  if(req.file) {
    const result = await cloudinary.uploader.upload(req.file.path, { folder: 'chat_attachments' });
    fileUrl = result.secure_url;
    fs.unlinkSync(req.file.path);
  }
  const nuovoMsg = new Chat({ user: req.body.user, msg: req.body.msg, fileUrl: fileUrl });
  await nuovoMsg.save();
  res.json(nuovoMsg);
});

app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'index.html')));

app.listen(process.env.PORT || 10000);
