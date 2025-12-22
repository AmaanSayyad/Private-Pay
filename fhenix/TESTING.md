# Fhenix Payments - Test Rehberi

Bu doküman, Fhenix Confidential Payments özelliğini frontend'de nasıl test edeceğinizi açıklar.

## Ön Gereksinimler

1. **MetaMask Kurulumu**
   - MetaMask extension'ı yüklü olmalı
   - [MetaMask İndir](https://metamask.io/download/)

2. **Arbitrum Sepolia Testnet**
   - MetaMask'te Arbitrum Sepolia network'ü eklenmiş olmalı
   - Testnet ETH'ye sahip olmalısınız

3. **Testnet ETH Alma**
   - [Arbitrum Sepolia Faucet](https://faucet.quicknode.com/arbitrum/sepolia)
   - Veya [Chainlink Faucet](https://faucets.chain.link/arbitrum-sepolia)

## Test Adımları

### 1. MetaMask'i Hazırlama

1. MetaMask extension'ını açın
2. Test hesabı kullanın (mainnet'teki gerçek fonlarınızı kullanmayın)
3. Network'ü **Arbitrum Sepolia** olarak değiştirin:
   - MetaMask'te network dropdown'dan "Add Network" seçin
   - Veya otomatik olarak eklenmesi için sayfadaki "Connect MetaMask" butonuna tıklayın

**Arbitrum Sepolia Network Bilgileri:**
- Network Name: Arbitrum Sepolia
- RPC URL: `https://sepolia-rollup.arbitrum.io/rpc`
- Chain ID: `421614`
- Currency Symbol: `ETH`
- Block Explorer: `https://sepolia.arbiscan.io`

### 2. Frontend'i Başlatma

```bash
# Proje root dizininde
npm install  # veya yarn install
npm run dev  # veya yarn dev
```

### 3. Fhenix Payments Sayfasına Gitme

1. Tarayıcıda uygulamayı açın (genellikle `http://localhost:5173`)
2. Navigasyon menüsünden `/fhenix` route'una gidin
3. Veya direkt URL: `http://localhost:5173/fhenix`

### 4. Wallet Bağlantısı

1. Sayfada "Connect MetaMask" butonuna tıklayın
2. MetaMask popup'ında "Connect" butonuna tıklayın
3. Network otomatik olarak Arbitrum Sepolia'ya geçirilecek
4. Eğer network yanlışsa, MetaMask'te manuel olarak değiştirin

**Beklenen Sonuç:**
- ✅ Wallet Status card'ında "FHE Ready" görünmeli
- ✅ Network badge'de "Arbitrum Sepolia" görünmeli
- ✅ Wallet adresiniz görünmeli
- ✅ Balance yüklenmeli (başlangıçta 0.00 olabilir)

### 5. Test Token'ları Mint Etme (Owner Only)

**ÖNEMLİ:** Sadece kontrat owner'ı mint yapabilir. Owner adresi `.env` dosyasındaki `ARBITRUM_TREASURY_PRIVATE_KEY` ile eşleşen adrestir.

1. Wallet Status card'ında "Test Tokens (Owner Only)" bölümünü bulun
2. Mint amount girin (örn: 100)
3. "Mint" butonuna tıklayın
4. MetaMask'te transaction'ı onaylayın
5. Transaction başarılı olduktan sonra balance güncellenecek

**Eğer Owner Değilseniz:**
- Mint butonu çalışmayacak veya hata verecek
- Bu durumda, owner'dan test token'ları almanız gerekir
- Veya owner olarak deploy eden hesabı kullanın

### 6. Confidential Transfer Testi

#### Senaryo 1: Kendi Kendinize Transfer

1. **Recipient Address:** Kendi wallet adresinizi girin
2. **Amount:** Transfer edilecek miktarı girin (örn: 10)
3. **Send Confidential Transfer** butonuna tıklayın
4. İşlem akışı:
   - ✅ "Miktar şifreleniyor..." mesajı görünür
   - ✅ Encryption state progress bar'ı ilerler
   - ✅ "İşlem hazırlanıyor..." mesajı görünür
   - ✅ MetaMask popup'ı açılır
   - ✅ Transaction'ı onaylayın
   - ✅ "Gizli transfer başarılı!" mesajı görünür
   - ✅ Transaction hash gösterilir

#### Senaryo 2: Başka Bir Adrese Transfer

1. İkinci bir MetaMask hesabı açın (veya başka bir test adresi kullanın)
2. Recipient address olarak bu adresi girin
3. Amount girin
4. Transfer'i gönderin
5. Transaction başarılı olduktan sonra, recipient adresinde balance kontrol edilebilir

### 7. Balance Kontrolü

1. Transfer sonrası balance otomatik güncellenir
2. "Balance" card'ında yeni balance görünür
3. Eğer güncellenmezse, sayfayı yenileyin veya "Max" butonuna tıklayın

### 8. Transaction Doğrulama

1. Başarılı transfer sonrası "View Transaction" linki görünür
2. Link'e tıklayarak Arbiscan'da transaction'ı görüntüleyin
3. Transaction detaylarında:
   - ✅ Status: Success
   - ✅ From: Sizin adresiniz
   - ✅ To: FHPAY contract adresi
   - ✅ Input data: Encrypted data içerir

## Beklenen Davranışlar

### ✅ Başarılı Senaryolar

1. **Wallet Bağlantısı:**
   - MetaMask bağlantısı başarılı
   - Network otomatik switch edilir
   - FHE client initialize olur

2. **Encryption:**
   - Amount başarıyla şifrelenir
   - Encryption state progress bar'ı çalışır
   - CoFHE veya fallback mode kullanılır

3. **Transfer:**
   - Transaction başarıyla gönderilir
   - Balance güncellenir
   - Transaction hash gösterilir

### ❌ Hata Senaryoları ve Çözümleri

1. **"MetaMask is not installed"**
   - **Çözüm:** MetaMask extension'ını yükleyin

2. **"Wrong Network"**
   - **Çözüm:** MetaMask'te Arbitrum Sepolia network'üne geçin

3. **"Insufficient funds"**
   - **Çözüm:** Arbitrum Sepolia testnet ETH alın (faucet'ten)

4. **"Only contract owner can mint"**
   - **Çözüm:** Owner hesabını kullanın veya owner'dan token alın

5. **"FHE client not initialized"**
   - **Çözüm:** Wallet'ı bağlayın ve sayfayı yenileyin

6. **"Transaction would fail"**
   - **Çözüm:** Balance'ınızı kontrol edin, recipient adresini doğrulayın

7. **"Encryption failed"**
   - **Çözüm:** CoFHE servisi çalışmıyor olabilir, fallback mode kullanılır
   - Sayfayı yenileyin ve tekrar deneyin

## Debug İpuçları

### Browser Console

1. F12 ile Developer Tools'u açın
2. Console tab'ına bakın
3. Hata mesajlarını kontrol edin

### MetaMask Logs

1. MetaMask extension'ında Settings > Advanced > Show Incoming Transactions
2. Transaction history'yi kontrol edin

### Network Tab

1. Developer Tools > Network tab
2. RPC çağrılarını kontrol edin
3. Failed request'leri inceleyin

## Test Checklist

- [ ] MetaMask kurulu ve çalışıyor
- [ ] Arbitrum Sepolia network'ü eklendi
- [ ] Testnet ETH var (en az 0.01 ETH)
- [ ] Wallet bağlantısı başarılı
- [ ] FHE client initialize oldu
- [ ] Balance yüklendi
- [ ] Test token'ları mint edildi (owner ise)
- [ ] Confidential transfer başarılı
- [ ] Transaction Arbiscan'da görünüyor
- [ ] Balance güncellendi

## Sorun Giderme

### FHE Client Initialize Olmuyor

1. MetaMask'in bağlı olduğundan emin olun
2. Network'ün Arbitrum Sepolia olduğunu kontrol edin
3. Browser console'da hata var mı bakın
4. Sayfayı yenileyin

### Transfer Başarısız

1. Balance'ınızı kontrol edin
2. Recipient adresinin doğru olduğundan emin olun (0x ile başlamalı, 42 karakter)
3. Amount'ın pozitif olduğundan emin olun
4. Gas fee için yeterli ETH'niz olduğundan emin olun

### Balance Güncellenmiyor

1. Sayfayı yenileyin
2. "Max" butonuna tıklayın
3. Browser console'da hata var mı kontrol edin
4. Transaction'ın başarılı olduğunu Arbiscan'da doğrulayın

## İletişim ve Destek

Sorun yaşarsanız:
1. Browser console log'larını kontrol edin
2. Network tab'ında failed request'leri inceleyin
3. Transaction hash'i Arbiscan'da kontrol edin
4. GitHub issues'da benzer sorunları arayın

## Notlar

- **Testnet Kullanımı:** Tüm işlemler testnet üzerinde gerçekleşir, gerçek para kullanılmaz
- **Gas Fees:** Her transaction için küçük bir gas fee ödenir (testnet ETH)
- **Encryption:** Amount'lar FHE ile şifrelenir, sadece sender ve recipient decrypt edebilir
- **Owner Mint:** Sadece kontrat owner'ı test token'ları mint edebilir

