
import type { SheetDefinition } from "./types";

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

const defaultDisplayFields = [
    { key: 'sn', label: 'S/N', table: true, quickView: true },
    { key: 'assetIdCode', label: 'Asset ID Code', table: true, quickView: true },
    { key: 'lga', label: 'LGA', table: true, quickView: true },
    { key: 'serialNumber', label: 'Serial Number', table: true, quickView: false },
    { key: 'assignee', label: 'Assignee', table: true, quickView: true },
    { key: 'verifiedStatus', label: 'Verified Status', table: true, quickView: true },
    { key: 'location', label: 'Location', table: false, quickView: true },
    { key: 'description', label: 'Description', table: false, quickView: true },
    { key: 'condition', label: 'Condition', table: false, quickView: true },
    { key: 'remarks', label: 'Remarks', table: false, quickView: true },
    { key: 'manufacturer', label: 'Manufacturer', table: false, quickView: true },
    { key: 'modelNumber', label: 'Model Number', table: false, quickView: false },
    { key: 'assetClass', label: 'Asset Class', table: false, quickView: false },
    { key: 'supplier', label: 'Supplier', table: false, quickView: false },
    { key: 'dateReceived', label: 'Date Received', table: false, quickView: false },
    { key: 'grant', label: 'Grant', table: false, quickView: false },
    { key: 'lastModified', label: 'Last Modified', table: false, quickView: true },
    { key: 'lastModifiedBy', label: 'Modified By', table: false, quickView: true },
];

const vehicleDisplayFields = [
    { key: 'sn', label: 'S/N', table: true, quickView: true },
    { key: 'assetIdCode', label: 'Asset ID Code', table: true, quickView: true },
    { key: 'lga', label: 'LGA', table: true, quickView: true },
    { key: 'chasisNo', label: 'Chasis No', table: true, quickView: true },
    { key: 'engineNo', label: 'Engine No', table: true, quickView: true },
    { key: 'assignee', label: 'Assignee', table: true, quickView: true },
    { key: 'verifiedStatus', label: 'Verified Status', table: true, quickView: true },
    { key: 'location', label: 'Location', table: false, quickView: true },
    { key: 'description', label: 'Description', table: false, quickView: true },
    { key: 'condition', label: 'Condition', table: false, quickView: true },
    { key: 'remarks', label: 'Remarks', table: false, quickView: true },
    { key: 'manufacturer', label: 'Manufacturer', table: false, quickView: false },
    { key: 'modelNumber', label: 'Model Number', table: false, quickView: false },
    { key: 'assetClass', label: 'Asset Class', table: false, quickView: false },
    { key: 'supplier', label: 'Supplier', table: false, quickView: false },
    { key: 'dateReceived', label: 'Date Received', table: false, quickView: false },
    { key: 'grant', label: 'Grant', table: false, quickView: false },
    { key: 'lastModified', label: 'Last Modified', table: false, quickView: true },
    { key: 'lastModifiedBy', label: 'Modified By', table: false, quickView: true },
];

