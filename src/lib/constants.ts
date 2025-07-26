
import type { Asset, SheetDefinition, DisplayField } from "./types";

export const TARGET_SHEETS = [
  'NTBLCP-TB-FAR',
  'MOTORCYCLES-C19RM',
  'PDX-C19RM',
  'TB LAMP-C19RM',
  'ECG monitors',
  'IHVN-GF N-THRIP',
  'TRUENAT-C19RM',
  'Vehicles-TB (IHVN)',
  'GeneXpert machines-TB',
];

export const NIGERIAN_STATES = [
  "Abia", "Adamawa", "Akwa Ibom", "Anambra", "Bauchi", "Bayelsa", "Benue", "Borno",
  "Cross River", "Delta", "Ebonyi", "Edo", "Ekiti", "Enugu", "FCT - Abuja", "Gombe",
  "Imo", "Jigawa", "Kaduna", "Kano", "Katsina", "Kebbi", "Kogi", "Kwara", "Lagos",
  "Nasarawa", "Niger", "Ogun", "Ondo", "Osun", "Oyo", "Plateau", "Rivers", "Sokoto",
  "Taraba", "Yobe", "Zamfara"
];

export const NIGERIAN_STATE_CAPITALS: Record<string, string> = {
  "Abia": "Umuahia",
  "Adamawa": "Yola",
  "Akwa Ibom": "Uyo",
  "Anambra": "Awka",
  "Bauchi": "Bauchi",
  "Bayelsa": "Yenagoa",
  "Benue": "Makurdi",
  "Borno": "Maiduguri",
  "Cross River": "Calabar",
  "Delta": "Asaba",
  "Ebonyi": "Abakaliki",
  "Edo": "Benin City",
  "Ekiti": "Ado Ekiti",
  "Enugu": "Enugu",
  "FCT - Abuja": "Abuja",
  "Gombe": "Gombe",
  "Imo": "Owerri",
  "Jigawa": "Dutse",
  "Kaduna": "Kaduna",
  "Kano": "Kano",
  "Katsina": "Katsina",
  "Kebbi": "Birnin Kebbi",
  "Kogi": "Lokoja",
  "Kwara": "Ilorin",
  "Lagos": "Ikeja",
  "Nasarawa": "Lafia",
  "Niger": "Minna",
  "Ogun": "Abeokuta",
  "Ondo": "Akure",
  "Osun": "Osogbo",
  "Oyo": "Ibadan",
  "Plateau": "Jos",
  "Rivers": "Port Harcourt",
  "Sokoto": "Sokoto",
  "Taraba": "Jalingo",
  "Yobe": "Damaturu",
  "Zamfara": "Gusau",
};


export const NIGERIAN_ZONES: Record<string, string[]> = {
  "North Central": ["Benue", "FCT - Abuja", "Kogi", "Kwara", "Nasarawa", "Niger", "Plateau"],
  "North East": ["Adamawa", "Bauchi", "Borno", "Gombe", "Taraba", "Yobe"],
  "North West": ["Jigawa", "Kaduna", "Kano", "Katsina", "Kebbi", "Sokoto", "Zamfara"],
  "South East": ["Abia", "Anambra", "Ebonyi", "Enugu", "Imo"],
  "South South": ["Akwa Ibom", "Bayelsa", "Cross River", "Delta", "Edo", "Rivers"],
  "South West": ["Ekiti", "Lagos", "Ogun", "Ondo", "Osun", "Oyo"],
};

export const ZONE_NAMES = Object.keys(NIGERIAN_ZONES);

export const SPECIAL_LOCATIONS = ["FCMS", "NTBLCP"];

