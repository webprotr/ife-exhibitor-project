const express = require('express');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// Test rotası
app.get('/', (req, res) => {
  res.json({ message: "IFE Exhibitor API Sunucusu Çalışıyor!" });
});

app.listen(PORT, () => {
  console.log(`Sunucu http://localhost:${PORT} adresinde çalışıyor`);
});