export const HEADER_DEFINITIONS: Record<string, SheetDefinition> = {
  'NTBLCP-TB-FAR': {
    name: 'NTBLCP-TB-FAR',
    headers: [ 'S/N', 'Location', 'LGA', 'Assignee', 'Asset Description', 'Asset ID Code', 'Asset Class', 'Manufacturer', 'Model Number', 'Serial Number', 'Supplier', 'Date Purchased or Received', 'Chq No / Goods Received Note No.', 'PV No', 'Purchase price (Naira)', 'Purchase Price (USD)', 'Funder', 'Condition', 'Remarks', 'GRANT', 'Useful Life (Years)' ],
    displayFields: defaultDisplayFields,
  },
  'MOTORCYCLES-C19RM': {
    name: 'MOTORCYCLES-C19RM',
    headers: [ 'S/N', 'Location', 'LGA', 'Assignee', 'Asset Description', 'Asset ID Code', 'Asset Class', 'Manufacturer', 'Chasis no', 'Engine no', 'Suppliers', 'Date Purchased or Received', 'Chq No / Goods Received Note No.', 'PV No', 'Purchase price (Naira)', 'Purchase Price (USD)', 'Funder', 'Condition', 'Remarks', 'GRANT', 'Useful Life (Years)' ],
    displayFields: vehicleDisplayFields,
  },
  'PDX-C19RM': {
    name: 'PDX-C19RM',
    headers: [ 'S/N', 'Location', 'LGA', 'Assignee', 'Asset Description', 'Asset ID Code', 'Asset Class', 'Manufacturer', 'Model Number', 'Serial Number', 'Supplier', 'Date Purchased or Received', 'Chq No / Goods Received Note No.', 'PV No', 'Purchase price (Naira)', 'Purchase Price (USD)', 'Funder', 'Condition', 'Remarks', 'GRANT', 'Useful Life (Years)', 'IMEI (TABLETS & MOBILE PHONES)' ],
    displayFields: defaultDisplayFields,
  },
  'TB LAMP-C19RM': {
    name: 'TB LAMP-C19RM',
    headers: [ 'S/N', 'Location', 'LGA', 'Assignee', 'Asset Description', 'Asset ID Code', 'Asset Class', 'Manufacturer', 'Model Number', 'Serial Number', 'Supplier', 'Date Purchased or Received', 'Chq No / Goods Received Note No.', 'PV No', 'Purchase price (Naira)', 'Purchase Price (USD)', 'Funder', 'Condition', 'Remarks', 'GRANT', 'Useful Life (Years)', 'IMEI (TABLETS & MOBILE PHONES)' ],
    displayFields: defaultDisplayFields,
  },
  'ECG monitors': {
    name: 'ECG monitors',
    headers: [ 'S/N', 'Location', 'LGA', 'Assignee', 'Asset Description', 'Asset ID Code', 'Asset Class', 'Manufacturer', 'Model Number', 'Serial Number', 'Supplier', 'Date Purchased or Received', 'Chq No / Goods Received Note No.', 'PV No', 'Purchase price (Naira)', 'Purchase Price (USD)', 'Funder', 'Condition', 'Remarks', 'GRANT', 'Useful Life (Years)', 'IMEI (TABLETS & MOBILE PHONES)' ],
    displayFields: defaultDisplayFields,
  },
  'IHVN-GF N-THRIP': {
    name: 'IHVN-GF N-THRIP',
    headers: [ 'S/N', 'STATE', 'TAG NUMBERS', 'DESCRIPTION', 'CLASSIFICATION', 'ASSET SERIAL NUMBERS', 'MODEL NUMBERS', 'QTY', 'LOCATION', 'SITE', 'YEAR OF PURCHASE', 'COST (NGN)', 'GRANT' ],
    displayFields: [
      { key: 'sn', label: 'S/N', table: true, quickView: true },
      { key: 'assetIdCode', label: 'TAG NUMBERS', table: true, quickView: true },
      { key: 'lga', label: 'LOCATION', table: true, quickView: true },
      { key: 'assignee', label: 'Assignee', table: true, quickView: true },
      { key: 'verifiedStatus', label: 'Verified Status', table: true, quickView: true },
      { key: 'location', label: 'STATE', table: false, quickView: true },
      { key: 'description', label: 'DESCRIPTION', table: false, quickView: true },
      { key: 'serialNumber', label: 'ASSET SERIAL NUMBERS', table: true, quickView: true },
      { key: 'condition', label: 'Condition', table: false, quickView: true },
      { key: 'remarks', label: 'Remarks', table: false, quickView: true },
      { key: 'assetClass', label: 'CLASSIFICATION', table: false, quickView: false },
      { key: 'modelNumber', label: 'MODEL NUMBERS', table: false, quickView: false },
      { key: 'site', label: 'SITE', table: false, quickView: false },
      { key: 'dateReceived', label: 'YEAR OF PURCHASE', table: false, quickView: false },
      { key: 'grant', label: 'GRANT', table: false, quickView: false },
      { key: 'lastModified', label: 'Last Modified', table: false, quickView: true },
      { key: 'lastModifiedBy', label: 'Modified By', table: false, quickView: true },
    ]
  },
  'TRUENAT-C19RM': {
    name: 'TRUENAT-C19RM',
    headers: [ 'S/N', 'Location', 'LGA', 'Assignee', 'Asset Description', 'Asset ID Code', 'Asset Class', 'Manufacturer', 'Model Number', 'Serial Number', 'Supplier', 'Date Purchased or Received', 'Chq No / Goods Received Note No.', 'PV No', 'Purchase price (Naira)', 'Purchase Price (USD)', 'Funder', 'Condition', 'Remarks', 'GRANT', 'Useful Life (Years)', 'IMEI (TABLETS & MOBILE PHONES)' ],
    displayFields: defaultDisplayFields,
  },
  'Vehicles-TB (IHVN)': {
    name: 'Vehicles-TB (IHVN)',
    headers: [ 'S/N', 'Location', 'LGA', 'Assignee', 'Asset Description', 'Asset ID Code', 'Asset Class', 'Manufacturer', 'Engine no', 'Chasis no', 'Suppliers', 'Date Purchased or Received', 'Chq No / Goods Received Note No.', 'PV No', 'Purchase price (Naira)', 'Purchase Price (USD)', 'Funder', 'Condition', 'GRANT', 'Useful Life (Years)' ],
    displayFields: vehicleDisplayFields,
  },
  'GeneXpert machines-TB': {
    name: 'GeneXpert machines-TB',
    headers: [ 'S/N', 'Location', 'LGA', 'Assignee', 'Asset Description', 'Asset ID Code', 'Asset Class', 'Manufacturer', 'Model Number', 'Serial Number', 'Supplier', 'Date Purchased or Received', 'Chq No / Goods Received Note No.', 'PV No', 'Purchase price (Naira)', 'Purchase Price (USD)', 'Funder', 'Condition', 'Remarks', 'GRANT', 'Useful Life (Years)', 'IMEI (TABLETS & MOBILE PHONES)' ],
    displayFields: defaultDisplayFields,
  }
};
