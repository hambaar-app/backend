// @ts-ignore

import { PrismaClient } from '../generated/prisma';

const prisma = new PrismaClient();

const provincesData = [
  {
    persianName: 'آذربایجان شرقی',
    englishName: 'East Azerbaijan',
    cities: [
      { persianName: 'تبریز', englishName: 'Tabriz' },
      { persianName: 'مراغه', englishName: 'Maragheh' },
      { persianName: 'میانه', englishName: 'Mianeh' },
      { persianName: 'مرند', englishName: 'Marand' },
      { persianName: 'شبستر', englishName: 'Shabestar' },
      { persianName: 'اهر', englishName: 'Ahar' },
      { persianName: 'بناب', englishName: 'Bonab' },
      { persianName: 'جلفا', englishName: 'Jolfa' },
      { persianName: 'سراب', englishName: 'Sarab' },
      { persianName: 'کلیبر', englishName: 'Kalibar' }
    ]
  },
  {
    persianName: 'آذربایجان غربی',
    englishName: 'West Azerbaijan',
    cities: [
      { persianName: 'ارومیه', englishName: 'Urmia' },
      { persianName: 'خوی', englishName: 'Khoy' },
      { persianName: 'مهاباد', englishName: 'Mahabad' },
      { persianName: 'بوکان', englishName: 'Bukan' },
      { persianName: 'میاندوآب', englishName: 'Miandoab' },
      { persianName: 'سلماس', englishName: 'Salmas' },
      { persianName: 'نقده', englishName: 'Naqadeh' },
      { persianName: 'تکاب', englishName: 'Takab' },
      { persianName: 'چالدران', englishName: 'Chaldoran' },
      { persianName: 'پیرانشهر', englishName: 'Piranshahr' }
    ]
  },
  {
    persianName: 'اردبیل',
    englishName: 'Ardabil',
    cities: [
      { persianName: 'اردبیل', englishName: 'Ardabil' },
      { persianName: 'پارس‌آباد', englishName: 'Parsabad' },
      { persianName: 'خلخال', englishName: 'Khalkhal' },
      { persianName: 'مشگین‌شهر', englishName: 'Meshgin Shahr' },
      { persianName: 'گرمی', englishName: 'Germi' },
      { persianName: 'نمین', englishName: 'Namin' },
      { persianName: 'نیر', englishName: 'Nir' },
      { persianName: 'کوثر', englishName: 'Kowsar' },
      { persianName: 'بیله‌سوار', englishName: 'Bileh Savar' },
      { persianName: 'سرعین', englishName: 'Sarein' }
    ]
  },
  {
    persianName: 'اصفهان',
    englishName: 'Isfahan',
    cities: [
      { persianName: 'اصفهان', englishName: 'Isfahan' },
      { persianName: 'کاشان', englishName: 'Kashan' },
      { persianName: 'نجف‌آباد', englishName: 'Najafabad' },
      { persianName: 'خمینی‌شهر', englishName: 'Khomeyni Shahr' },
      { persianName: 'شاهین‌شهر', englishName: 'Shahin Shahr' },
      { persianName: 'فولادشهر', englishName: 'Fooladshahr' },
      { persianName: 'دولت‌آباد', englishName: 'Dowlatabad' },
      { persianName: 'زرین‌شهر', englishName: 'Zarin Shahr' },
      { persianName: 'گلپایگان', englishName: 'Golpayegan' },
      { persianName: 'نطنز', englishName: 'Natanz' }
    ]
  },
  {
    persianName: 'ایلام',
    englishName: 'Ilam',
    cities: [
      { persianName: 'ایلام', englishName: 'Ilam' },
      { persianName: 'دهلران', englishName: 'Dehloran' },
      { persianName: 'مهران', englishName: 'Mehran' },
      { persianName: 'آبدانان', englishName: 'Abdanan' },
      { persianName: 'دره‌شهر', englishName: 'Dareh Shahr' },
      { persianName: 'ایوان', englishName: 'Eyvan' },
      { persianName: 'چوار', englishName: 'Chavar' },
      { persianName: 'ملکشاهی', englishName: 'Malekshahi' },
      { persianName: 'بدره', englishName: 'Badreh' },
      { persianName: 'سرابله', englishName: 'Sarableh' }
    ]
  },
  {
    persianName: 'بوشهر',
    englishName: 'Bushehr',
    cities: [
      { persianName: 'بوشهر', englishName: 'Bushehr' },
      { persianName: 'برازجان', englishName: 'Borazjan' },
      { persianName: 'خارک', englishName: 'Khark' },
      { persianName: 'گناوه', englishName: 'Genaveh' },
      { persianName: 'دشتستان', englishName: 'Dashtestan' },
      { persianName: 'جم', englishName: 'Jam' },
      { persianName: 'کنگان', englishName: 'Kangan' },
      { persianName: 'عسلویه', englishName: 'Asaluyeh' },
      { persianName: 'دیر', englishName: 'Deyr' },
      { persianName: 'دیلم', englishName: 'Deylam' }
    ]
  },
  {
    persianName: 'تهران',
    englishName: 'Tehran',
    cities: [
      { persianName: 'تهران', englishName: 'Tehran' },
      { persianName: 'کرج', englishName: 'Karaj' },
      { persianName: 'اسلام‌شهر', englishName: 'Eslam Shahr' },
      { persianName: 'رباط‌کریم', englishName: 'Robat Karim' },
      { persianName: 'ورامین', englishName: 'Varamin' },
      { persianName: 'شهریار', englishName: 'Shahriar' },
      { persianName: 'ری', englishName: 'Rey' },
      { persianName: 'دماوند', englishName: 'Damavand' },
      { persianName: 'پاکدشت', englishName: 'Pakdasht' },
      { persianName: 'قدس', englishName: 'Qods' }
    ]
  },
  {
    persianName: 'چهارمحال و بختیاری',
    englishName: 'Chaharmahal and Bakhtiari',
    cities: [
      { persianName: 'شهرکرد', englishName: 'Shahrekord' },
      { persianName: 'بروجن', englishName: 'Borujen' },
      { persianName: 'فارسان', englishName: 'Farsan' },
      { persianName: 'لردگان', englishName: 'Lordegan' },
      { persianName: 'اردل', englishName: 'Ardal' },
      { persianName: 'کوهرنگ', englishName: 'Kohrang' },
      { persianName: 'کیار', englishName: 'Kiar' },
      { persianName: 'سامان', englishName: 'Saman' },
      { persianName: 'گندمان', englishName: 'Gandomkar' },
      { persianName: 'بن', englishName: 'Ben' }
    ]
  },
  {
    persianName: 'خراسان جنوبی',
    englishName: 'South Khorasan',
    cities: [
      { persianName: 'بیرجند', englishName: 'Birjand' },
      { persianName: 'قائن', englishName: 'Qaen' },
      { persianName: 'فردوس', englishName: 'Ferdows' },
      { persianName: 'نهبندان', englishName: 'Nehbandan' },
      { persianName: 'سرایان', englishName: 'Sarayan' },
      { persianName: 'طبس', englishName: 'Tabas' },
      { persianName: 'درمیان', englishName: 'Darmian' },
      { persianName: 'سربیشه', englishName: 'Sarbisheh' },
      { persianName: 'بشرویه', englishName: 'Bashruiyeh' },
      { persianName: 'خوسف', englishName: 'Khusf' }
    ]
  },
  {
    persianName: 'خراسان رضوی',
    englishName: 'Razavi Khorasan',
    cities: [
      { persianName: 'مشهد', englishName: 'Mashhad' },
      { persianName: 'نیشابور', englishName: 'Neyshabur' },
      { persianName: 'سبزوار', englishName: 'Sabzevar' },
      { persianName: 'تربت حیدریه', englishName: 'Torbat-e Heydarieh' },
      { persianName: 'قوچان', englishName: 'Quchan' },
      { persianName: 'کاشمر', englishName: 'Kashmar' },
      { persianName: 'گناباد', englishName: 'Gonabad' },
      { persianName: 'تایباد', englishName: 'Taybad' },
      { persianName: 'چناران', englishName: 'Chenaran' },
      { persianName: 'درگز', englishName: 'Dargaz' }
    ]
  },
  {
    persianName: 'خراسان شمالی',
    englishName: 'North Khorasan',
    cities: [
      { persianName: 'بجنورد', englishName: 'Bojnurd' },
      { persianName: 'اسفراین', englishName: 'Esfarayen' },
      { persianName: 'شیروان', englishName: 'Shirvan' },
      { persianName: 'جاجرم', englishName: 'Jajarm' },
      { persianName: 'فاروج', englishName: 'Farouj' },
      { persianName: 'مانه و سملقان', englishName: 'Maneh va Samalqan' },
      { persianName: 'گرمه', englishName: 'Garmeh' },
      { persianName: 'راز و جرگلان', englishName: 'Raz va Jargalan' },
      { persianName: 'درق', englishName: 'Daraq' },
      { persianName: 'آشخانه', englishName: 'Ashkhaneh' }
    ]
  },
  {
    persianName: 'خوزستان',
    englishName: 'Khuzestan',
    cities: [
      { persianName: 'اهواز', englishName: 'Ahvaz' },
      { persianName: 'آبادان', englishName: 'Abadan' },
      { persianName: 'خرمشهر', englishName: 'Khorramshahr' },
      { persianName: 'دزفول', englishName: 'Dezful' },
      { persianName: 'اندیمشک', englishName: 'Andimeshk' },
      { persianName: 'شوشتر', englishName: 'Shushtar' },
      { persianName: 'ماهشهر', englishName: 'Mahshahr' },
      { persianName: 'بهبهان', englishName: 'Behbahan' },
      { persianName: 'ایذه', englishName: 'Izeh' },
      { persianName: 'شوش', englishName: 'Shush' }
    ]
  },
  {
    persianName: 'زنجان',
    englishName: 'Zanjan',
    cities: [
      { persianName: 'زنجان', englishName: 'Zanjan' },
      { persianName: 'ابهر', englishName: 'Abhar' },
      { persianName: 'خدابنده', englishName: 'Khodabandeh' },
      { persianName: 'طارم', englishName: 'Tarom' },
      { persianName: 'ماهنشان', englishName: 'Mahneshan' },
      { persianName: 'خرمدره', englishName: 'Khorramdarreh' },
      { persianName: 'ایجرود', englishName: 'Ijrud' },
      { persianName: 'سلطانیه', englishName: 'Soltanieh' },
      { persianName: 'هیدج', englishName: 'Hidaj' },
      { persianName: 'قیدار', englishName: 'Qeydar' }
    ]
  },
  {
    persianName: 'سمنان',
    englishName: 'Semnan',
    cities: [
      { persianName: 'سمنان', englishName: 'Semnan' },
      { persianName: 'شاهرود', englishName: 'Shahroud' },
      { persianName: 'دامغان', englishName: 'Damghan' },
      { persianName: 'گرمسار', englishName: 'Garmsar' },
      { persianName: 'مهدی‌شهر', englishName: 'Mehdi Shahr' },
      { persianName: 'سرخه', englishName: 'Sorkheh' },
      { persianName: 'میامی', englishName: 'Miami' },
      { persianName: 'آرادان', englishName: 'Aradan' },
      { persianName: 'بسطام', englishName: 'Bastam' },
      { persianName: 'ایوانکی', englishName: 'Ivanaki' }
    ]
  },
  {
    persianName: 'سیستان و بلوچستان',
    englishName: 'Sistan and Baluchestan',
    cities: [
      { persianName: 'زاهدان', englishName: 'Zahedan' },
      { persianName: 'زابل', englishName: 'Zabol' },
      { persianName: 'چابهار', englishName: 'Chabahar' },
      { persianName: 'ایرانشهر', englishName: 'Iranshahr' },
      { persianName: 'خاش', englishName: 'Khash' },
      { persianName: 'سراوان', englishName: 'Saravan' },
      { persianName: 'کنارک', englishName: 'Konarak' },
      { persianName: 'نیک‌شهر', englishName: 'Nikshahr' },
      { persianName: 'سرباز', englishName: 'Sarbaz' },
      { persianName: 'زهک', englishName: 'Zahak' }
    ]
  },
  {
    persianName: 'فارس',
    englishName: 'Fars',
    cities: [
      { persianName: 'شیراز', englishName: 'Shiraz' },
      { persianName: 'مرودشت', englishName: 'Marvdasht' },
      { persianName: 'جهرم', englishName: 'Jahrom' },
      { persianName: 'فسا', englishName: 'Fasa' },
      { persianName: 'کازرون', englishName: 'Kazerun' },
      { persianName: 'لار', englishName: 'Lar' },
      { persianName: 'آباده', englishName: 'Abadeh' },
      { persianName: 'داراب', englishName: 'Darab' },
      { persianName: 'اقلید', englishName: 'Eqlid' },
      { persianName: 'فیروزآباد', englishName: 'Firuzabad' }
    ]
  },
  {
    persianName: 'قزوین',
    englishName: 'Qazvin',
    cities: [
      { persianName: 'قزوین', englishName: 'Qazvin' },
      { persianName: 'البرز', englishName: 'Alborz' },
      { persianName: 'تاکستان', englishName: 'Takestan' },
      { persianName: 'آبیک', englishName: 'Abyek' },
      { persianName: 'بوئین‌زهرا', englishName: 'Buin Zahra' },
      { persianName: 'آوج', englishName: 'Avaj' },
      { persianName: 'الوند', englishName: 'Alvand' },
      { persianName: 'محمدیه', englishName: 'Mohammadieh' },
      { persianName: 'ضیاء آباد', englishName: 'Zia Abad' },
      { persianName: 'شال', englishName: 'Shal' }
    ]
  },
  {
    persianName: 'قم',
    englishName: 'Qom',
    cities: [
      { persianName: 'قم', englishName: 'Qom' },
      { persianName: 'جعفریه', englishName: 'Jafarieh' },
      { persianName: 'دستجرد', englishName: 'Dastjerd' },
      { persianName: 'سلفچگان', englishName: 'Salafchegan' },
      { persianName: 'قنوات', englishName: 'Qanvat' },
      { persianName: 'کهک', englishName: 'Kahak' },
      { persianName: 'مامونیه', englishName: 'Mamounieh' }
    ]
  },
  {
    persianName: 'کردستان',
    englishName: 'Kurdistan',
    cities: [
      { persianName: 'سنندج', englishName: 'Sanandaj' },
      { persianName: 'مریوان', englishName: 'Marivan' },
      { persianName: 'بانه', englishName: 'Baneh' },
      { persianName: 'سقز', englishName: 'Saqqez' },
      { persianName: 'قروه', englishName: 'Qorveh' },
      { persianName: 'کامیاران', englishName: 'Kamyaran' },
      { persianName: 'بیجار', englishName: 'Bijar' },
      { persianName: 'دیواندره', englishName: 'Divandarreh' },
      { persianName: 'دهگلان', englishName: 'Dehgolan' },
      { persianName: 'سروآباد', englishName: 'Sarvabad' }
    ]
  },
  {
    persianName: 'کرمان',
    englishName: 'Kerman',
    cities: [
      { persianName: 'کرمان', englishName: 'Kerman' },
      { persianName: 'رفسنجان', englishName: 'Rafsanjan' },
      { persianName: 'جیرفت', englishName: 'Jiroft' },
      { persianName: 'سیرجان', englishName: 'Sirjan' },
      { persianName: 'بم', englishName: 'Bam' },
      { persianName: 'زرند', englishName: 'Zarand' },
      { persianName: 'شهربابک', englishName: 'Shahr-e Babak' },
      { persianName: 'کهنوج', englishName: 'Kahnuj' },
      { persianName: 'بردسیر', englishName: 'Bardsir' },
      { persianName: 'بافت', englishName: 'Baft' }
    ]
  },
  {
    persianName: 'کرمانشاه',
    englishName: 'Kermanshah',
    cities: [
      { persianName: 'کرمانشاه', englishName: 'Kermanshah' },
      { persianName: 'اسلام‌آباد غرب', englishName: 'Eslamabad-e Gharb' },
      { persianName: 'کنگاور', englishName: 'Kangavar' },
      { persianName: 'هرسین', englishName: 'Harsin' },
      { persianName: 'سنقر', englishName: 'Sonqor' },
      { persianName: 'جوانرود', englishName: 'Javanrud' },
      { persianName: 'پاوه', englishName: 'Paveh' },
      { persianName: 'قصر شیرین', englishName: 'Qasr-e Shirin' },
      { persianName: 'صحنه', englishName: 'Sahneh' },
      { persianName: 'روانسر', englishName: 'Ravansar' }
    ]
  },
  {
    persianName: 'کهگیلویه و بویراحمد',
    englishName: 'Kohgiluyeh and Boyer-Ahmad',
    cities: [
      { persianName: 'یاسوج', englishName: 'Yasuj' },
      { persianName: 'گچساران', englishName: 'Gachsaran' },
      { persianName: 'دوگنبدان', englishName: 'Dogonbadan' },
      { persianName: 'سی‌سخت', englishName: 'Sisakht' },
      { persianName: 'لنده', englishName: 'Landeh' },
      { persianName: 'چرام', englishName: 'Charam' },
      { persianName: 'باشت', englishName: 'Basht' },
      { persianName: 'مارگون', englishName: 'Margoon' },
      { persianName: 'سرفاریاب', englishName: 'Sarfaryab' },
      { persianName: 'دیشموک', englishName: 'Dishmook' }
    ]
  },
  {
    persianName: 'گلستان',
    englishName: 'Golestan',
    cities: [
      { persianName: 'گرگان', englishName: 'Gorgan' },
      { persianName: 'گنبد کاووس', englishName: 'Gonbad-e Kavus' },
      { persianName: 'آق قلا', englishName: 'Aq Qala' },
      { persianName: 'علی‌آباد کتول', englishName: 'Aliabad Katul' },
      { persianName: 'کردکوی', englishName: 'Kordkuy' },
      { persianName: 'بندر گز', englishName: 'Bandar-e Gaz' },
      { persianName: 'کلاله', englishName: 'Kalaleh' },
      { persianName: 'مینودشت', englishName: 'Minudasht' },
      { persianName: 'آزادشهر', englishName: 'Azadshahr' },
      { persianName: 'رامیان', englishName: 'Ramian' }
    ]
  },
  {
    persianName: 'گیلان',
    englishName: 'Gilan',
    cities: [
      { persianName: 'رشت', englishName: 'Rasht' },
      { persianName: 'بندر انزلی', englishName: 'Bandar Anzali' },
      { persianName: 'لاهیجان', englishName: 'Lahijan' },
      { persianName: 'لنگرود', englishName: 'Langarud' },
      { persianName: 'رودسر', englishName: 'Rudsar' },
      { persianName: 'فومن', englishName: 'Fuman' },
      { persianName: 'صومعه‌سرا', englishName: 'Sowme\'eh Sara' },
      { persianName: 'تالش', englishName: 'Talesh' },
      { persianName: 'آستارا', englishName: 'Astara' },
      { persianName: 'ماسال', englishName: 'Masal' }
    ]
  },
  {
    persianName: 'لرستان',
    englishName: 'Lorestan',
    cities: [
      { persianName: 'خرم‌آباد', englishName: 'Khorramabad' },
      { persianName: 'بروجرد', englishName: 'Boroujerd' },
      { persianName: 'دورود', englishName: 'Dorud' },
      { persianName: 'کوهدشت', englishName: 'Kuhdasht' },
      { persianName: 'الیگودرز', englishName: 'Aligudarz' },
      { persianName: 'پل‌دختر', englishName: 'Pol-e Dokhtar' },
      { persianName: 'ازنا', englishName: 'Azna' },
      { persianName: 'نورآباد', englishName: 'Nurabad' },
      { persianName: 'الشتر', englishName: 'Aleshtar' },
      { persianName: 'چگنی', englishName: 'Chegeni' }
    ]
  },
  {
    persianName: 'مازندران',
    englishName: 'Mazandaran',
    cities: [
      { persianName: 'ساری', englishName: 'Sari' },
      { persianName: 'بابل', englishName: 'Babol' },
      { persianName: 'آمل', englishName: 'Amol' },
      { persianName: 'قائم‌شهر', englishName: 'Qaem Shahr' },
      { persianName: 'بابلسر', englishName: 'Babolsar' },
      { persianName: 'بهشهر', englishName: 'Behshahr' },
      { persianName: 'تنکابن', englishName: 'Tonekabon' },
      { persianName: 'چالوس', englishName: 'Chalus' },
      { persianName: 'نوشهر', englishName: 'Nowshahr' },
      { persianName: 'رامسر', englishName: 'Ramsar' }
    ]
  },
  {
    persianName: 'مرکزی',
    englishName: 'Markazi',
    cities: [
      { persianName: 'اراک', englishName: 'Arak' },
      { persianName: 'ساوه', englishName: 'Saveh' },
      { persianName: 'خمین', englishName: 'Khomein' },
      { persianName: 'محلات', englishName: 'Mahallat' },
      { persianName: 'دلیجان', englishName: 'Delijan' },
      { persianName: 'تفرش', englishName: 'Tafresh' },
      { persianName: 'آشتیان', englishName: 'Ashtian' },
      { persianName: 'شازند', englishName: 'Shazand' },
      { persianName: 'کمیجان', englishName: 'Komijan' },
      { persianName: 'زرندیه', englishName: 'Zarandieh' }
    ]
  },
  {
    persianName: 'هرمزگان',
    englishName: 'Hormozgan',
    cities: [
      { persianName: 'بندر عباس', englishName: 'Bandar Abbas' },
      { persianName: 'میناب', englishName: 'Minab' },
      { persianName: 'کیش', englishName: 'Kish' },
      { persianName: 'قشم', englishName: 'Qeshm' },
      { persianName: 'بندر لنگه', englishName: 'Bandar Lengeh' },
      { persianName: 'رودان', englishName: 'Rudan' },
      { persianName: 'جاسک', englishName: 'Jask' },
      { persianName: 'حاجی‌آباد', englishName: 'Hajiabad' },
      { persianName: 'بستک', englishName: 'Bastak' },
      { persianName: 'پارسیان', englishName: 'Parsian' }
    ]
  },
  {
    persianName: 'همدان',
    englishName: 'Hamadan',
    cities: [
      { persianName: 'همدان', englishName: 'Hamadan' },
      { persianName: 'ملایر', englishName: 'Malayer' },
      { persianName: 'نهاوند', englishName: 'Nahavand' },
      { persianName: 'تویسرکان', englishName: 'Tuyserkan' },
      { persianName: 'اسدآباد', englishName: 'Asadabad' },
      { persianName: 'بهار', englishName: 'Bahar' },
      { persianName: 'کبودر آهنگ', englishName: 'Kabudar Ahang' },
      { persianName: 'رزن', englishName: 'Razan' },
      { persianName: 'فامنین', englishName: 'Famenin' },
      { persianName: 'قهاوند', englishName: 'Qahavand' }
    ]
  },
  {
    persianName: 'یزد',
    englishName: 'Yazd',
    cities: [
      { persianName: 'یزد', englishName: 'Yazd' },
      { persianName: 'میبد', englishName: 'Meybod' },
      { persianName: 'اردکان', englishName: 'Ardakan' },
      { persianName: 'بافق', englishName: 'Bafq' },
      { persianName: 'ابرکوه', englishName: 'Abarkuh' },
      { persianName: 'تفت', englishName: 'Taft' },
      { persianName: 'مهریز', englishName: 'Mehriz' },
      { persianName: 'خاتم', englishName: 'Khatam' },
      { persianName: 'زارچ', englishName: 'Zarch' },
      { persianName: 'بهاباد', englishName: 'Bahabad' }
    ]
  }
];

async function seedProvincesAndCities() {
  console.log('🌱 Starting provinces and cities seeding...');

  try {
    // Clear existing data
    await prisma.city.deleteMany();
    await prisma.province.deleteMany();

    // Seed provinces and cities
    for (const provinceData of provincesData) {
      const province = await prisma.province.create({
        data: {
          persianName: provinceData.persianName,
          englishName: provinceData.englishName,
        },
      });

      // Create cities for this province
      for (const cityData of provinceData.cities) {
        await prisma.city.create({
          data: {
            persianName: cityData.persianName,
            englishName: cityData.englishName,
            provinceId: province.id,
          },
        });
      }

      console.log(`✅ Created province: ${province.persianName} with ${provinceData.cities.length} cities`);
    }

    console.log('🎉 Seeding completed successfully!');
  } catch (error) {
    console.error('❌ Seeding failed:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

if (require.main === module) {
  seedProvincesAndCities()
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}

export default seedProvincesAndCities;