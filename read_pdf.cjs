const fs = require('fs');
const pdfParse = require('pdf-parse/lib/pdf-parse.js');

const buf = fs.readFileSync('./JAACKPOT_JMETER_REAL_LOAD_TESTING_GUIDE.pdf');
pdfParse(buf).then(data => {
  console.log(data.text);
}).catch(err => {
  console.error(err.message);
});
