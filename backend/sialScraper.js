// backend/sialScraper.js
const puppeteer = require('puppeteer');
const db = require('./db');
const axios = require('axios');
const fs = require('fs');
const path = require('path');

/**
 * Logoları ve Ürün Görsellerini /uploads klasörüne indiren fonksiyon
 */
async function downloadImage(imageUrl, fileName) {
  if (!imageUrl || !imageUrl.startsWith('http')) return null;
  try {
    const uploadDir = path.join(__dirname, 'uploads');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    const filePath = path.join(uploadDir, fileName);
    const writer = fs.createWriteStream(filePath);

    const response = await axios({
      url: imageUrl,
      method: 'GET',
      responseType: 'stream',
      timeout: 15000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      }
    });

    response.data.pipe(writer);

    return new Promise((resolve) => {
      writer.on('finish', () => resolve(`/uploads/${fileName}`));
      writer.on('error', () => resolve(null));
    });
  } catch (err) {
    return null;
  }
}

/**
 * Sayfayı yavaşça kaydırarak Lazy-Loading görsellerini tetikleyen fonksiyon
 */
async function autoScroll(page) {
  await page.evaluate(async () => {
    await new Promise((resolve) => {
      let totalHeight = 0;
      const distance = 300;
      const timer = setInterval(() => {
        const scrollHeight = document.body.scrollHeight;
        window.scrollBy(0, distance);
        totalHeight += distance;

        if (totalHeight >= scrollHeight - window.innerHeight) {
          clearInterval(timer);
          resolve();
        }
      }, 100);
    });
  });
}

/**
 * SIAL Paris 2026 Scraper - Kesin Konteynır Ayrıştırmalı (#partner, #information, #products)
 */
