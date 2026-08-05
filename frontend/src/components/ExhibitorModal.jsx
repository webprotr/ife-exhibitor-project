// frontend/src/components/ExhibitorModal.jsx
import { useEffect, useState } from 'react';
import axios from 'axios';
import { 
  X, Globe, Building2, Tag, Share2, MapPin, Calendar, Clock, 
  Phone, Mail, Building, FileText, Package 
} from 'lucide-react';

function ExhibitorModal({ exhibitorId, onClose }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDetails = async () => {
      setLoading(true);
      try {
        const response = await axios.get(`http://127.0.0.1:5000/api/exhibitors/${exhibitorId}`);
        if (response.data.success) {
          setData(response.data.data);
        }
      } catch (err) {
        console.error('Detay çekme hatası:', err);
      } finally {
        setLoading(false);
      }
    };

    if (exhibitorId) fetchDetails();
  }, [exhibitorId]);

  if (!exhibitorId) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <button className="close-btn" onClick={onClose} title="Kapat">
          <X size={20} />
        </button>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '3rem 1rem', color: '#64748b', fontWeight: '500' }}>
            Fuar ve şirket detayları yükleniyor...
          </div>
        ) : !data ? (
          <div style={{ textAlign: 'center', padding: '3rem 1rem', color: '#ef4444' }}>
            Detay bilgisi alınamadı.
          </div>
        ) : (
          <>
            {/* Modal Header */}
            <div className="modal-header-area">
              <div className="modal-header-logo">
                {data.local_logo_path || data.logo_url ? (
                  <img
                    src={data.local_logo_path ? `http://127.0.0.1:5000${data.local_logo_path}` : data.logo_url}
                    alt={data.name}
                    onError={(e) => { e.target.style.display = 'none'; }}
                  />
                ) : (
                  <Building2 size={36} color="#94a3b8" />
                )}
              </div>

              <div>
                <h2 style={{ fontSize: '1.4rem', fontWeight: 800, color: '#0f172a' }}>{data.name}</h2>
                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginTop: '0.5rem' }}>
                  {data.stand_number && <span className="stand-badge">Stant: {data.stand_number}</span>}
                  {data.category && (
                    <span className="stand-badge" style={{ background: '#eff6ff', color: '#2563eb' }}>
                      <Tag size={12} /> {data.category}
                    </span>
                  )}
                  {data.event_dates && (
                    <span className="stand-badge" style={{ background: '#fef3c7', color: '#92400e' }}>
                      <Calendar size={12} /> {data.event_dates}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Modal Body Content */}
            <div className="modal-body-content">
              {/* Overview */}
              {(data.full_details || data.description) && (
                <div className="modal-section">
                  <h4 className="modal-section-title"><FileText size={16} /> Genel Açıklama (Overview)</h4>
                  <div className="modal-box">
                    {data.full_details || data.description}
                  </div>
                </div>
              )}

              {/* Ürün Kataloğu */}
              {data.products && data.products.length > 0 && (
                <div className="modal-section">
                  <h4 className="modal-section-title">
                    <Package size={16} /> Sergilenen Ürün Kataloğu ({data.products.length})
                  </h4>
                  <div className="products-grid">
                    {data.products.map((prod) => (
                      <div key={prod.id} className="product-card-item">
                        {prod.image_url && (
                          <img
                            src={prod.local_image_path ? `http://127.0.0.1:5000${prod.local_image_path}` : prod.image_url}
                            alt={prod.name}
                            onError={(e) => { e.target.style.display = 'none'; }}
                          />
                        )}
                        <strong>{prod.name}</strong>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Opening Times */}
              {data.opening_times && (
                <div className="modal-section">
                  <h4 className="modal-section-title" style={{ color: '#92400e' }}>
                    <Clock size={16} /> Fuar Açılış Saatleri (Opening Times)
                  </h4>
                  <div className="modal-box" style={{ background: '#fffbeb', borderColor: '#fef08a', color: '#78350f', whiteSpace: 'pre-line' }}>
                    {data.opening_times}
                  </div>
                </div>
              )}

              {/* İletişim & Organizatör */}
              {(data.contact_phone || data.contact_email || data.address || data.organiser) && (
                <div className="modal-section">
                  <h4 className="modal-section-title"><Building size={16} /> İletişim & Organizatör Bilgileri</h4>
                  <div className="modal-box" style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                    {data.organiser && <p><strong>Organizatör:</strong> {data.organiser}</p>}
                    {data.address && <p style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}><MapPin size={14} /> <strong>Adres:</strong> {data.address}</p>}
                    {data.contact_phone && <p style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}><Phone size={14} /> <strong>Tel:</strong> {data.contact_phone}</p>}
                    {data.contact_email && <p style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}><Mail size={14} /> <strong>Email:</strong> {data.contact_email}</p>}
                  </div>
                </div>
              )}

              {/* Web Sitesi ve Sosyal Bağlantılar */}
              <div style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap', marginTop: '0.5rem' }}>
                {data.website && (
                  <a href={data.website} target="_blank" rel="noreferrer" style={{ background: '#2563eb', color: 'white', padding: '0.6rem 1.2rem', borderRadius: '8px', fontSize: '0.85rem', textDecoration: 'none', fontWeight: '600', display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}>
                    <Globe size={16} /> Resmi Web Sitesi
                  </a>
                )}
                {data.linkedin_url && (
                  <a href={data.linkedin_url} target="_blank" rel="noreferrer" style={{ background: '#0a66c2', color: 'white', padding: '0.6rem 1.2rem', borderRadius: '8px', fontSize: '0.85rem', textDecoration: 'none', fontWeight: '600', display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}>
                    <Share2 size={16} /> LinkedIn
                  </a>
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default ExhibitorModal;