declare module 'file-saver' {
  export function saveAs(data: Blob | string, filename?: string, options?: FileSaverOptions): void;

  interface FileSaverOptions {
    autoBom?: boolean;
  }
}
