// backend/scraper.js
const puppeteer = require('puppeteer');
const db = require('./db');

/**
 * IFE Exhibitor sayfasından Puppeteer ile dinamik veri çeken fonksiyon
 * @param {number} year - Verinin kaydedileceği fuar yılı
 */
async function scrapeExhibitors(year = 2026) {
  const url = 'https://www.ife.co.uk/exhibitor-list';
  console.log(`[SCRAPER] Puppeteer başlatılıyor: ${url} (Yıl: ${year})`);

  let browser;
  try {
    // 1. Arka planda gizli bir Chrome tarayıcı başlat
    browser = await puppeteer.launch({
      headless: 'new', // Gizli modda çalış
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    const page = await browser.newPage();

    // Mobil değil masaüstü görünümü simüle et
    await page.setViewport({ width: 1280, height: 800 });

    // Sayfaya git ve ağ hareketlerinin durulmasını bekle
    console.log('[SCRAPER] Sayfaya gidiliyor...');
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 60000 });

    // 2. Sayfanın ve kartların yüklenmesini bekle
    console.log('[SCRAPER] İçeriklerin yüklenmesi bekleniyor...');
    
    // Sayfayı biraz aşağı kaydır (Lazy loading/sonsuz kaydırma tetiklensin)
    await page.evaluate(() => window.scrollBy(0, 1000));
    await new Promise(resolve => setTimeout(resolve, 3000));

    // 3. Sayfa içindeki verileri ayıkla
    const scrapedExhibitors = await page.evaluate((currentYear) => {
      const items = [];
      
      // Sitedeki olası kart seçicilerini tara
      const cards = document.querySelectorAll('.m-exhibitors-list__item, .exhibitor-card, [class*="exhibitor"], .m-card');

      cards.forEach(card => {
        // İsim bulma
        const nameEl = card.querySelector('.m-exhibitors-list__title, h3, .title, [class*="title"], [class*="name"]');
        const name = nameEl ? nameEl.innerText.trim() : null;

        // Stant numarası bulma
        const standEl = card.querySelector('.m-exhibitors-list__stand, [class*="stand"]');
        const standNumber = standEl ? standEl.innerText.trim() : null;

        // Kategori bulma
        const catEl = card.querySelector('.m-exhibitors-list__category, [class*="category"]');
        const category = catEl ? catEl.innerText.trim() : 'Genel';

        // Açıklama bulma
        const descEl = card.querySelector('.m-exhibitors-list__description, p, [class*="description"]');
        const description = descEl ? descEl.innerText.trim() : null;

        // Link bulma
        const linkEl = card.querySelector('a');
        const website = linkEl ? linkEl.href : null;

        if (name && name.length > 1) {
          items.push({
            name,
            stand_number: standNumber,
            category,
            description,
            website,
            year: currentYear
          });
        }
      });

      return items;
    }, year);

    console.log(`[SCRAPER] Toplam ${scrapedExhibitors.length} adet exhibitor çekildi.`);

    await browser.close();

    // 4. Verileri Veritabanına Kaydet
    let addedCount = 0;
    for (const item of scrapedExhibitors) {
      // Mükerrer kayıt engelleme
      const existing = await db('exhibitors')
        .where({ name: item.name, year: item.year })
        .first();

      if (!existing) {
        await db('exhibitors').insert(item);
        addedCount++;
      }
    }

    console.log(`[SCRAPER] Veritabanına ${addedCount} yeni kayıt eklendi.`);
    return { success: true, totalScraped: scrapedExhibitors.length, addedCount };

  } catch (error) {
    if (browser) await browser.close();
    console.error('[SCRAPER HATA]:', error.message);
    throw error;
  }
}

module.exports = { scrapeExhibitors };