import type { Asset, SheetDefinition, DisplayField } from "./types";

export const TARGET_SHEETS = [
  'NTBLCP-TB-FAR',
  'MOTORCYCLES-C19RM',
  'PDX-C19RM',
  'TB LAMP-C19RM',
  'ECG monitors',
  'TRUENAT-C19RM',
  'Vehicles-TB (IHVN)',
  'GeneXpert machines-TB',
  'IHVN-GF N-THRIP', // Simplified: now a single sheet
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

export const ZONAL_STORES = Object.keys(NIGERIAN_ZONES);

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
  verifiedStatus: ['VERIFIED STATUS'],
  verifiedDate: ['VERIFIED DATE'],
  lastModifiedBy: ['LAST MODIFIED BY'],
  lastModified: ['LAST MODIFIED DATE'],
};

const defaultTableFields: (keyof Asset)[] = ['sn', 'assetIdCode', 'lga', 'assignee', 'verifiedStatus'];
const vehicleTableFields: (keyof Asset)[] = ['sn', 'assetIdCode', 'lga', 'chasisNo', 'engineNo', 'assignee', 'verifiedStatus'];
const ihvnTableFields: (keyof Asset)[] = ['sn', 'description', 'assetIdCode', 'serialNumber', 'location', 'site', 'assignee', 'verifiedStatus'];

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


// These are the header definitions used to find and parse the different tables within the single "IHVN-GF N-THRIP" sheet.
export const IHVN_SUB_SHEET_DEFINITIONS: Record<string, string[]> = {
    'IHVN-General': [ "S/N", "STATE", "TAG NUMBERS", "DESCRIPTION", "CLASSIFICATION", "ASSET SERIAL NUMBERS", "MODEL NUMBERS", "QTY", "LOCATION", "SITE", "YEAR OF PURCHASE", "COST (NGN)", "GRANT" ],
    'IHVN-Computers': [ "S/N", "CATEGORY", "TAG NUMBER", "DESCRIPTION", "QTY", "SERIAL NUMBER", "MODEL NUMBER", "YEAR OF PURCHASE", "LOCATION/USER", "COST (NGN)", "Grant" ],
    'IHVN-IT Equipment': [ "S/N", "CATEGORY", "TAG NUMBER", "DESCRIPTION", "QTY", "SERIAL NUMBER", "MODEL NUMBER", "YEAR OF PURCHASE", "LOCATION/USER", "COST (NGN)", "Grant" ],
    'IHVN-Inherited Assets': [ "S/N", "STATE", "TAG NUMBERS", "DESCRIPTION", "CLASSIFICATION", "SERIAL NUMBERS", "MODEL NUMBERS", "QTY", "LOCATION", "SITE", "YEAR OF PURCHASE", "COST(N)", "GRANT" ],
};


