// backend/index.js
const express = require('express');
const cors = require('cors');
const db = require('./db');
const { scrapeExhibitors } = require('./scraper');

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// Test rotası
app.get('/', (req, res) => {
  res.json({ message: "IFE Exhibitor API Sunucusu Çalışıyor!" });
});

// 1. Veri Çekme Rotası (Tarayıcıdan doğrudan tıklayabilmek için hem GET hem POST)
const handleScrape = async (req, res) => {
  const year = req.body?.year || req.query?.year || 2026;
  try {
    const result = await scrapeExhibitors(Number(year));
    res.json({ success: true, message: "Scraping işlemi tamamlandı.", data: result });
  } catch (error) {
    res.status(500).json({ success: false, message: "Scraping sırasında hata oluştu.", error: error.message });
  }
};

app.post('/api/scrape', handleScrape);
app.get('/api/scrape', handleScrape); // Tarayıcıdan kolay erişim için

// 2. Exhibitor Listeleme ve Filtreleme Rotası
app.get('/api/exhibitors', async (req, res) => {
  try {
    const { year, category, search } = req.query;

    let query = db('exhibitors');

    if (year) {
      query = query.where('year', year);
    }

    if (category) {
      query = query.where('category', category);
    }

    if (search) {
      query = query.where('name', 'like', `%${search}%`);
    }

    const exhibitors = await query.select('*').orderBy('id', 'desc');
    res.json({ success: true, count: exhibitors.length, data: exhibitors });
  } catch (error) {
    res.status(500).json({ success: false, message: "Veriler getirilirken hata oluştu.", error: error.message });
  }
});

app.listen(PORT, () => {
  console.log(`Sunucu http://localhost:${PORT} adresinde çalışıyor`);
});