import type { Asset } from './types';
import { saveAs } from 'file-saver';

export function exportAssetsToJson(assets: Asset[], fileName: string = 'assets-export.json') {
  if (!assets || assets.length === 0) {
    throw new Error('No assets available to export.');
  }

  const jsonString = JSON.stringify(assets, null, 2);
  const blob = new Blob([jsonString], { type: 'application/json;charset=utf-8' });

  saveAs(blob, fileName);
}
