# aUSDC Token Alma Rehberi

## aUSDC Nedir?

**aUSDC** (Axelar USDC), Axelar testnet'inde kullanılan test token'ıdır. Cross-chain transferler için kullanılır.

## aUSDC Alma Yöntemleri

### Yöntem 1: Axelar Discord Faucet (Önerilen)

1. **Axelar Discord'a katılın:**
   - Discord: https://discord.gg/axelarnetwork

2. **Faucet kanalına gidin:**
   - `#faucet` veya `#testnet-faucet` kanalını bulun

3. **Komut gönderin:**
   ```
   !faucet arbitrum-sepolia <your-address>
   ```
   veya
   ```
   !faucet base-sepolia <your-address>
   ```

4. **Bekleyin:**
   - Token'lar birkaç dakika içinde cüzdanınıza gelir

### Yöntem 2: Satellite.money Bridge

1. **Satellite.money testnet'e gidin:**
   - URL: https://testnet.satellite.money/

2. **Bridge işlemi yapın:**
   - Kaynak chain: Ethereum Sepolia (veya başka bir chain)
   - Hedef chain: Arbitrum Sepolia veya Base Sepolia
   - Token: USDC veya aUSDC
   - Miktar: İstediğiniz miktar

3. **Token'ları bridge edin:**
   - Bridge işlemi tamamlandığında token'lar hedef chain'de olur

### Yöntem 3: Axelar Testnet Faucet

1. **Axelar testnet faucet'e gidin:**
   - URL: https://faucet.testnet.axelar.dev/

2. **Cüzdan adresinizi girin**

3. **Chain seçin:**
   - Arbitrum Sepolia veya Base Sepolia

4. **Token isteyin:**
   - aUSDC token'ları otomatik olarak gönderilir

## Alternatif: TUSDC Token

Projenizde **TUSDC** (Test USDC) adında özel bir test token'ı da var:

- **Adres (Ethereum Sepolia):** `0x5EF8B232E6e5243bf9fAe7E725275A8B0800924B`
- **Decimals:** 6
- **Type:** ITS Token (Interchain Token Service)

TUSDC, ITS (Interchain Token Service) üzerinden çalışır ve cross-chain transferler için kullanılabilir.

## Hangi Token'ı Kullanmalıyım?

### aUSDC Kullanın Eğer:
- ✅ Standart Axelar gateway token'ları ile çalışmak istiyorsanız
- ✅ Resmi Axelar token'larını kullanmak istiyorsanız
- ✅ Daha yaygın kullanılan bir token istiyorsanız

### TUSDC Kullanın Eğer:
- ✅ ITS (Interchain Token Service) ile çalışmak istiyorsanız
- ✅ Özel test token'ı kullanmak istiyorsanız
- ✅ Privacy pool özelliklerini test etmek istiyorsanız

## Token Adresleri (Testnet)

### Arbitrum Sepolia
- **aUSDC:** Gateway'den sorgulanabilir (gateway.tokenAddresses("aUSDC"))
- **TUSDC:** `0x5EF8B232E6e5243bf9fAe7E725275A8B0800924B` (Ethereum Sepolia'da deploy edilmiş, bridge ile kullanılabilir)

### Base Sepolia
- **aUSDC:** Gateway'den sorgulanabilir
- **axlUSDC:** Gateway'den sorgulanabilir

## Token Kontrolü

Frontend'de token'ları kontrol etmek için:

1. Cross-chain payment sayfasını açın
2. Source ve destination chain seçin
3. Token dropdown'ında mevcut token'ları görürsünüz
4. Token seçildiğinde balance otomatik kontrol edilir

## Sorun Giderme

### Token görünmüyor:
- Gateway'de token'ın deploy edildiğinden emin olun
- Chain'in doğru seçildiğinden emin olun
- RPC bağlantısını kontrol edin

### Balance 0:
- Faucet'ten token istediğinizden emin olun
- Doğru chain'de olduğunuzdan emin olun
- Transaction'ın tamamlandığını kontrol edin

### Token transfer edilemiyor:
- Yeterli gas (ETH) olduğundan emin olun
- Token approval yapıldığından emin olun
- Bridge kontratının doğru adresini kullandığınızdan emin olun

## Önemli Notlar

⚠️ **Testnet Token'ları:**
- aUSDC ve TUSDC sadece testnet'te geçerlidir
- Mainnet'te gerçek değeri yoktur
- Sadece test amaçlı kullanılmalıdır

⚠️ **Gas Fees:**
- Cross-chain transferler için hem source hem destination chain'de gas gerekir
- Source chain'de native token (ETH) olmalı
- Gas estimation frontend'de otomatik yapılır

## Hızlı Başlangıç

1. **Discord'a katıl:** https://discord.gg/axelarnetwork
2. **Faucet'ten token iste:** `!faucet arbitrum-sepolia <address>`
3. **Frontend'de test et:** Cross-chain payment sayfasını aç
4. **Transfer yap:** Arbitrum → Base veya Base → Arbitrum

## İletişim

Sorun yaşarsanız:
- Axelar Discord: https://discord.gg/axelarnetwork
- Axelar Docs: https://docs.axelar.dev
- Satellite.money: https://testnet.satellite.money/

