import { readFileSync } from 'fs';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const pdfParse = require('pdf-parse');

const buf = readFileSync('./JAACKPOT_JMETER_REAL_LOAD_TESTING_GUIDE.pdf');
pdfParse(buf).then(data => {
  console.log(data.text);
}).catch(err => {
  console.error(err.message);
});
