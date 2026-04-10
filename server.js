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
app.use(express.static(path.join(__dirname, 'public')));

// Database Schema per Video e Messaggi Chat
const MediaSchema = new mongoose.Schema({
  titolo: String, url: String, public_id: String, tipo: String, 
  owner: String, likes: { type: Array, default: [] }, data: { type: Date, default: Date.now }
});
const Media = mongoose.model('Media', MediaSchema);

const ChatSchema = new mongoose.Schema({ user: String, msg: String, fileUrl: String, data: { type: Date, default: Date.now } });
const Chat = mongoose.model('Chat', ChatSchema);

// Connessione MongoDB
mongoose.connect(process.env.MONGO_URI).then(() => console.log('✅ DB Connesso'));

// ROTTA CANCELLAZIONE (Nuova!)
app.delete('/api/media/:id', async (req, res) => {
  try {
    const item = await Media.findById(req.params.id);
    if (item.public_id) await cloudinary.uploader.destroy(item.public_id, { resource_type: item.tipo });
    await Media.findByIdAndDelete(req.params.id);
    res.json({ message: "Eliminato correttamente" });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ROTTA CHAT
app.get('/api/chat', async (req, res) => {
  const messaggi = await Chat.find().sort({ data: 1 }).limit(50);
  res.json(messaggi);
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log(`🚀 Server su porta ${PORT}`));