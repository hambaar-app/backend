import { PrismaClient } from '../../generated/prisma/index.js';

const prisma = new PrismaClient();

const vehicleBrandsData = [
  {
    name: 'ایران‌خودرو',
    englishName: 'Iran Khodro (IKCO)',
    models: [
      { name: 'سمند', englishName: 'Samand' },
      { name: 'سمند EF7', englishName: 'Samand EF7' },
      { name: 'سمند سورن', englishName: 'Samand Soren' },
      { name: 'سمند سورن پلاس', englishName: 'Samand Soren Plus' },
      { name: 'دنا', englishName: 'Dena' },
      { name: 'دنا پلاس', englishName: 'Dena Plus' },
      { name: 'دنا پلاس توربو', englishName: 'Dena Plus Turbo' },
      { name: 'پژو 405', englishName: 'Peugeot 405' },
      { name: 'پژو 405 GLX', englishName: 'Peugeot 405 GLX' },
      { name: 'پژو پارس', englishName: 'Peugeot Pars' },
      { name: 'پژو پارس ELX', englishName: 'Peugeot Pars ELX' },
      { name: 'پژو پارس TU5', englishName: 'Peugeot Pars TU5' },
      { name: 'پژو 206', englishName: 'Peugeot 206' },
      { name: 'پژو 206 تیپ 2', englishName: 'Peugeot 206 Type 2' },
      { name: 'پژو 206 تیپ 3', englishName: 'Peugeot 206 Type 3' },
      { name: 'پژو 206 تیپ 5', englishName: 'Peugeot 206 Type 5' },
      { name: 'پژو 206 SD', englishName: 'Peugeot 206 SD' },
      { name: 'پژو 207i', englishName: 'Peugeot 207i' },
      { name: 'رنا', englishName: 'Runna' },
      { name: 'رنا پلاس', englishName: 'Runna Plus' },
      { name: 'تارا', englishName: 'Tara' },
      { name: 'تارا اتوماتیک', englishName: 'Tara Automatic' },
      { name: 'پیکان', englishName: 'Paykan' },
      { name: 'پیکان وانت', englishName: 'Paykan Van' },
      { name: 'آریسان', englishName: 'Arisun' },
      { name: 'آریسان 2', englishName: 'Arisun 2' },
      { name: 'هایما S7', englishName: 'Haima S7' },
      { name: 'هایما S5', englishName: 'Haima S5' },
      { name: 'TF21', englishName: 'TF21' },
    ],
  },
  {
    name: 'سایپا',
    englishName: 'SAIPA',
    models: [
      { name: 'پراید', englishName: 'Pride' },
      { name: 'پراید 111', englishName: 'Pride 111' },
      { name: 'پراید 131', englishName: 'Pride 131' },
      { name: 'پراید 132', englishName: 'Pride 132' },
      { name: 'پراید 141', englishName: 'Pride 141' },
      { name: 'پراید وانت', englishName: 'Pride Van' },
      { name: 'تیبا', englishName: 'Tiba' },
      { name: 'تیبا 2', englishName: 'Tiba 2' },
      { name: 'تیبا هاچ بک', englishName: 'Tiba Hatchback' },
      { name: 'کوییک', englishName: 'Quick' },
      { name: 'کوییک R', englishName: 'Quick R' },
      { name: 'کوییک S', englishName: 'Quick S' },
      { name: 'ساینا', englishName: 'Saina' },
      { name: 'ساینا اس', englishName: 'Saina S' },
      { name: 'ساینا EX', englishName: 'Saina EX' },
      { name: 'شاهین', englishName: 'Shahin' },
      { name: 'شاهین G', englishName: 'Shahin G' },
      { name: 'اطلس', englishName: 'Atlas' },
      { name: 'سایپا 151', englishName: 'SAIPA 151 Van' },
      { name: 'ریو', englishName: 'Rio' },
      { name: 'چانگان CS35', englishName: 'Changan CS35' },
    ],
  },
  {
    name: 'پارس‌خودرو',
    englishName: 'Pars Khodro',
    models: [
      { name: 'برلیانس H330', englishName: 'Brilliance H330' },
      { name: 'برلیانس H320', englishName: 'Brilliance H320' },
      { name: 'برلیانس H230', englishName: 'Brilliance H230' },
      { name: 'برلیانس H220', englishName: 'Brilliance H220' },
      { name: 'رنو تندر 90', englishName: 'Renault Tondar 90' },
      { name: 'رنو تندر 90 پلاس', englishName: 'Renault Tondar 90 Plus' },
      { name: 'رنو ساندرو', englishName: 'Renault Sandero' },
      { name: 'رنو ساندرو استپ‌وی', englishName: 'Renault Sandero Stepway' },
      { name: 'نیسان قشقایی', englishName: 'Nissan Qashqai' },
    ],
  },
  {
    name: 'کرمان‌موتور',
    englishName: 'Kerman Motor',
    models: [
      { name: 'جک S5', englishName: 'JAC S5' },
      { name: 'جک J7', englishName: 'JAC J7' },
      { name: 'جک J4', englishName: 'JAC J4' },
      { name: 'جک S3', englishName: 'JAC S3' },
      { name: 'T8', englishName: 'T8' },
      { name: 'K7', englishName: 'K7' },
      { name: 'KMC J7', englishName: 'KMC J7' },
      { name: 'KMC T9', englishName: 'KMC T9' },
      { name: 'لیفان X60', englishName: 'Lifan X60' },
    ],
  },
  {
    name: 'بهمن‌موتور',
    englishName: 'Bahman Motor',
    models: [
      { name: 'کارا', englishName: 'Cara' },
      { name: 'دیگنیتی', englishName: 'Dignity' },
      { name: 'دیگنیتی پرایم', englishName: 'Dignity Prime' },
      { name: 'فیدلیتی', englishName: 'Fidelity' },
      { name: 'فیدلیتی پرایم', englishName: 'Fidelity Prime' },
      { name: 'مزدا 3', englishName: 'Mazda 3' },
      { name: 'مزدا 6', englishName: 'Mazda 6' },
      { name: 'مزدا CX-5', englishName: 'Mazda CX-5' },
      { name: 'هاوال H2', englishName: 'Haval H2' },
      { name: 'کاپرا 2', englishName: 'Capra 2' },
    ],
  },
  {
    name: 'مدیران‌خودرو',
    englishName: 'Modiran Khodro (MVM)',
    models: [
      { name: 'چری آریزو 5', englishName: 'Chery Arrizo 5' },
      { name: 'چری آریزو 6', englishName: 'Chery Arrizo 6' },
      { name: 'چری تیگو 7', englishName: 'Chery Tiggo 7' },
      { name: 'چری تیگو 5', englishName: 'Chery Tiggo 5' },
      { name: 'چری تیگو 8', englishName: 'Chery Tiggo 8' },
      { name: 'چری تیگو 8 پرو', englishName: 'Chery Tiggo 8 Pro' },
      { name: 'X22', englishName: 'MVM X22' },
      { name: 'X22 پرو', englishName: 'MVM X22 Pro' },
      { name: 'X33', englishName: 'MVM X33' },
      { name: 'X55', englishName: 'MVM X55' },
      { name: 'X55 پرو', englishName: 'MVM X55 Pro' },
    ],
  },
  {
    name: 'پژو',
    englishName: 'Peugeot',
    models: [
      { name: '2008', englishName: 'Peugeot 2008' },
      { name: '301', englishName: 'Peugeot 301' },
      { name: '3008', englishName: 'Peugeot 3008' },
      { name: '508', englishName: 'Peugeot 508' },
      { name: '407', englishName: 'Peugeot 407' },
    ],
  },
  {
    name: 'سیتروئن',
    englishName: 'Citroen',
    models: [
      { name: 'C3', englishName: 'Citroen C3' },
      { name: 'C4', englishName: 'Citroen C4' },
      { name: 'C5', englishName: 'Citroen C5' },
      { name: 'DS5', englishName: 'Citroen DS5' },
    ],
  },
  {
    name: 'تویوتا',
    englishName: 'Toyota',
    models: [
      { name: 'کمری', englishName: 'Camry' },
      { name: 'کرولا', englishName: 'Corolla' },
      { name: 'هایلوکس', englishName: 'Hilux' },
      { name: 'RAV4', englishName: 'RAV4' },
      { name: 'پرادو', englishName: 'Prado' },
      { name: 'یاریس', englishName: 'Yaris' },
      { name: 'هایس', englishName: 'Hiace' },
      { name: 'لندکروز', englishName: 'Land Cruiser' },
      { name: 'فورچونر', englishName: 'Fortuner' },
    ],
  },
  {
    name: 'هیوندای',
    englishName: 'Hyundai',
    models: [
      { name: 'سوناتا', englishName: 'Sonata' },
      { name: 'توسان', englishName: 'Tucson' },
      { name: 'اکسنت', englishName: 'Accent' },
      { name: 'النترا', englishName: 'Elantra' },
      { name: 'سانتافه', englishName: 'Santa Fe' },
      { name: 'i30', englishName: 'i30' },
      { name: 'i20', englishName: 'i20' },
      { name: 'جنسیس', englishName: 'Genesis' },
    ],
  },
  {
    name: 'کیا',
    englishName: 'Kia',
    models: [
      { name: 'سراتو', englishName: 'Cerato' },
      { name: 'اسپورتیج', englishName: 'Sportage' },
      { name: 'سورنتو', englishName: 'Sorento' },
      { name: 'اپتیما', englishName: 'Optima' },
      { name: 'پیکانتو', englishName: 'Picanto' },
      { name: 'ریو', englishName: 'Rio' },
      { name: 'کادنزا', englishName: 'Cadenza' },
      { name: 'موهاوی', englishName: 'Mohave' },
    ],
  },
  {
    name: 'فردا‌موتورز',
    englishName: 'Farda Motors',
    models: [
      { name: 'SX5', englishName: 'Farda SX5' },
      { name: 'T5', englishName: 'Farda T5' },
      { name: 'V8', englishName: 'Farda V8' },
      { name: 'SX6', englishName: 'Farda SX6' },
    ],
  },
  {
    name: 'آزیم‌خودرو',
    englishName: 'Azim Khodro',
    models: [
      { name: 'X7', englishName: 'Hanteng X7' },
      { name: 'X5', englishName: 'Hanteng X5' },
      { name: 'V7', englishName: 'Hanteng V7' },
      { name: 'V8', englishName: 'Hanteng V8' },
    ],
  },
  {
    name: 'میتسوبیشی',
    englishName: 'Mitsubishi',
    models: [
      { name: 'لنسر', englishName: 'Lancer' },
      { name: 'ASX', englishName: 'ASX' },
      { name: 'آوتلندر', englishName: 'Outlander' },
      { name: 'پجرو اسپرت', englishName: 'Pajero Sport' },
      { name: 'میراژ', englishName: 'Mirage' },
    ],
  },
  {
    name: 'سوزوکی',
    englishName: 'Suzuki',
    models: [
      { name: 'ویتارا', englishName: 'Vitara' },
      { name: 'گرند ویتارا', englishName: 'Grand Vitara' },
      { name: 'جیمنی', englishName: 'Jimny' },
      { name: 'سوئیفت', englishName: 'Swift' },
      { name: 'کیزاشی', englishName: 'Kizashi' },
    ],
  },
  {
    name: 'نیسان',
    englishName: 'Nissan',
    models: [
      { name: 'آلتیما', englishName: 'Altima' },
      { name: 'تیدا', englishName: 'Tiida' },
      { name: 'X-Trail', englishName: 'X-Trail' },
      { name: 'پاترول', englishName: 'Patrol' },
      { name: 'جووک', englishName: 'Juke' },
      { name: 'ماکسیما', englishName: 'Maxima' },
    ],
  },
  {
    name: 'هوندا',
    englishName: 'Honda',
    models: [
      { name: 'سیویک', englishName: 'Civic' },
      { name: 'آکورد', englishName: 'Accord' },
      { name: 'CR-V', englishName: 'CR-V' },
      { name: 'پایلوت', englishName: 'Pilot' },
      { name: 'سیتی', englishName: 'City' },
    ],
  },
  {
    name: 'فولکس‌واگن',
    englishName: 'Volkswagen',
    models: [
      { name: 'جتا', englishName: 'Jetta' },
      { name: 'پولو', englishName: 'Polo' },
      { name: 'پاسات', englishName: 'Passat' },
      { name: 'تیگوان', englishName: 'Tiguan' },
      { name: 'گلف', englishName: 'Golf' },
    ],
  },
  {
    name: 'ب‌ام‌و',
    englishName: 'BMW',
    models: [
      { name: 'سری 3', englishName: 'BMW 3 Series' },
      { name: 'سری 5', englishName: 'BMW 5 Series' },
      { name: 'سری 7', englishName: 'BMW 7 Series' },
      { name: 'X3', englishName: 'BMW X3' },
      { name: 'X5', englishName: 'BMW X5' },
      { name: 'X1', englishName: 'BMW X1' },
      { name: 'سری 2', englishName: 'BMW 2 Series' },
    ],
  },
  {
    name: 'بنز',
    englishName: 'Mercedes-Benz',
    models: [
      { name: 'کلاس C', englishName: 'C-Class' },
      { name: 'کلاس E', englishName: 'E-Class' },
      { name: 'کلاس S', englishName: 'S-Class' },
      { name: 'GLE', englishName: 'GLE' },
      { name: 'GLC', englishName: 'GLC' },
      { name: 'GLA', englishName: 'GLA' },
      { name: 'کلاس A', englishName: 'A-Class' },
    ],
  },
  {
    name: 'آئودی',
    englishName: 'Audi',
    models: [
      { name: 'A3', englishName: 'A3' },
      { name: 'A4', englishName: 'A4' },
      { name: 'A6', englishName: 'A6' },
      { name: 'Q3', englishName: 'Q3' },
      { name: 'Q5', englishName: 'Q5' },
      { name: 'Q7', englishName: 'Q7' },
      { name: 'A5', englishName: 'A5' },
    ],
  },
  {
    name: 'لکسوس',
    englishName: 'Lexus',
    models: [
      { name: 'ES', englishName: 'ES' },
      { name: 'RX', englishName: 'RX' },
      { name: 'LX', englishName: 'LX' },
      { name: 'IS', englishName: 'IS' },
      { name: 'NX', englishName: 'NX' },
    ],
  },
  {
    name: 'اینفینیتی',
    englishName: 'Infiniti',
    models: [
      { name: 'Q50', englishName: 'Q50' },
      { name: 'QX60', englishName: 'QX60' },
      { name: 'QX70', englishName: 'QX70' },
      { name: 'QX50', englishName: 'QX50' },
    ],
  },
  {
    name: 'جیلی',
    englishName: 'Geely',
    models: [
      { name: 'امگراند', englishName: 'Emgrand' },
      { name: 'X7', englishName: 'X7' },
      { name: 'GC6', englishName: 'GC6' },
      { name: 'امگراند 7', englishName: 'Emgrand 7' },
      { name: 'GC9', englishName: 'GC9' },
    ],
  },
  {
    name: 'گریت‌وال',
    englishName: 'Great Wall',
    models: [
      { name: 'وینگل 5', englishName: 'Wingle 5' },
      { name: 'وینگل 7', englishName: 'Wingle 7' },
      { name: 'هاوال H6', englishName: 'Haval H6' },
      { name: 'هاوال H9', englishName: 'Haval H9' },
      { name: 'هاوال H8', englishName: 'Haval H8' },
    ],
  },
  {
    name: 'ام‌جی',
    englishName: 'MG',
    models: [
      { name: 'ZS', englishName: 'MG ZS' },
      { name: 'HS', englishName: 'MG HS' },
      { name: '6', englishName: 'MG 6' },
      { name: 'RX5', englishName: 'MG RX5' },
      { name: 'GS', englishName: 'MG GS' },
    ],
  },
  {
    name: 'زامیاد',
    englishName: 'Zamyad',
    models: [
      { name: 'Z24', englishName: 'Z24' },
      { name: 'کپسا', englishName: 'Kapsa' },
      { name: 'پیک‌آپ', englishName: 'Pickup' },
      { name: 'پادرا', englishName: 'Padra' },
      { name: 'پادرا پلاس', englishName: 'Padra Plus' },
    ],
  },
  {
    name: 'رنجر',
    englishName: 'Ranger',
    models: [
      { name: 'R1', englishName: 'Ranger R1' },
      { name: 'R2', englishName: 'Ranger R2' },
      { name: 'R3', englishName: 'Ranger R3' },
    ],
  },
  {
    name: 'دیار خودرو',
    englishName: 'Diar Khodro',
    models: [
      { name: 'سورنتو', englishName: 'Soren' },
      { name: 'وانت بسترن', englishName: 'Besturn Van' },
      { name: 'BAIC X25', englishName: 'BAIC X25' },
    ],
  },
  {
    name: 'سناباد خودرو',
    englishName: 'Senabad Khodro',
    models: [
      { name: 'چری تیگو 7 پرو', englishName: 'Chery Tiggo 7 Pro' },
      { name: 'چری آریزو 5 توربو', englishName: 'Chery Arrizo 5 Turbo' },
    ],
  },
  {
    name: 'ریگان خودرو',
    englishName: 'Reagan Khodro',
    models: [
      { name: 'کوپا T210', englishName: 'Coupa T210' },
      { name: 'کوپا رویال', englishName: 'Coupa Royal' },
    ],
  },
];

