/**
 * @fileOverview C19 ASSETS.xlsx Workbook Profile.
 */

import { WorkbookProfile } from '../types';

export const C19_PROFILE: WorkbookProfile = {
  id: 'C19_PROFILE',
  grantKey: 'C19RM-GRANT',
  workbookMatchHints: ['C19', 'RM', 'GRANT-GF'],
  sheetNameHints: ['C19RM', 'C19'],
  titlePatterns: [
    'NATIONAL TUBERCULOSIS',
    'GLOBAL FUND PROJECT',
    'INVENTORY REPORTING FORM',
    'Asset Focal Persons',
    'NTBLCP'
  ],
  sectionPatterns: [
    'ADDITIONAL ASSETS',
    'MOTORBIKES',
    'PDX',
    'TB LAMP',
    'TRUENAT',
    'SAMSUNG GALAXY TABLETS',
    'ADDITIONS',
    'ECG Machine'
  ],
  primaryHeaderSignature: [
    'S/N', 'Location', 'LGA', 'Assignee', 'Asset Description', 'Asset ID Code',
    'Asset Class', 'Manufacturer', 'Chasis no', 'Engine no', 'Suppliers'
  ],
  secondaryHeaderSignatures: [
    ['Location', 'LGA', 'Assignee', 'Asset Description', 'Asset ID Code', 'Asset Class', 'Manufacturer', 'Model Number', 'Serial Number'],
    ['Location', 'LGA', 'Assignee', 'Asset Description', 'Asset ID Code', 'Asset Class', 'Manufacturer', 'Model No', 'Serial Number']
  ],
  headerAliases: {
    'S/N': 'sn',
    'Location': 'location',
    'State': 'location',
    'LGA': 'lga',
    'Assignee': 'custodian',
    'Asset Description': 'description',
    'Asset ID Code': 'assetIdCode',
    'Tag Number': 'assetIdCode',
    'Tag Numbers': 'assetIdCode',
    'Asset Class': 'assetClass',
    'Classification': 'assetClass',
    'Manufacturer': 'manufacturer',
    'Chasis no': 'chassisNo',
    'Chassis no': 'chassisNo',
    'Engine no': 'engineNo',
    'Suppliers': 'supplier',
    'Supplier': 'supplier',
    'Date Purchased or Received': 'purchaseDate',
    'Date Purchased or  Received': 'purchaseDate',
    'Chq No / Goods Received Note No.': 'grnNo',
    'PV/JV No': 'pvJvNo',
    'PV No': 'pvNo',
    'Purchase price (Naira)': 'purchasePriceNgn',
    'Purchase Price [USD)': 'purchasePriceUsd',
    'Funder': 'funder',
    'Useful life': 'usefulLife',
    'Condition': 'condition',
    'Condition ': 'condition',
    'Remarks': 'remarks',
    'GRANT': 'grant'
  }
};
