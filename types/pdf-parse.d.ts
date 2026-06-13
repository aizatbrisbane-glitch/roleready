declare module "pdf-parse" {
  export interface PdfParseResult {
    numpages: number;
    numrender: number;
    info: unknown;
    metadata: unknown;
    version: string;
    text: string;
  }

  export interface PdfParseOptions {
    pagerender?: (pageData: unknown) => string | Promise<string>;
    max?: number;
    version?: string;
  }

  export default function pdfParse(
    dataBuffer: Buffer,
    options?: PdfParseOptions
  ): Promise<PdfParseResult>;
}
