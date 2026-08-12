# NurSahifa

Men uchun Telegram Mini App (TMA) sifatida ishlaydigan "Nur Sahifa" veb-ilovasini yaratib ber.

### Loyiha haqida: "Nur Sahifa"

Foydalanuvchilar kitob sahifasini rasmga olib, matnni (OCR orqali) aniqlaydigan, bilmagan so'zlarini kartochka (Flashcard) shakliga o'tkazib, interval takrorlash (Spaced Repetition) tizimi orqali yodlaydigan va test topshiradigan platforma.

### Asosiy Funksionallik va Telegram Integratsiyasi:

1. Telegram Bot va Majburiy Obuna:

   - Foydalanuvchi Telegram Mini App ga kirishdan oldin, tizim Telegram Bot API (`getChatMember`) orqali belgilangan Telegram kanallariga obuna bo'lganini tekshirsin.

   - Faqat barcha kanallarga obuna bo'lgandan keyingina Mini App to'liq ochilsin.

   - Telegram WebApp SDK orqali foydalanuvchining `user_id`, ismi va mavzusini (theme) avtomatik aniqlansin va foydalanilsin.

2. OCR va So'z Ajratish (Rasm -> Kartochka):

   - Foydalanuvchi kitob sahifasini rasmga oladi yoki yuklaydi.

   - Tizim matnni o'qiydi (ingliz tili, o'zbekcha lotin va kirill alifbolarini qo'llab-quvvatlaydi).

   - Foydalanuvchi qiyin so'z ustiga bossa, uning o'zbekcha tarjimasi chiqadi va so'z avtomatik ravishda shaxsiy "Kartochkalar" bo'limiga qo'shiladi.

3. Aqlli Takrorlash va Test Tizimi:

   - Har bir kartochkada: so'z, tarjima va kitobdagi gapdan misol bo'lsin.

   - Kartochkalar soni 20 tadan oshganda: Mini-testlar (4 ta variantli test, juftlikni topish, imlo) ochilsin.

   - Kartochkalar soni 100 tadan oshganda: Imtihon rejimi ochilsin.

   - Interval takrorlash algoritmi: Foydalanuvchi adashgan so me'yordagi so'zlarni tez-tez va qayta-qayta ko'rsatilsin. Agar so'z ketma-ket 5-6 marta to'g'ri topilsa, u "Yodlangan" deb belgilanib, faol takrorlashdan chiqarib tashlansin.

### Dizayn va Interfeys:

- Faqat mobil qurilmalar va Telegram Mini App interfeysiga moslashtirilgan bo'lsin.

- Zamonaviy, tushunarli va foydalanishga qulay (gamified) dizaynga ega bo'lsin.

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://nursahifauz.lovable.app

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/3afa9e58-f34a-456d-952d-ec6c04fe37c8).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
