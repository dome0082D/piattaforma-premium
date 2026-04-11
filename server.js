require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cloudinary = require('cloudinary').v2;
const multer = require('multer');
const cors = require('cors');
const fs = require('fs');

const appServer = express();
appServer.use(cors());
appServer.use(express.json());
appServer.use(express.static(__dirname));

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

const upload = multer({ dest: 'uploads/' });

const Media = mongoose.model('Media', new mongoose.Schema({
  titolo: String, url: String, public_id: String, tipo: String,
  owner: String, categoria: { type: String, default: 'all' },
  likes: { type: Array, default: [] }, data: { type: Date, default: Date.now }
}));

const Chat = mongoose.model('Chat', new mongoose.Schema({
  user: String, msg: String, data: { type: Date, default: Date.now }
}));

mongoose.connect(process.env.MONGO_URI).then(() => console.log('✅ Connesso al Database xxxD'));

// API Caricamento
appServer.post('/api/upload', upload.single('file'), async (req, res) => {
  try {
    const result = await cloudinary.uploader.upload(req.file.path, { 
        resource_type: 'auto', 
        folder: 'xxxd_vault' 
    });
    const nuovo = new Media({
      titolo: req.body.titolo || "Senza titolo",
      url: result.secure_url,
      public_id: result.public_id,
      tipo: result.resource_type,
      owner: req.body.owner,
      categoria: req.body.categoria || 'all'
    });
    await nuovo.save();
    if (fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
    res.json(nuovo);
  } catch (err) { 
    console.error(err);
    res.status(500).json({ error: "Errore Cloudinary" }); 
  }
});

appServer.get('/api/media', async (req, res) => {
  const media = await Media.find().sort({ data: -1 });
  res.json(media);
});

appServer.post('/api/media/:id/like', async (req, res) => {
  const item = await Media.findById(req.params.id);
  const { user } = req.body;
  item.likes.includes(user) ? item.likes = item.likes.filter(u => u !== user) : item.likes.push(user);
  await item.save();
  res.json(item);
});

appServer.delete('/api/media/:id', async (req, res) => {
  const item = await Media.findById(req.params.id);
  if (item) await cloudinary.uploader.destroy(item.public_id, { resource_type: item.tipo });
  await Media.findByIdAndDelete(req.params.id);
  res.json({ ok: true });
});

// Chat API
appServer.post('/api/chat', async (req, res) => {
  const m = new Chat(req.body); await m.save(); res.json(m);
});

appServer.get('/api/chat', async (req, res) => {
  const msgs = await Chat.find().sort({ data: -1 }).limit(30);
  res.json(msgs);
});

// FIX PORTA PER RENDER
const PORT = process.env.PORT || 10000;
appServer.listen(PORT, '0.0.0.0', () => console.log(`🚀 Vault Attivo su porta ${PORT}`));