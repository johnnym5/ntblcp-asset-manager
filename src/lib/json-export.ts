import type { Asset, AppSettings } from './types';

export async function exportFullBackupToJson(assets: Asset[] | null, settings: AppSettings | null, fileName: string = 'ntblcp-full-backup.json') {
  if ((!assets || assets.length === 0) && !settings) {
    throw new Error('No data available to export.');
  }

  const { saveAs } = await import('file-saver');

  const exportData = {
    timestamp: new Date().toISOString(),
    settings: settings,
    assets: assets,
  };

  const jsonString = JSON.stringify(exportData, null, 2);
  const blob = new Blob([jsonString], { type: 'application/json;charset=utf-8' });

  saveAs(blob, fileName);
}

export async function exportAssetsToJson(assets: Asset[] | null, fileName: string = 'ntblcp-assets-backup.json') {
  if (!assets || assets.length === 0) {
    throw new Error('No assets available to export.');
  }

  const { saveAs } = await import('file-saver');

  const exportData = {
    timestamp: new Date().toISOString(),
    assetCount: assets.length,
    assets: assets,
  };

  const jsonString = JSON.stringify(exportData, null, 2);
  const blob = new Blob([jsonString], { type: 'application/json;charset=utf-8' });

  saveAs(blob, fileName);
}

export async function exportSettingsToJson(settings: AppSettings | null, fileName: string = 'ntblcp-settings-backup.json') {
  if (!settings) {
    throw new Error('No settings available to export.');
  }

  const { saveAs } = await import('file-saver');

  const exportData = {
    timestamp: new Date().toISOString(),
    settings: settings,
  };

  const jsonString = JSON.stringify(exportData, null, 2);
  const blob = new Blob([jsonString], { type: 'application/json;charset=utf-8' });

  saveAs(blob, fileName);
}