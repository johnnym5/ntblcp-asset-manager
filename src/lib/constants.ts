
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

// This defines the expected headers for each sheet.
// The parser will use this to find the header row and map columns.
export const HEADER_DEFINITIONS: { [key: string]: string[] } = {
  'NTBLCP-TB-FAR': [ "S/N", "Location", "LGA", "Assignee", "Asset Description", "Asset ID Code", "Asset Class", "Manufacturer", "Model Number", "Serial Number", "Supplier", "Date Purchased or Received", "Purchase price (Naira)", "Condition", "Remarks", "Comments" ],
  'MOTORCYCLES-C19RM': [ "S/N", "Location", "LGA", "Assignee", "Asset Description", "Manufacturer", "Chasis no", "Engine no", "Suppliers", "Date Purchased or Received", "Purchase price (Naira)", "Condition", "Remarks" ],
  'PDX-C19RM': [ "S/N", "Location", "LGA", "Assignee", "Asset Description", "Asset ID Code", "Asset Class", "Manufacturer", "Model Number", "Serial Number", "Supplier", "Date Purchased or Received", "Purchase price (Naira)", "Condition", "Remarks", "Comments" ],
  'TB LAMP-C19RM': [ "S/N", "Location", "LGA", "Assignee", "Asset Description", "Asset ID Code", "Asset Class", "Manufacturer", "Model Number", "Serial Number", "Supplier", "Date Purchased or Received", "Purchase price (Naira)", "Condition", "Remarks", "Comments" ],
  'ECG monitors': [ "S/N", "Location", "LGA", "Assignee", "Asset Description", "Asset ID Code", "Asset Class", "Manufacturer", "Model Number", "Serial Number", "Supplier", "Date Purchased or Received", "Purchase price (Naira)", "Condition", "Remarks", "Comments" ],
  'IHVN-GF N-THRIP': [ "S/N", "STATE", "TAG NUMBERS", "DESCRIPTION", "CLASSIFICATION", "ASSET SERIAL NUMBERS", "MODEL NUMBERS", "QTY", "LOCATION", "SITE", "YEAR OF PURCHASE", "COST (NGN)" ],
  'TRUENAT-C19RM': [ "S/N", "Location", "LGA", "Assignee", "Asset Description", "Asset ID Code", "Asset Class", "Manufacturer", "Model Number", "Serial Number", "Supplier", "Date Purchased or Received", "Purchase price (Naira)", "Condition", "Remarks", "Comments" ],
  'Vehicles-TB (IHVN)': [ "S/N", "Location", "LGA", "Assignee", "Asset Description", "Manufacturer", "Engine no", "Chasis no", "Suppliers", "Date Purchased or Received", "Purchase price (Naira)", "Condition" ],
  'GeneXpert machines-TB': [ "S/N", "Location", "LGA", "Assignee", "Asset Description", "Asset ID Code", "Asset Class", "Manufacturer", "Model Number", "Serial Number", "Supplier", "Date Purchased or Received", "Purchase price (Naira)", "Condition", "Remarks", "Comments" ]
};
