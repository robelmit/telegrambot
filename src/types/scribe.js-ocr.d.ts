declare module 'scribe.js-ocr' {
  export default {
    extractText(imagePaths: string[]): Promise<string>;
  };
}
