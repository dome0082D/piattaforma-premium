require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cloudinary = require('cloudinary').v2;
const multer = require('multer');
const cors = require('cors');
const fs = require('fs');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

const appServer = express();
appServer.use(cors());
appServer.use(express.json({ limit: '150mb' }));
appServer.use(express.static(__dirname));

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

const upload = multer({ dest: 'uploads/' });
const JWT_SECRET = process.env.JWT_SECRET || 'segreto_super_sicuro_xxxd';

// Modelli Database
const User = mongoose.model('User', new mongoose.Schema({
  email: { type: String, unique: true },
  password: String,
  lastActive: { type: Date, default: Date.now }
}));

const Media = mongoose.model('Media', new mongoose.Schema({
  titolo: String, url: String, public_id: String, tipo: String, formato: String,
  owner: String, likes: { type: Array, default: [] }, data: { type: Date, default: Date.now }
}));

const Chat = mongoose.model('Chat', new mongoose.Schema({
  user: String, msg: String, fileUrl: String, fileType: String, data: { type: Date, default: Date.now }
}));

mongoose.connect(process.env.MONGO_URI).then(() => console.log('✅ DB Connesso'));

// --- API AUTENTICAZIONE ---
appServer.post('/api/register', async (req, res) => {
  try {
    const hash = await bcrypt.hash(req.body.password, 10);
    const user = new User({ email: req.body.email, password: hash });
    await user.save();
    res.json({ success: true });
  } catch (err) { res.status(400).json({ error: "Email già in uso" }); }
});

appServer.post('/api/login', async (req, res) => {
  const user = await User.findOne({ email: req.body.email });
  if (!user || !(await bcrypt.compare(req.body.password, user.password))) {
    return res.status(401).json({ error: "Credenziali errate" });
  }
  user.lastActive = Date.now();
  await user.save();
  const token = jwt.sign({ email: user.email }, JWT_SECRET);
  res.json({ token, email: user.email });
});

appServer.post('/api/ping', async (req, res) => {
  if(req.body.email) await User.findOneAndUpdate({ email: req.body.email }, { lastActive: Date.now() });
  res.json({ ok: true });
});

appServer.get('/api/online', async (req, res) => {
  const dueMinutiFa = new Date(Date.now() - 2 * 60 * 1000);
  const online = await User.find({ lastActive: { $gte: dueMinutiFa } }).select('email');
  res.json(online);
});

// --- API MEDIA ---
appServer.post('/api/upload', upload.single('file'), async (req, res) => {
  try {
    const result = await cloudinary.uploader.upload(req.file.path, { resource_type: 'auto', folder: 'vault_xxxd' });
    const nuovo = new Media({
      titolo: req.body.titolo || "Senza titolo", url: result.secure_url, public_id: result.public_id,
      tipo: result.resource_type, formato: result.format || 'unknown', owner: req.body.owner
    });
    await nuovo.save();
    if (fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
    res.json(nuovo);
  } catch (err) { res.status(500).json(err); }
});

appServer.get('/api/media', async (req, res) => { res.json(await Media.find().sort({ data: -1 })); });

appServer.post('/api/media/:id/like', async (req, res) => {
  const item = await Media.findById(req.params.id);
  const { user } = req.body;
  item.likes.includes(user) ? item.likes = item.likes.filter(u => u !== user) : item.likes.push(user);
  await item.save();
  res.json(item);
});

appServer.delete('/api/media/:id', async (req, res) => {
  const item = await Media.findById(req.params.id);
  if(item) await cloudinary.uploader.destroy(item.public_id, { resource_type: item.tipo });
  await Media.findByIdAndDelete(req.params.id);
  res.json({ ok: true });
});

// --- API CHAT ---
appServer.get('/api/chat', async (req, res) => { res.json(await Chat.find().sort({ data: 1 }).limit(100)); });
appServer.post('/api/chat', async (req, res) => {
  const n = new Chat(req.body); await n.save(); res.json(n);
});

const PORT = process.env.PORT || 10000;
appServer.listen(PORT, '0.0.0.0', () => console.log(`🚀 Vault Live su ${PORT}`));