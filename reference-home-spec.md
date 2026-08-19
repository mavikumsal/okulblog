# Referans Ana Sayfa Tasarım Özeti

Kaynak: `/home/ubuntu/upload/okulblog-ana-sayfa.html` (kullanıcı tarafından yüklenen referans HTML)

## CSS tokenları

- `--navy: #061b2e`
- `--navy2: #0b2942`
- `--teal: #08a7a2`
- `--teal2: #078b87`
- `--paper: #f7f9fa`
- `--line: #e2e8e7`
- `--muted: #64748b`
- `--amber: #f4b63e`
- `--violet: #7664d9`
- `--white: #fff`
- Gölge: `0 12px 34px rgba(6,27,46,.08)`
- Container: `min(1400px, calc(100% - 64px))`
- Genel font: Inter / ui-sans-serif / system-ui

## Ana layout

- Hero: lacivert radial/linear gradient, `padding-bottom: 58px`, taşma gizli.
- Header: `height: 78px`, logo/nav/search/header-actions aynı satırda.
- Hero grid: `46% 54%`, minimum yükseklik `400px`, üst padding `34px`.
- Stats: hero üzerine kayan beyaz card, `margin-top: -44px`, dört kolon.
- Ana bölüm padding’i: `68px 0`.
- Keşif düzeni: sol tarafta dört sınıf kartı, sağda `305px` Popüler Konular paneli; gap `26px`.
- Sınıf kartları: dört kolon, `gap: 16px`, `padding: 14px`, radius `16px`.
- Kart kapak alanı: `height: 92px`, radius `13px`; her kart farklı gradient.

## Çalışma planı kompozisyonu

- Sağ hero wrapper: `position: relative`, `min-height: 360px`.
- Ana plan kartı: absolute, z-index 3, left `7%`, top `5%`, width `390px`, padding `24px`, beyaz card.
- Başlık: `Bugünkü Çalışma Planın`.
- İç gövde: yatay flex; progress halka `104x104`; plan bilgisi yanında.
- Halkanın görünümü: teal conic-gradient yüzde 68, içte beyaz daire.
- Plan bilgi sırası: `Türkçe • 6. Sınıf`, `Sıradaki Konu`, `Paragrafta Anlam`, `30 dk önerilen çalışma`.
- CTA: tam genişlik, teal, `Devam Et →`.
- Alt streak: üst border, plan kartının negatif yan/alt margin’iyle karta eklenmiş şerit; `5 gün üst üste çalıştın!` ve yedi günlük noktalar.
- Mini kart 1: width `190px`, left `53%`, top `12%`, rotate `6deg`, Matematik / Kesirler.
- Mini kart 2: width `190px`, left `70%`, top `22%`, rotate `10deg`, Fen Bilimleri / Güneş Sistemi.
- Mini kartlar ana kartın arkasında z-index 2/1.
- Kitap/kalem dekoru sağ-alt konumda.

## Responsive

- `max-width: 1050px`: nav gizli, menu görünür, search gizli, hero tek kolon, plan aşağı iner, stats iki kolon, discovery tek kolon, grade grid iki kolon.
- `max-width: 680px`: container `100% - 28px`, hero başlık `42px`, trust dikey, plan width `92%`, mini kartlar gizli, stats tek kolon, sınıf/content/latest/news/benefit/footer grid tek kolon.

## Uygulama notu

Bu dosya referansın ölçü ve stil sözleşmesidir. Gerçek OkulBlog verileri bu görsel kabuğa yerleştirilecek; demo içerik, sabit istatistik ve referansın statik metni veri kaynağı yerine kullanılmayacaktır.
