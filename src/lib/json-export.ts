import type { Asset, AppSettings } from './types';
import { saveAs } from 'file-saver';

export function exportFullBackupToJson(assets: Asset[], settings: AppSettings, fileName: string = 'ntblcp-full-backup.json') {
  if ((!assets || assets.length === 0) && !settings) {
    throw new Error('No data available to export.');
  }

  const exportData = {
    timestamp: new Date().toISOString(),
    settings: settings,
    assets: assets,
  };

  const jsonString = JSON.stringify(exportData, null, 2);
  const blob = new Blob([jsonString], { type: 'application/json;charset=utf-8' });

  saveAs(blob, fileName);
}