async function scrapeSialExhibitors(year = 2026) {
  const baseUrl = 'https://www.sialparis.com/en/exhibitors-2026/exhibitors';
  console.log(`[SIAL SCRAPER] Kesin ID Ayrıştırmalı Tarama Başlatılıyor (Yıl: ${year})...`);

  let browser;
  try {
    browser = await puppeteer.launch({
      headless: 'new',
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--window-size=1920,1080',
        '--user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      ]
    });

    const page = await browser.newPage();
    await page.setViewport({ width: 1920, height: 1080 });

    let initialList = [];
    let pageNum = 1;
    let hasMorePages = true;
    const maxPages = 350; // ~7.500 veriyi kapsayacak sayfa sayısı

    // ==========================================
    // ADIM 1: KATILIMCI DETAY LİNKLERİNİ TOPLAMA
    // ==========================================
    while (hasMorePages && pageNum <= maxPages) {
      const targetPageUrl = `${baseUrl}?catalog.prod.sial.exhibitors.en%5Bpage%5D=${pageNum}`;
      console.log(`[SIAL SCRAPER] Sayfa ${pageNum} yükleniyor: ${targetPageUrl}`);

      await page.goto(targetPageUrl, { waitUntil: 'networkidle2', timeout: 60000 });

      if (pageNum === 1) {
        try {
          const cookieBtn = await page.$('#onetrust-accept-btn-handler, [id*="cookie"] button');
          if (cookieBtn) await cookieBtn.click();
        } catch (e) {}
      }

      await autoScroll(page);
      await new Promise(resolve => setTimeout(resolve, 1200));

      const pageItems = await page.evaluate((currentYear) => {
        const items = [];
        const cardLinks = document.querySelectorAll('a[href*="/exhibitors-2026/exhibitor/"]');

        cardLinks.forEach(link => {
          const detailUrl = link.href;
          const nameEl = link.querySelector('h3, h2, h4, [class*="title"], [class*="name"]') || link;
          const name = nameEl ? nameEl.innerText.trim() : null;

          if (name && name.length > 1 && detailUrl && !items.some(i => i.detailUrl === detailUrl)) {
            items.push({ name, detailUrl, year: currentYear });
          }
        });

        return items;
      }, year);

      console.log(`   -> Sayfa ${pageNum}'den ${pageItems.length} şirket linki alındı.`);

      if (pageItems.length === 0) {
        hasMorePages = false;
        console.log(`[SIAL SCRAPER] Sayfa ${pageNum} boş döndü. Liste toplama bitti.`);
      } else {
        let newItemsFound = 0;
        pageItems.forEach(item => {
          if (!initialList.some(i => i.detailUrl === item.detailUrl)) {
            initialList.push(item);
            newItemsFound++;
          }
        });

        if (newItemsFound === 0 && pageNum > 1) {
          hasMorePages = false;
        } else {
          pageNum++;
        }
      }
    }

    console.log(`[SIAL SCRAPER] Toplam ${initialList.length} şirket detay sayfaları ayrıştırılıyor...`);
    let addedCount = 0;

    // ==========================================
    // ADIM 2: #partner, #information, #products BÖLÜMLERİNİ AYRI AYRI PARSE ETME
    // ==========================================
    for (const item of initialList) {
      if (!item.detailUrl) continue;

      try {
        console.log(` -> Detay Taranıyor: ${item.name}`);
        const detailPage = await browser.newPage();
        await detailPage.setViewport({ width: 1920, height: 1080 });
        await detailPage.goto(item.detailUrl, { waitUntil: 'networkidle2', timeout: 35000 });

        await autoScroll(detailPage);
        await new Promise(resolve => setTimeout(resolve, 1000));

        const pageData = await detailPage.evaluate(() => {
          // --- 1. #PARTNER KONTEYNIRI (İletişim, Stant, Logo, Adres, Web, Sosyal Medya) ---
          const partnerSec = document.querySelector('#partner') || document.body;

          // Firma Adı
          const companyName = partnerSec.querySelector('h1')?.innerText?.trim() || 
                              document.querySelector('h1')?.innerText?.trim();

          // Stant Numarası (örn: "4A H080")
          let standNumber = null;
          const standMatch = partnerSec.innerText.match(/Stands?\s*:\s*([A-Z0-9\s\/]+)/i);
          if (standMatch) standNumber = standMatch[1].trim();

          // Adres (Sadece #partner içerisinden temiz şekilde çekilir)
          let address = null;
          const addressMatch = partnerSec.innerText.match(/Address\s*\n([\s\S]*?)(?=\n\n|\n[A-Z][a-z]+:|\nhttps?:|Certifications|$)/i);
          if (addressMatch) {
            address = addressMatch[1].trim();
          }

          // Web Sitesi
          let website = null;
          const webLink = Array.from(partnerSec.querySelectorAll('a[href^="http"]')).find(
            a => !a.href.includes('sialparis.com') && 
                 !a.href.includes('linkedin') && 
                 !a.href.includes('youtube') && 
                 !a.href.includes('facebook') &&
                 !a.href.includes('instagram')
          );
          if (webLink) website = webLink.href;

          // Logo URL
          let logoUrl = null;
          const logoImg = partnerSec.querySelector('img[src*="logo"], [class*="logo"] img, img');
          if (logoImg) logoUrl = logoImg.src || logoImg.getAttribute('data-src');

          // Sosyal Medya
          const socials = {};
          const socialLinks = partnerSec.querySelectorAll('a[href*="linkedin"], a[href*="youtube"], a[href*="facebook"], a[href*="instagram"]');
          socialLinks.forEach(l => {
            if (l.href.includes('linkedin')) socials.linkedin = l.href;
            if (l.href.includes('youtube')) socials.youtube = l.href;
            if (l.href.includes('facebook')) socials.facebook = l.href;
            if (l.href.includes('instagram')) socials.instagram = l.href;
          });

          // --- 2. #INFORMATION KONTEYNIRI (Genel Bilgiler, Şirket Detayı, Sertifikalar) ---
          const infoSec = document.querySelector('#information');
          let fullDetails = null;
          if (infoSec) {
            fullDetails = infoSec.innerText.trim();
          }

          // Sertifikaları da topla
          const certs = [];
          const certEls = document.querySelectorAll('[class*="Certif"] div, [class*="certif"] span, a[href*="Certif"]');
          certEls.forEach(c => {
            const txt = c.innerText.trim();
            if (txt && !certs.includes(txt)) certs.push(txt);
          });

          if (certs.length > 0) {
            const certText = `Sertifikalar: ${certs.join(', ')}`;
            fullDetails = fullDetails ? `${fullDetails}\n\n${certText}` : certText;
          }

          // --- 3. #PRODUCTS KONTEYNIRI (Ürün Kataloğu) ---
          const products = [];
          const prodSec = document.querySelector('#products');
          if (prodSec) {
            const prodCards = prodSec.querySelectorAll('article, [class*="product"], [class*="Product"], [class*="card"], div > a');
            prodCards.forEach(pCard => {
              const pNameEl = pCard.querySelector('h3, h4, h2, [class*="title"], [class*="name"]');
              const pImgEl = pCard.querySelector('img');
              const pLinkEl = pCard.tagName === 'A' ? pCard : pCard.querySelector('a');

              const pName = pNameEl ? pNameEl.innerText.trim() : null;
              const pImg = pImgEl ? (pImgEl.src || pImgEl.getAttribute('data-src')) : null;
              const pLink = pLinkEl ? pLinkEl.href : null;

              if (pName && pName.length > 1 && !products.some(p => p.name === pName)) {
                products.push({
                  name: pName,
                  image_url: pImg,
                  product_link: pLink
                });
              }
            });
          }

          return {
            companyName: companyName || item.name,
            standNumber,
            address,
            website,
            logoUrl,
            socials,
            fullDetails,
            products
          };
        });

        await detailPage.close();

        const companyName = pageData.companyName || item.name;
        if (!companyName) continue;

        // Logoyu İndir
        let localLogoPath = null;
        if (pageData.logoUrl) {
          const safeName = companyName.replace(/[^a-z0-9]/gi, '_').toLowerCase();
          localLogoPath = await downloadImage(pageData.logoUrl, `logo_sial_${safeName}_${year}.png`);
        }

        // Veritabanında kontrol et & Güncelle / Ekle
        let exhibitor = await db('exhibitors').where({ name: companyName, year: item.year }).first();
        let exhibitorId;

        if (!exhibitor) {
          const [newId] = await db('exhibitors').insert({
            name: companyName,
            stand_number: pageData.standNumber,
            category: 'Gıda & İçecek / Food & Beverage',
            address: pageData.address,
            website: pageData.website || item.detailUrl,
            year: item.year,
            full_details: pageData.fullDetails,
            event_dates: 'SIAL Paris 2026',
            event_location: 'Paris Nord Villepinte',
            logo_url: pageData.logoUrl,
            local_logo_path: localLogoPath,
            linkedin_url: pageData.socials.linkedin || null,
            facebook_url: pageData.socials.facebook || null,
            instagram_url: pageData.socials.instagram || null,
            youtube_url: pageData.socials.youtube || null
          });
          exhibitorId = newId;
          addedCount++;
        } else {
          exhibitorId = exhibitor.id;
          await db('exhibitors').where({ id: exhibitorId }).update({
            stand_number: pageData.standNumber || exhibitor.stand_number,
            address: pageData.address || exhibitor.address,
            website: pageData.website || exhibitor.website,
            full_details: pageData.fullDetails || exhibitor.full_details,
            event_dates: 'SIAL Paris 2026',
            event_location: 'Paris Nord Villepinte',
            logo_url: pageData.logoUrl || exhibitor.logo_url,
            local_logo_path: localLogoPath || exhibitor.local_logo_path,
            linkedin_url: pageData.socials.linkedin || exhibitor.linkedin_url,
            youtube_url: pageData.socials.youtube || exhibitor.youtube_url
          });
        }

        // Ürünleri Kaydet (#products alanından gelenler)
        if (pageData.products && pageData.products.length > 0) {
          for (const prod of pageData.products) {
            let pLocalImg = null;
            if (prod.image_url) {
              const safePName = prod.name.replace(/[^a-z0-9]/gi, '_').toLowerCase();
              pLocalImg = await downloadImage(prod.image_url, `prod_sial_${exhibitorId}_${safePName}.png`);
            }

            const existingProd = await db('exhibitor_products')
              .where({ exhibitor_id: exhibitorId, name: prod.name })
              .first();

            if (!existingProd) {
              await db('exhibitor_products').insert({
                exhibitor_id: exhibitorId,
                name: prod.name,
                image_url: prod.image_url,
                local_image_path: pLocalImg,
                product_link: prod.product_link
              });
            }
          }
        }

      } catch (err) {
        console.error(` [SIAL HATA] (${item.name}):`, err.message);
      }
    }

    await browser.close();
    console.log(`[SIAL SCRAPER] SIAL Paris Taraması Başarıyla Tamamlandı!`);
    return { success: true, totalScraped: initialList.length, addedCount };

  } catch (error) {
    if (browser) await browser.close();
    console.error('[SIAL KRİTİK HATA]:', error.message);
    throw error;
  }
}

module.exports = { scrapeSialExhibitors };