export const HEADER_ALIASES: { [key in keyof Partial<Asset>]: string[] } = {
  sn: ['S/N'],
  description: ['DESCRIPTION', 'ASSET DESCRIPTION'],
  location: ['LOCATION', 'STATE'],
  lga: ['LGA'],
  site: ['SITE'],
  assignee: ['ASSIGNEE', 'LOCATION/USER'],
  assetIdCode: ['ASSET ID CODE', 'TAG NUMBERS', 'TAG NUMBER'],
  assetClass: ['ASSET CLASS', 'CLASSIFICATION', 'CATEGORY'],
  manufacturer: ['MANUFACTURER'],
  modelNumber: ['MODEL NUMBER', 'MODEL NUMBERS'],
  serialNumber: ['SERIAL NUMBER', 'ASSET SERIAL NUMBERS', 'SERIAL NUMBERS'],
  supplier: ['SUPPLIER', 'SUPPLIERS'],
  dateReceived: ['DATE PURCHASED OR RECEIVED', 'DATE PURCHASED OR  RECEIVED', 'YEAR OF PURCHASE'],
  grnNo: ['CHQ NO / GOODS RECEIVED NOTE NO.'],
  pvNo: ['PV NO'],
  costNgn: ['PURCHASE PRICE (NAIRA)', 'COST (NGN)', 'COST(N)'],
  costUsd: ['PURCHASE PRICE [USD)', 'PURCHASE PRICE (USD)'],
  funder: ['FUNDER'],
  condition: ['CONDITION', 'COMMENTS'],
  remarks: ['REMARKS'],
  grant: ['GRANT'],
  usefulLifeYears: ['USEFUL LIFE (YEARS)'],
  chasisNo: ['CHASIS NO'],
  engineNo: ['ENGINE NO'],
  qty: ['QTY'],
  imei: ['IMEI (TABLETS & MOBILE PHONES)'],
};

const defaultTableFields: (keyof Asset)[] = ['sn', 'assetIdCode', 'lga', 'assignee', 'verifiedStatus'];
const vehicleTableFields: (keyof Asset)[] = ['sn', 'assetIdCode', 'lga', 'chasisNo', 'engineNo', 'assignee', 'verifiedStatus'];

const ntblcpFarHeaders = [ 'S/N', 'Location', 'LGA', 'Assignee', 'Asset Description', 'Asset ID Code', 'Asset Class', 'Manufacturer', 'Model Number', 'Serial Number', 'Suppliers', 'Date Purchased or  Received', 'Chq No / Goods Received Note No.', 'PV No', 'Purchase price (Naira)', 'Purchase Price [USD)', 'Funder', 'Condition', 'Remarks', 'GRANT', 'Useful Life (Years)' ];
const motorcycleHeaders = [ 'S/N', 'Location', 'LGA', 'Assignee', 'Asset Description', 'Asset ID Code', 'Asset Class', 'Manufacturer', 'Chasis no', 'Engine no', 'Suppliers', 'Date Purchased or  Received', 'Chq No / Goods Received Note No.', 'PV No', 'Purchase price (Naira)', 'Purchase Price [USD)', 'Funder', 'Condition', 'Remarks', 'GRANT', 'Useful Life (Years)' ];
const pdxHeaders = [ 'S/N', 'Location', 'LGA', 'Assignee', 'Asset Description', 'Asset ID Code', 'Asset Class', 'Manufacturer', 'Model Number', 'Serial Number', 'Supplier', 'Date Purchased or  Received', 'Chq No / Goods Received Note No.', 'PV No', 'Purchase price (Naira)', 'Purchase Price [USD)', 'Funder', 'Condition', 'Remarks', 'GRANT', 'Useful Life (Years)', 'IMEI (TABLETS & MOBILE PHONES)' ];
const vehiclesIHVNHeaders = [ 'S/N', 'Location', 'LGA', 'Assignee', 'Asset Description', 'Asset ID Code', 'Asset Class', 'Manufacturer', 'Engine no', 'Chasis no', 'Suppliers', 'Date Purchased or  Received', 'Chq No / Goods Received Note No.', 'PV No', 'Purchase price (Naira)', 'Purchase Price [USD)', 'Funder', 'Condition', 'GRANT', 'Useful Life (Years)' ];
const genexpertHeaders = [ 'S/N', 'Location', 'LGA', 'Assignee', 'Asset Description', 'Asset ID Code', 'Asset Class', 'Manufacturer', 'Model Number', 'Serial Number', 'Supplier', 'Date Purchased or  Received', 'Chq No / Goods Received Note No.', 'PV No', 'Purchase price (Naira)', 'Purchase Price [USD)', 'Funder', 'Condition', 'Remarks', 'GRANT', 'Useful Life (Years)' ];

const ihvnGeneralHeaders = [ "S/N", "STATE", "TAG NUMBERS", "DESCRIPTION", "CLASSIFICATION", "ASSET SERIAL NUMBERS", "MODEL NUMBERS", "QTY", "LOCATION", "SITE", "YEAR OF PURCHASE", "COST (NGN)", "GRANT" ];
const ihvnComputersHeaders = [ "S/N", "CATEGORY", "TAG NUMBER", "DESCRIPTION", "QTY", "SERIAL NUMBER", "MODEL NUMBER", "YEAR OF PURCHASE", "LOCATION/USER", "COST (NGN)", "Grant" ];
const ihvnItHeaders = [ "S/N", "CATEGORY", "TAG NUMBER", "DESCRIPTION", "QTY", "SERIAL NUMBER", "MODEL NUMBER", "YEAR OF PURCHASE", "LOCATION/USER", "COST (NGN)", "Grant" ];
const ihvnInheritedHeaders = [ "S/N", "STATE", "TAG NUMBERS", "DESCRIPTION", "CLASSIFICATION", "SERIAL NUMBERS", "MODEL NUMBERS", "QTY", "LOCATION", "SITE", "YEAR OF PURCHASE", "COST(N)", "GRANT" ];

