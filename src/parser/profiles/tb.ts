/**
 * @fileOverview TB.xlsx Workbook Profile.
 */

import { WorkbookProfile } from '../types';

export const TB_PROFILE: WorkbookProfile = {
  id: 'TB_PROFILE',
  grantKey: 'TB-GLOBAL-FUND',
  workbookMatchHints: ['TB', 'NTBLCP', 'GLOBAL FUND'],
  sheetNameHints: ['TB'],
  titlePatterns: [
    'NATIONAL TUBERCULOSIS',
    'GLOBAL FUND PROJECT',
    'INVENTORY REPORTING FORM',
    'Asset Focal Persons',
    'NTBLCP'
  ],
  sectionPatterns: [
    'GENERAL',
    'IT EQUIPMENT',
    'PRINTER MACHINE',
    'PMU Office',
    'TRANSFERRED ASSETS',
    'COMPUTERS',
    'IT-EQUIPMENTS',
    'INHERITED ASSESTS',
    'MOTOR VEHICLES',
    'GENEXPERT MACHINES',
    'Additions'
  ],
  primaryHeaderSignature: [
    'S/N', 'Location', 'Assignee (Location)', 'Asset Description', 'Asset ID Code',
    'Asset Class', 'Manufacturer', 'Model Number', 'Serial Number', 'Suppliers'
  ],
  secondaryHeaderSignatures: [
    ['S/N', 'ASSETS TAG NO', 'ASSET CLASS', 'QTY', 'DESCRIPTION'],
    ['S/N', 'TAG NUMBERS', 'DESCRIPTION', 'CLASSIFICATION', 'QTY'],
    ['S/N', 'TAG NUMBER', 'DESCRIPTION', 'QTY', 'CATEGORY'],
    ['S/N', 'Location', 'Assignee', 'Asset Description', 'Asset ID Code']
  ],
  headerAliases: {
    'S/N': 'sn',
    'Location': 'location',
    'Assignee (Location)': 'custodian',
    'Assignee': 'custodian',
    'Location/User': 'location',
    'Asset Description': 'description',
    'Asset ID Code': 'assetIdCode',
    'Tag Number': 'assetIdCode',
    'Tag Numbers': 'assetIdCode',
    'Assets Tag No': 'assetIdCode',
    'Asset Class': 'assetClass',
    'Classification': 'assetClass',
    'Category': 'assetClass',
    'Manufacturer': 'manufacturer',
    'Model Number': 'modelNumber',
    'Model No': 'modelNumber',
    'Serial Number': 'serialNumber',
    'Serial No': 'serialNumber',
    'Asset Serial Numbers': 'serialNumber',
    'Suppliers': 'supplier',
    'Supplier': 'supplier',
    'Date Purchased or Received': 'purchaseDate',
    'Date Purchased or  Received': 'purchaseDate',
    'Acquisition Date': 'purchaseDate',
    'Chq No / Goods Received Note No.': 'grnNo',
    'PV No': 'pvNo',
    'PV/JV No': 'pvJvNo',
    'Purchase price (Naira)': 'purchasePriceNgn',
    'Cost (NGN)': 'purchasePriceNgn',
    'Cost(N)': 'purchasePriceNgn',
    'Purchase Price [USD)': 'purchasePriceUsd',
    'Cost (USD)': 'purchasePriceUsd',
    'Funder': 'funder',
    'Useful life': 'usefulLife',
    'Condition': 'condition',
    'Condition ': 'condition',
    'Remarks': 'remarks',
    'GRANT': 'grant',
    'Grant': 'grant'
  }
};
