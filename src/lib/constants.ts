
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


// This defines the expected headers for each sheet.
// The parser will use this to find the header row and map columns.
export const HEADER_DEFINITIONS: { [key: string]: string[] } = {
  'NTBLCP-TB-FAR': ["S/N", "Location", "LGA", "Assignee", "Asset Description", "Asset ID Code", "Asset Class", "Manufacturer", "Model Number", "Serial Number", "Supplier", "Date Purchased or Received", "Chq No / Goods Received Note No.", "PV No", "Purchase price (Naira)", "Purchase Price [USD)", "Funder", "Condition", "Remarks", "GRANT", "Useful Life (Years)", "2019 (NGN)", "2020 (NGN)", "2021 (NGN)", "2022 (NGN)", "Accumulated Depreciation (NGN)", "Net Book Value (NGN)", "X", "2019 (USD)", "2020 (USD)", "2021 (USD)", "2022 (USD)", "Accumulated Depreciation (USD)", "Net Book Value (USD)", "x", "ADDED ASSETS (2022 - 2023)", "IMEI (TABLETS & MOBILE PHONES)", "a", "Assignee", "Asset ID Code", "Asset Class", "Manufacturer", "Model Number", "Serial Number", "Suppliers", "Date Purchased or Received", "Chq No / Goods Received Note No.", "PV No", "Purchase price (Naira)", "Purchase Price [USD)", "Funder", "Condition", "Comments"],
  'MOTORCYCLES-C19RM': ["S/N", "Location", "LGA", "Assignee", "Asset Description", "Asset ID Code", "Asset Class", "Manufacturer", "Chasis no", "Engine no", "Suppliers", "Date Purchased or Received", "Chq No / Goods Received Note No.", "PV No", "Purchase price (Naira)", "Purchase Price [USD)", "Funder", "Condition", "Remarks", "GRANT", "Useful Life (Years)", "2019 (NGN)", "2020 (NGN)", "2021 (NGN)", "2022 (NGN)", "Accumulated Depreciation (NGN)", "Net Book Value (NGN)", "X", "2019 (USD)", "2020 (USD)", "2021 (USD)", "2022 (USD)", "Accumulated Depreciation (USD)", "Net Book Value (USD)", "x"],
  'PDX-C19RM': ["S/N", "Location", "LGA", "Assignee", "Asset Description", "Asset ID Code", "Asset Class", "Manufacturer", "Model Number", "Serial Number", "Supplier", "Date Purchased or Received", "Chq No / Goods Received Note No.", "PV No", "Purchase price (Naira)", "Purchase Price [USD)", "Funder", "Condition", "Remarks", "GRANT", "Useful Life (Years)", "2019 (NGN)", "2020 (NGN)", "2021 (NGN)", "2022 (NGN)", "Accumulated Depreciation (NGN)", "Net Book Value (NGN)", "X", "2019 (USD)", "2020 (USD)", "2021 (USD)", "2022 (USD)", "Accumulated Depreciation (USD)", "Net Book Value (USD)", "x", "ADDED ASSETS (2022 - 2023)", "IMEI (TABLETS & MOBILE PHONES)", "a", "Assignee", "Asset ID Code", "Asset Class", "Manufacturer", "Model Number", "Serial Number", "Suppliers", "Date Purchased or Received", "Chq No / Goods Received Note No.", "PV No", "Purchase price (Naira)", "Purchase Price [USD)", "Funder", "Condition", "Comments"],
  'TB LAMP-C19RM': ["S/N", "Location", "LGA", "Assignee", "Asset Description", "Asset ID Code", "Asset Class", "Manufacturer", "Model Number", "Serial Number", "Supplier", "Date Purchased or Received", "Chq No / Goods Received Note No.", "PV No", "Purchase price (Naira)", "Purchase Price [USD)", "Funder", "Condition", "Remarks", "GRANT", "Useful Life (Years)", "2019 (NGN)", "2020 (NGN)", "2021 (NGN)", "2022 (NGN)", "Accumulated Depreciation (NGN)", "Net Book Value (NGN)", "X", "2019 (USD)", "2020 (USD)", "2021 (USD)", "2022 (USD)", "Accumulated Depreciation (USD)", "Net Book Value (USD)", "x", "ADDED ASSETS (2022 - 2023)", "IMEI (TABLETS & MOBILE PHONES)", "a", "Assignee", "Asset ID Code", "Asset Class", "Manufacturer", "Model Number", "Serial Number", "Suppliers", "Date Purchased or Received", "Chq No / Goods Received Note No.", "PV No", "Purchase price (Naira)", "Purchase Price [USD)", "Funder", "Condition", "Comments"],
  'ECG monitors': ["S/N", "Location", "LGA", "Assignee", "Asset Description", "Asset ID Code", "Asset Class", "Manufacturer", "Model Number", "Serial Number", "Supplier", "Date Purchased or Received", "Chq No / Goods Received Note No.", "PV No", "Purchase price (Naira)", "Purchase Price [USD)", "Funder", "Condition", "Remarks", "GRANT", "Useful Life (Years)", "2019 (NGN)", "2020 (NGN)", "2021 (NGN)", "2022 (NGN)", "Accumulated Depreciation (NGN)", "Net Book Value (NGN)", "X", "2019 (USD)", "2020 (USD)", "2021 (USD)", "2022 (USD)", "Accumulated Depreciation (USD)", "Net Book Value (USD)", "x", "ADDED ASSETS (2022 - 2023)", "IMEI (TABLETS & MOBILE PHONES)", "a", "Assignee", "Asset ID Code", "Asset Class", "Manufacturer", "Model Number", "Serial Number", "Suppliers", "Date Purchased or Received", "Chq No / Goods Received Note No.", "PV No", "Purchase price (Naira)", "Purchase Price [USD)", "Funder", "Condition", "Comments"],
  'IHVN-GF N-THRIP': ["S/N", "STATE", "TAG NUMBERS", "DESCRIPTION", "CLASSIFICATION", "ASSET SERIAL NUMBERS", "MODEL NUMBERS", "QTY", "LOCATION", "SITE", "YEAR OF PURCHASE", "COST (NGN)", "GRANT"],
  'TRUENAT-C19RM': ["S/N", "Location", "LGA", "Assignee", "Asset Description", "Asset ID Code", "Asset Class", "Manufacturer", "Model Number", "Serial Number", "Supplier", "Date Purchased or Received", "Chq No / Goods Received Note No.", "PV No", "Purchase price (Naira)", "Purchase Price [USD)", "Funder", "Condition", "Remarks", "GRANT", "Useful Life (Years)", "2019 (NGN)", "2020 (NGN)", "2021 (NGN)", "2022 (NGN)", "Accumulated Depreciation (NGN)", "Net Book Value (NGN)", "X", "2019 (USD)", "2020 (USD)", "2021 (USD)", "2022 (USD)", "Accumulated Depreciation (USD)", "Net Book Value (USD)", "x", "ADDED ASSETS (2022 - 2023)", "IMEI (TABLETS & MOBILE PHONES)", "a", "Assignee", "Asset ID Code", "Asset Class", "Manufacturer", "Model Number", "Serial Number", "Suppliers", "Date Purchased or Received", "Chq No / Goods Received Note No.", "PV No", "Purchase price (Naira)", "Purchase Price [USD)", "Funder", "Condition", "Comments"],
  'Vehicles-TB (IHVN)': ["S/N", "Location", "LGA", "Assignee", "Asset Description", "Asset ID Code", "Asset Class", "Manufacturer", "Engine no", "Chasis no", "Suppliers", "Date Purchased or Received", "Chq No / Goods Received Note No.", "PV No", "Purchase price (Naira)", "Purchase Price [USD)", "Funder", "Condition", "GRANT", "X", "Useful Life (Years)", "2019 (NGN)", "2020 (NGN)", "2021 (NGN)", "2022 (NGN)", "Accumulated Depreciation (NGN)", "Net Book Value (NGN)", "GRANT"],
  'GeneXpert machines-TB': ["S/N", "Location", "LGA", "Assignee", "Asset Description", "Asset ID Code", "Asset Class", "Manufacturer", "Model Number", "Serial Number", "Supplier", "Date Purchased or Received", "Chq No / Goods Received Note No.", "PV No", "Purchase price (Naira)", "Purchase Price [USD)", "Funder", "Condition", "Remarks", "GRANT", "Useful Life (Years)", "2019 (NGN)", "2020 (NGN)", "2021 (NGN)", "2022 (NGN)", "Accumulated Depreciation (NGN)", "Net Book Value (NGN)", "X", "2019 (USD)", "2020 (USD)", "2021 (USD)", "2022 (USD)", "Accumulated Depreciation (USD)", "Net Book Value (USD)", "x", "ADDED ASSETS (2022 - 2023)", "IMEI (TABLETS & MOBILE PHONES)", "a", "Assignee", "Asset ID Code", "Asset Class", "Manufacturer", "Model Number", "Serial Number", "Suppliers", "Date Purchased or Received", "Chq No / Goods Received Note No.", "PV No", "Purchase price (Naira)", "Purchase Price [USD)", "Funder", "Condition", "Comments"]
};