const createDisplayFields = (headers: string[], tableFields: (keyof Asset)[]): DisplayField[] => {
  const quickViewFields = headers.slice(0, 10).map(h => {
    for (const key in HEADER_ALIASES) {
      if (HEADER_ALIASES[key as keyof typeof HEADER_ALIASES].map(a => a.toLowerCase()).includes(h.toLowerCase())) {
        return { key: key as keyof Asset, label: h, quickView: true, table: false };
      }
    }
    return null;
  }).filter(Boolean) as DisplayField[];

  const essentialQuickViewKeys: (keyof Asset)[] = ['remarks', 'condition', 'verifiedStatus', 'lastModified', 'lastModifiedBy'];
  essentialQuickViewKeys.forEach(key => {
    if (!quickViewFields.some(f => f.key === key)) {
      const label = key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase());
      quickViewFields.push({ key, label, quickView: true, table: false });
    }
  });

  const finalFields: DisplayField[] = [];
  const addedKeys = new Set<keyof Asset>();

  tableFields.forEach(key => {
    const label = key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase());
    finalFields.push({ key, label, table: true, quickView: false });
    addedKeys.add(key);
  });
  
  quickViewFields.forEach(field => {
    if (!addedKeys.has(field.key)) {
      finalFields.push(field);
      addedKeys.add(field.key);
    }
  });

  return finalFields;
}


export const HEADER_DEFINITIONS: Record<string, SheetDefinition> = {
  'NTBLCP-TB-FAR': { name: 'NTBLCP-TB-FAR', headers: ntblcpFarHeaders, displayFields: createDisplayFields(ntblcpFarHeaders, defaultTableFields) },
  'MOTORCYCLES-C19RM': { name: 'MOTORCYCLES-C19RM', headers: motorcycleHeaders, displayFields: createDisplayFields(motorcycleHeaders, vehicleTableFields) },
  'PDX-C19RM': { name: 'PDX-C19RM', headers: pdxHeaders, displayFields: createDisplayFields(pdxHeaders, defaultTableFields) },
  'TB LAMP-C19RM': { name: 'TB LAMP-C19RM', headers: pdxHeaders, displayFields: createDisplayFields(pdxHeaders, defaultTableFields) },
  'ECG monitors': { name: 'ECG monitors', headers: pdxHeaders, displayFields: createDisplayFields(pdxHeaders, defaultTableFields) },
  'TRUENAT-C19RM': { name: 'TRUENAT-C19RM', headers: pdxHeaders, displayFields: createDisplayFields(pdxHeaders, defaultTableFields) },
  'Vehicles-TB (IHVN)': { name: 'Vehicles-TB (IHVN)', headers: vehiclesIHVNHeaders, displayFields: createDisplayFields(vehiclesIHVNHeaders, vehicleTableFields) },
  'GeneXpert machines-TB': { name: 'GeneXpert machines-TB', headers: genexpertHeaders, displayFields: createDisplayFields(genexpertHeaders, defaultTableFields) },

  'IHVN-General': { name: 'IHVN-General', headers: ihvnGeneralHeaders, displayFields: createDisplayFields(ihvnGeneralHeaders, defaultTableFields) },
  'IHVN-Computers': { name: 'IHVN-Computers', headers: ihvnComputersHeaders, displayFields: createDisplayFields(ihvnComputersHeaders, defaultTableFields) },
  'IHVN-IT Equipment': { name: 'IHVN-IT Equipment', headers: ihvnItHeaders, displayFields: createDisplayFields(ihvnItHeaders, defaultTableFields) },
  'IHVN-Inherited Assets': { name: 'IHVN-Inherited Assets', headers: ihvnInheritedHeaders, displayFields: createDisplayFields(ihvnInheritedHeaders, defaultTableFields) },
  
  // This is now just a virtual group, its definition is for display purposes.
  'IHVN-GF N-THRIP': { name: 'IHVN-GF N-THRIP', headers: [], displayFields: [] } 
};
    
