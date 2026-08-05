# 🏛️ Exhibitor Data Çekimi Projesi

> **IFE (International Food & Drink Event)** fuar katılımcı verilerini, ürün kataloglarını, stant numaralarını ve detaylı iletişim/açılış bilgilerini otomatik olarak toplayan, veritabanına işleyen ve yüksek performanslı modern bir arayüzde sunan **Full-Stack Web Portalı**.

---

## 🌟 Öne Çıkan Özellikler

### 🕵️‍♂️ Derin & Bütünsel Scraper (Puppeteer Engine)
* **Sayfalandırma (Pagination) Desteği:** Sitedeki tüm dinamik sayfaları (`?page=X`) gezerek eksiksiz veri toplama.
* **Doğru Logo Tespiti:** Sayfadaki bayrak veya site banner'larını filtreleyerek nokta atışı gerçek şirket logolarını çekme.
* **Otomatik Aşağı Kaydırma (Auto-Scroll):** Lazy-loading mimarisine takılmadan footer'daki **Opening Times**, **Contact Us**, **Adres** ve **Organizatör** verilerini yakalama.
* **Sergilenen Ürün Kataloğu Çekimi:** Katılımcıların fuarda sergilediği tüm ürünlerin başlıklarını, bağlantılarını ve görsellerini indirip veritabanına kaydetme.
* **Görsel Sunucu İndiricisi (Local Storage):** Logoları ve ürün resimlerini sunucuya indirerek `/uploads` klasöründen statik olarak servis etme.

### 💻 Modern & Performanslı Arayüz (React 18 + Vite)
* **Glassmorphism & SaaS UI Tasarımı:** Dark Navy & Accent Blue renk paleti, dinamik kart efektleri ve mikro-etkileşimler.
* **Frontend Pagination & Performance:** 1000+ veriyi tarayıcıyı yormadan sayfa başı esnek gösterimle (12, 24, 48, 96 kart) akıcı sunma.
* **Gelişmiş Arama & Filtreleme:** Firma adı, stant numarası veya kategoriye göre anlık canlı arama; A-Z/Tarih sıralama.
* **Görsel Detay Pop-Up (Modal):** Kart üzerine tıklandığında şirket açıklaması (Overview), ürün vitrini grid'i, açılış saatleri ve sosyal medya bağlantılarını gösteren interaktif alan.

---

## 🛠️ Teknolojik Mimari (Tech Stack)

### **Backend (Node.js & Express)**
* **Runtime:** Node.js
* **Framework:** Express.js
* **Scraper Engine:** Puppeteer (Headless Browser Automation)
* **HTTP Client:** Axios (Image Downloading)
* **Database Query Builder:** Knex.js
* **Database:** SQLite3

### **Frontend (React)**
* **Build Tool:** Vite
* **Library:** React 18
* **Icons:** Lucide React
* **Styling:** Custom CSS (CSS Variables, Flexbox, CSS Grid Architecture)

---

## 📂 Proje Yapısı

```text
├── backend/
│   ├── migrations/             # Veritabanı tablo şemaları (Exhibitors, Products, Partners)
│   ├── uploads/                # İndirilen yerel logo ve ürün görselleri
│   ├── db.js                   # SQLite Knex veritabanı bağlantısı
│   ├── index.js                # Express API sunucusu ve statik dosya servisleri
│   └── scraper.js              # Derin Puppeteer scraping algoritması
│
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   └── ExhibitorModal.jsx # Detay ve Ürün Kataloğu Popup bileşeni
│   │   ├── App.jsx             # Ana arayüz, filtreleme ve pagination mantığı
│   │   ├── App.css             # Modern SaaS UI stilleri ve responsive grid
│   │   └── main.jsx            # React giriş noktası
│   └── package.json
└── README.md