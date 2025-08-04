import { PrismaClient } from '../generated/prisma';

const prisma = new PrismaClient();

const provincesData = [
  {
    persianName: 'آذربایجان شرقی',
    englishName: 'East Azerbaijan',
    cities: [
      { persianName: 'تبریز', englishName: 'Tabriz', latitude: 38.0792, longitude: 46.2887 },
      { persianName: 'مراغه', englishName: 'Maragheh', latitude: 37.3919, longitude: 46.2391 },
      { persianName: 'میانه', englishName: 'Mianeh', latitude: 37.4210, longitude: 47.7150 },
      { persianName: 'مرند', englishName: 'Marand', latitude: 38.4329, longitude: 45.7749 },
      { persianName: 'شبستر', englishName: 'Shabestar', latitude: 38.1804, longitude: 45.7028 },
      { persianName: 'اهر', englishName: 'Ahar', latitude: 38.4774, longitude: 47.0699 },
      { persianName: 'بناب', englishName: 'Bonab', latitude: 37.3404, longitude: 46.0553 },
      { persianName: 'جلفا', englishName: 'Jolfa', latitude: 38.9404, longitude: 45.6308 },
      { persianName: 'سراب', englishName: 'Sarab', latitude: 37.9408, longitude: 47.5367 },
      { persianName: 'کلیبر', englishName: 'Kalibar', latitude: 38.8694, longitude: 47.0356 },
      { persianName: 'هریس', englishName: 'Heris', latitude: 38.2471, longitude: 47.1168 },
      { persianName: 'عجب‌شیر', englishName: 'Ajab Shir', latitude: 37.4776, longitude: 45.8943 }
    ]
  },
  {
    persianName: 'آذربایجان غربی',
    englishName: 'West Azerbaijan',
    cities: [
      { persianName: 'ارومیه', englishName: 'Urmia', latitude: 37.5528, longitude: 45.0760 },
      { persianName: 'خوی', englishName: 'Khoy', latitude: 38.5503, longitude: 44.9521 },
      { persianName: 'مهاباد', englishName: 'Mahabad', latitude: 36.7631, longitude: 45.7222 },
      { persianName: 'بوکان', englishName: 'Bukan', latitude: 36.5210, longitude: 46.2089 },
      { persianName: 'میاندوآب', englishName: 'Miandoab', latitude: 36.9694, longitude: 46.1027 },
      { persianName: 'سلماس', englishName: 'Salmas', latitude: 38.1973, longitude: 44.7653 },
      { persianName: 'نقده', englishName: 'Naqadeh', latitude: 36.9553, longitude: 45.3880 },
      { persianName: 'تکاب', englishName: 'Takab', latitude: 36.4009, longitude: 47.1133 },
      { persianName: 'چالدران', englishName: 'Chaldoran', latitude: 39.0640, longitude: 44.3848 },
      { persianName: 'پیرانشهر', englishName: 'Piranshahr', latitude: 36.6941, longitude: 45.1413 },
      { persianName: 'ماکو', englishName: 'Maku', latitude: 39.2952, longitude: 44.5167 },
      { persianName: 'شاهین‌دژ', englishName: 'Shahin Dezh', latitude: 36.6793, longitude: 46.5669 }
    ]
  },
  {
    persianName: 'اردبیل',
    englishName: 'Ardabil',
    cities: [
      { persianName: 'اردبیل', englishName: 'Ardabil', latitude: 38.2498, longitude: 48.2933 },
      { persianName: 'پارس‌آباد', englishName: 'Parsabad', latitude: 39.6482, longitude: 47.9174 },
      { persianName: 'خلخال', englishName: 'Khalkhal', latitude: 37.6189, longitude: 48.5258 },
      { persianName: 'مشگین‌شهر', englishName: 'Meshgin Shahr', latitude: 38.3989, longitude: 47.6814 },
      { persianName: 'گرمی', englishName: 'Germi', latitude: 39.0213, longitude: 48.0800 },
      { persianName: 'نمین', englishName: 'Namin', latitude: 38.4269, longitude: 48.4838 },
      { persianName: 'نیر', englishName: 'Nir', latitude: 38.0346, longitude: 47.9986 },
      { persianName: 'کوثر', englishName: 'Kowsar', latitude: 37.6900, longitude: 48.2700 },
      { persianName: 'بیله‌سوار', englishName: 'Bileh Savar', latitude: 39.3796, longitude: 48.3546 },
      { persianName: 'سرعین', englishName: 'Sarein', latitude: 38.1513, longitude: 48.0708 }
    ]
  },
  {
    persianName: 'اصفهان',
    englishName: 'Isfahan',
    cities: [
      { persianName: 'اصفهان', englishName: 'Isfahan', latitude: 32.6546, longitude: 51.6679 },
      { persianName: 'کاشان', englishName: 'Kashan', latitude: 33.9850, longitude: 51.4096 },
      { persianName: 'نجف‌آباد', englishName: 'Najafabad', latitude: 32.6344, longitude: 51.3658 },
      { persianName: 'خمینی‌شهر', englishName: 'Khomeyni Shahr', latitude: 32.6856, longitude: 51.5360 },
      { persianName: 'شاهین‌شهر', englishName: 'Shahin Shahr', latitude: 32.8579, longitude: 51.5529 },
      { persianName: 'فولادشهر', englishName: 'Fooladshahr', latitude: 32.6237, longitude: 51.4185 },
      { persianName: 'دولت‌آباد', englishName: 'Dowlatabad', latitude: 32.7998, longitude: 51.6955 },
      { persianName: 'زرین‌شهر', englishName: 'Zarin Shahr', latitude: 32.3897, longitude: 51.3766 },
      { persianName: 'گلپایگان', englishName: 'Golpayegan', latitude: 33.4537, longitude: 50.2884 },
      { persianName: 'نطنز', englishName: 'Natanz', latitude: 33.5112, longitude: 51.9181 },
      { persianName: 'خوانسار', englishName: 'Khansar', latitude: 33.2205, longitude: 50.3150 },
      { persianName: 'سمیرم', englishName: 'Semirom', latitude: 31.4167, longitude: 51.5667 }
    ]
  },
  {
    persianName: 'البرز',
    englishName: 'Alborz',
    cities: [
      { persianName: 'کرج', englishName: 'Karaj', latitude: 35.8400, longitude: 50.9391 },
      { persianName: 'فردیس', englishName: 'Fardis', latitude: 35.7292, longitude: 50.9848 },
      { persianName: 'نظرآباد', englishName: 'Nazarabad', latitude: 35.9521, longitude: 50.6061 },
      { persianName: 'اشتهارد', englishName: 'Eshtehard', latitude: 35.7256, longitude: 50.3663 },
      { persianName: 'هشتگرد', englishName: 'Hashtgerd', latitude: 35.9619, longitude: 50.6800 },
      { persianName: 'کمال‌شهر', englishName: 'Kamal Shahr', latitude: 35.8653, longitude: 50.8717 },
      { persianName: 'ماهدشت', englishName: 'Mahdasht', latitude: 35.7292, longitude: 50.8137 }
    ]
  },
  {
    persianName: 'ایلام',
    englishName: 'Ilam',
    cities: [
      { persianName: 'ایلام', englishName: 'Ilam', latitude: 33.6374, longitude: 46.4226 },
      { persianName: 'دهلران', englishName: 'Dehloran', latitude: 32.6941, longitude: 47.2679 },
      { persianName: 'مهران', englishName: 'Mehran', latitude: 33.1222, longitude: 46.1646 },
      { persianName: 'آبدانان', englishName: 'Abdanan', latitude: 32.9926, longitude: 47.4198 },
      { persianName: 'دره‌شهر', englishName: 'Dareh Shahr', latitude: 33.1396, longitude: 47.3762 },
      { persianName: 'ایوان', englishName: 'Eyvan', latitude: 33.8274, longitude: 46.3096 },
      { persianName: 'چوار', englishName: 'Chavar', latitude: 33.6953, longitude: 46.2973 },
      { persianName: 'ملکشاهی', englishName: 'Malekshahi', latitude: 33.3828, longitude: 46.5983 },
      { persianName: 'بدره', englishName: 'Badreh', latitude: 33.3054, longitude: 47.0370 },
      { persianName: 'سرابله', englishName: 'Sarableh', latitude: 33.7678, longitude: 46.5658 }
    ]
  },
  {
    persianName: 'بوشهر',
    englishName: 'Bushehr',
    cities: [
      { persianName: 'بوشهر', englishName: 'Bushehr', latitude: 28.9689, longitude: 50.8385 },
      { persianName: 'برازجان', englishName: 'Borazjan', latitude: 29.2699, longitude: 51.2185 },
      { persianName: 'خارک', englishName: 'Khark', latitude: 29.2614, longitude: 50.3306 },
      { persianName: 'گناوه', englishName: 'Genaveh', latitude: 29.5791, longitude: 50.5170 },
      { persianName: 'دشتستان', englishName: 'Dashtestan', latitude: 29.2667, longitude: 51.2167 },
      { persianName: 'جم', englishName: 'Jam', latitude: 27.8273, longitude: 52.3269 },
      { persianName: 'کنگان', englishName: 'Kangan', latitude: 27.8370, longitude: 52.0646 },
      { persianName: 'عسلویه', englishName: 'Asaluyeh', latitude: 27.4761, longitude: 52.6076 },
      { persianName: 'دیر', englishName: 'Deyr', latitude: 27.8399, longitude: 51.9378 },
      { persianName: 'دیلم', englishName: 'Deylam', latitude: 30.0596, longitude: 50.1640 }
    ]
  },
  {
    persianName: 'تهران',
    englishName: 'Tehran',
    cities: [
      { persianName: 'تهران', englishName: 'Tehran', latitude: 35.6892, longitude: 51.3890 },
      { persianName: 'اسلام‌شهر', englishName: 'Eslam Shahr', latitude: 35.5522, longitude: 51.2350 },
      { persianName: 'رباط‌کریم', englishName: 'Robat Karim', latitude: 35.4846, longitude: 51.0829 },
      { persianName: 'ورامین', englishName: 'Varamin', latitude: 35.3242, longitude: 51.6457 },
      { persianName: 'شهریار', englishName: 'Shahriar', latitude: 35.6596, longitude: 51.0578 },
      { persianName: 'ری', englishName: 'Rey', latitude: 35.5935, longitude: 51.4340 },
      { persianName: 'دماوند', englishName: 'Damavand', latitude: 35.7184, longitude: 52.0650 },
      { persianName: 'پاکدشت', englishName: 'Pakdasht', latitude: 35.4785, longitude: 51.6834 },
      { persianName: 'قدس', englishName: 'Qods', latitude: 35.7214, longitude: 51.1090 },
      { persianName: 'ملارد', englishName: 'Malard', latitude: 35.6659, longitude: 50.9767 }
    ]
  },
  {
    persianName: 'چهارمحال و بختیاری',
    englishName: 'Chaharmahal and Bakhtiari',
    cities: [
      { persianName: 'شهرکرد', englishName: 'Shahrekord', latitude: 32.3256, longitude: 50.8644 },
      { persianName: 'بروجن', englishName: 'Borujen', latitude: 31.9652, longitude: 51.2872 },
      { persianName: 'فارسان', englishName: 'Farsan', latitude: 32.2569, longitude: 50.5640 },
      { persianName: 'لردگان', englishName: 'Lordegan', latitude: 31.5103, longitude: 50.8293 },
      { persianName: 'اردل', englishName: 'Ardal', latitude: 31.9996, longitude: 50.6574 },
      { persianName: 'کوهرنگ', englishName: 'Kohrang', latitude: 32.4340, longitude: 50.1214 },
      { persianName: 'کیار', englishName: 'Kiar', latitude: 32.0333, longitude: 50.8167 },
      { persianName: 'سامان', englishName: 'Saman', latitude: 32.4521, longitude: 50.9138 },
      { persianName: 'گندمان', englishName: 'Gandomkar', latitude: 31.8667, longitude: 51.1667 },
      { persianName: 'بن', englishName: 'Ben', latitude: 32.5350, longitude: 50.7422 }
    ]
  },
  {
    persianName: 'خراسان جنوبی',
    englishName: 'South Khorasan',
    cities: [
      { persianName: 'بیرجند', englishName: 'Birjand', latitude: 32.8649, longitude: 59.2211 },
      { persianName: 'قائن', englishName: 'Qaen', latitude: 33.7267, longitude: 59.1844 },
      { persianName: 'فردوس', englishName: 'Ferdows', latitude: 34.0186, longitude: 58.1722 },
      { persianName: 'نهبندان', englishName: 'Nehbandan', latitude: 31.5419, longitude: 60.0363 },
      { persianName: 'سرایان', englishName: 'Sarayan', latitude: 33.8600, longitude: 58.5217 },
      { persianName: 'طبس', englishName: 'Tabas', latitude: 33.5959, longitude: 56.9244 },
      { persianName: 'درمیان', englishName: 'Darmian', latitude: 32.9167, longitude: 60.1167 },
      { persianName: 'سربیشه', englishName: 'Sarbisheh', latitude: 32.5756, longitude: 59.7982 },
      { persianName: 'بشرویه', englishName: 'Bashruiyeh', latitude: 33.8680, longitude: 57.3210 },
      { persianName: 'خوسف', englishName: 'Khusf', latitude: 32.7800, longitude: 58.9000 }
    ]
  },
  {
    persianName: 'خراسان رضوی',
    englishName: 'Razavi Khorasan',
    cities: [
      { persianName: 'مشهد', englishName: 'Mashhad', latitude: 36.2970, longitude: 59.6062 },
      { persianName: 'نیشابور', englishName: 'Neyshabur', latitude: 36.2133, longitude: 58.7958 },
      { persianName: 'سبزوار', englishName: 'Sabzevar', latitude: 36.2126, longitude: 57.6819 },
      { persianName: 'تربت حیدریه', englishName: 'Torbat-e Heydarieh', latitude: 35.2740, longitude: 59.2195 },
      { persianName: 'قوچان', englishName: 'Quchan', latitude: 37.1060, longitude: 58.5095 },
      { persianName: 'کاشمر', englishName: 'Kashmar', latitude: 35.2383, longitude: 58.4656 },
      { persianName: 'گناباد', englishName: 'Gonabad', latitude: 34.3529, longitude: 58.6837 },
      { persianName: 'تایباد', englishName: 'Taybad', latitude: 34.7400, longitude: 60.7756 },
      { persianName: 'چناران', englishName: 'Chenaran', latitude: 36.6455, longitude: 59.1212 },
      { persianName: 'درگز', englishName: 'Dargaz', latitude: 37.4445, longitude: 59.1081 },
      { persianName: 'تربت جام', englishName: 'Torbat-e Jam', latitude: 35.2440, longitude: 60.6225 },
      { persianName: 'خواف', englishName: 'Khvaf', latitude: 34.5763, longitude: 60.1410 }
    ]
  },
  {
    persianName: 'خراسان شمالی',
    englishName: 'North Khorasan',
    cities: [
      { persianName: 'بجنورد', englishName: 'Bojnurd', latitude: 37.4747, longitude: 57.3290 },
      { persianName: 'اسفراین', englishName: 'Esfarayen', latitude: 37.0764, longitude: 57.5101 },
      { persianName: 'شیروان', englishName: 'Shirvan', latitude: 37.4096, longitude: 57.9295 },
      { persianName: 'جاجرم', englishName: 'Jajarm', latitude: 36.9501, longitude: 56.3800 },
      { persianName: 'فاروج', englishName: 'Farouj', latitude: 37.2312, longitude: 58.2189 },
      { persianName: 'مانه و سملقان', englishName: 'Maneh va Samalqan', latitude: 37.4900, longitude: 56.8200 },
      { persianName: 'گرمه', englishName: 'Garmeh', latitude: 36.9870, longitude: 56.2894 },
      { persianName: 'راز و جرگلان', englishName: 'Raz va Jargalan', latitude: 37.9300, longitude: 57.1000 },
      { persianName: 'درق', englishName: 'Daraq', latitude: 36.9667, longitude: 56.2167 },
      { persianName: 'آشخانه', englishName: 'Ashkhaneh', latitude: 37.5615, longitude: 56.9212 }
    ]
  },
  {
    persianName: 'خوزستان',
    englishName: 'Khuzestan',
    cities: [
      { persianName: 'اهواز', englishName: 'Ahvaz', latitude: 31.3183, longitude: 48.6706 },
      { persianName: 'آبادان', englishName: 'Abadan', latitude: 30.3392, longitude: 48.3043 },
      { persianName: 'خرمشهر', englishName: 'Khorramshahr', latitude: 30.4408, longitude: 48.1664 },
      { persianName: 'دزفول', englishName: 'Dezful', latitude: 32.3814, longitude: 48.4058 },
      { persianName: 'اندیمشک', englishName: 'Andimeshk', latitude: 32.4600, longitude: 48.3596 },
      { persianName: 'شوشتر', englishName: 'Shushtar', latitude: 32.0497, longitude: 48.8484 },
      { persianName: 'ماهشهر', englishName: 'Mahshahr', latitude: 30.5589, longitude: 49.1919 },
      { persianName: 'بهبهان', englishName: 'Behbahan', latitude: 30.5959, longitude: 50.2417 },
      { persianName: 'ایذه', englishName: 'Izeh', latitude: 31.8341, longitude: 49.8670 },
      { persianName: 'شوش', englishName: 'Shush', latitude: 32.1942, longitude: 48.2436 },
      { persianName: 'رامهرمز', englishName: 'Ramhormoz', latitude: 31.2780, longitude: 49.6036 },
      { persianName: 'بندر امام خمینی', englishName: 'Bandar-e Emam Khomeyni', latitude: 30.4260, longitude: 49.0760 }
    ]
  },
  {
    persianName: 'زنجان',
    englishName: 'Zanjan',
    cities: [
      { persianName: 'زنجان', englishName: 'Zanjan', latitude: 36.6764, longitude: 48.4963 },
      { persianName: 'ابهر', englishName: 'Abhar', latitude: 36.1468, longitude: 49.2180 },
      { persianName: 'خدابنده', englishName: 'Khodabandeh', latitude: 36.1192, longitude: 48.5913 },
      { persianName: 'طارم', englishName: 'Tarom', latitude: 36.9500, longitude: 48.9000 },
      { persianName: 'ماهنشان', englishName: 'Mahneshan', latitude: 36.7440, longitude: 47.6725 },
      { persianName: 'خرمدره', englishName: 'Khorramdarreh', latitude: 36.2031, longitude: 49.1915 },
      { persianName: 'ایجرود', englishName: 'Ijrud', latitude: 36.4167, longitude: 48.2500 },
      { persianName: 'سلطانیه', englishName: 'Soltanieh', latitude: 36.4324, longitude: 48.7940 },
      { persianName: 'هیدج', englishName: 'Hidaj', latitude: 36.2500, longitude: 49.1333 },
      { persianName: 'قیدار', englishName: 'Qeydar', latitude: 36.1194, longitude: 48.5917 }
    ]
  },
  {
    persianName: 'سمنان',
    englishName: 'Semnan',
    cities: [
      { persianName: 'سمنان', englishName: 'Semnan', latitude: 35.5769, longitude: 53.3953 },
      { persianName: 'شاهرود', englishName: 'Shahroud', latitude: 36.4182, longitude: 54.9763 },
      { persianName: 'دامغان', englishName: 'Damghan', latitude: 36.1683, longitude: 54.3429 },
      { persianName: 'گرمسار', englishName: 'Garmsar', latitude: 35.2182, longitude: 52.3409 },
      { persianName: 'مهدی‌شهر', englishName: 'Mehdi Shahr', latitude: 35.7000, longitude: 53.3500 },
      { persianName: 'سرخه', englishName: 'Sorkheh', latitude: 35.4632, longitude: 53.2139 },
      { persianName: 'میامی', englishName: 'Miami', latitude: 36.4109, longitude: 55.6501 },
      { persianName: 'آرادان', englishName: 'Aradan', latitude: 35.2496, longitude: 52.4923 },
      { persianName: 'بسطام', englishName: 'Bastam', latitude: 36.4853, longitude: 55.0000 },
      { persianName: 'ایوانکی', englishName: 'Ivanaki', latitude: 35.3439, longitude: 51.9069 }
    ]
  },
  {
    persianName: 'سیستان و بلوچستان',
    englishName: 'Sistan and Baluchestan',
    cities: [
      { persianName: 'زاهدان', englishName: 'Zahedan', latitude: 29.4963, longitude: 60.8629 },
      { persianName: 'زابل', englishName: 'Zabol', latitude: 31.0287, longitude: 61.5012 },
      { persianName: 'چابهار', englishName: 'Chabahar', latitude: 25.2919, longitude: 60.6430 },
      { persianName: 'ایرانشهر', englishName: 'Iranshahr', latitude: 27.2024, longitude: 60.6848 },
      { persianName: 'خاش', englishName: 'Khash', latitude: 28.2211, longitude: 61.2158 },
      { persianName: 'سراوان', englishName: 'Saravan', latitude: 27.3709, longitude: 62.3342 },
      { persianName: 'کنارک', englishName: 'Konarak', latitude: 25.3604, longitude: 60.3995 },
      { persianName: 'نیک‌شهر', englishName: 'Nikshahr', latitude: 26.2258, longitude: 60.2143 },
      { persianName: 'سرباز', englishName: 'Sarbaz', latitude: 26.6309, longitude: 61.2562 },
      { persianName: 'زهک', englishName: 'Zahak', latitude: 30.8939, longitude: 61.6804 },
      { persianName: 'دلگان', englishName: 'Delgan', latitude: 27.6073, longitude: 59.4721 },
      { persianName: 'فنوج', englishName: 'Fanuj', latitude: 26.5744, longitude: 59.6414 }
    ]
  },
  {
    persianName: 'فارس',
    englishName: 'Fars',
    cities: [
      { persianName: 'شیراز', englishName: 'Shiraz', latitude: 29.5918, longitude: 52.5837 },
      { persianName: 'مرودشت', englishName: 'Marvdasht', latitude: 29.8742, longitude: 52.8025 },
      { persianName: 'جهرم', englishName: 'Jahrom', latitude: 28.5000, longitude: 53.5605 },
      { persianName: 'فسا', englishName: 'Fasa', latitude: 28.9383, longitude: 53.6482 },
      { persianName: 'کازرون', englishName: 'Kazerun', latitude: 29.6195, longitude: 51.6541 },
      { persianName: 'لار', englishName: 'Lar', latitude: 27.6811, longitude: 54.3404 },
      { persianName: 'آباده', englishName: 'Abadeh', latitude: 31.1608, longitude: 52.6506 },
      { persianName: 'داراب', englishName: 'Darab', latitude: 28.7519, longitude: 54.5444 },
      { persianName: 'اقلید', englishName: 'Eqlid', latitude: 30.8989, longitude: 52.6866 },
      { persianName: 'فیروزآباد', englishName: 'Firuzabad', latitude: 28.8438, longitude: 52.5707 },
      { persianName: 'لامرد', englishName: 'Lamerd', latitude: 27.3438, longitude: 53.1809 },
      { persianName: 'استهبان', englishName: 'Estahban', latitude: 29.1266, longitude: 54.0420 }
    ]
  },
  {
    persianName: 'قزوین',
    englishName: 'Qazvin',
    cities: [
      { persianName: 'قزوین', englishName: 'Qazvin', latitude: 36.2797, longitude: 50.0041 },
      { persianName: 'تاکستان', englishName: 'Takestan', latitude: 35.9999, longitude: 49.6957 },
      { persianName: 'آبیک', englishName: 'Abyek', latitude: 36.0400, longitude: 50.5310 },
      { persianName: 'بوئین‌زهرا', englishName: 'Buin Zahra', latitude: 35.7669, longitude: 50.0578 },
      { persianName: 'آوج', englishName: 'Avaj', latitude: 35.5767, longitude: 49.2231 },
      { persianName: 'الوند', englishName: 'Alvand', latitude: 36.1893, longitude: 50.0643 },
      { persianName: 'محمدیه', englishName: 'Mohammadieh', latitude: 36.2252, longitude: 50.1776 },
      { persianName: 'ضیاء آباد', englishName: 'Zia Abad', latitude: 35.9930, longitude: 49.4477 },
      { persianName: 'شال', englishName: 'Shal', latitude: 35.8994, longitude: 49.7689 },
      { persianName: 'اسفرورین', englishName: 'Esfarvarin', latitude: 35.9264, longitude: 49.7632 }
    ]
  },
  {
    persianName: 'قم',
    englishName: 'Qom',
    cities: [
      { persianName: 'قم', englishName: 'Qom', latitude: 34.6399, longitude: 50.8759 },
      { persianName: 'جعفریه', englishName: 'Jafarieh', latitude: 34.7683, longitude: 50.5048 },
      { persianName: 'دستجرد', englishName: 'Dastjerd', latitude: 34.5530, longitude: 50.2483 },
      { persianName: 'سلفچگان', englishName: 'Salafchegan', latitude: 34.4789, longitude: 50.4586 },
      { persianName: 'قنوات', englishName: 'Qanvat', latitude: 34.6147, longitude: 51.0330 },
      { persianName: 'کهک', englishName: 'Kahak', latitude: 34.3833, longitude: 50.8667 },
      { persianName: 'خاکفرج', englishName: 'Khakfaraj', latitude: 34.6667, longitude: 50.8333 }
    ]
  },
  {
    persianName: 'کردستان',
    englishName: 'Kurdistan',
    cities: [
      { persianName: 'سنندج', englishName: 'Sanandaj', latitude: 35.3144, longitude: 46.9923 },
      { persianName: 'مریوان', englishName: 'Marivan', latitude: 35.5183, longitude: 46.1760 },
      { persianName: 'بانه', englishName: 'Baneh', latitude: 35.9975, longitude: 45.8853 },
      { persianName: 'سقز', englishName: 'Saqqez', latitude: 36.2499, longitude: 46.2735 },
      { persianName: 'قروه', englishName: 'Qorveh', latitude: 35.1666, longitude: 47.8045 },
      { persianName: 'کامیاران', englishName: 'Kamyaran', latitude: 34.7956, longitude: 46.9355 },
      { persianName: 'بیجار', englishName: 'Bijar', latitude: 35.8668, longitude: 47.6051 },
      { persianName: 'دیواندره', englishName: 'Divandarreh', latitude: 35.9139, longitude: 47.0700 },
      { persianName: 'دهگلان', englishName: 'Dehgolan', latitude: 35.2780, longitude: 47.4194 },
      { persianName: 'سروآباد', englishName: 'Sarvabad', latitude: 35.3126, longitude: 46.3669 }
    ]
  },
  {
    persianName: 'کرمان',
    englishName: 'Kerman',
    cities: [
      { persianName: 'کرمان', englishName: 'Kerman', latitude: 30.2832, longitude: 57.0788 },
      { persianName: 'رفسنجان', englishName: 'Rafsanjan', latitude: 30.4067, longitude: 55.9939 },
      { persianName: 'جیرفت', englishName: 'Jiroft', latitude: 28.6751, longitude: 57.7401 },
      { persianName: 'سیرجان', englishName: 'Sirjan', latitude: 29.4514, longitude: 55.6802 },
      { persianName: 'بم', englishName: 'Bam', latitude: 29.1060, longitude: 58.3570 },
      { persianName: 'زرند', englishName: 'Zarand', latitude: 30.8127, longitude: 56.5639 },
      { persianName: 'شهربابک', englishName: 'Shahr-e Babak', latitude: 30.1165, longitude: 55.1185 },
      { persianName: 'کهنوج', englishName: 'Kahnuj', latitude: 27.9472, longitude: 57.6993 },
      { persianName: 'بردسیر', englishName: 'Bardsir', latitude: 29.9275, longitude: 56.5722 },
      { persianName: 'بافت', englishName: 'Baft', latitude: 29.2331, longitude: 56.6022 },
      { persianName: 'راور', englishName: 'Ravar', latitude: 31.2656, longitude: 56.8055 },
      { persianName: 'انار', englishName: 'Anar', latitude: 30.8740, longitude: 55.2710 }
    ]
  },
  {
    persianName: 'کرمانشاه',
    englishName: 'Kermanshah',
    cities: [
      { persianName: 'کرمانشاه', englishName: 'Kermanshah', latitude: 34.3142, longitude: 47.0650 },
      { persianName: 'اسلام‌آباد غرب', englishName: 'Eslamabad-e Gharb', latitude: 34.1094, longitude: 46.5275 },
      { persianName: 'کنگاور', englishName: 'Kangavar', latitude: 34.5015, longitude: 47.9653 },
      { persianName: 'هرسین', englishName: 'Harsin', latitude: 34.2721, longitude: 47.5861 },
      { persianName: 'سنقر', englishName: 'Sonqor', latitude: 34.7836, longitude: 47.5995 },
      { persianName: 'جوانرود', englishName: 'Javanrud', latitude: 34.7968, longitude: 46.4919 },
      { persianName: 'پاوه', englishName: 'Paveh', latitude: 35.0434, longitude: 46.3566 },
      { persianName: 'قصر شیرین', englishName: 'Qasr-e Shirin', latitude: 34.5155, longitude: 45.5772 },
      { persianName: 'صحنه', englishName: 'Sahneh', latitude: 34.4814, longitude: 47.6810 },
      { persianName: 'روانسر', englishName: 'Ravansar', latitude: 34.7153, longitude: 46.6533 },
      { persianName: 'گیلانغرب', englishName: 'Gilan-e Gharb', latitude: 34.1421, longitude: 45.9203 },
      { persianName: 'سرپل ذهاب', englishName: 'Sarpol-e Zahab', latitude: 34.4611, longitude: 45.8626 }
    ]
  },
  {
    persianName: 'کهگیلویه و بویراحمد',
    englishName: 'Kohgiluyeh and Boyer-Ahmad',
    cities: [
      { persianName: 'یاسوج', englishName: 'Yasuj', latitude: 30.6682, longitude: 51.5877 },
      { persianName: 'گچساران', englishName: 'Gachsaran', latitude: 30.3586, longitude: 50.7981 },
      { persianName: 'دوگنبدان', englishName: 'Dogonbadan', latitude: 30.3586, longitude: 50.7981 },
      { persianName: 'سی‌سخت', englishName: 'Sisakht', latitude: 30.8639, longitude: 51.4563 },
      { persianName: 'لنده', englishName: 'Landeh', latitude: 30.9797, longitude: 50.4247 },
      { persianName: 'چرام', englishName: 'Charam', latitude: 30.7461, longitude: 50.7460 },
      { persianName: 'باشت', englishName: 'Basht', latitude: 30.3608, longitude: 51.1587 },
      { persianName: 'مارگون', englishName: 'Margoon', latitude: 30.9923, longitude: 51.0835 },
      { persianName: 'سرفاریاب', englishName: 'Sarfaryab', latitude: 30.6667, longitude: 50.8333 },
      { persianName: 'دیشموک', englishName: 'Dishmook', latitude: 31.1667, longitude: 50.4000 }
    ]
  },
  {
    persianName: 'گلستان',
    englishName: 'Golestan',
    cities: [
      { persianName: 'گرگان', englishName: 'Gorgan', latitude: 36.8387, longitude: 54.4348 },
      { persianName: 'گنبد کاووس', englishName: 'Gonbad-e Kavus', latitude: 37.2500, longitude: 55.1672 },
      { persianName: 'آق قلا', englishName: 'Aq Qala', latitude: 37.0139, longitude: 54.4550 },
      { persianName: 'علی‌آباد کتول', englishName: 'Aliabad Katul', latitude: 36.9011, longitude: 54.8694 },
      { persianName: 'کردکوی', englishName: 'Kordkuy', latitude: 36.7931, longitude: 54.1121 },
      { persianName: 'بندر گز', englishName: 'Bandar-e Gaz', latitude: 36.7741, longitude: 53.9462 },
      { persianName: 'کلاله', englishName: 'Kalaleh', latitude: 37.3807, longitude: 55.4916 },
      { persianName: 'مینودشت', englishName: 'Minudasht', latitude: 37.1489, longitude: 55.3749 },
      { persianName: 'آزادشهر', englishName: 'Azadshahr', latitude: 37.0870, longitude: 55.1738 },
      { persianName: 'رامیان', englishName: 'Ramian', latitude: 37.0160, longitude: 55.1412 }
    ]
  },
  {
    persianName: 'گیلان',
    englishName: 'Gilan',
    cities: [
      { persianName: 'رشت', englishName: 'Rasht', latitude: 37.2794, longitude: 49.5832 },
      { persianName: 'بندر انزلی', englishName: 'Bandar Anzali', latitude: 37.4727, longitude: 49.4579 },
      { persianName: 'لاهیجان', englishName: 'Lahijan', latitude: 37.2072, longitude: 50.0039 },
      { persianName: 'لنگرود', englishName: 'Langarud', latitude: 37.1970, longitude: 50.1535 },
      { persianName: 'رودسر', englishName: 'Rudsar', latitude: 37.1376, longitude: 50.2880 },
      { persianName: 'فومن', englishName: 'Fuman', latitude: 37.2239, longitude: 49.3125 },
      { persianName: 'صومعه‌سرا', englishName: 'Sowme\'eh Sara', latitude: 37.3113, longitude: 49.3214 },
      { persianName: 'تالش', englishName: 'Talesh', latitude: 37.8013, longitude: 48.9069 },
      { persianName: 'آستارا', englishName: 'Astara', latitude: 38.4291, longitude: 48.8717 },
      { persianName: 'ماسال', englishName: 'Masal', latitude: 37.3631, longitude: 49.1329 },
      { persianName: 'رودبار', englishName: 'Rudbar', latitude: 36.8210, longitude: 49.4264 },
      { persianName: 'آستانه اشرفیه', englishName: 'Astaneh-ye Ashrafiyeh', latitude: 37.2632, longitude: 49.9444 }
    ]
  },
  {
    persianName: 'لرستان',
    englishName: 'Lorestan',
    cities: [
      { persianName: 'خرم‌آباد', englishName: 'Khorramabad', latitude: 33.4878, longitude: 48.3558 },
      { persianName: 'بروجرد', englishName: 'Boroujerd', latitude: 33.8973, longitude: 48.7516 },
      { persianName: 'دورود', englishName: 'Dorud', latitude: 33.4955, longitude: 49.0578 },
      { persianName: 'کوهدشت', englishName: 'Kuhdasht', latitude: 33.5350, longitude: 47.6061 },
      { persianName: 'الیگودرز', englishName: 'Aligudarz', latitude: 33.4006, longitude: 49.6949 },
      { persianName: 'پل‌دختر', englishName: 'Pol-e Dokhtar', latitude: 33.1536, longitude: 47.7130 },
      { persianName: 'ازنا', englishName: 'Azna', latitude: 33.6095, longitude: 49.4556 },
      { persianName: 'نورآباد', englishName: 'Nurabad', latitude: 34.0734, longitude: 47.9725 },
      { persianName: 'الشتر', englishName: 'Aleshtar', latitude: 33.8634, longitude: 48.2619 },
      { persianName: 'چگنی', englishName: 'Chegeni', latitude: 33.5833, longitude: 47.8000 }
    ]
  },
  {
    persianName: 'مازندران',
    englishName: 'Mazandaran',
    cities: [
      { persianName: 'ساری', englishName: 'Sari', latitude: 36.5633, longitude: 53.0601 },
      { persianName: 'بابل', englishName: 'Babol', latitude: 36.5513, longitude: 52.6789 },
      { persianName: 'آمل', englishName: 'Amol', latitude: 36.4696, longitude: 52.3507 },
      { persianName: 'قائم‌شهر', englishName: 'Qaem Shahr', latitude: 36.4631, longitude: 52.8601 },
      { persianName: 'بابلسر', englishName: 'Babolsar', latitude: 36.7025, longitude: 52.6576 },
      { persianName: 'بهشهر', englishName: 'Behshahr', latitude: 36.6923, longitude: 53.5526 },
      { persianName: 'تنکابن', englishName: 'Tonekabon', latitude: 36.8163, longitude: 50.8738 },
      { persianName: 'چالوس', englishName: 'Chalus', latitude: 36.6570, longitude: 51.4204 },
      { persianName: 'نوشهر', englishName: 'Nowshahr', latitude: 36.6490, longitude: 51.4962 },
      { persianName: 'رامسر', englishName: 'Ramsar', latitude: 36.9031, longitude: 50.6583 },
      { persianName: 'محمودآباد', englishName: 'Mahmudabad', latitude: 36.6319, longitude: 52.2629 },
      { persianName: 'نور', englishName: 'Nur', latitude: 36.5731, longitude: 52.0136 }
    ]
  },
  {
    persianName: 'مرکزی',
    englishName: 'Markazi',
    cities: [
      { persianName: 'اراک', englishName: 'Arak', latitude: 34.0917, longitude: 49.6892 },
      { persianName: 'ساوه', englishName: 'Saveh', latitude: 35.0213, longitude: 50.3566 },
      { persianName: 'خمین', englishName: 'Khomein', latitude: 33.6415, longitude: 50.0789 },
      { persianName: 'محلات', englishName: 'Mahallat', latitude: 33.9054, longitude: 50.4531 },
      { persianName: 'دلیجان', englishName: 'Delijan', latitude: 33.9905, longitude: 50.6838 },
      { persianName: 'تفرش', englishName: 'Tafresh', latitude: 34.6931, longitude: 50.0130 },
      { persianName: 'آشتیان', englishName: 'Ashtian', latitude: 34.5219, longitude: 50.0061 },
      { persianName: 'شازند', englishName: 'Shazand', latitude: 33.9274, longitude: 49.4116 },
      { persianName: 'کمیجان', englishName: 'Komijan', latitude: 34.7192, longitude: 49.3264 },
      { persianName: 'زرندیه', englishName: 'Zarandieh', latitude: 35.3062, longitude: 50.4967 }
    ]
  },
  {
    persianName: 'هرمزگان',
    englishName: 'Hormozgan',
    cities: [
      { persianName: 'بندر عباس', englishName: 'Bandar Abbas', latitude: 27.1832, longitude: 56.2666 },
      { persianName: 'میناب', englishName: 'Minab', latitude: 27.1310, longitude: 57.0872 },
      { persianName: 'کیش', englishName: 'Kish', latitude: 26.5578, longitude: 54.0194 },
      { persianName: 'قشم', englishName: 'Qeshm', latitude: 26.9581, longitude: 56.2716 },
      { persianName: 'بندر لنگه', englishName: 'Bandar Lengeh', latitude: 26.5579, longitude: 54.8806 },
      { persianName: 'رودان', englishName: 'Rudan', latitude: 27.4419, longitude: 57.1924 },
      { persianName: 'جاسک', englishName: 'Jask', latitude: 25.6451, longitude: 57.7745 },
      { persianName: 'حاجی‌آباد', englishName: 'Hajiabad', latitude: 28.3091, longitude: 55.9017 },
      { persianName: 'بستک', englishName: 'Bastak', latitude: 27.1991, longitude: 54.3668 },
      { persianName: 'پارسیان', englishName: 'Parsian', latitude: 27.2027, longitude: 53.0420 }
    ]
  },
  {
    persianName: 'همدان',
    englishName: 'Hamadan',
    cities: [
      { persianName: 'همدان', englishName: 'Hamadan', latitude: 34.7992, longitude: 48.5146 },
      { persianName: 'ملایر', englishName: 'Malayer', latitude: 34.2969, longitude: 48.8236 },
      { persianName: 'نهاوند', englishName: 'Nahavand', latitude: 34.1885, longitude: 48.3769 },
      { persianName: 'تویسرکان', englishName: 'Tuyserkan', latitude: 34.5480, longitude: 48.4469 },
      { persianName: 'اسدآباد', englishName: 'Asadabad', latitude: 34.7824, longitude: 48.1202 },
      { persianName: 'بهار', englishName: 'Bahar', latitude: 34.9072, longitude: 48.4414 },
      { persianName: 'کبودر آهنگ', englishName: 'Kabudar Ahang', latitude: 35.2083, longitude: 48.7241 },
      { persianName: 'رزن', englishName: 'Razan', latitude: 35.3866, longitude: 49.0339 },
      { persianName: 'فامنین', englishName: 'Famenin', latitude: 35.1159, longitude: 48.9716 },
      { persianName: 'قهاوند', englishName: 'Qahavand', latitude: 34.8667, longitude: 48.9333 }
    ]
  },
  {
    persianName: 'یزد',
    englishName: 'Yazd',
    cities: [
      { persianName: 'یزد', englishName: 'Yazd', latitude: 31.8972, longitude: 54.3678 },
      { persianName: 'میبد', englishName: 'Meybod', latitude: 32.2501, longitude: 54.0166 },
      { persianName: 'اردکان', englishName: 'Ardakan', latitude: 32.3100, longitude: 54.0175 },
      { persianName: 'بافق', englishName: 'Bafq', latitude: 31.6035, longitude: 55.4025 },
      { persianName: 'ابرکوه', englishName: 'Abarkuh', latitude: 31.1304, longitude: 53.2504 },
      { persianName: 'تفت', englishName: 'Taft', latitude: 31.7478, longitude: 54.2088 },
      { persianName: 'مهریز', englishName: 'Mehriz', latitude: 31.5917, longitude: 54.4318 },
      { persianName: 'خاتم', englishName: 'Khatam', latitude: 30.3167, longitude: 54.3167 },
      { persianName: 'زارچ', englishName: 'Zarch', latitude: 31.9843, longitude: 54.2422 },
      { persianName: 'بهاباد', englishName: 'Bahabad', latitude: 31.8709, longitude: 56.0243 }
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
            latitude: String(cityData.latitude),
            longitude: String(cityData.longitude),
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