async function seedVehicleBrandsAndModels() {
  console.log('🌱 Starting comprehensive vehicle brands and models seeding...');

  try {
    // Clear existing data
    await prisma.vehicleModel.deleteMany();
    await prisma.vehicleBrand.deleteMany();

    let totalBrands = 0;
    let totalModels = 0;

    for (const brandData of vehicleBrandsData) {
      const brand = await prisma.vehicleBrand.create({
        data: {
          name: brandData.name,
          englishName: brandData.englishName,
        },
      });

      // Create models for this brand
      const modelPromises = brandData.models.map((modelData) =>
        prisma.vehicleModel.create({
          data: {
            name: modelData.name,
            englishName: modelData.englishName,
            brandId: brand.id,
          },
        }),
      );

      await Promise.all(modelPromises);

      totalBrands++;
      totalModels += brandData.models.length;

      console.log(
        `✅ Created brand: ${brand.name} with ${brandData.models.length} models`,
      );
    }

    console.log(`🎉 Seeding completed successfully!`);
    console.log(
      `📊 Total: ${totalBrands} brands and ${totalModels} models created`,
    );
  } catch (error) {
    console.error('❌ Seeding failed:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

seedVehicleBrandsAndModels().catch((error) => {
  console.error(error);
  process.exit(0);
});

export default seedVehicleBrandsAndModels;
