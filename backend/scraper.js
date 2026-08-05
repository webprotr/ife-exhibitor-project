// backend/scraper.js
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
 * Sayfayı yavaşça en alta kaydırarak Lazy-Loading görsellerini ve alanları yükleten fonksiyon
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
 * IFE Exhibitor Listesi - Tam Kapsamlı (URL Parametreli Sayfalandırma + Detay + Ürünler) Scraper
 */
async function scrapeExhibitors(year = 2026) {
  const baseUrl = 'https://www.ife.co.uk/exhibitors';
  console.log(`[SCRAPER] Kesin URL Sayfalandırması İle Derin Tarama Başlatılıyor: (Yıl: ${year})`);

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
    const maxPages = 30; // İhtiyaca göre sayfa sınırını artırabilirsin

    // ==========================================
    // ADIM 1: ?page=X PARAMETRESİ İLE TÜM SAYFALARI GEZME
    // ==========================================
    while (hasMorePages && pageNum <= maxPages) {
      // Dinamik Sayfa URL'si
      const targetPageUrl = `${baseUrl}?page=${pageNum}&searchgroup=00000001-exhibitors`;
      console.log(`[SCRAPER] Sayfa ${pageNum} yükleniyor: ${targetPageUrl}`);

      await page.goto(targetPageUrl, { waitUntil: 'networkidle2', timeout: 60000 });

      // İlk sayfada çerez butonunu kapat
      if (pageNum === 1) {
        try {
          const cookieBtn = await page.$('#onetrust-accept-btn-handler, .cookie-accept, [id*="cookie"] button');
          if (cookieBtn) await cookieBtn.click();
        } catch (e) {}
      }

      await autoScroll(page);
      await new Promise(resolve => setTimeout(resolve, 1500));

      const pageItems = await page.evaluate((currentYear) => {
        const items = [];
        const cards = document.querySelectorAll(
          '.m-exhibitors-list__item, .exhibitor-card, [class*="exhibitor-list__item"], .m-card, article'
        );

        cards.forEach(card => {
          const nameEl = card.querySelector(
            '.m-exhibitors-list__title, h3, h2, h4, .title, [class*="title"], [class*="name"], a strong'
          );
          const name = nameEl ? nameEl.innerText.trim() : null;

          const standEl = card.querySelector('.m-exhibitors-list__stand, [class*="stand"]');
          const standNumber = standEl ? standEl.innerText.trim() : null;

          const catEl = card.querySelector('.m-exhibitors-list__category, [class*="category"]');
          const category = catEl ? catEl.innerText.trim() : 'Genel';

          const linkEl = card.tagName === 'A' ? card : card.querySelector('a');
          const detailUrl = linkEl ? linkEl.href : null;

          if (name && name.length > 1 && !name.toLowerCase().includes('filter')) {
            items.push({
              name,
              stand_number: standNumber,
              category,
              detailUrl,
              year: currentYear
            });
          }
        });

        return items;
      }, year);

      console.log(`   -> Sayfa ${pageNum}'den ${pageItems.length} şirket bulundu.`);

      // Eğer sayfadan hiç eleman dönmediyse veya hepsi daha önce eklendiyse son sayfaya gelinmiştir
      if (pageItems.length === 0) {
        hasMorePages = false;
        console.log(`[SCRAPER] Sayfa ${pageNum} boş döndü. Tarama sonlandırılıyor.`);
      } else {
        // Çift kayıtları engellemek için listeyi birleştir
        let newItemsFound = 0;
        pageItems.forEach(item => {
          if (!initialList.some(i => i.name === item.name)) {
            initialList.push(item);
            newItemsFound++;
          }
        });

        // Eğer o sayfadaki tüm şirketler zaten önceki sayfalardan geldiyse döngüyü bitir
        if (newItemsFound === 0 && pageNum > 1) {
          hasMorePages = false;
        } else {
          pageNum++;
        }
      }
    }

    console.log(`[SCRAPER] Toplam ${initialList.length} benzersiz şirket toplandı. Detaylar ve Ürünler çekilecek...`);
    let addedCount = 0;

    // ==========================================
    // ADIM 2: HER ŞİRKETİN DETAY, LOGO, FOOTER VE ÜRÜNLERİNİ ÇEKME
    // ==========================================
    for (const item of initialList) {
      let exhibitor = await db('exhibitors').where({ name: item.name, year: item.year }).first();
      let exhibitorId;

      if (!exhibitor) {
        const [newId] = await db('exhibitors').insert({
          name: item.name,
          stand_number: item.stand_number,
          category: item.category,
          website: item.detailUrl,
          year: item.year
        });
        exhibitorId = newId;
        addedCount++;
      } else {
        exhibitorId = exhibitor.id;
      }

      if (item.detailUrl && item.detailUrl.includes('ife.co.uk')) {
        try {
          console.log(` -> Detay & Ürünler Taranıyor: ${item.name}`);
          const detailPage = await browser.newPage();
          await detailPage.setViewport({ width: 1920, height: 1080 });
          await detailPage.goto(item.detailUrl, { waitUntil: 'networkidle2', timeout: 35000 });

          await autoScroll(detailPage);
          await new Promise(resolve => setTimeout(resolve, 1500));

          const pageData = await detailPage.evaluate(() => {
            // Overview Açıklama Metni
            let fullDetails = null;
            const overviewDescEl = document.querySelector(
              '.m-exhibitor-entry__item__body__content__overview__description, ' +
              '.m-exhibitor-entry__description, ' +
              '[class*="overview__description"]'
            );
            if (overviewDescEl) {
              fullDetails = overviewDescEl.innerText.trim();
            }

            // Firma Logosu
            let logoUrl = null;
            const targetLogoImg = document.querySelector(
              '.m-exhibitor-entry__item__body__content__overview__logo__image, ' +
              '.m-exhibitor-entry__logo img, ' +
              '[class*="overview__logo"] img'
            );
            if (targetLogoImg) {
              logoUrl = targetLogoImg.src || targetLogoImg.getAttribute('data-src');
            }

            // Ürünler Kataloğu
            const products = [];
            const productItems = document.querySelectorAll(
              '.m-libraries-products-list__list__items .m-libraries-products-list__item, ' +
              '.m-libraries-products-list__list__items > div, ' +
              '[class*="products-list"] [class*="item"]'
            );

            productItems.forEach(pItem => {
              const pNameEl = pItem.querySelector('h3, h4, [class*="title"], [class*="name"]');
              const pImgEl = pItem.querySelector('img');
              const pLinkEl = pItem.querySelector('a');

              const pName = pNameEl ? pNameEl.innerText.trim() : null;
              const pImg = pImgEl ? (pImgEl.src || pImgEl.getAttribute('data-src')) : null;
              const pLink = pLinkEl ? pLinkEl.href : null;

              if (pName && pName.length > 1) {
                products.push({
                  name: pName,
                  image_url: pImg,
                  product_link: pLink
                });
              }
            });

            // Opening Times
            let openingTimes = null;
            let eventDates = null;
            const allElements = Array.from(document.querySelectorAll('div, section, footer, td, p, h2, h3, h4, strong'));
            const openingEl = allElements.find(el => el.innerText && el.innerText.toLowerCase().includes('opening times'));

            if (openingEl) {
              const text = openingEl.innerText;
              if (text.includes('Monday') || text.includes('Tuesday') || text.includes('Wednesday') || text.includes('10:00')) {
                openingTimes = text.replace(/Opening Times/i, '').trim();
                const daysMatch = openingTimes.match(/([A-Za-z]+\s+\d{1,2}\s+[A-Za-z]+).*?([A-Za-z]+\s+\d{1,2}\s+[A-Za-z]+)/s);
                if (daysMatch) {
                  eventDates = `${daysMatch[1]} - ${daysMatch[2]}`;
                } else {
                  eventDates = openingTimes.split('\n')[0];
                }
              }
            }

            // Contact Us
            let contactPhone = null;
            let contactEmail = null;
            let contactAddress = null;

            const contactEl = allElements.find(el => el.innerText && el.innerText.toLowerCase().includes('contact us'));
            if (contactEl) {
              const contactText = contactEl.innerText;
              const phoneMatch = contactText.match(/(?:Tel|Phone):\s*([^\n]+)/i);
              if (phoneMatch) contactPhone = phoneMatch[1].trim();

              const emailMatch = contactText.match(/(?:Email|E-mail):\s*([^\n]+)/i);
              if (emailMatch) contactEmail = emailMatch[1].trim();

              if (contactText.includes('London') || contactText.includes('Square') || contactText.includes('W1U')) {
                contactAddress = contactText.replace(/Contact Us/i, '').split(/Tel:|Phone:|Email:/i)[0].trim();
              }
            }

            // Organised By
            let organiser = null;
            const orgEl = allElements.find(el => el.innerText && el.innerText.toLowerCase().includes('organised by'));
            if (orgEl) {
              organiser = orgEl.innerText.replace(/Organised By/i, '').trim().split('\n')[0];
            }

            // Sosyal Medya
            const socials = {};
            const socialLinks = document.querySelectorAll('a[href*="linkedin"], a[href*="facebook"], a[href*="twitter"], a[href*="x.com"], a[href*="instagram"], a[href*="youtube"]');
            socialLinks.forEach(link => {
              const href = link.href;
              if (href.includes('linkedin')) socials.linkedin = href;
              if (href.includes('facebook')) socials.facebook = href;
              if (href.includes('twitter') || href.includes('x.com')) socials.twitter = href;
              if (href.includes('instagram')) socials.instagram = href;
              if (href.includes('youtube')) socials.youtube = href;
            });

            // Web Sitesi
            let officialWebsite = null;
            const visitBtn = Array.from(document.querySelectorAll('a')).find(
              a => a.innerText.toLowerCase().includes('visit website') || a.innerText.toLowerCase().includes('website')
            );
            if (visitBtn) officialWebsite = visitBtn.href;

            return {
              logoUrl,
              fullDetails,
              address: contactAddress,
              officialWebsite,
              socials,
              eventDates,
              eventLocation: 'ExCeL London',
              openingTimes,
              contactPhone,
              contactEmail,
              organiser,
              products
            };
          });

          await detailPage.close();

          // Logoyu İndir
          let localLogoPath = null;
          if (pageData.logoUrl) {
            const safeName = item.name.replace(/[^a-z0-9]/gi, '_').toLowerCase();
            localLogoPath = await downloadImage(pageData.logoUrl, `logo_${safeName}_${year}.png`);
          }

          // Veritabanını Güncelle
          await db('exhibitors').where({ id: exhibitorId }).update({
            full_details: pageData.fullDetails || null,
            address: pageData.address || null,
            event_dates: pageData.eventDates || null,
            event_location: pageData.eventLocation || 'ExCeL London',
            opening_times: pageData.openingTimes || null,
            organiser: pageData.organiser || null,
            contact_phone: pageData.contactPhone || null,
            contact_email: pageData.contactEmail || null,
            website: pageData.officialWebsite || item.detailUrl,
            logo_url: pageData.logoUrl || null,
            local_logo_path: localLogoPath || null,
            linkedin_url: pageData.socials.linkedin || null,
            facebook_url: pageData.socials.facebook || null,
            twitter_url: pageData.socials.twitter || null,
            instagram_url: pageData.socials.instagram || null,
            youtube_url: pageData.socials.youtube || null
          });

          // Ürünleri Kaydet
          if (pageData.products && pageData.products.length > 0) {
            for (const prod of pageData.products) {
              let pLocalImg = null;
              if (prod.image_url) {
                const safePName = prod.name.replace(/[^a-z0-9]/gi, '_').toLowerCase();
                pLocalImg = await downloadImage(prod.image_url, `prod_${exhibitorId}_${safePName}.png`);
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
          console.error(` [SCRAPER HATA] (${item.name}):`, err.message);
        }
      }
    }

    await browser.close();
    console.log(`[SCRAPER] Tüm Sayfalar, Detaylar ve Ürünler Başarıyla Tamamlandı!`);
    return { success: true, totalScraped: initialList.length, addedCount };

  } catch (error) {
    if (browser) await browser.close();
    console.error('[SCRAPER KRİTİK HATA]:', error.message);
    throw error;
  }
}

module.exports = { scrapeExhibitors };