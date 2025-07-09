
export const TARGET_SHEETS = [
  'NTBLCP-TB-FAR',
  'MOTORCYCLES-C19RM',
  'PDX-C19RM',
  'TB LAMP-C19RM',
  'ECG monitors',
  'IHVN-GF N-THRIP',
  'TRUENAT-C19RM',
  'Vehicles-TB (IHVN)',
  'GeneXpert machines-TB'
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

export const SPECIAL_LOCATIONS = ["FCMS", "FCT", "NTBLCP"];


// This defines a clean, unique, and comprehensive set of headers for each sheet.
// The parser will use this to find the header row, and the exporter will use this to generate the file.
// This structure ensures data aligns correctly under its proper header.
export const HEADER_DEFINITIONS: { [key: string]: string[] } = {
  'NTBLCP-TB-FAR': [
    'S/N', 'Location', 'LGA', 'Assignee', 'Asset Description', 'Asset ID Code',
    'Asset Class', 'Manufacturer', 'Model Number', 'Serial Number', 'Supplier',
    'Date Purchased or Received', 'Chq No / Goods Received Note No.', 'PV No',
    'Purchase price (Naira)', 'Purchase Price [USD)', 'Funder', 'Condition',
    'Remarks', 'GRANT', 'Useful Life (Years)', 'IMEI (TABLETS & MOBILE PHONES)'
  ],
  'MOTORCYCLES-C19RM': [
    'S/N', 'Location', 'LGA', 'Assignee', 'Asset Description', 'Asset ID Code',
    'Asset Class', 'Manufacturer', 'Chasis no', 'Engine no', 'Suppliers',
    'Date Purchased or Received', 'Chq No / Goods Received Note No.', 'PV No',
    'Purchase price (Naira)', 'Purchase Price [USD)', 'Funder', 'Condition',
    'Remarks', 'GRANT', 'Useful Life (Years)'
  ],
  'PDX-C19RM': [
    'S/N', 'Location', 'LGA', 'Assignee', 'Asset Description', 'Asset ID Code',
    'Asset Class', 'Manufacturer', 'Model Number', 'Serial Number', 'Supplier',
    'Date Purchased or Received', 'Chq No / Goods Received Note No.', 'PV No',
    'Purchase price (Naira)', 'Purchase Price [USD)', 'Funder', 'Condition',
    'Remarks', 'GRANT', 'Useful Life (Years)', 'IMEI (TABLETS & MOBILE PHONES)'
  ],
  'TB LAMP-C19RM': [
    'S/N', 'Location', 'LGA', 'Assignee', 'Asset Description', 'Asset ID Code',
    'Asset Class', 'Manufacturer', 'Model Number', 'Serial Number', 'Supplier',
    'Date Purchased or Received', 'Chq No / Goods Received Note No.', 'PV No',
    'Purchase price (Naira)', 'Purchase Price [USD)', 'Funder', 'Condition',
    'Remarks', 'GRANT', 'Useful Life (Years)', 'IMEI (TABLETS & MOBILE PHONES)'
  ],
  'ECG monitors': [
    'S/N', 'Location', 'LGA', 'Assignee', 'Asset Description', 'Asset ID Code',
    'Asset Class', 'Manufacturer', 'Model Number', 'Serial Number', 'Supplier',
    'Date Purchased or Received', 'Chq No / Goods Received Note No.', 'PV No',
    'Purchase price (Naira)', 'Purchase Price [USD)', 'Funder', 'Condition',
    'Remarks', 'GRANT', 'Useful Life (Years)', 'IMEI (TABLETS & MOBILE PHONES)'
  ],
  'IHVN-GF N-THRIP': [
    'S/N', 'STATE', 'TAG NUMBERS', 'DESCRIPTION', 'CLASSIFICATION',
    'ASSET SERIAL NUMBERS', 'MODEL NUMBERS', 'QTY', 'LOCATION', 'SITE',
    'YEAR OF PURCHASE', 'COST (NGN)', 'GRANT'
  ],
  'TRUENAT-C19RM': [
    'S/N', 'Location', 'LGA', 'Assignee', 'Asset Description', 'Asset ID Code',
    'Asset Class', 'Manufacturer', 'Model Number', 'Serial Number', 'Supplier',
    'Date Purchased or Received', 'Chq No / Goods Received Note No.', 'PV No',
    'Purchase price (Naira)', 'Purchase Price [USD)', 'Funder', 'Condition',
    'Remarks', 'GRANT', 'Useful Life (Years)', 'IMEI (TABLETS & MOBILE PHONES)'
  ],
  'Vehicles-TB (IHVN)': [
    'S/N', 'Location', 'LGA', 'Assignee', 'Asset Description', 'Asset ID Code',
    'Asset Class', 'Manufacturer', 'Engine no', 'Chasis no', 'Suppliers',
    'Date Purchased or Received', 'Chq No / Goods Received Note No.', 'PV No',
    'Purchase price (Naira)', 'Purchase Price [USD)', 'Funder', 'Condition',
    'GRANT', 'Useful Life (Years)'
  ],
  'GeneXpert machines-TB': [
    'S/N', 'Location', 'LGA', 'Assignee', 'Asset Description', 'Asset ID Code',
    'Asset Class', 'Manufacturer', 'Model Number', 'Serial Number', 'Supplier',
    'Date Purchased or Received', 'Chq No / Goods Received Note No.', 'PV No',
    'Purchase price (Naira)', 'Purchase Price [USD)', 'Funder', 'Condition',
    'Remarks', 'GRANT', 'Useful Life (Years)', 'IMEI (TABLETS & MOBILE PHONES)'
  ]
};
