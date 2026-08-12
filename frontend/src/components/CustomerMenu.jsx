import { useState, useEffect, useRef } from 'react'
import { db } from '../firebase'
import { collection, getDocs, addDoc, doc, onSnapshot, updateDoc, increment } from 'firebase/firestore'
import confetti from 'canvas-confetti'
import { FaUtensils, FaMotorcycle, FaGift, FaStar, FaStore, FaClipboardCheck, FaTimesCircle, FaConciergeBell, FaShoppingCart, FaHourglassHalf } from 'react-icons/fa'

export default function CustomerMenu() {
  const [menu, setMenu] = useState([])
  const [cart, setCart] = useState([])
  const [ordered, setOrdered] = useState(false)
  const [loading, setLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const isSubmittingRef = useRef(false)
  const [adres, setAdres] = useState('')
  const [telefon, setTelefon] = useState('')
  const [not, setNot] = useState('')
  const [orderStatus, setOrderStatus] = useState(null)

  useEffect(() => {
    if (typeof ordered === 'string') {
      const unsub = onSnapshot(doc(db, "Siparisler", ordered), (docSnap) => {
        if (docSnap.exists()) {
          const newStatus = docSnap.data().Durum;
          setOrderStatus(newStatus);
          
          if (newStatus === 'Teslim Edildi') {
            confetti({
              particleCount: 150,
              spread: 70,
              origin: { y: 0.6 },
              colors: ['#8C6239', '#5DB075', '#ffffff']
            });
          }
        }
      })
      return () => unsub()
    }
  }, [ordered])



  useEffect(() => {
    async function loadMenu() {
      try {
        const urunlerSnap = await getDocs(collection(db, "Urunler"));
        const kategorilerSnap = await getDocs(collection(db, "Kategoriler"));
        
        const kategorilerMap = {};
        kategorilerSnap.forEach(doc => {
          const data = doc.data();
          kategorilerMap[doc.id] = data.KategoriAdi;
        });

        const menuData = [];
        urunlerSnap.forEach(doc => {
          const data = doc.data();
          menuData.push({
            ...data,
            UrunID: data.UrunID || doc.id,
            KategoriAdi: data.KategoriAdi || kategorilerMap[data.KategoriID] || 'Diğer'
          });
        });
        
        setMenu(menuData);
      } catch (err) {
        console.error('Menü yüklenemedi:', err);
      } finally {
        setLoading(false);
      }
    }
    loadMenu();
  }, [])

  const addToCart = (urun) => {
    setCart(prev => {
      const existing = prev.find(item => item.UrunID === urun.UrunID)
      if (existing) {
        return prev.map(item =>
          item.UrunID === urun.UrunID ? { ...item, adet: item.adet + 1 } : item
        )
      }
      return [...prev, { ...urun, adet: 1 }]
    })
  }

  const removeFromCart = (urunId) => {
    setCart(prev => {
      const existing = prev.find(item => item.UrunID === urunId)
      if (existing && existing.adet > 1) {
        return prev.map(item => item.UrunID === urunId ? { ...item, adet: item.adet - 1 } : item)
      }
      return prev.filter(item => item.UrunID !== urunId)
    })
  }

  const submitOrder = async () => {
    if (cart.length === 0) return alert('Lütfen önce ürün seçin.')
    if (!adres.trim()) return alert('Lütfen teslimat adresi giriniz.')
    if (!telefon.trim()) return alert('Lütfen telefon numarası giriniz.')
    
    // Telefon numarası doğrulama (Sadece rakam ve isteğe bağlı başa +, boşluksuz/boşluklu 10-14 hane)
    const phoneRegex = /^[+]?[0-9\s]{10,14}$/;
    if (!phoneRegex.test(telefon.trim())) {
      return alert('Lütfen geçerli bir telefon numarası giriniz (Örn: 0555 555 5555 veya 05555555555).')
    }

    if (isSubmittingRef.current) return;
    isSubmittingRef.current = true;
    setIsSubmitting(true);
    
    const urunDetaylari = cart.map(item => `${item.adet}x ${item.UrunAdi}`).join(', ');
    const orderData = {
      Adres: adres,
      Telefon: telefon,
      Not: not.trim(),
      SiparisTarihi: new Date().toISOString(),
      ToplamTutar: cart.reduce((sum, item) => sum + item.Fiyat * item.adet, 0),
      Durum: 'Alındı',
      urun_detaylari: urunDetaylari
    }
    
    try {
      // Siparişi ekle
      const orderRef = await addDoc(collection(db, "Siparisler"), orderData);
      
      // Sipariş detaylarını ekle
      for (const item of cart) {
        await addDoc(collection(db, "SiparisDetay"), {
          SiparisID: orderRef.id,
          UrunID: item.UrunID,
          Miktar: item.adet,
          BirimFiyat: item.Fiyat
        });
        
        // Ürün satış sayısını artır
        await updateDoc(doc(db, "Urunler", String(item.UrunID)), {
          SatisSayisi: increment(item.adet)
        }).catch(err => console.log('Satış sayısı artırılamadı (belge eksik veya yetki yok)', err));
      }
      
      setOrdered(orderRef.id)
      setCart([])
      setOrderStatus('Alındı')
    } catch (err) {
      console.error(err);
      alert('Sipariş gönderilemedi. Bağlantınızı kontrol edin.')
    } finally {
      setIsSubmitting(false);
      isSubmittingRef.current = false;
    }
  }

  // Kategori bazlı gruplama ve popüler ürünler
  // En çok satan (SatisSayisi en yüksek) 3 ürünü belirle
  const topPopular = [...menu]
    .filter(u => u.SatisSayisi && u.SatisSayisi > 0)
    .sort((a, b) => b.SatisSayisi - a.SatisSayisi)
    .slice(0, 3)
    .map(u => u.UrunID);

  const grouped = menu.reduce((acc, urun) => {
    // Popülerler için ayrı bir alan oluştur
    if (topPopular.includes(urun.UrunID)) {
      if (!acc['Popüler Yemekler']) acc['Popüler Yemekler'] = []
      acc['Popüler Yemekler'].push(urun)
    }
    
    // Normal kategoriye ekle
    const cat = urun.KategoriAdi || 'Diğer'
    if (!acc[cat]) acc[cat] = []
    
    // Hem kategorisinde hem popülerlerde görünsün
    acc[cat].push(urun)
    return acc
  }, {})

  // Popülerlerin her zaman en üstte çıkması için sıralama ayarlayalım
  const sortedCategories = Object.entries(grouped).sort((a, b) => {
    if (a[0] === 'Popüler Yemekler') return -1;
    if (b[0] === 'Popüler Yemekler') return 1;
    return a[0].localeCompare(b[0]);
  });

  const totalPrice = cart.reduce((sum, item) => sum + item.Fiyat * item.adet, 0)
  const totalItems = cart.reduce((sum, item) => sum + item.adet, 0)

  // ── Sipariş Tamamlandı ─────────────────────────────────────────────
  if (ordered) {
    const isError = orderStatus === 'Reddedildi';
    const isSuccess = orderStatus === 'Teslim Edildi';

    const getStatusText = () => {
      if (orderStatus === 'Alındı') return { icon: <FaClipboardCheck />, title: 'Siparişiniz Alındı!', desc: 'Siparişiniz mutfağa iletildi.', color: '#8bc34a' };
      if (orderStatus === 'Hazırlanıyor') return { icon: <FaConciergeBell />, title: 'Hazırlanıyor...', desc: 'Siparişiniz şu an mutfakta özenle hazırlanıyor.', color: 'var(--warning)' };
      if (orderStatus === 'Hazır') return { icon: <FaStore />, title: 'Siparişiniz Hazır!', desc: 'Kuryenin siparişinizi teslim alması bekleniyor.', color: 'var(--accent)' };
      if (orderStatus === 'Kuryede') return { icon: <FaMotorcycle />, title: 'Yola Çıktı!', desc: 'Kuryemiz siparişinizle birlikte yola çıktı.', color: 'var(--primary)' };
      if (orderStatus === 'Teslim Edildi') return { icon: <FaGift />, title: 'Afiyet Olsun!', desc: 'Siparişiniz başarıyla teslim edildi.', color: 'var(--success)' };
      if (orderStatus === 'Reddedildi') return { icon: <FaTimesCircle />, title: 'Sipariş İptal Edildi', desc: 'Siparişiniz mutfak tarafından reddedildi.', color: 'var(--danger)' };
      return { icon: <FaHourglassHalf />, title: 'Bekleniyor...', desc: 'Sipariş durumu güncelleniyor.', color: 'var(--text-muted)' };
    }

    const st = getStatusText();

    return (
      <div style={{ minHeight: '100vh', background: 'var(--bg-app)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '40px 20px', textAlign: 'center' }}>
        <style>
          {`
            @keyframes pulse-ring {
              0% { transform: scale(0.8); box-shadow: 0 0 0 0 rgba(78, 112, 85, 0.7); }
              70% { transform: scale(1); box-shadow: 0 0 0 10px rgba(78, 112, 85, 0); }
              100% { transform: scale(0.8); box-shadow: 0 0 0 0 rgba(78, 112, 85, 0); }
            }
            @keyframes bounce-icon {
              0%, 20%, 50%, 80%, 100% { transform: translateY(0); }
              40% { transform: translateY(-15px); }
              60% { transform: translateY(-7px); }
            }
          `}
        </style>
        <div style={{ background: '#fff', borderRadius: '20px', padding: '50px 40px', border: `2px solid ${st.color}`, boxShadow: '0 8px 40px rgba(0,0,0,0.08)', maxWidth: '400px', width: '100%', transition: 'border 0.4s ease' }}>
          <div style={{ fontSize: '64px', marginBottom: '20px', animation: 'bounce-icon 2s infinite' }}>{st.icon}</div>
          <h2 style={{ color: st.color, margin: '0 0 12px', fontFamily: "'Playfair Display', serif" }}>{st.title}</h2>
          <p style={{ color: 'var(--text-muted)', margin: '0 0 8px', lineHeight: 1.6, fontSize: '15px' }}>
            {st.desc}
          </p>
          
          <div style={{ margin: '40px 0 20px 0', position: 'relative', width: '100%' }}>
            
            {/* Arka plan çizgisi */}
            <div style={{ position: 'absolute', top: '18px', left: '10%', right: '10%', height: '4px', background: 'var(--border)', zIndex: 1, borderRadius: '2px' }}></div>
            
            {/* Dolum (Progress) çizgisi */}
            <div style={{ 
              position: 'absolute', top: '18px', left: '10%', 
              width: orderStatus === 'Reddedildi' ? '100%' : `${Math.max(0, Math.min(100, (['Alındı', 'Hazırlanıyor', 'Kuryede', 'Teslim Edildi'].indexOf(orderStatus === 'Hazır' ? 'Hazırlanıyor' : orderStatus) / 3) * 80))}%`, 
              height: '4px', 
              background: orderStatus === 'Reddedildi' ? 'var(--danger)' : 'var(--primary)', 
              zIndex: 1, borderRadius: '2px', transition: 'width 0.8s cubic-bezier(0.4, 0, 0.2, 1)' 
            }}></div>

            <div style={{ display: 'flex', justifyContent: 'space-between', position: 'relative', zIndex: 2 }}>
              {['Alındı', 'Hazırlanıyor', 'Kuryede', 'Teslim'].map((step, idx) => {
                const stages = ['Alındı', 'Hazırlanıyor', 'Kuryede', 'Teslim Edildi'];
                let currentIndex = stages.indexOf(orderStatus);
                if (orderStatus === 'Hazır') currentIndex = 1;
                
                const isError = orderStatus === 'Reddedildi';
                if (isError) currentIndex = -1;
                
                const isCompleted = currentIndex > idx;
                const isCurrent = Math.floor(currentIndex) === idx;
                const isUpcoming = currentIndex < idx;

                let bgColor = 'var(--bg-app)';
                let borderColor = 'var(--border)';
                let color = 'var(--text-muted)';

                if (isError) {
                  bgColor = '#fff';
                  borderColor = 'var(--danger)';
                  color = 'var(--danger)';
                } else if (isCompleted) {
                  bgColor = 'var(--primary)';
                  borderColor = 'var(--primary)';
                  color = '#fff';
                } else if (isCurrent) {
                  bgColor = '#fff';
                  borderColor = 'var(--primary)';
                  color = 'var(--primary)';
                }

                // Özel ikonlar
                const icons = [<FaShoppingCart />, <FaConciergeBell />, <FaMotorcycle />, <FaGift />];
                const stepIcon = icons[idx];

                return (
                  <div key={step} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '60px' }}>
                    <div style={{ 
                      width: '40px', height: '40px', borderRadius: '50%', 
                      background: bgColor, border: `3px solid ${borderColor}`,
                      color: color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px',
                      animation: isCurrent && !isError ? 'pulse-ring 2s infinite' : 'none',
                      transition: 'all 0.5s ease',
                      boxShadow: isCurrent ? '0 4px 10px rgba(140,98,57,0.3)' : 'none'
                    }}>
                      {isCompleted ? '✓' : (isError ? '✕' : stepIcon)}
                    </div>
                    <span style={{ 
                      fontSize: '11px', fontWeight: isCurrent ? 700 : 600, 
                      color: isCurrent || isCompleted ? 'var(--text-dark)' : 'var(--text-muted)', 
                      marginTop: '8px', transition: 'color 0.4s ease', textAlign: 'center',
                      lineHeight: 1.2
                    }}>
                      {step}
                    </span>
                  </div>
                )
              })}
            </div>
          </div>

          <button
            onClick={() => setOrdered(false)}
            style={{ padding: '12px 30px', background: 'var(--primary)', color: '#fff', border: 'none', borderRadius: '30px', fontWeight: 700, fontSize: '15px', cursor: 'pointer', boxShadow: '0 4px 15px rgba(140,98,57,0.2)' }}>
            Ana Sayfaya Dön
          </button>
        </div>
      </div>
    )
  }

  // ── Ana Sayfa ──────────────────────────────────────────────────────
  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-app)', paddingBottom: '40px' }}>

      {/* ── Header ── */}
      <div style={{
        background: 'linear-gradient(135deg, #8c6239 0%, #b8901c 100%)',
        padding: '30px 24px 24px',
        textAlign: 'center',
        color: '#fff',
        boxShadow: '0 4px 20px rgba(140,98,57,0.2)'
      }}>
        <h1 style={{ fontFamily: "'Playfair Display', serif", fontSize: '30px', fontStyle: 'italic', margin: '0 0 10px', color: '#fff', fontWeight: 700, letterSpacing: '1px' }}>
          Mirza Lokantası
        </h1>
        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: '8px',
          background: 'rgba(255,255,255,0.2)', padding: '8px 22px',
          borderRadius: '30px', fontSize: '15px', fontWeight: 700,
          border: '1px solid rgba(255,255,255,0.35)'
        }}>
          <span><FaUtensils /></span> Menü
        </div>
      </div>

      <div style={{ display: 'flex', gap: '24px', padding: '24px', maxWidth: '1100px', margin: '0 auto', flexWrap: 'wrap' }}>

        {/* ── Menü ── */}
        <div style={{ flex: '2 1 420px' }}>
          {loading ? (
            <div style={{ textAlign: 'center', padding: '60px', color: 'var(--text-muted)' }}>
              <p style={{ fontSize: '18px' }}>Menü yükleniyor...</p>
            </div>
          ) : menu.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '60px', color: 'var(--text-muted)' }}>
              <p style={{ fontSize: '18px' }}>Şu an aktif ürün bulunmuyor.</p>
              <p style={{ fontSize: '14px' }}>Lütfen garsonunuzu arayın.</p>
            </div>
          ) : (
            sortedCategories.map(([category, items]) => (
              <div key={category} style={{ marginBottom: '32px' }}>
                {/* Kategori Başlığı */}
                <div style={{
                  display: 'flex', alignItems: 'center', gap: '12px',
                  marginBottom: '16px', paddingBottom: '10px',
                  borderBottom: '2px solid var(--accent)'
                }}>
                  <h1 style={{ margin: 0, fontSize: '20px', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <FaShoppingCart /> Sipariş Menüsü
                  </h1>
                  <h3 style={{ margin: 0, fontSize: '17px', color: 'var(--primary)', textTransform: 'uppercase', letterSpacing: '1.5px', fontFamily: "'Outfit', sans-serif", fontWeight: 700 }}>
                    {category === 'Popüler Yemekler' && <FaStar style={{ color: '#d4af37' }} />}
                    {category}
                  </h3>
                  <span style={{ background: 'var(--primary-light)', color: 'var(--primary)', fontSize: '11px', fontWeight: 700, padding: '2px 9px', borderRadius: '20px' }}>
                    {items.length} çeşit
                  </span>
                </div>

                {/* Ürün Kartları */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px,1fr))', gap: '14px' }}>
                  {items.map(urun => {
                    const inCart = cart.find(c => c.UrunID === urun.UrunID)
                    return (
                      <div key={urun.UrunID} style={{
                        background: '#fff',
                        borderRadius: '14px',
                        padding: '18px 16px',
                        border: `1.5px solid ${inCart ? 'var(--primary)' : 'var(--border)'}`,
                        boxShadow: inCart ? '0 6px 20px rgba(140,98,57,0.14)' : 'var(--shadow)',
                        transition: 'all 0.25s ease',
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'space-between',
                        minHeight: '110px'
                      }}>
                        <div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px', marginBottom: '6px' }}>
                            <span style={{ fontWeight: 600, fontSize: '15px', fontFamily: "'Playfair Display', serif", lineHeight: 1.3 }}>
                              {urun.UrunAdi}
                            </span>
                            {urun.MenuTipi && (
                              <span style={{ fontSize: '10px', background: 'var(--primary-light)', color: 'var(--primary)', padding: '2px 7px', borderRadius: '10px', fontWeight: 700, whiteSpace: 'nowrap', flexShrink: 0 }}>
                                {urun.MenuTipi}
                              </span>
                            )}
                          </div>
                        </div>

                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '14px' }}>
                          <span style={{ fontSize: '19px', fontWeight: 700, color: 'var(--primary)' }}>
                            {urun.Fiyat} ₺
                          </span>

                          {inCart ? (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <button onClick={() => removeFromCart(urun.UrunID)} style={{ width: '30px', height: '30px', borderRadius: '50%', background: 'var(--primary-light)', color: 'var(--primary)', border: 'none', fontWeight: 700, fontSize: '17px', cursor: 'pointer', lineHeight: 1 }}>−</button>
                              <span style={{ fontWeight: 700, fontSize: '16px', minWidth: '22px', textAlign: 'center' }}>{inCart.adet}</span>
                              <button onClick={() => addToCart(urun)} style={{ width: '30px', height: '30px', borderRadius: '50%', background: 'var(--primary)', color: '#fff', border: 'none', fontWeight: 700, fontSize: '17px', cursor: 'pointer', lineHeight: 1 }}>+</button>
                            </div>
                          ) : (
                            <button onClick={() => addToCart(urun)} style={{ padding: '7px 18px', background: 'var(--primary)', color: '#fff', border: 'none', borderRadius: '20px', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}>
                              Ekle
                            </button>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            ))
          )}
        </div>

        {/* ── Sepet ── */}
        <div style={{ flex: '1 1 280px', alignSelf: 'flex-start', position: 'sticky', top: '20px' }}>
          <div style={{ background: '#fff', borderRadius: '16px', border: '1px solid var(--border)', boxShadow: 'var(--shadow)', overflow: 'hidden' }}>
            {/* Sepet Başlığı */}
            <div style={{ background: 'linear-gradient(135deg, #8c6239, #b8901c)', padding: '14px 20px', color: '#fff', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontWeight: 700, fontSize: '16px' }}><FaShoppingCart /> Siparişlerim</span>
              {totalItems > 0 && (
                <span style={{ background: 'rgba(255,255,255,0.25)', padding: '2px 10px', borderRadius: '20px', fontWeight: 700, fontSize: '14px' }}>
                  {totalItems} ürün
                </span>
              )}
            </div>

            <div style={{ padding: '16px' }}>
              {cart.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '30px 10px', color: 'var(--text-muted)' }}>
                  <div style={{ fontSize: '36px', marginBottom: '8px' }}><FaShoppingCart /></div>
                  <p style={{ margin: 0, fontSize: '14px' }}>Sepetiniz boş.</p>
                  <p style={{ margin: '5px 0 0', fontSize: '12px' }}>Menüden seçim yapın.</p>
                </div>
              ) : (
                <>
                  {cart.map(item => (
                    <div key={item.UrunID} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: '1px dashed var(--border)' }}>
                      <div>
                        <div style={{ fontWeight: 600, fontSize: '14px' }}>{item.UrunAdi}</div>
                        <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>x{item.adet} × {item.Fiyat} ₺</div>
                      </div>
                      <span style={{ fontWeight: 700, color: 'var(--primary)' }}>{item.Fiyat * item.adet} ₺</span>
                    </div>
                  ))}

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', margin: '16px 0 0', padding: '12px 0 0', borderTop: '2px solid var(--primary-light)' }}>
                    <span style={{ fontWeight: 700 }}>Toplam</span>
                    <span style={{ fontSize: '22px', fontWeight: 700, color: 'var(--primary)' }}>{totalPrice} ₺</span>
                  </div>

                  <div style={{ marginTop: '20px' }}>
                    <label style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-dark)' }}>Teslimat Adresi *</label>
                    <textarea 
                      required
                      value={adres} 
                      onChange={e => setAdres(e.target.value)}
                      placeholder="Mahalle, sokak, bina no, daire..."
                      style={{ width: '100%', padding: '10px', marginTop: '6px', borderRadius: '8px', border: '1px solid var(--border)', fontFamily: 'inherit', resize: 'vertical', minHeight: '60px' }}
                    />
                  </div>
                  <div style={{ marginTop: '12px' }}>
                    <label style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-dark)' }}>Telefon Numarası *</label>
                    <input 
                      required
                      type="tel"
                      maxLength={15}
                      value={telefon} 
                      onChange={e => {
                        let val = e.target.value.replace(/[^\d]/g, '');
                        if (val.length > 11) {
                          val = val.slice(0, 11);
                        }
                        setTelefon(val);
                      }}
                      placeholder="Örn: 0555 555 5555"
                      style={{ width: '100%', padding: '10px', marginTop: '6px', borderRadius: '8px', border: '1px solid var(--border)', fontFamily: 'inherit' }}
                    />
                  </div>
                  <div style={{ marginTop: '12px' }}>
                    <label style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-dark)' }}>Sipariş Notu (İsteğe Bağlı)</label>
                    <textarea 
                      value={not} 
                      onChange={e => setNot(e.target.value)}
                      placeholder="Lütfen zile basmayın vb..."
                      style={{ width: '100%', padding: '10px', marginTop: '6px', borderRadius: '8px', border: '1px solid var(--border)', fontFamily: 'inherit', resize: 'vertical', minHeight: '50px' }}
                    />
                  </div>

                  <button onClick={submitOrder} disabled={isSubmitting} style={{ width: '100%', marginTop: '14px', padding: '14px', background: isSubmitting ? 'var(--text-muted)' : 'var(--success)', color: '#fff', border: 'none', borderRadius: '10px', fontSize: '15px', fontWeight: 700, cursor: isSubmitting ? 'not-allowed' : 'pointer', boxShadow: '0 4px 14px rgba(78,112,85,0.2)' }}>
                    {isSubmitting ? 'Gönderiliyor...' : 'Siparişi Gönder →'}
                  </button>
                </>
              )}
            </div>
          </div>
        </div>

      </div>
    </div>
  )
}
