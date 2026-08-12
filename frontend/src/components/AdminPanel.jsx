import { useState, useEffect, useRef } from 'react'
import { db } from '../firebase'
import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc, query, where, orderBy, onSnapshot } from 'firebase/firestore'
import ExcelJS from 'exceljs'
import { saveAs } from 'file-saver'
import { FaUtensils, FaConciergeBell, FaChartBar, FaCog, FaStar, FaClock, FaCheck, FaHamburger, FaCrown, FaPlus, FaPen, FaTimes, FaFileDownload, FaSyncAlt } from 'react-icons/fa'

const RESTAURANT_NAME = 'Mirza Lokantası'

const badge = (text, color) => (
  <span style={{
    background: color, color: '#fff', padding: '3px 10px',
    borderRadius: 12, fontSize: 11, fontWeight: 700,
    textTransform: 'uppercase', letterSpacing: '0.5px'
  }}>{text}</span>
)

export default function AdminPanel() {
  const [tab, setTab] = useState('products')

  const tabs = [
    { key: 'kitchen',   label: <span style={{display: 'flex', alignItems: 'center', gap: '8px'}}><FaConciergeBell /> Mutfak Siparişleri</span> },
    { key: 'products',  label: <span style={{display: 'flex', alignItems: 'center', gap: '8px'}}><FaUtensils /> Ürün Yönetimi</span> },
    { key: 'reports',   label: <span style={{display: 'flex', alignItems: 'center', gap: '8px'}}><FaChartBar /> Raporlar</span> },
  ]

  return (
    <div>
      <div style={{ display: 'flex', gap: 10, marginBottom: 30, flexWrap: 'wrap' }}>
        {tabs.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            style={{
              padding: '12px 24px', border: 'none', borderRadius: '30px', cursor: 'pointer',
              fontWeight: 600, fontSize: 14, transition: 'all 0.3s ease',
              background: tab === t.key ? 'var(--primary)' : 'var(--primary-light)',
              color: tab === t.key ? '#fff' : 'var(--primary)'
            }}>
            {t.label}
          </button>
        ))}
      </div>

      <div style={{ marginTop: '20px' }}>
        {tab === 'kitchen'   && <KitchenManager />}
        {tab === 'products'  && <ProductManager />}

        {tab === 'reports'   && <Reports />}
      </div>
    </div>
  )
}

