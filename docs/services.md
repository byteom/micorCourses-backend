# Services

## CertificateService
Utility for generating certificates.

### generatePDFCertificate(certificateData) -> Buffer
- Input:
  - **learnerName**: string
  - **courseTitle**: string
  - **courseDuration**: minutes
  - **totalLessons**: number
  - **completionDate**: date
  - **serialHash**: string
  - **grade**: string (optional)
  - **issuedByName**: string
- Output: PDF Buffer suitable for `application/pdf` download.

### generateCertificateHTML(certificateData) -> string
- Same inputs; returns HTML string preview.

### Example (Node)
```js
const CertificateService = require('../src/services/certificateService');
const fs = require('fs');

(async () => {
  const buf = await CertificateService.generatePDFCertificate({
    learnerName: 'Jane Doe',
    courseTitle: 'Node.js Basics',
    courseDuration: 120,
    totalLessons: 12,
    completionDate: new Date(),
    serialHash: 'ABC123DEF456',
    grade: 'A',
    issuedByName: 'MicroCourses Platform'
  });
  fs.writeFileSync('certificate.pdf', buf);
})();
```
