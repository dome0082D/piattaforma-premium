require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cloudinary = require('cloudinary').v2;
const multer = require('multer');
const cors = require('cors');
const fs = require('fs');

const appServer = express();
appServer.use(cors());
appServer.use(express.json({ limit: '100mb' }));
appServer.use(express.static(__dirname));

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

const upload = multer({ dest: 'uploads/' });

const Media = mongoose.model('Media', new mongoose.Schema({
  titolo: String, url: String, public_id: String, tipo: String,
  owner: String, likes: { type: Array, default: [] }, data: { type: Date, default: Date.now }
}));

const Chat = mongoose.model('Chat', new mongoose.Schema({
  user: String, msg: String, data: { type: Date, default: Date.now }
}));

mongoose.connect(process.env.MONGO_URI).then(() => console.log('✅ Database Pronto'));

// API LIKE (Risolve l'errore app.like)
appServer.post('/api/media/:id/like', async (req, res) => {
  const item = await Media.findById(req.params.id);
  const { user } = req.body;
  if(!item.likes.includes(user)) { item.likes.push(user); } 
  else { item.likes = item.likes.filter(u => u !== user); }
  await item.save();
  res.json(item);
});

appServer.post('/api/upload', upload.single('file'), async (req, res) => {
  try {
    const result = await cloudinary.uploader.upload(req.file.path, { resource_type: 'auto', folder: 'vault_xxxd' });
    const nuovo = new Media({
      titolo: req.body.titolo || "Senza titolo",
      url: result.secure_url,
      public_id: result.public_id,
      tipo: result.resource_type,
      owner: req.body.owner
    });
    await nuovo.save();
    if (fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
    res.json(nuovo);
  } catch (err) { res.status(500).json(err); }
});

appServer.get('/api/media', async (req, res) => {
  res.json(await Media.find().sort({ data: -1 }));
});

appServer.post('/api/chat', async (req, res) => {
  const n = new Chat(req.body); await n.save(); res.json(n);
});

appServer.get('/api/chat', async (req, res) => {
  res.json(await Chat.find().sort({ data: -1 }).limit(20));
});

const PORT = process.env.PORT || 10000;
appServer.listen(PORT, '0.0.0.0', () => console.log(`🚀 Vault Live su porta ${PORT}`));