/* ─── 1. ÜRÜN YÖNETİMİ ──────────────────────────────────────────────── */
function ProductManager() {
  const [products, setProducts]     = useState([])
  const [categories, setCategories] = useState([])
  const [menuTipleri, setMenuTipleri] = useState([])
  const [editId, setEditId]         = useState(null)
  const [showForm, setShowForm]     = useState(false)
  
  // Kategori Yönetimi Modalı
  const [showCatMan, setShowCatMan] = useState(false)
  const [newCat, setNewCat] = useState('')
  const [newMenuTip, setNewMenuTip] = useState('')

  const [form, setForm] = useState({
    urun_adi: '', fiyat: '',
    kategori_id: '', menu_tipi: 'Tüm Gün', aktif_mi: true
  })

  const load = async () => {
    const pSnap = await getDocs(collection(db, "Urunler"))
    const cSnap = await getDocs(collection(db, "Kategoriler"))
    const mSnap = await getDocs(collection(db, "MenuTipleri"))
    
    setProducts(pSnap.docs.map(d => ({ ...d.data(), UrunID: d.id })))
    setCategories(cSnap.docs.map(d => ({ ...d.data(), KategoriID: d.id })))
    setMenuTipleri(mSnap.docs.map(d => ({ ...d.data(), MenuTipiID: d.id })))
  }

  useEffect(() => { load() }, [])

  const handleAddCategory = async () => {
    if (!newCat.trim()) return
    await addDoc(collection(db, "Kategoriler"), { KategoriAdi: newCat.trim() })
    setNewCat('')
    load()
  }

  const handleDeleteCategory = async (id) => {
    if (!confirm('Bu kategoriyi silmek istediğinizden emin misiniz?')) return
    await deleteDoc(doc(db, "Kategoriler", String(id)))
    load()
  }

  const handleAddMenuTip = async () => {
    if (!newMenuTip.trim()) return
    await addDoc(collection(db, "MenuTipleri"), { Adi: newMenuTip.trim() })
    setNewMenuTip('')
    load()
  }

  const handleDeleteMenuTip = async (id) => {
    if (!confirm('Bu menü tipini silmek istediğinizden emin misiniz?')) return
    await deleteDoc(doc(db, "MenuTipleri", String(id)))
    load()
  }

  const resetForm = () => {
    setForm({ urun_adi: '', fiyat: '', kategori_id: '', menu_tipi: 'Tüm Gün', aktif_mi: true })
    setEditId(null)
    setShowForm(false)
  }

  const startEdit = (p) => {
    setForm({
      urun_adi: p.UrunAdi, fiyat: p.Fiyat,
      kategori_id: p.KategoriID, menu_tipi: p.MenuTipi, aktif_mi: !!p.AktifMi
    })
    setEditId(p.UrunID)
    setShowForm(true)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    // Find KategoriAdi to save inside Urunler for easy reading
    const cat = categories.find(c => c.KategoriID === form.kategori_id)
    const kategoriAdi = cat ? cat.KategoriAdi : 'Diğer'

    const body = {
      UrunAdi: form.urun_adi, Fiyat: parseFloat(form.fiyat),
      KategoriID: form.kategori_id, KategoriAdi: kategoriAdi, MenuTipi: form.menu_tipi,
      AktifMi: form.aktif_mi ? 1 : 0
    }
    
    if (editId) {
      await updateDoc(doc(db, "Urunler", String(editId)), body)
    } else {
      await addDoc(collection(db, "Urunler"), body)
    }
    resetForm()
    load()
  }

  const handleDelete = async (id) => {
    if (!confirm('Bu ürünü silmek istediğinizden emin misiniz?')) return
    await deleteDoc(doc(db, "Urunler", String(id)))
    load()
  }

  const toggleActive = async (p) => {
    setProducts(products.map(prod => prod.UrunID === p.UrunID ? { ...prod, AktifMi: p.AktifMi ? 0 : 1 } : prod))
    try {
      await updateDoc(doc(db, "Urunler", String(p.UrunID)), { AktifMi: p.AktifMi ? 0 : 1 })
    } catch (err) {
      setProducts(products.map(prod => prod.UrunID === p.UrunID ? { ...prod, AktifMi: p.AktifMi } : prod))
      alert("Durum güncellenirken hata oluştu: " + err.message)
    }
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <h3 style={{ margin: 0, fontSize: '22px', display: 'flex', alignItems: 'center', gap: '8px' }}><FaUtensils /> Ürün Envanteri</h3>
        <button onClick={() => { resetForm(); setShowForm(true) }}
          style={{ padding: '10px 20px', background: 'var(--success)', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px' }}>
          <FaPlus /> Yeni Ürün Ekle
        </button>
      </div>

      {showForm && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div className="card" style={{ width: 600, maxHeight: '90vh', overflowY: 'auto' }}>
          <h4 style={{ marginTop: 0 }}>{editId ? <><FaPen /> Ürünü Güncelle</> : <><FaPlus /> Yeni Ürün Ekle</>}</h4>
          <form onSubmit={handleSubmit}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 15 }}>
              <div>
                <label>Ürün Adı *</label>
                <input required value={form.urun_adi}
                  onChange={e => setForm({ ...form, urun_adi: e.target.value })} />
              </div>
              <div>
                <label>Fiyat (₺) *</label>
                <input type="number" step="0.01" required value={form.fiyat}
                  onChange={e => setForm({ ...form, fiyat: e.target.value })} />
              </div>

              <div>
                <label>Kategori * 
                  <button type="button" onClick={() => setShowCatMan(!showCatMan)} style={{ marginLeft: 10, fontSize: 11, padding: '2px 6px', borderRadius: 4, border: '1px solid var(--primary)', background: 'transparent', color: 'var(--primary)', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '4px' }}><FaCog /> Yönet</button>
                </label>
                <select required value={form.kategori_id}
                  onChange={e => setForm({ ...form, kategori_id: e.target.value })}>
                  <option value="">Seçin...</option>
                  {categories.map(c => <option key={c.KategoriID} value={c.KategoriID}>{c.KategoriAdi}</option>)}
                </select>
              </div>
              <div>
                <label>Menü Tipi</label>
                <select value={form.menu_tipi}
                  onChange={e => setForm({ ...form, menu_tipi: e.target.value })}>
                  {menuTipleri.map(m => <option key={m.MenuTipiID} value={m.Adi}>{m.Adi}</option>)}
                </select>
              </div>
            </div>
            
            {showCatMan && (
              <div style={{ marginTop: 20, padding: 15, background: '#f5f5f5', borderRadius: 8, display: 'flex', gap: 20 }}>
                <div style={{ flex: 1 }}>
                  <h5 style={{ marginTop: 0, marginBottom: 10 }}>Kategoriler</h5>
                  <div style={{ display: 'flex', gap: 5, marginBottom: 10 }}>
                    <input required placeholder="Yeni Kategori" value={newCat} onChange={e => setNewCat(e.target.value)} style={{ padding: '4px 8px' }} />
                    <button type="button" onClick={handleAddCategory} style={btnSm('var(--success)')}><FaPlus /></button>
                  </div>
                  <ul style={{ margin: 0, paddingLeft: 20, fontSize: 13 }}>
                    {categories.map(c => (
                      <li key={c.KategoriID} style={{ marginBottom: 4 }}>
                        {c.KategoriAdi} <span onClick={() => handleDeleteCategory(c.KategoriID)} style={{ color: 'red', cursor: 'pointer', marginLeft: 5 }}><FaTimes /></span>
                      </li>
                    ))}
                  </ul>
                </div>
                <div style={{ flex: 1 }}>
                  <h5 style={{ marginTop: 0, marginBottom: 10 }}>Menü Tipleri</h5>
                  <div style={{ display: 'flex', gap: 5, marginBottom: 10 }}>
                    <input required placeholder="Yeni Menü Tipi" value={newMenuTip} onChange={e => setNewMenuTip(e.target.value)} style={{ padding: '4px 8px' }} />
                    <button type="button" onClick={handleAddMenuTip} style={btnSm('var(--success)')}><FaPlus /></button>
                  </div>
                  <ul style={{ margin: 0, paddingLeft: 20, fontSize: 13 }}>
                    {menuTipleri.map(m => (
                      <li key={m.MenuTipiID} style={{ marginBottom: 4 }}>
                        {m.Adi} <span onClick={() => handleDeleteMenuTip(m.MenuTipiID)} style={{ color: 'red', cursor: 'pointer', marginLeft: 5 }}><FaTimes /></span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            )}
            <div style={{ marginTop: 15, display: 'flex', alignItems: 'center', gap: 20 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <input type="checkbox" id="aktif" checked={form.aktif_mi}
                  style={{ width: 'auto', cursor: 'pointer' }}
                  onChange={e => setForm({ ...form, aktif_mi: e.target.checked })} />
                <label htmlFor="aktif" style={{ margin: 0, cursor: 'pointer' }}>Ürün Aktif</label>
              </div>
            </div>
            <div style={{ marginTop: 20, display: 'flex', gap: 10 }}>
              <button type="submit" style={{ padding: '10px 24px', background: 'var(--primary)', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer' }}>
                {editId ? 'Güncelle' : 'Ekle'}
              </button>
              <button type="button" onClick={resetForm}
                style={{ padding: '10px 24px', background: 'var(--text-muted)', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer' }}>
                İptal
              </button>
            </div>
            </form>
          </div>
        </div>
      )}

      <table>
        <thead>
          <tr>
            {['Ürün Adı', 'Kategori', 'Fiyat', 'Menü Tipi', 'Durum', 'İşlemler'].map(h =>
              <th key={h}>{h}</th>
            )}
          </tr>
        </thead>
        <tbody>
          {products.map(p => (
            <tr key={p.UrunID} style={{ opacity: p.AktifMi ? 1 : 0.6 }}>
              <td><b>{p.UrunAdi}</b></td>
              <td>{p.KategoriAdi}</td>
              <td style={{ fontWeight: 600 }}>{p.Fiyat} ₺</td>

              <td>{p.MenuTipi}</td>
              <td>
                {p.AktifMi ? badge('Aktif', 'var(--success)') : badge('Pasif', 'var(--text-muted)')}
              </td>
              <td>
                <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                  <label style={{
                    position: 'relative', display: 'inline-block', width: '44px', height: '24px'
                  }}>
                    <input type="checkbox" checked={p.AktifMi} onChange={() => toggleActive(p)} style={{ opacity: 0, width: 0, height: 0 }} />
                    <span style={{
                      position: 'absolute', cursor: 'pointer', top: 0, left: 0, right: 0, bottom: 0,
                      backgroundColor: p.AktifMi ? 'var(--success)' : '#ccc', transition: '.4s', borderRadius: '24px'
                    }}>
                      <span style={{
                        position: 'absolute', height: '18px', width: '18px', left: p.AktifMi ? '22px' : '3px', bottom: '3px',
                        backgroundColor: 'white', transition: '.4s', borderRadius: '50%'
                      }}></span>
                    </span>
                  </label>
                  <button onClick={() => startEdit(p)} style={btnSm('var(--primary)')}><FaPen /></button>
                  <button onClick={() => handleDelete(p.UrunID)} style={btnSm('var(--danger)')}><FaTimes /></button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

/* ── 2. MUTFAK YÖNETİMİ ── */
function KitchenManager() {
  const [orders, setOrders] = useState([])
  const [socketStatus, setSocketStatus] = useState('Bağlanıyor...')
  const prevOrderCountRef = useRef(0)

  useEffect(() => {
    const q = query(
      collection(db, "Siparisler"),
      where("Durum", "in", ["Alındı", "Hazırlanıyor"])
    );
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const kitchenOrders = snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          tutar: data.ToplamTutar,
          durum: data.Durum,
          urunler: data.urun_detaylari || 'Uygulamadan gönderilen sipariş',
          adres: data.Adres || 'Bilinmiyor',
          telefon: data.Telefon || 'Bilinmiyor',
          not: data.Not || ''
        }
      });
      
      // Bildirim sesi
      if (kitchenOrders.length > prevOrderCountRef.current && prevOrderCountRef.current !== 0) {
        try {
          const audio = new Audio('https://actions.google.com/sounds/v1/alarms/beep_short.ogg')
          audio.play()
        } catch (e) { console.error("Ses çalınamadı", e) }
      }
      prevOrderCountRef.current = kitchenOrders.length;
      
      setOrders(kitchenOrders);
      setSocketStatus('Canlı İzleniyor ✓');
    }, (error) => {
      console.error(error);
      setSocketStatus('Bağlantı Koptu - Yenileyin');
    });

    return () => unsubscribe();
  }, [])

  const updateStatus = async (id, newStatus) => {
    try {
      await updateDoc(doc(db, "Siparisler", String(id)), {
        Durum: newStatus
      });
    } catch (err) {
      console.error(err)
    }
  }

  const durumRengi = (durum) => {
    if (durum === 'Alındı') return 'var(--accent-dark)'
    if (durum === 'Hazırlanıyor') return 'var(--warning)'
    return 'var(--text-muted)'
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', marginBottom: '20px' }}>
        <div style={{ display: 'flex', gap: '15px', alignItems: 'center' }}>
          <span style={{ 
            color: socketStatus.includes('İzleniyor') ? 'var(--success)' : 'var(--danger)', 
            fontSize: '14px',
            fontWeight: 600,
            background: socketStatus.includes('İzleniyor') ? 'rgba(78, 112, 85, 0.1)' : 'rgba(179, 57, 57, 0.1)',
            padding: '6px 12px',
            borderRadius: '20px'
          }}>
            ● {socketStatus}
          </span>
        </div>
      </div>

      {orders.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--text-muted)' }}>
          <span style={{ fontSize: '48px', display: 'block', marginBottom: '15px' }}><FaUtensils /></span>
          <p style={{ fontSize: '18px', fontWeight: 600, margin: 0 }}>Aktif Sipariş Yok</p>
          <p style={{ fontSize: '14px', marginTop: '5px' }}>Müşteriler sipariş girdiğinde anlık olarak burada listelenecektir.</p>
        </div>
      ) : (
        <div className="grid">
          {orders.map(order => (
            <div key={order.id} className="card" style={{ 
              borderTop: `5px solid ${durumRengi(order.durum)}`, 
              display: 'flex', 
              flexDirection: 'column', 
              justifyContent: 'space-between',
              minHeight: '200px'
            }}>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                  <h4 style={{ margin: 0, fontSize: '18px' }} title={order.id}>Sipariş #{order.id.slice(-5)}</h4>
                  <span style={{
                    background: durumRengi(order.durum),
                    color: 'white',
                    padding: '3px 10px',
                    borderRadius: '20px',
                    fontSize: '11px',
                    fontWeight: 700,
                    textTransform: 'uppercase'
                  }}>{order.durum}</span>
                </div>
                <div style={{ fontSize: '13px', fontWeight: 600, marginBottom: '8px', color: 'var(--text-dark)' }}>
                  <div style={{marginBottom: 4}}>📞 {order.telefon}</div>
                  <div>📍 {order.adres}</div>
                  {order.not && <div style={{ marginTop: '8px', padding: '6px', background: '#fff3cd', color: '#856404', borderRadius: '6px', fontSize: '12px' }}>📝 <b>Not:</b> {order.not}</div>}
                </div>
                {order.urunler && (
                  <div style={{ 
                    background: 'var(--bg-app)', 
                    padding: '10px', 
                    borderRadius: '8px', 
                    fontSize: '13px', 
                    color: 'var(--text-dark)',
                    border: '1px solid var(--border)',
                    marginBottom: '10px'
                  }}>
                    {order.urunler}
                  </div>
                )}
              </div>
              
              <div style={{ marginTop: '15px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '8px' }}>
                  {order.durum === 'Alındı' && (
                    <>
                      <button
                        onClick={() => updateStatus(order.id, 'Hazırlanıyor')}
                        style={{ 
                          padding: '12px', background: 'var(--primary-light)', color: 'var(--primary)', 
                          border: 'none', borderRadius: '6px', fontSize: '14px', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px'
                        }}
                      >
                        <FaConciergeBell /> Hazırlamaya Başla
                      </button>
                      <button
                        onClick={() => {
                          if(confirm('Siparişi reddetmek istediğinize emin misiniz?')) {
                            updateStatus(order.id, 'Reddedildi')
                          }
                        }}
                        style={{ 
                          padding: '8px', background: '#ffebee', color: '#c62828', 
                          border: 'none', borderRadius: '6px', fontSize: '13px', fontWeight: 700, cursor: 'pointer'
                        }}
                      >
                        <FaTimes /> Siparişi Reddet
                      </button>
                    </>
                  )}
                  {order.durum === 'Hazırlanıyor' && (
                    <button
                      onClick={() => updateStatus(order.id, 'Hazır')}
                      style={{ 
                        padding: '12px', background: 'var(--success)', color: 'white', 
                        border: 'none', borderRadius: '6px', fontSize: '14px', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px'
                      }}
                    >
                      <FaCheck /> Kurye İçin Hazır
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

/* ─── 4. RAPORLAR ────────────────────────────────────────────────────── */
function Reports() {
  const [topSelling, setTopSelling]   = useState([])
  const [daily, setDaily]             = useState(null)
  const [recentOrders, setRecentOrders] = useState([])

  const load = async () => {
    // 1. Top Selling (Tüm Siparişlerden, durumu Teslim Edildi olanlardan)
    const oSnap = await getDocs(collection(db, "Siparisler"))
    const orders = oSnap.docs.map(d => d.data())
    const completedOrders = orders.filter(o => o.Durum === 'Teslim Edildi')
    
    // Urun adedini hesapla: we need urun_detaylari (e.g. "2x Çay, 1x Su")
    const productCounts = {}
    completedOrders.forEach(o => {
      if (o.urun_detaylari) {
        o.urun_detaylari.split(', ').forEach(item => {
          const match = item.match(/^(\d+)x (.*)$/)
          if (match) {
            const count = parseInt(match[1])
            const name = match[2]
            if (!productCounts[name]) productCounts[name] = { count: 0, revenue: 0 }
            productCounts[name].count += count
          }
        })
      }
    })
    
    // We don't have accurate historical prices in Siparisler for individual items,
    // so we just estimate top selling by quantity for now.
    const top = Object.entries(productCounts).map(([UrunAdi, data]) => ({
      UrunAdi, Satilan: data.count, Kazanc: 0 // Cannot easily calculate per-item revenue without saving it in the order
    })).sort((a,b) => b.Satilan - a.Satilan).slice(0, 10)
    
    setTopSelling(top)
    
    // 2. Daily Summary (Bugünün siparişleri)
  const todayStr = new Date().toISOString().split('T')[0]
  const todayOrders = orders.filter(o => o.SiparisTarihi && o.SiparisTarihi.startsWith(todayStr) && o.Durum === 'Teslim Edildi')
  const totalOrderCount = todayOrders.length
  const ciro = todayOrders.reduce((acc, o) => acc + (o.ToplamTutar || 0), 0)
    
  setDaily({ ToplamSiparis: totalOrderCount, Ciro: ciro })

    // 4. Son Siparişler
    const recent = [...orders].sort((a,b) => new Date(b.SiparisTarihi) - new Date(a.SiparisTarihi)).slice(0, 5)
    setRecentOrders(recent)
  }

  useEffect(() => { load() }, [])

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <h3 style={{ margin: 0, fontSize: '22px' }}>📊 Günlük Rapor Paneli</h3>
        <div style={{ display: 'flex', gap: 10 }}>
          <button onClick={async () => {
            const today = new Date().toISOString().split('T')[0];
            
            // Fetch export data from Firestore directly
            const oSnap = await getDocs(collection(db, "Siparisler"))
            const orders = oSnap.docs.map(d => ({id: d.id, ...d.data()})).filter(o => o.SiparisTarihi && o.SiparisTarihi.startsWith(today))
            
            const workbook = new ExcelJS.Workbook();
            const wsSiparis = workbook.addWorksheet('Günlük Siparişler');
            
            // Başlık Stili
            wsSiparis.columns = [
              { header: 'Tarih', key: 'Tarih', width: 15 },
              { header: 'Saat', key: 'Saat', width: 12 },
              { header: 'Sipariş No', key: 'SiparisID', width: 15 },
              { header: 'Durum', key: 'Durum', width: 15 },
              { header: 'Açıklama / Ürünler', key: 'Aciklama', width: 45 },
              { header: 'Adres', key: 'Adres', width: 40 },
              { header: 'Telefon', key: 'Telefon', width: 15 },
              { header: 'Tutar (₺)', key: 'Tutar', width: 15 }
            ];
            
            wsSiparis.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 12 };
            wsSiparis.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF8C6239' } };
            wsSiparis.getRow(1).alignment = { vertical: 'middle', horizontal: 'center' };
            
            const filteredOrders = orders.filter(o => o.Durum === 'Teslim Edildi' || o.Durum === 'Reddedildi');
            
            filteredOrders.forEach(o => {
              const row = wsSiparis.addRow({
                Tarih: new Date(o.SiparisTarihi).toLocaleDateString('tr-TR'),
                Saat: new Date(o.SiparisTarihi).toLocaleTimeString('tr-TR'),
                SiparisID: o.id.slice(-5),
                Durum: o.Durum,
                Aciklama: o.urun_detaylari,
                Adres: o.Adres || '-',
                Telefon: o.Telefon || '-',
                Tutar: o.ToplamTutar
              });
              row.alignment = { vertical: 'top', wrapText: true };
              
              if (o.Durum === 'Reddedildi') {
                row.getCell('Durum').font = { color: { argb: 'FFC62828' }, bold: true };
              } else {
                row.getCell('Durum').font = { color: { argb: 'FF2E7D32' }, bold: true };
              }
            });
            
            // Çizgiler ekle
            wsSiparis.eachRow((row, rowNumber) => {
              row.eachCell((cell) => {
                cell.border = {
                  top: {style:'thin'}, left: {style:'thin'},
                  bottom: {style:'thin'}, right: {style:'thin'}
                };
              });
            });
            
            const wsOzet = workbook.addWorksheet('Günlük Özet')
            wsOzet.columns = [{ header: 'Metrik', key: 'Metrik', width: 35 }, { header: 'Değer', key: 'Deger', width: 20 }]
            wsOzet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 12 };
            wsOzet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF8C6239' } };
            
            const ciro = filteredOrders.filter(o => o.Durum === 'Teslim Edildi').reduce((s,o) => s + (o.ToplamTutar||0), 0)
            const ortalamaSiparis = filteredOrders.length ? (ciro / filteredOrders.filter(o => o.Durum === 'Teslim Edildi').length).toFixed(2) : 0;
            
            wsOzet.addRow(['Toplam Tamamlanan Sipariş (Teslim Edildi)', filteredOrders.filter(o => o.Durum === 'Teslim Edildi').length]);
            wsOzet.addRow(['Toplam Reddedilen Sipariş', filteredOrders.filter(o => o.Durum === 'Reddedildi').length]);
            wsOzet.addRow(['Ortalama Sepet Tutarı (₺)', ortalamaSiparis]);
            wsOzet.addRow(['Günlük Ciro (₺)', ciro]);
            
            wsOzet.eachRow((row) => {
              row.eachCell((cell) => {
                cell.border = {
                  top: {style:'thin'}, left: {style:'thin'},
                  bottom: {style:'thin'}, right: {style:'thin'}
                };
              });
            });
            
            const buffer = await workbook.xlsx.writeBuffer();
            const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
            saveAs(blob, `Gunluk_Rapor_${today}.xlsx`);
            
          }} style={{ padding: '8px 16px', background: '#217346', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <FaFileDownload /> Excel İndir
          </button>
          <button onClick={load} style={{ padding: '8px 16px', background: 'var(--primary)', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <FaSyncAlt /> Raporu Güncelle
          </button>
        </div>
      </div>

      {daily && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 15, marginBottom: 25 }}>
          {[
            { label: 'Bugünün Siparişleri', value: daily.ToplamSiparis, color: 'var(--primary)', icon: '📋' },
            { label: 'Günlük Ciro',      value: `${(daily.Ciro || 0).toFixed(2)} ₺`,     color: 'var(--success)', icon: '💰' }
          ].map(c => (
            <div key={c.label} className="card" style={{ display: 'flex', alignItems: 'center', padding: '20px' }}>
              <div style={{ fontSize: '32px', marginRight: '15px' }}>{c.icon}</div>
              <div>
                <div style={{ color: 'var(--text-muted)', fontSize: '13px', fontWeight: 600 }}>{c.label}</div>
                <div style={{ fontSize: '24px', fontWeight: 800, color: c.color, marginTop: '4px' }}>{c.value}</div>
              </div>
            </div>
          ))}
        </div>
      )}
        <div className="card">
          <h4 style={{ marginTop: 0, borderBottom: '1px solid var(--border)', paddingBottom: '10px', display: 'flex', alignItems: 'center', gap: '8px' }}><FaCrown style={{ color: '#d4af37' }} /> En Popüler Lezzetler (Top 10)</h4>
          {topSelling.length === 0 ? (
            <p style={{ color: 'var(--text-muted)', margin: '15px 0 0 0' }}>Henüz yeterli satış verisi bulunmuyor.</p>
          ) : (
            <div style={{ marginTop: '10px' }}>
              {topSelling.map((item, idx) => (
                <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px dashed var(--border)' }}>
                  <span><b style={{ color: 'var(--primary)', marginRight: '6px' }}>#{idx + 1}</b> {item.UrunAdi}</span>
                  <span style={{ color: 'var(--text-muted)', fontSize: '13px' }}>
                    <span style={{ fontWeight: 700, color: 'var(--text-dark)' }}>{item.Satilan}</span> Satış
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="card">
          <h4 style={{ marginTop: 0, borderBottom: '1px solid var(--border)', paddingBottom: '10px', display: 'flex', alignItems: 'center', gap: '8px' }}><FaClock /> Son Siparişler</h4>
          {recentOrders.length === 0 ? (
            <p style={{ color: 'var(--text-muted)', margin: '15px 0 0 0' }}>Henüz sipariş bulunmuyor.</p>
          ) : (
            <div style={{ marginTop: '10px' }}>
              {recentOrders.map((order, idx) => {
                const timeStr = new Date(order.SiparisTarihi).toLocaleTimeString('tr-TR', {hour: '2-digit', minute: '2-digit'});
                return (
                  <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px dashed var(--border)' }}>
                    <div>
                      <div><b style={{ color: 'var(--primary)' }}>Sipariş #{order.id?.slice(-5) || '?'}</b> <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>({timeStr})</span></div>
                      <div style={{ fontSize: '13px', color: 'var(--text-dark)', marginTop: '4px' }}>
                        <div>📞 {order.Telefon || '-'}</div>
                        <div>📍 {order.Adres || '-'}</div>
                        {order.Not && <div style={{ marginTop: '8px', padding: '6px', background: '#fff3cd', color: '#856404', borderRadius: '6px', fontSize: '12px' }}>📝 <b>Not:</b> {order.Not}</div>}
                        <div style={{marginTop: '4px', fontStyle: 'italic'}}>{order.urun_detaylari}</div>
                      </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontWeight: 700 }}>{order.ToplamTutar} ₺</div>
                      <div style={{ fontSize: '11px', fontWeight: 600, color: order.Durum === 'Teslim Edildi' ? 'var(--success)' : (order.Durum === 'Hazır' ? 'var(--accent)' : 'var(--warning)'), marginTop: '4px' }}>{order.Durum}</div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
    </div>
  )
}

const btnSm = (bg) => ({
  padding: '6px 12px', background: bg, color: '#fff',
  border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 12, fontWeight: 600
})