export const HEADER_DEFINITIONS: Record<string, SheetDefinition> = {
  'NTBLCP-TB-FAR': { 
    name: 'NTBLCP-TB-FAR', 
    headers: [ 'S/N', 'Location', 'LGA', 'Assignee', 'Asset Description', 'Asset ID Code', 'Asset Class', 'Manufacturer', 'Model Number', 'Serial Number', 'Suppliers', 'Date Purchased or Received', 'Chq No / Goods Received Note No.', 'PV No', 'Purchase price (Naira)', 'Purchase Price [USD)', 'Funder', 'Condition', 'Remarks', 'GRANT', 'Useful Life (Years)' ], 
    displayFields: [
        { key: 'sn', label: 'S/N', table: true, quickView: true },
        { key: 'location', label: 'Location', table: true, quickView: true },
        { key: 'lga', label: 'LGA', table: true, quickView: true },
        { key: 'assignee', label: 'Assignee', table: true, quickView: true },
        { key: 'description', label: 'Asset Description', table: true, quickView: true },
        { key: 'assetIdCode', label: 'Asset ID Code', table: true, quickView: true },
        { key: 'assetClass', label: 'Asset Class', table: false, quickView: true },
        { key: 'manufacturer', label: 'Manufacturer', table: false, quickView: true },
        { key: 'modelNumber', label: 'Model Number', table: false, quickView: true },
        { key: 'serialNumber', label: 'Serial Number', table: false, quickView: true },
        { key: 'supplier', label: 'Suppliers', table: false, quickView: false },
        { key: 'dateReceived', label: 'Date Purchased or Received', table: false, quickView: false },
        { key: 'grnNo', label: 'Chq No / Goods Received Note No.', table: false, quickView: false },
        { key: 'pvNo', label: 'PV No', table: false, quickView: false },
        { key: 'costNgn', label: 'Purchase price (Naira)', table: false, quickView: false },
        { key: 'costUsd', label: 'Purchase Price [USD)', table: false, quickView: false },
        { key: 'funder', label: 'Funder', table: false, quickView: false },
        { key: 'condition', label: 'Condition', table: false, quickView: true },
        { key: 'remarks', label: 'Remarks', table: false, quickView: true },
        { key: 'grant', label: 'GRANT', table: false, quickView: false },
        { key: 'usefulLifeYears', label: 'Useful Life (Years)', table: false, quickView: false },
        { key: 'verifiedStatus', label: 'Verified Status', table: true, quickView: true },
        { key: 'verifiedDate', label: 'Verified Date', table: false, quickView: false },
        { key: 'lastModifiedBy', label: 'Last Modified By', table: false, quickView: false },
        { key: 'lastModified', label: 'Last Modified Date', table: true, quickView: false },
    ]
  },
  'MOTORCYCLES-C19RM': { name: 'MOTORCYCLES-C19RM', headers: [ 'S/N', 'Location', 'LGA', 'Assignee', 'Asset Description', 'Asset ID Code', 'Asset Class', 'Manufacturer', 'Chasis no', 'Engine no', 'Suppliers', 'Date Purchased or  Received', 'Chq No / Goods Received Note No.', 'PV No', 'Purchase price (Naira)', 'Purchase Price [USD)', 'Funder', 'Condition', 'Remarks', 'GRANT', 'Useful Life (Years)' ], displayFields: createDisplayFields([ 'S/N', 'Location', 'LGA', 'Assignee', 'Asset Description', 'Asset ID Code', 'Asset Class', 'Manufacturer', 'Chasis no', 'Engine no', 'Suppliers', 'Date Purchased or  Received', 'Chq No / Goods Received Note No.', 'PV No', 'Purchase price (Naira)', 'Purchase Price [USD)', 'Funder', 'Condition', 'Remarks', 'GRANT', 'Useful Life (Years)' ], vehicleTableFields) },
  'PDX-C19RM': { name: 'PDX-C19RM', headers: [ 'S/N', 'Location', 'LGA', 'Assignee', 'Asset Description', 'Asset ID Code', 'Asset Class', 'Manufacturer', 'Model Number', 'Serial Number', 'Supplier', 'Date Purchased or  Received', 'Chq No / Goods Received Note No.', 'PV No', 'Purchase price (Naira)', 'Purchase Price [USD)', 'Funder', 'Condition', 'Remarks', 'GRANT', 'Useful Life (Years)', 'IMEI (TABLETS & MOBILE PHONES)' ], displayFields: createDisplayFields([ 'S/N', 'Location', 'LGA', 'Assignee', 'Asset Description', 'Asset ID Code', 'Asset Class', 'Manufacturer', 'Model Number', 'Serial Number', 'Supplier', 'Date Purchased or  Received', 'Chq No / Goods Received Note No.', 'PV No', 'Purchase price (Naira)', 'Purchase Price [USD)', 'Funder', 'Condition', 'Remarks', 'GRANT', 'Useful Life (Years)', 'IMEI (TABLETS & MOBILE PHONES)' ], defaultTableFields) },
  'TB LAMP-C19RM': { name: 'TB LAMP-C19RM', headers: [ 'S/N', 'Location', 'LGA', 'Assignee', 'Asset Description', 'Asset ID Code', 'Asset Class', 'Manufacturer', 'Model Number', 'Serial Number', 'Supplier', 'Date Purchased or  Received', 'Chq No / Goods Received Note No.', 'PV No', 'Purchase price (Naira)', 'Purchase Price [USD)', 'Funder', 'Condition', 'Remarks', 'GRANT', 'Useful Life (Years)', 'IMEI (TABLETS & MOBILE PHONES)' ], displayFields: createDisplayFields([ 'S/N', 'Location', 'LGA', 'Assignee', 'Asset Description', 'Asset ID Code', 'Asset Class', 'Manufacturer', 'Model Number', 'Serial Number', 'Supplier', 'Date Purchased or  Received', 'Chq No / Goods Received Note No.', 'PV No', 'Purchase price (Naira)', 'Purchase Price [USD)', 'Funder', 'Condition', 'Remarks', 'GRANT', 'Useful Life (Years)', 'IMEI (TABLETS & MOBILE PHONES)' ], defaultTableFields) },
  'ECG monitors': { name: 'ECG monitors', headers: [ 'S/N', 'Location', 'LGA', 'Assignee', 'Asset Description', 'Asset ID Code', 'Asset Class', 'Manufacturer', 'Model Number', 'Serial Number', 'Supplier', 'Date Purchased or  Received', 'Chq No / Goods Received Note No.', 'PV No', 'Purchase price (Naira)', 'Purchase Price [USD)', 'Funder', 'Condition', 'Remarks', 'GRANT', 'Useful Life (Years)', 'IMEI (TABLETS & MOBILE PHONES)' ], displayFields: createDisplayFields([ 'S/N', 'Location', 'LGA', 'Assignee', 'Asset Description', 'Asset ID Code', 'Asset Class', 'Manufacturer', 'Model Number', 'Serial Number', 'Supplier', 'Date Purchased or  Received', 'Chq No / Goods Received Note No.', 'PV No', 'Purchase price (Naira)', 'Purchase Price [USD)', 'Funder', 'Condition', 'Remarks', 'GRANT', 'Useful Life (Years)', 'IMEI (TABLETS & MOBILE PHONES)' ], defaultTableFields) },
  'TRUENAT-C19RM': { name: 'TRUENAT-C19RM', headers: [ 'S/N', 'Location', 'LGA', 'Assignee', 'Asset Description', 'Asset ID Code', 'Asset Class', 'Manufacturer', 'Model Number', 'Serial Number', 'Supplier', 'Date Purchased or  Received', 'Chq No / Goods Received Note No.', 'PV No', 'Purchase price (Naira)', 'Purchase Price [USD)', 'Funder', 'Condition', 'Remarks', 'GRANT', 'Useful Life (Years)', 'IMEI (TABLETS & MOBILE PHONES)' ], displayFields: createDisplayFields([ 'S/N', 'Location', 'LGA', 'Assignee', 'Asset Description', 'Asset ID Code', 'Asset Class', 'Manufacturer', 'Model Number', 'Serial Number', 'Supplier', 'Date Purchased or  Received', 'Chq No / Goods Received Note No.', 'PV No', 'Purchase price (Naira)', 'Purchase Price [USD)', 'Funder', 'Condition', 'Remarks', 'GRANT', 'Useful Life (Years)', 'IMEI (TABLETS & MOBILE PHONES)' ], defaultTableFields) },
  'Vehicles-TB (IHVN)': { name: 'Vehicles-TB (IHVN)', headers: [ 'S/N', 'Location', 'LGA', 'Assignee', 'Asset Description', 'Asset ID Code', 'Asset Class', 'Manufacturer', 'Engine no', 'Chasis no', 'Suppliers', 'Date Purchased or  Received', 'Chq No / Goods Received Note No.', 'PV No', 'Purchase price (Naira)', 'Purchase Price [USD)', 'Funder', 'Condition', 'GRANT', 'Useful Life (Years)' ], displayFields: createDisplayFields([ 'S/N', 'Location', 'LGA', 'Assignee', 'Asset Description', 'Asset ID Code', 'Asset Class', 'Manufacturer', 'Engine no', 'Chasis no', 'Suppliers', 'Date Purchased or  Received', 'Chq No / Goods Received Note No.', 'PV No', 'Purchase price (Naira)', 'Purchase Price [USD)', 'Funder', 'Condition', 'GRANT', 'Useful Life (Years)' ], vehicleTableFields) },
  'GeneXpert machines-TB': { name: 'GeneXpert machines-TB', headers: [ 'S/N', 'Location', 'LGA', 'Assignee', 'Asset Description', 'Asset ID Code', 'Asset Class', 'Manufacturer', 'Model Number', 'Serial Number', 'Supplier', 'Date Purchased or  Received', 'Chq No / Goods Received Note No.', 'PV No', 'Purchase price (Naira)', 'Purchase Price [USD)', 'Funder', 'Condition', 'Remarks', 'GRANT', 'Useful Life (Years)' ], displayFields: createDisplayFields([ 'S/N', 'Location', 'LGA', 'Assignee', 'Asset Description', 'Asset ID Code', 'Asset Class', 'Manufacturer', 'Model Number', 'Serial Number', 'Supplier', 'Date Purchased or  Received', 'Chq No / Goods Received Note No.', 'PV No', 'Purchase price (Naira)', 'Purchase Price [USD)', 'Funder', 'Condition', 'Remarks', 'GRANT', 'Useful Life (Years)' ], defaultTableFields) },

  'IHVN-GF N-THRIP': { 
    name: 'IHVN-GF N-THRIP',
    // The 'headers' for this special sheet is a union of all possible headers from its sub-tables.
    headers: Array.from(new Set(Object.values(IHVN_SUB_SHEET_DEFINITIONS).flat())),
    displayFields: createDisplayFields(Array.from(new Set(Object.values(IHVN_SUB_SHEET_DEFINITIONS).flat())), ihvnTableFields),
  }
};
