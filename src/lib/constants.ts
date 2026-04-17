import type { Asset, SheetDefinition, DisplayField } from "./types";

/**
 * @fileOverview System Constants & Canonical Sheet Definitions.
 * Aligned with PRD requirements for dynamic asset register importing.
 */

export const TARGET_SHEETS = [
  'NTBLCP-TB-FAR',
  'MOTORCYCLES',
  'PDX',
  'ECG MONITORS',
  'TB LAMP',
  'IHVN',
  'TRUENAT',
  'VEHICLES',
  'GENEXPERT',
  'TBLAMP C19RM',
];

export const ASSET_CONDITIONS = [
  "New",
  "Used- good condition",
  "Used but in good working condition",
  "Used but requires occasional repair",
  "Used but in poor condition",
  "Bad condition",
  "F2: Major repairs required-poor condition",
  "Unsalvageable",
  "Burnt",
  "Stolen",
  "Obsolete",
  "Insurance settlement",
  "Writeoff"
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

export const HEADER_ALIASES: { [key in keyof Partial<Asset>]: string[] } = {
  sn: ['S/N'],
  description: ['DESCRIPTION', 'ASSET DESCRIPTION'],
  location: ['LOCATION', 'STATE'],
  custodian: ['ASSIGNEE', 'LOCATION/USER', 'CUSTODIAN'],
  assetIdCode: ['ASSET ID CODE', 'TAG NUMBERS', 'TAG NUMBER'],
  category: ['ASSET CLASS', 'CLASSIFICATION', 'CATEGORY'],
  serialNumber: ['SERIAL NUMBER', 'ASSET SERIAL NUMBERS', 'SERIAL NUMBERS'],
  purchaseDate: ['DATE PURCHASED OR RECEIVED', 'YEAR OF PURCHASE'],
  value: ['PURCHASE PRICE (NAIRA)', 'COST (NGN)', 'COST(N)', 'PURCHASE PRICE'],
  condition: ['CONDITION', 'COMMENTS'],
};

// Specialized sub-table signatures for complex sheets (e.g. IHVN)
export const SUB_TABLE_SIGNATURES: Record<string, string[]> = {
  'IHVN-General': [ "S/N", "STATE", "TAG NUMBERS", "DESCRIPTION", "CLASSIFICATION", "SERIAL NUMBERS" ],
  'IHVN-Computers': [ "S/N", "CATEGORY", "TAG NUMBER", "DESCRIPTION", "SERIAL NUMBER", "MODEL NUMBER" ],
  'IHVN-Vehicles': [ "S/N", "DESCRIPTION", "TAG NUMBER", "CHASIS NO", "ENGINE NO" ],
};

export const HEADER_DEFINITIONS: Record<string, SheetDefinition> = {
  'NTBLCP-TB-FAR': { 
    name: 'NTBLCP-TB-FAR', 
    headers: [ 'S/N', 'Location', 'LGA', 'Assignee', 'Asset Description', 'Asset ID Code', 'Asset Class', 'Manufacturer', 'Model Number', 'Serial Number', 'Suppliers', 'Date Purchased or Received', 'Chq No / Goods Received Note No.', 'PV No', 'Purchase price (Naira)', 'Purchase Price [USD)', 'Funder', 'Condition', 'Remarks', 'GRANT', 'Useful Life (Years)' ], 
    displayFields: []
  },
  'MOTORCYCLES': { name: 'MOTORCYCLES', headers: [ 'S/N', 'Location', 'LGA', 'Assignee', 'Asset Description', 'Asset ID Code', 'Asset Class', 'Manufacturer', 'Chasis no', 'Engine no' ], displayFields: [] },
  'PDX': { name: 'PDX', headers: [ 'S/N', 'Location', 'LGA', 'Assignee', 'Asset Description', 'Asset ID Code', 'Asset Class', 'Manufacturer', 'Model Number', 'Serial Number' ], displayFields: [] },
  'ECG MONITORS': { name: 'ECG MONITORS', headers: [ 'S/N', 'Location', 'LGA', 'Assignee', 'Asset Description', 'Asset ID Code', 'Asset Class' ], displayFields: [] },
  'TB LAMP': { name: 'TB LAMP', headers: [ 'S/N', 'Location', 'LGA', 'Assignee', 'Asset Description', 'Asset ID Code', 'Asset Class' ], displayFields: [] },
  'IHVN': { name: 'IHVN', headers: [ 'S/N', 'STATE', 'TAG NUMBERS', 'DESCRIPTION', 'CLASSIFICATION', 'SERIAL NUMBERS' ], displayFields: [] },
  'TRUENAT': { name: 'TRUENAT', headers: [ 'S/N', 'Location', 'LGA', 'Assignee', 'Asset Description', 'Asset ID Code' ], displayFields: [] },
  'VEHICLES': { name: 'VEHICLES', headers: [ 'S/N', 'Location', 'LGA', 'Assignee', 'Asset Description', 'Asset ID Code', 'Chasis no', 'Engine no' ], displayFields: [] },
  'GENEXPERT': { name: 'GENEXPERT', headers: [ 'S/N', 'Location', 'LGA', 'Assignee', 'Asset Description', 'Asset ID Code' ], displayFields: [] },
  'TBLAMP C19RM': { name: 'TBLAMP C19RM', headers: [ 'S/N', 'Location', 'LGA', 'Assignee', 'Asset Description', 'Asset ID Code' ], displayFields: [] },
};
