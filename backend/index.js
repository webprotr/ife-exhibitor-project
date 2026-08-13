// backend/index.js
const express = require('express');
const cors = require('cors');
const db = require('./db');
const { scrapeExhibitors } = require('./scraper');

const app = express();
const PORT = process.env.PORT || 5000;

// CORS izinlerini tüm kökenlere (origin) açık hale getirelim
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json());

const path = require('path');

// Uploads klasörünü dış dünyaya (frontend'e) statik dosya olarak açıyoruz
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Test rotası
app.get('/', (req, res) => {
  res.json({ message: "IFE Exhibitor API Sunucusu Çalışıyor!" });
});

// 1. Veri Çekme Rotası (POST & GET)
const handleScrape = async (req, res) => {
  const year = req.body?.year || req.query?.year || 2026;
  console.log(`[API] /api/scrape isteği alındı. Yıl: ${year}`);
  
  try {
    const result = await scrapeExhibitors(Number(year));
    console.log('[API] Scraping başarılı:', result);
    res.json({ success: true, message: "Scraping işlemi tamamlandı.", data: result });
  } catch (error) {
    console.error('[API HATA] Scraping hatası:', error);
    res.status(500).json({ 
      success: false, 
      message: "Scraping sırasında hata oluştu.", 
      error: error.message 
    });
  }
};

app.post('/api/scrape', handleScrape);
app.get('/api/scrape', handleScrape);

// 2. Exhibitor Listeleme ve Filtreleme Rotası
app.get('/api/exhibitors', async (req, res) => {
  try {
    const { year, category, search } = req.query;

    let query = db('exhibitors');

    if (year) {
      query = query.where('year', year);
    }

    if (category && category !== '') {
      query = query.where('category', category);
    }

    if (search && search.trim() !== '') {
      query = query.where('name', 'like', `%${search.trim()}%`);
    }

    const exhibitors = await query.select('*').orderBy('id', 'desc');
    res.json({ success: true, count: exhibitors.length, data: exhibitors });
  } catch (error) {
    console.error('[API HATA] Exhibitors getirme hatası:', error);
    res.status(500).json({ success: false, message: "Veriler getirilirken hata oluştu.", error: error.message });
  }
});

// backend/index.js

// 3. Tekli Exhibitor Detay ve Partner Bilgileri Rotası
app.get('/api/exhibitors/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const exhibitor = await db('exhibitors').where({ id }).first();

    if (!exhibitor) {
      return res.status(404).json({ success: false, message: 'Exhibitor bulunamadı.' });
    }

    // İlişkili Ürünleri ve Partnerleri Çek
    const partners = await db('exhibitor_partners').where({ exhibitor_id: id });
    const products = await db('exhibitor_products').where({ exhibitor_id: id });

    res.json({
      success: true,
      data: {
        ...exhibitor,
        partners,
        products
      }
    });
  } catch (error) {
    console.error('[API HATA] Detay getirme hatası:', error);
    res.status(500).json({ success: false, message: 'Detaylar alınamadı.', error: error.message });
  }
});

// backend/index.js

// 4. Benzersiz Kategorileri ve Katılımcı Sayılarını Getiren Rota
app.get('/api/categories', async (req, res) => {
  try {
    const categories = await db('exhibitors')
      .whereNotNull('category')
      .whereNot('category', '')
      .select('category')
      .count('id as count')
      .groupBy('category')
      .orderBy('category', 'asc');

    res.json({
      success: true,
      data: categories
    });
  } catch (error) {
    console.error('[API HATA] Kategori getirme hatası:', error);
    res.status(500).json({ success: false, message: 'Kategoriler alınamadı.', error: error.message });
  }
});

// Scraper'ı import et
const { scrapeSialExhibitors } = require('./sialScraper');

// Yeni API Endpoint'i
app.post('/api/scrape/sial', async (req, res) => {
  try {
    res.json({ message: 'SIAL Paris 2026 tarama işlemi arka planda başlatıldı!' });
    scrapeSialExhibitors(2026).catch(err => console.error("SIAL Scrape Error:", err));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.listen(PORT, () => {
  console.log(`Sunucu http://localhost:${PORT} adresinde çalışıyor`);
});