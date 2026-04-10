require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cloudinary = require('cloudinary').v2;
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const app = express();
app.use(express.json());
app.use(express.static(__dirname));

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

const upload = multer({ dest: 'uploads/' });

// Schemi DB
const Media = mongoose.model('Media', new mongoose.Schema({
  titolo: String, url: String, public_id: String, tipo: String, owner: String, data: { type: Date, default: Date.now }
}));
const Chat = mongoose.model('Chat', new mongoose.Schema({
  user: String, msg: String, fileUrl: String, data: { type: Date, default: Date.now }
}));

mongoose.connect(process.env.MONGO_URI).then(() => console.log('✅ DB Connesso'));

// Rotte Media
app.get('/api/media', async (req, res) => res.json(await Media.find().sort({ data: -1 })));

app.post('/api/upload', upload.single('file'), async (req, res) => {
  try {
    const result = await cloudinary.uploader.upload(req.file.path, { resource_type: 'auto' });
    const nuovo = new Media({ titolo: req.body.titolo, url: result.secure_url, public_id: result.public_id, tipo: result.resource_type, owner: req.body.owner });
    await nuovo.save();
    fs.unlinkSync(req.file.path);
    res.json(nuovo);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.delete('/api/media/:id', async (req, res) => {
  const item = await Media.findById(req.params.id);
  if(item && item.public_id) await cloudinary.uploader.destroy(item.public_id, { resource_type: item.tipo });
  await Media.findByIdAndDelete(req.params.id);
  res.json({ ok: true });
});

// Rotte Chat
app.get('/api/chat', async (req, res) => res.json(await Chat.find().sort({ data: 1 })));
app.post('/api/chat', upload.single('file'), async (req, res) => {
  let fUrl = "";
  if(req.file) {
    const r = await cloudinary.uploader.upload(req.file.path, { resource_type: 'auto' });
    fUrl = r.secure_url; fs.unlinkSync(req.file.path);
  }
  const m = new Chat({ user: req.body.user, msg: req.body.msg, fileUrl: fUrl });
  await m.save(); res.json(m);
});

app.get('*', (req, res) => res.sendFile(path.join(__dirname, 'index.html')));
app.listen(process.env.PORT || 10000);