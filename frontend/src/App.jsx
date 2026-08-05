// frontend/src/App.jsx
import { useEffect, useState, useMemo } from 'react';
import axios from 'axios';
import { 
  Search, Building2, Globe, Tag, ArrowUpDown, Calendar, RefreshCw, 
  Layers, ChevronRight, Package, ChevronLeft, SlidersHorizontal 
} from 'lucide-react';
import ExhibitorModal from './components/ExhibitorModal';
import './App.css';

function App() {
  const [exhibitors, setExhibitors] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [scraping, setScraping] = useState(false);
  const [selectedExhibitorId, setSelectedExhibitorId] = useState(null);

  // Filtre State'leri
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedYear, setSelectedYear] = useState('');
  const [sortBy, setSortBy] = useState('name-asc');

  // Pagination State'leri
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(24);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [exRes, catRes] = await Promise.allSettled([
        axios.get('http://127.0.0.1:5000/api/exhibitors'),
        axios.get('http://127.0.0.1:5000/api/categories')
      ]);

      if (exRes.status === 'fulfilled' && exRes.value.data.success) {
        setExhibitors(exRes.value.data.data);
      }
      if (catRes.status === 'fulfilled' && catRes.value.data.success) {
        setCategories(catRes.value.data.data);
      }
    } catch (err) {
      console.error('Veri yükleme hatası:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Filtreleme veya Arama değiştiğinde 1. sayfaya dön
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, selectedCategory, selectedYear, sortBy, itemsPerPage]);

  const handleScrape = async () => {
    setScraping(true);
    try {
      const res = await axios.get('http://127.0.0.1:5000/api/scrape');
      if (res.data.success) {
        alert(`Tüm Sayfalar Taranıp Güncellendi! Toplam: ${res.data.data.totalScraped}`);
        fetchData();
      }
    } catch (err) {
      alert('Scraper çalışırken bir hata oluştu.');
    } finally {
      setScraping(false);
    }
  };

  // 1. Filtreleme ve Sıralama
  const filteredExhibitors = useMemo(() => {
    return exhibitors
      .filter((item) => {
        const matchesSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          (item.category && item.category.toLowerCase().includes(searchTerm.toLowerCase())) ||
          (item.stand_number && item.stand_number.toLowerCase().includes(searchTerm.toLowerCase()));

        const matchesCategory = selectedCategory === '' || item.category === selectedCategory;
        const matchesYear = selectedYear === '' || String(item.year) === selectedYear;

        return matchesSearch && matchesCategory && matchesYear;
      })
      .sort((a, b) => {
        if (sortBy === 'name-asc') return a.name.localeCompare(b.name);
        if (sortBy === 'name-desc') return b.name.localeCompare(a.name);
        if (sortBy === 'date-asc') return (a.event_dates || '').localeCompare(b.event_dates || '');
        if (sortBy === 'date-desc') return (b.event_dates || '').localeCompare(a.event_dates || '');
        return 0;
      });
  }, [exhibitors, searchTerm, selectedCategory, selectedYear, sortBy]);

  // 2. Pagination (Sayfalandırma Dilimleme)
  const totalPages = Math.ceil(filteredExhibitors.length / itemsPerPage);
  const currentExhibitors = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredExhibitors.slice(start, start + itemsPerPage);
  }, [filteredExhibitors, currentPage, itemsPerPage]);

  return (
    <div className="app-container">
      {/* HERO BANNER & HEADER */}
      <header className="hero-header">
        <div className="brand-info">
          <h1><Building2 size={32} />Exhibitor Listesi Global</h1>
          <p>Uluslararası Fuar Katılımcı Verileri, Ürün Kataloğu ve İletişim Portalı</p>
        </div>

        <button className="scrape-action-btn" onClick={handleScrape} disabled={scraping}>
          <RefreshCw size={18} className={scraping ? 'spin' : ''} />
          {scraping ? 'Derin Scrape Sürüyor...' : 'Verileri Canlı Güncelle'}
        </button>
      </header>

      {/* İSTATİSTİK BARI */}
      <div className="stats-grid">
        <div className="stat-box">
          <div className="stat-icon"><Layers size={22} /></div>
          <div className="stat-data">
            <span>Veritabanındaki Katılımcı</span>
            <strong>{exhibitors.length} Şirket</strong>
          </div>
        </div>
        <div className="stat-box">
          <div className="stat-icon" style={{ background: '#ecfdf5', color: '#059669' }}><Tag size={22} /></div>
          <div className="stat-data">
            <span>Kategoriler</span>
            <strong>{categories.length} Sektör</strong>
          </div>
        </div>
        <div className="stat-box">
          <div className="stat-icon" style={{ background: '#fef3c7', color: '#d97706' }}><Calendar size={22} /></div>
          <div className="stat-data">
            <span>Bulunan / Listelenen</span>
            <strong>{filteredExhibitors.length} Sonuç</strong>
          </div>
        </div>
      </div>

      {/* ARAMA VE FİLTRE BARI */}
      <div className="filter-bar">
        <div className="search-input-wrapper">
          <Search size={18} />
          <input
            type="text"
            placeholder="Firma adı, stant no veya ürün ara..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <div className="select-group">
          <select value={selectedCategory} onChange={(e) => setSelectedCategory(e.target.value)}>
            <option value="">Tüm Kategoriler</option>
            {categories.map((cat, idx) => (
              <option key={idx} value={cat.category}>{cat.category}</option>
            ))}
          </select>

          <select value={selectedYear} onChange={(e) => setSelectedYear(e.target.value)}>
            <option value="">Tüm Yıllar</option>
            <option value="2026">2026</option>
            <option value="2025">2025</option>
          </select>

          <select value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
            <option value="name-asc">İsim (A-Z)</option>
            <option value="name-desc">İsim (Z-A)</option>
            <option value="date-asc">Tarih (Eskiden Yeniye)</option>
            <option value="date-desc">Tarih (Yeniden Eskiye)</option>
          </select>
        </div>
      </div>

      {/* SAYFALANDIRMA ÜST BARI & SAYFA BAŞI GÖSTERİM */}
      <div className="pagination-top-bar">
        <span className="pagination-info">
          Sayfa <strong>{currentPage}</strong> / {totalPages || 1} — Toplam {filteredExhibitors.length} kayıt
        </span>

        <div className="per-page-select">
          <SlidersHorizontal size={14} />
          <span>Sayfa Başı:</span>
          <select value={itemsPerPage} onChange={(e) => setItemsPerPage(Number(e.target.value))}>
            <option value={12}>12 Kart</option>
            <option value={24}>24 Kart</option>
            <option value={48}>48 Kart</option>
            <option value={96}>96 Kart</option>
          </select>
        </div>
      </div>

      {/* ŞİRKET KART LİSTESİ */}
      {loading ? (
        <div className="state-message">Veri kataloğu yükleniyor, lütfen bekleyin...</div>
      ) : filteredExhibitors.length === 0 ? (
        <div className="state-message">Arama kriterlerine uygun katılımcı firma bulunamadı.</div>
      ) : (
        <div className="exhibitor-grid">
          {currentExhibitors.map((item) => (
            <div key={item.id} className="exhibitor-card" onClick={() => setSelectedExhibitorId(item.id)}>
              <div className="card-inner">
                <div className="card-top">
                  <div className="card-logo-box">
                    {item.local_logo_path || item.logo_url ? (
                      <img
                        src={item.local_logo_path ? `http://127.0.0.1:5000${item.local_logo_path}` : item.logo_url}
                        alt={item.name}
                        onError={(e) => { e.target.style.display = 'none'; }}
                      />
                    ) : (
                      <Building2 size={24} color="#94a3b8" />
                    )}
                  </div>
                  <div className="card-title-group">
                    <h3>{item.name}</h3>
                    {item.stand_number && <span className="stand-badge">Stant: {item.stand_number}</span>}
                  </div>
                </div>

                <p className="card-desc">
                  {item.full_details || item.description || 'Fuar detayları, iletişim ve sergilenen ürün kataloğu için tıklayın.'}
                </p>
              </div>

              <div className="card-bottom">
                {item.event_dates ? (
                  <span className="date-pill"><Calendar size={12} /> {item.event_dates}</span>
                ) : (
                  <span className="date-pill muted">{item.year}</span>
                )}
                <span className="detail-btn-text">İncele <ChevronRight size={16} /></span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* PAGINATION BOTTON BARI */}
      {totalPages > 1 && (
        <div className="pagination-bottom-bar">
          <button 
            className="pg-btn" 
            disabled={currentPage === 1} 
            onClick={() => setCurrentPage(p => p - 1)}
          >
            <ChevronLeft size={18} /> Önceki
          </button>

          <div className="pg-numbers">
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              let pageNum;
              if (totalPages <= 5) {
                pageNum = i + 1;
              } else if (currentPage <= 3) {
                pageNum = i + 1;
              } else if (currentPage >= totalPages - 2) {
                pageNum = totalPages - 4 + i;
              } else {
                pageNum = currentPage - 2 + i;
              }

              return (
                <button
                  key={pageNum}
                  className={`pg-num-btn ${currentPage === pageNum ? 'active' : ''}`}
                  onClick={() => setCurrentPage(pageNum)}
                >
                  {pageNum}
                </button>
              );
            })}
          </div>

          <button 
            className="pg-btn" 
            disabled={currentPage === totalPages} 
            onClick={() => setCurrentPage(p => p + 1)}
          >
            Sonraki <ChevronRight size={18} />
          </button>
        </div>
      )}

      {/* MODAL POPUP */}
      {selectedExhibitorId && (
        <ExhibitorModal
          exhibitorId={selectedExhibitorId}
          onClose={() => setSelectedExhibitorId(null)}
        />
      )}
    </div>
  );
}

export default App;