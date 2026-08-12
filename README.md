<div align="center">
  <img src="https://mirzalokantasi.web.app/vite.svg" alt="Logo" width="80" height="80">
  <h1 align="center">Mirza Lokantası - Sipariş Otomasyonu</h1>

  <p align="center">
    Serverless mimari (Vite + React + Firebase) ile geliştirilmiş modern, hızlı ve gerçek zamanlı restoran yönetim uygulaması.
    <br />
    <a href="https://mirzalokantasi.web.app/"><strong>🔥 Canlı Demoyu İncele »</strong></a>
  </p>
</div>

<details open="open">
  <summary><h2 style="display: inline-block">İçindekiler</h2></summary>
  <ol>
    <li><a href="#proje-hakkında">Proje Hakkında</a></li>
    <li><a href="#kullanılan-teknolojiler">Kullanılan Teknolojiler</a></li>
    <li><a href="#kurulum-ve-çalıştırma">Kurulum ve Çalıştırma</a></li>
    <li><a href="#sistem-modülleri">Sistem Modülleri</a></li>
    <li><a href="#git-ve-güvenlik-notları">Git ve Güvenlik Notları</a></li>
  </ol>
</details>

## 🚀 Proje Hakkında

Mirza Lokantası, geleneksel bir restoranın paket servis, mutfak yönetimi ve genel envanter kontrolünü tek bir noktadan, gerçek zamanlı olarak yönetebilmesini sağlayan modern bir web uygulamasıdır. Backend tarafı Firebase kullanılarak tamamen "Serverless" tasarlanmıştır.

* **Gerçek Zamanlı İletişim:** Sipariş verildiği an mutfakta, kuryeye verildiği an müşteri ekranında anlık güncellenir.
* **Akıllı UI:** "Optimistic UI" yaklaşımı ile işlemler (ürün aç/kapat, sipariş durumu değiştirme vs.) sayfa yenilenmeden, gecikmesiz olarak arayüze yansır.
* **Otomatik Popüler Yemekler:** Sipariş sayısına göre en çok satan ilk 3 yemek menüde otomatik olarak "Popüler Yemekler" kategorisine taşınır.

## 🛠 Kullanılan Teknolojiler

* **Frontend:** React (Vite.js)
* **Veritabanı / Backend:** Firebase Firestore (Serverless)
* **Hosting:** Firebase Hosting
* **Stil / İkonlar:** CSS, React Icons (FontAwesome vb.)

## 💻 Kurulum ve Çalıştırma

Projeyi bilgisayarınızda yerel olarak çalıştırmak için aşağıdaki adımları izleyin:

1. Depoyu bilgisayarınıza indirin:
   ```sh
   git clone https://github.com/KULLANICI_ADINIZ/mirza-lokantasi.git
   ```

2. Frontend klasörüne girip paketleri yükleyin:
   ```sh
   cd frontend
   npm install
   ```

3. Çevresel Değişkenleri Ayarlayın:
   - `frontend` klasörü içerisine `.env` isimli bir dosya oluşturun ve içerisine size verilen Firebase API anahtarlarını yapıştırın:
   ```env
   VITE_FIREBASE_API_KEY=XXXXXXXXXXXXXXXXXXXXXX
   VITE_FIREBASE_PROJECT_ID=mirzalokantasi
   # (Diğer Firebase key'leri...)
   ```

4. Geliştirme sunucusunu başlatın:
   ```sh
   npm run dev
   ```

## 📦 Sistem Modülleri

Sistem 3 temel modülden oluşmaktadır:

1. **👨‍🍳 Müşteri Paneli (`/`)** 
   - Menü ve kategorileri görüntüler.
   - Gerçek zamanlı sepet yönetimi (Artır/Azalt).
   - Sipariş notu ekleme ve sipariş durumu takip animasyonu.

2. **⚙️ Admin / Mutfak Paneli (`/#/admin`)**
   - **Mutfak:** Gelen siparişlerin "Hazırlanıyor", "Kuryeye Verildi" vs. olarak yönetilmesi.
   - **Ürün Yönetimi:** Menüye yeni ürün ekleme, aktif/pasif durumu, fiyat ve stok güncelleme.
   - **Raporlar:** Belirtilen tarihler arası satışların `Excel` dosyası olarak indirilmesi. *(Giriş: admin / 123456)*

3. **🛵 Kurye Paneli (`/#/kurye`)**
   - Hazır durumdaki siparişleri görür, teslim alır ve teslimatı onaylar. Müşteride sipariş animasyonu havai fişek patlamasıyla tamamlanır. *(Giriş: kurye / 123456)*

## 🛡️ Git ve Güvenlik Notları

Firebase yapısı gereği sunucuya ve veritabanına doğrudan bağlanır. Bu yüzden, `.env` dosyasını asla GitHub'a atmamalısınız. Projenin ana klasöründeki `.gitignore` dosyası bunu engeller. GitHub'a atmanız ve atmamanız gereken klasör yapısı şu şekildedir:

✅ **Github'a Yüklenecekler:**
- `frontend/src/`
- `frontend/public/`
- `frontend/package.json`
- `frontend/vite.config.js`
- `README.md`
- `firebase.json`, `firestore.rules`

❌ **Github'a Kesinlikle Yüklenmeyecekler:**
- `.env` veya `.env.local` dosyaları (Şifre ve API key içerir)
- `node_modules/` (Aşırı büyüktür, npm install ile indirilir)
- `frontend/dist/` (Derlenmiş proje doyalarıdır)
- `.firebase/` (Lokal önbellek dosyaları)
