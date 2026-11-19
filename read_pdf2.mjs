import { readFileSync } from 'fs';
// Use legacy build for Node.js
const pdfjsLib = await import('./node_modules/pdfjs-dist/legacy/build/pdf.mjs');

const data = new Uint8Array(readFileSync('./JAACKPOT_JMETER_REAL_LOAD_TESTING_GUIDE.pdf'));
const loadingTask = pdfjsLib.getDocument({ data });
const pdfDoc = await loadingTask.promise;

let fullText = '';
for (let i = 1; i <= pdfDoc.numPages; i++) {
  const page = await pdfDoc.getPage(i);
  const content = await page.getTextContent();
  const pageText = content.items.map(item => item.str).join(' ');
  fullText += `\n--- PAGE ${i} ---\n${pageText}`;
}
console.log(fullText);
