import { useState, useEffect } from 'react'
import CustomerMenu from './components/CustomerMenu'
import WaiterPanel from './components/CourierPanel' // renamed from WaiterPanel
import AdminPanel from './components/AdminPanel'

function App() {
  const [route, setRoute] = useState(window.location.hash || '#/')
  const [adminAuth, setAdminAuth] = useState(false)
  const [kuryeAuth, setKuryeAuth] = useState(false)

  useEffect(() => {
    const handleHashChange = () => setRoute(window.location.hash || '#/')
    window.addEventListener('hashchange', handleHashChange)
    return () => window.removeEventListener('hashchange', handleHashChange)
  }, [])

  // ── Kurye ──────────────────────────────────────────────────────────
  if (route.startsWith('#/kurye')) {
    if (!kuryeAuth) {
      return (
        <div className="app-container">
          <RoleHeader title="Kurye Teslimat Paneli" icon="🛵" role="Kurye" />
          <LoginBox onLogin={(u, p) => {
            if(u === 'kurye' && p === '123456') setKuryeAuth(true); else alert('Hatalı giriş');
          }} />
        </div>
      )
    }
    return (
      <div className="app-container">
        <RoleHeader title="Kurye Teslimat Paneli" icon="🛵" role="Kurye" />
        <WaiterPanel />
      </div>
    )
  }

  // ── Yönetim ─────────────────────────────────────────────────────────
  if (route.startsWith('#/yonetim')) {
    if (!adminAuth) {
      return (
        <div className="app-container">
          <RoleHeader title="Mirza Lokantası — Yönetim" icon="📋" role="Yönetici" />
          <LoginBox onLogin={(u, p) => {
            if(u === 'admin' && p === '123456') setAdminAuth(true); else alert('Hatalı giriş');
          }} />
        </div>
      )
    }
    return (
      <div className="app-container">
        <RoleHeader title="Mirza Lokantası — Yönetim" icon="📋" role="Yönetici" />
        <AdminPanel />
      </div>
    )
  }

  // ── Müşteri Menü: #/menu ────────────────────────────
  if (route.startsWith('#/menu')) {
    return <CustomerMenu />
  }

  // ── Giriş Noktası (doğrudan URL açıldığında) ─────────────────────────
  return (
    <div className="app-container" style={{ textAlign: 'center', paddingTop: '80px' }}>
      <span style={{ fontSize: '64px' }}>🍽️</span>
      <h2 style={{ fontStyle: 'italic', marginTop: '16px', fontSize: '30px' }}>Mirza Lokantası</h2>
      <p style={{ color: 'var(--text-muted)', maxWidth: '360px', margin: '0 auto 40px', lineHeight: 1.7 }}>
        Müşteriler masadaki QR kodu okutarak menüye ulaşır.<br/>
        Personel linkleri aşağıdan kullanabilir.
      </p>
      <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', justifyContent: 'center' }}>
        <a href="#/menu" style={linkStyle('#d35400')}>📱 Sipariş Menüsü</a>
        <a href="#/kurye" style={linkStyle('#4e7055')}>🛵 Kurye Paneli</a>
        <a href="#/yonetim" style={linkStyle('#b8901c')}>📋 Yönetici Paneli</a>
      </div>
    </div>
  )
}

const linkStyle = (bg) => ({
  padding: '12px 28px',
  background: bg,
  color: '#fff',
  borderRadius: '10px',
  textDecoration: 'none',
  fontWeight: 700,
  fontSize: '15px',
  boxShadow: `0 4px 14px ${bg}44`
})

// ── Rol Başlığı ──────────────────────────────────────────────────────
function RoleHeader({ title, icon, role }) {
  return (
    <div style={{
      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      marginBottom: '24px', paddingBottom: '16px',
      borderBottom: '2px solid var(--border)'
    }}>
      <h2 style={{ margin: 0, fontStyle: 'italic' }}>{icon} {title}</h2>
      <span style={{
        fontSize: '13px', background: 'var(--primary-light)',
        padding: '6px 14px', borderRadius: '20px',
        fontWeight: 600, color: 'var(--primary)'
      }}>{role} Modu</span>
    </div>
  )
}

function LoginBox({ onLogin }) {
  const [u, setU] = useState('');
  const [p, setP] = useState('');
  return (
    <div style={{ maxWidth: 300, margin: '40px auto', background: '#fff', padding: 20, borderRadius: 12, boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}>
      <h3 style={{ marginTop: 0, textAlign: 'center' }}>Giriş Yapın</h3>
      <input placeholder="Kullanıcı Adı" value={u} onChange={e=>setU(e.target.value)} style={{ width: '100%', marginBottom: 10, padding: 8, borderRadius: 6, border: '1px solid #ccc' }}/>
      <input placeholder="Şifre" type="password" value={p} onChange={e=>setP(e.target.value)} style={{ width: '100%', marginBottom: 15, padding: 8, borderRadius: 6, border: '1px solid #ccc' }}/>
      <button onClick={() => onLogin(u,p)} style={{ width: '100%', padding: 10, background: 'var(--primary)', color: '#fff', border: 'none', borderRadius: 6, fontWeight: 'bold', cursor: 'pointer' }}>Giriş</button>
    </div>
  )
}

export default App
