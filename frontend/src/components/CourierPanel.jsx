import { useState, useEffect } from 'react'
import { db } from '../firebase'
import { collection, query, where, onSnapshot, updateDoc, doc } from 'firebase/firestore'
import { FaMotorcycle, FaRocket, FaBell } from 'react-icons/fa'

export default function CourierPanel() {
  const [orders, setOrders] = useState([])
  const [socketStatus, setSocketStatus] = useState('Bağlanıyor...')

  useEffect(() => {
    const q = query(
      collection(db, "Siparisler"),
      where("Durum", "in", ["Hazır", "Kuryede"])
    );
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const readyOrders = snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          tutar: data.ToplamTutar,
          durum: data.Durum,
          urunler: data.urun_detaylari || 'Sipariş detayları',
          adres: data.Adres || 'Bilinmiyor',
          telefon: data.Telefon || 'Bilinmiyor',
          not: data.Not || ''
        }
      });
      setOrders(readyOrders);
      setSocketStatus('Canlı Bağlantı Aktif ✓');
    }, (error) => {
      console.error(error);
      setSocketStatus('Bağlantı Koptu - Yenileyin');
    });

    return () => unsubscribe();
  }, [])

  const markStatus = async (id, newStatus) => {
    try {
      await updateDoc(doc(db, "Siparisler", String(id)), {
        Durum: newStatus
      });
    } catch (err) {
      console.error(err)
    }
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', marginBottom: '20px' }}>
        <div style={{ display: 'flex', gap: '15px', alignItems: 'center' }}>
          <span style={{ 
            color: socketStatus.includes('Aktif') ? 'var(--success)' : 'var(--danger)', 
            fontSize: '14px',
            fontWeight: 600,
            background: socketStatus.includes('Aktif') ? 'rgba(78, 112, 85, 0.1)' : 'rgba(179, 57, 57, 0.1)',
            padding: '6px 12px',
            borderRadius: '20px'
          }}>
            ● {socketStatus}
          </span>
          <button style={{ 
            padding: '8px 16px', 
            background: 'var(--primary-light)', 
            color: 'var(--primary)', 
            border: 'none', 
            borderRadius: '8px' 
          }}>Canlı</button>
        </div>
      </div>

      {orders.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--text-muted)' }}>
          <span style={{ fontSize: '48px', display: 'block', marginBottom: '15px' }}><FaBell /></span>
          <p style={{ fontSize: '18px', fontWeight: 600, margin: 0 }}>Teslim Edilecek Sipariş Yok</p>
          <p style={{ fontSize: '14px', marginTop: '5px' }}>Mutfak siparişleri "Hazır" olarak işaretlediğinde burada zil çalacaktır.</p>
        </div>
      ) : (
        <div className="grid">
          {orders.map(order => (
            <div key={order.id} className="card" style={{ 
              borderTop: '5px solid var(--accent)', 
              display: 'flex', 
              flexDirection: 'column', 
              justifyContent: 'space-between',
              minHeight: '200px'
            }}>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                  <h4 style={{ margin: 0, fontSize: '18px' }} title={order.id}>Sipariş #{order.id.slice(-5)}</h4>
                  <span style={{
                    background: order.durum === 'Hazır' ? 'var(--accent)' : 'var(--primary)',
                    color: 'white',
                    padding: '3px 10px',
                    borderRadius: '20px',
                    fontSize: '11px',
                    fontWeight: 700,
                    textTransform: 'uppercase'
                  }}>{order.durum}</span>
                </div>
                <div style={{ fontSize: '14px', fontWeight: 600, marginBottom: '8px', color: 'var(--text-dark)' }}>
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
              
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px', fontWeight: 700 }}>
                  <span>Tutar:</span>
                  <span style={{ color: 'var(--primary)', fontSize: '16px' }}>{order.tutar} ₺</span>
                </div>

                {order.durum === 'Hazır' && (
                  <button
                    onClick={() => markStatus(order.id, 'Kuryede')}
                    style={{ 
                      width: '100%', padding: '12px', background: 'var(--primary)', color: 'white', 
                      border: 'none', borderRadius: '8px', fontSize: '14px', fontWeight: 700, cursor: 'pointer',
                      boxShadow: '0 4px 10px rgba(78, 112, 85, 0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px'
                    }}
                  >
                    <FaMotorcycle /> Teslim Al (Kuryede)
                  </button>
                )}
                {order.durum === 'Kuryede' && (
                  <button
                    onClick={() => markStatus(order.id, 'Teslim Edildi')}
                    style={{ 
                      width: '100%', padding: '12px', background: 'var(--success)', color: 'white', 
                      border: 'none', borderRadius: '8px', fontSize: '14px', fontWeight: 700, cursor: 'pointer',
                      boxShadow: '0 4px 10px rgba(78, 112, 85, 0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px'
                    }}
                  >
                    <FaRocket /> Müşteriye Teslim Edildi
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
