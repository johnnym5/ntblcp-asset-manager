declare module 'jspdf' {
  export class jsPDF {
    constructor(orientation?: string, unit?: string, format?: string | number[]);
    setFillColor(r: number, g: number, b: number): void;
    rect(x: number, y: number, w: number, h: number, style: string): void;
    setTextColor(r: number, g: number, b: number): void;
    setFont(fontName: string, fontStyle?: string): void;
    setFontSize(size: number): void;
    text(text: string, x: number, y: number, options?: any): void;
    addImage(imageData: string, format: string, x: number, y: number, w: number, h: number): void;
    line(x1: number, y1: number, x2: number, y2: number): void;
    save(filename: string): void;
    lastAutoTable?: { finalY: number };
  }
}

declare module 'jspdf-autotable' {
  import { jsPDF } from 'jspdf';
  export default function autoTable(doc: jsPDF, options: any): void;
}
