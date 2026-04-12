require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cloudinary = require('cloudinary').v2;
const multer = require('multer');
const cors = require('cors');
const fs = require('fs');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

const app = express();
app.use(cors());
app.use(express.json({ limit: '200mb' }));
app.use(express.static(__dirname));

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

const upload = multer({ dest: 'uploads/' });
const SECRET = process.env.JWT_SECRET || 'xxxd_super_secret_fluid_2026';
const ADMIN_EMAIL = "dome0082@gmail.com";

// --- DATABASE MODELS ---
const User = mongoose.model('User', new mongoose.Schema({
  email: { type: String, unique: true }, 
  password: String, 
  lastActive: { type: Date, default: Date.now },
  loginTime: { type: Date, default: Date.now }
}));

const Media = mongoose.model('Media', new mongoose.Schema({
  titolo: String, url: String, public_id: String, tipo: String, formato: String, 
  owner: String, likes: { type: Array, default: [] }, views: { type: Number, default: 0 }, data: { type: Date, default: Date.now }
}));

const Chat = mongoose.model('Chat', new mongoose.Schema({
  user: String, msg: String, data: { type: Date, default: Date.now }
}));

mongoose.connect(process.env.MONGO_URI).then(() => console.log('✅ Database Strutturato Connesso'));

// --- AUTHENTICATION ---
app.post('/api/auth/register', async (req, res) => {
  try {
    const hash = await bcrypt.hash(req.body.password, 10);
    await new User({ email: req.body.email, password: hash }).save();
    res.json({ success: true });
  } catch (e) { res.status(400).send("Email già registrata"); }
});

app.post('/api/auth/login', async (req, res) => {
  const user = await User.findOne({ email: req.body.email });
  if (!user || !(await bcrypt.compare(req.body.password, user.password))) return res.status(401).send("Dati errati");
  user.loginTime = Date.now();
  await user.save();
  const token = jwt.sign({ email: user.email }, SECRET);
  res.json({ token, email: user.email });
});

app.post('/api/auth/changepassword', async (req, res) => {
  const { email, oldPass, newPass } = req.body;
  const user = await User.findOne({ email });
  if (!user || !(await bcrypt.compare(oldPass, user.password))) return res.status(401).send("Password vecchia errata");
  user.password = await bcrypt.hash(newPass, 10);
  await user.save();
  res.json({ success: true });
});

// --- MEDIA SYSTEM ---
app.get('/api/media', async (req, res) => res.json(await Media.find().sort({ data: -1 })));

app.post('/api/upload', upload.single('file'), async (req, res) => {
  try {
    const result = await cloudinary.uploader.upload(req.file.path, { resource_type: 'auto', folder: 'vault_xxxd' });
    const nuovo = new Media({
      titolo: req.body.titolo || 'File senza titolo', url: result.secure_url, public_id: result.public_id,
      tipo: result.resource_type, formato: result.format, owner: req.body.owner
    });
    await nuovo.save();
    fs.unlinkSync(req.file.path);
    res.json(nuovo);
  } catch (err) { res.status(500).json(err); }
});

app.delete('/api/media/:id', async (req, res) => {
  const { userEmail } = req.body;
  const item = await Media.findById(req.params.id);
  if (!item) return res.status(404).send("File non trovato");
  // Potere di cancellazione: Solo Proprietario o Admin Dome
  if (userEmail === ADMIN_EMAIL || item.owner === userEmail) {
    await cloudinary.uploader.destroy(item.public_id, { resource_type: item.tipo });
    await Media.findByIdAndDelete(req.params.id);
    return res.json({ success: true });
  }
  res.status(403).send("Non autorizzato");
});

app.post('/api/media/:id/view', async (req, res) => {
  res.json(await Media.findByIdAndUpdate(req.params.id, { $inc: { views: 1 } }, { new: true }));
});

app.post('/api/media/:id/like', async (req, res) => {
  if(!req.body.user) return res.status(401).send("Login richiesto");
  const item = await Media.findById(req.params.id);
  item.likes.includes(req.body.user) ? item.likes = item.likes.filter(u => u !== req.body.user) : item.likes.push(req.body.user);
  await item.save(); res.json(item);
});

// --- CHAT & ONLINE PING ---
app.post('/api/chat', async (req, res) => { const m = new Chat(req.body); await m.save(); res.json(m); });
app.get('/api/chat', async (req, res) => res.json(await Chat.find().sort({ data: 1 }).limit(100)));

app.post('/api/ping', async (req, res) => {
  if(req.body.email) await User.findOneAndUpdate({ email: req.body.email }, { lastActive: Date.now() });
  // Online negli ultimi 30 secondi
  const online = await User.find({ lastActive: { $gte: new Date(Date.now() - 30000) } }).select('-password');
  res.json(online);
});

app.listen(process.env.PORT || 10000, '0.0.0.0');
