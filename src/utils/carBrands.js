// Car brand logos from the open-source car-logos-dataset
// https://github.com/filippofilip95/car-logos-dataset
const BASE = "https://raw.githubusercontent.com/filippofilip95/car-logos-dataset/master/logos/optimized";

// Chinese brands — logos from Wikipedia/brand CDNs (not in the dataset above)
const CHINESE = "https://upload.wikimedia.org/wikipedia/commons/thumb";

export const CAR_BRANDS = [
  { name: "Alfa Romeo",       logo: `${BASE}/alfa-romeo.png` },
  { name: "Aston Martin",     logo: `${BASE}/aston-martin.png` },
  { name: "Audi",             logo: `${BASE}/audi.png` },
  { name: "Bentley",          logo: `${BASE}/bentley.png` },
  { name: "BMW",              logo: `${BASE}/bmw.png` },
  { name: "Bugatti",          logo: `${BASE}/bugatti.png` },
  { name: "Buick",            logo: `${BASE}/buick.png` },
  { name: "BYD",              logo: `${CHINESE}/9/9f/BYD_logo_%282022%29.svg/320px-BYD_logo_%282022%29.svg.png` },
  { name: "Cadillac",         logo: `${BASE}/cadillac.png` },
  { name: "Chery",            logo: `${CHINESE}/4/4e/Chery_new_logo.svg/320px-Chery_new_logo.svg.png` },
  { name: "Chevrolet",        logo: `${BASE}/chevrolet.png` },
  { name: "Chrysler",         logo: `${BASE}/chrysler.png` },
  { name: "Citroën",          logo: `${BASE}/citroen.png` },
  { name: "Dacia",            logo: `${BASE}/dacia.png` },
  { name: "Dodge",            logo: `${BASE}/dodge.png` },
  { name: "Ferrari",          logo: `${BASE}/ferrari.png` },
  { name: "Fiat",             logo: `${BASE}/fiat.png` },
  { name: "Ford",             logo: `${BASE}/ford.png` },
  { name: "Geely",            logo: `${CHINESE}/e/e8/Geely_logo_%282019%29.svg/320px-Geely_logo_%282019%29.svg.png` },
  { name: "Genesis",          logo: `${BASE}/genesis.png` },
  { name: "Great Wall",       logo: `${CHINESE}/b/b3/Great_Wall_Motors_logo_2021.svg/320px-Great_Wall_Motors_logo_2021.svg.png` },
  { name: "Haval",            logo: `${CHINESE}/5/5e/Haval_logo_2021.svg/320px-Haval_logo_2021.svg.png` },
  { name: "Honda",            logo: `${BASE}/honda.png` },
  { name: "Huawei Aito",      logo: `${CHINESE}/3/3e/Huawei_Logo.svg/320px-Huawei_Logo.svg.png` },
  { name: "Hyundai",          logo: `${BASE}/hyundai.png` },
  { name: "Infiniti",         logo: `${BASE}/infiniti.png` },
  { name: "JAC",              logo: `${CHINESE}/c/c6/JAC_Motors_logo.svg/320px-JAC_Motors_logo.svg.png` },
  { name: "Jaguar",           logo: `${BASE}/jaguar.png` },
  { name: "Jeep",             logo: `${BASE}/jeep.png` },
  { name: "Kia",              logo: `${BASE}/kia.png` },
  { name: "Lamborghini",      logo: `${BASE}/lamborghini.png` },
  { name: "Land Rover",       logo: `${BASE}/land-rover.png` },
  { name: "Lexus",            logo: `${BASE}/lexus.png` },
  { name: "Lincoln",          logo: `${BASE}/lincoln.png` },
  { name: "Lynk & Co",        logo: `${CHINESE}/f/f8/Lynk_%26_Co_logo.svg/320px-Lynk_%26_Co_logo.svg.png` },
  { name: "Maserati",         logo: `${BASE}/maserati.png` },
  { name: "Mazda",            logo: `${BASE}/mazda.png` },
  { name: "McLaren",          logo: `${BASE}/mclaren.png` },
  { name: "Mercedes-Benz",    logo: `${BASE}/mercedes-benz.png` },
  { name: "MG",               logo: `${CHINESE}/9/92/MG_Cars_logo.svg/320px-MG_Cars_logo.svg.png` },
  { name: "MINI",             logo: `${BASE}/mini.png` },
  { name: "Mitsubishi",       logo: `${BASE}/mitsubishi.png` },
  { name: "Nissan",           logo: `${BASE}/nissan.png` },
  { name: "NIO",              logo: `${CHINESE}/0/03/Nio-Logo.svg/320px-Nio-Logo.svg.png` },
  { name: "Omoda",            logo: `${CHINESE}/4/4e/Chery_new_logo.svg/320px-Chery_new_logo.svg.png` },
  { name: "Opel",             logo: `${BASE}/opel.png` },
  { name: "Peugeot",          logo: `${BASE}/peugeot.png` },
  { name: "Porsche",          logo: `${BASE}/porsche.png` },
  { name: "RAM",              logo: `${BASE}/ram.png` },
  { name: "Renault",          logo: `${BASE}/renault.png` },
  { name: "Rolls-Royce",      logo: `${BASE}/rolls-royce.png` },
  { name: "SEAT",             logo: `${BASE}/seat.png` },
  { name: "Škoda",            logo: `${BASE}/skoda.png` },
  { name: "Smart",            logo: `${BASE}/smart.png` },
  { name: "Subaru",           logo: `${BASE}/subaru.png` },
  { name: "Suzuki",           logo: `${BASE}/suzuki.png` },
  { name: "Tesla",            logo: `${BASE}/tesla.png` },
  { name: "Toyota",           logo: `${BASE}/toyota.png` },
  { name: "Volkswagen",       logo: `${BASE}/volkswagen.png` },
  { name: "Volvo",            logo: `${BASE}/volvo.png` },
  { name: "Wuling",           logo: `${CHINESE}/5/5b/SGMW_Wuling_logo.svg/320px-SGMW_Wuling_logo.svg.png` },
  { name: "Xpeng",            logo: `${CHINESE}/7/75/Xpeng_Motors_logo.svg/320px-Xpeng_Motors_logo.svg.png` },
  { name: "Zeekr",            logo: `${CHINESE}/5/5b/Zeekr_logo_2021.svg/320px-Zeekr_logo_2021.svg.png` },
];

export const getBrandLogo = (manufacturer) => {
  if (!manufacturer) return null;
  const m = manufacturer.toLowerCase().replace(/[^a-z0-9]/g, "");
  const match = CAR_BRANDS.find(
    (b) => b.name.toLowerCase().replace(/[^a-z0-9]/g, "") === m
  );
  return match?.logo ?? null;
};
