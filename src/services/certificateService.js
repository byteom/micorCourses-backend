const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');

class CertificateService {
  static async generatePDFCertificate(certificateData) {
    return new Promise((resolve, reject) => {
      try {
        // Create a new PDF document
        const doc = new PDFDocument({
          size: 'A4',
          layout: 'landscape',
          margin: 50
        });

        // Create buffers array to collect PDF data
        const buffers = [];
        doc.on('data', buffers.push.bind(buffers));
        doc.on('end', () => {
          const pdfData = Buffer.concat(buffers);
          resolve(pdfData);
        });

        // Certificate background and styling
        const pageWidth = doc.page.width;
        const pageHeight = doc.page.height;

        // Draw decorative border
        doc.rect(30, 30, pageWidth - 60, pageHeight - 60)
          .lineWidth(3)
          .stroke('#2D3748');

        doc.rect(40, 40, pageWidth - 80, pageHeight - 80)
          .lineWidth(1)
          .stroke('#4A5568');

        // Header - Certificate Title
        doc.fontSize(36)
          .fillColor('#2D3748')
          .text('CERTIFICATE OF COMPLETION', pageWidth / 2, 80, {
            align: 'center',
            underline: true
          });

        // Subtitle
        doc.fontSize(18)
          .fillColor('#4A5568')
          .text('This is to certify that', pageWidth / 2, 130, {
            align: 'center'
          });

        // Learner Name (highlighted)
        doc.fontSize(28)
          .fillColor('#1A365D')
          .text(certificateData.learnerName, pageWidth / 2, 160, {
            align: 'center',
            underline: true
          });

        // Course completion text
        doc.fontSize(16)
          .fillColor('#2D3748')
          .text('has successfully completed the course', pageWidth / 2, 200, {
            align: 'center'
          });

        // Course Title (highlighted)
        doc.fontSize(24)
          .fillColor('#1A365D')
          .text(`"${certificateData.courseTitle}"`, pageWidth / 2, 230, {
            align: 'center',
            underline: true
          });

        // Course Details Section
        const detailsY = 280;
        doc.fontSize(14)
          .fillColor('#4A5568')
          .text('Course Details:', 100, detailsY);

        // Course information
        const courseInfo = [
          `Duration: ${certificateData.courseDuration} minutes`,
          `Total Lessons: ${certificateData.totalLessons}`,
          `Completion Date: ${new Date(certificateData.completionDate).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
          })}`,
          `Certificate ID: ${certificateData.serialHash}`
        ];

        courseInfo.forEach((info, index) => {
          doc.fontSize(12)
            .fillColor('#2D3748')
            .text(info, 120, detailsY + 30 + (index * 20));
        });

        // Issuer Information
        const issuerY = detailsY + 150;
        doc.fontSize(14)
          .fillColor('#4A5568')
          .text('Issued by:', pageWidth - 200, issuerY);

        doc.fontSize(12)
          .fillColor('#2D3748')
          .text(certificateData.issuedByName || 'MicroCourses Platform', pageWidth - 200, issuerY + 25);

        doc.fontSize(10)
          .fillColor('#718096')
          .text('Digital Signature', pageWidth - 200, issuerY + 45);

        // Footer
        doc.fontSize(10)
          .fillColor('#718096')
          .text('This certificate is digitally verified and can be verified online', pageWidth / 2, pageHeight - 80, {
            align: 'center'
          });

        doc.fontSize(8)
          .fillColor('#A0AEC0')
          .text(`Generated on ${new Date().toLocaleString()}`, pageWidth / 2, pageHeight - 60, {
            align: 'center'
          });

        // Decorative elements
        this.addDecorativeElements(doc, pageWidth, pageHeight);

        // Finalize the PDF
        doc.end();

      } catch (error) {
        reject(error);
      }
    });
  }

  static addDecorativeElements(doc, pageWidth, pageHeight) {
    // Add corner decorations
    const cornerSize = 20;
    
    // Top-left corner
    doc.rect(30, 30, cornerSize, cornerSize)
      .fillColor('#E2E8F0')
      .fill();

    // Top-right corner
    doc.rect(pageWidth - 50, 30, cornerSize, cornerSize)
      .fillColor('#E2E8F0')
      .fill();

    // Bottom-left corner
    doc.rect(30, pageHeight - 50, cornerSize, cornerSize)
      .fillColor('#E2E8F0')
      .fill();

    // Bottom-right corner
    doc.rect(pageWidth - 50, pageHeight - 50, cornerSize, cornerSize)
      .fillColor('#E2E8F0')
      .fill();

    // Add some decorative lines
    doc.moveTo(pageWidth / 2 - 100, 120)
      .lineTo(pageWidth / 2 + 100, 120)
      .stroke('#CBD5E0');

    doc.moveTo(pageWidth / 2 - 100, 190)
      .lineTo(pageWidth / 2 + 100, 190)
      .stroke('#CBD5E0');
  }

  static async generateCertificateHTML(certificateData) {
    return `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Certificate of Completion</title>
        <style>
          * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
          }
          
          body {
            font-family: 'Georgia', serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 20px;
          }
          
          .certificate {
            background: white;
            width: 100%;
            max-width: 800px;
            padding: 60px;
            border-radius: 20px;
            box-shadow: 0 20px 40px rgba(0,0,0,0.1);
            position: relative;
            overflow: hidden;
          }
          
          .certificate::before {
            content: '';
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            border: 4px solid #2D3748;
            border-radius: 16px;
            pointer-events: none;
          }
          
          .certificate::after {
            content: '';
            position: absolute;
            top: 20px;
            left: 20px;
            right: 20px;
            bottom: 20px;
            border: 2px solid #4A5568;
            border-radius: 12px;
            pointer-events: none;
          }
          
          .header {
            text-align: center;
            margin-bottom: 40px;
          }
          
          .title {
            font-size: 2.5rem;
            color: #2D3748;
            font-weight: bold;
            margin-bottom: 10px;
            text-decoration: underline;
            text-decoration-color: #4A5568;
          }
          
          .subtitle {
            font-size: 1.2rem;
            color: #4A5568;
            margin-bottom: 30px;
          }
          
          .learner-name {
            font-size: 2rem;
            color: #1A365D;
            text-align: center;
            margin: 20px 0;
            font-weight: bold;
            text-decoration: underline;
            text-decoration-color: #2D3748;
          }
          
          .completion-text {
            font-size: 1.1rem;
            color: #2D3748;
            text-align: center;
            margin: 20px 0;
          }
          
          .course-title {
            font-size: 1.8rem;
            color: #1A365D;
            text-align: center;
            margin: 20px 0 40px 0;
            font-weight: bold;
            text-decoration: underline;
            text-decoration-color: #2D3748;
          }
          
          .details {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 30px;
            margin: 40px 0;
          }
          
          .detail-section {
            background: #F7FAFC;
            padding: 20px;
            border-radius: 10px;
            border-left: 4px solid #4A5568;
          }
          
          .detail-title {
            font-size: 1.1rem;
            color: #2D3748;
            font-weight: bold;
            margin-bottom: 15px;
          }
          
          .detail-item {
            font-size: 0.95rem;
            color: #4A5568;
            margin-bottom: 8px;
            display: flex;
            justify-content: space-between;
          }
          
          .detail-label {
            font-weight: 500;
          }
          
          .detail-value {
            color: #2D3748;
            font-weight: bold;
          }
          
          .footer {
            margin-top: 40px;
            text-align: center;
            border-top: 2px solid #E2E8F0;
            padding-top: 20px;
          }
          
          .issuer {
            font-size: 1rem;
            color: #4A5568;
            margin-bottom: 5px;
          }
          
          .signature {
            font-size: 0.9rem;
            color: #718096;
            font-style: italic;
          }
          
          .verification {
            font-size: 0.8rem;
            color: #A0AEC0;
            margin-top: 20px;
          }
          
          .decorative {
            position: absolute;
            width: 60px;
            height: 60px;
            background: #E2E8F0;
            border-radius: 50%;
            opacity: 0.3;
          }
          
          .decorative.top-left {
            top: 20px;
            left: 20px;
          }
          
          .decorative.top-right {
            top: 20px;
            right: 20px;
          }
          
          .decorative.bottom-left {
            bottom: 20px;
            left: 20px;
          }
          
          .decorative.bottom-right {
            bottom: 20px;
            right: 20px;
          }
          
          @media print {
            body {
              background: white;
            }
            .certificate {
              box-shadow: none;
              border-radius: 0;
            }
          }
        </style>
      </head>
      <body>
        <div class="certificate">
          <div class="decorative top-left"></div>
          <div class="decorative top-right"></div>
          <div class="decorative bottom-left"></div>
          <div class="decorative bottom-right"></div>
          
          <div class="header">
            <h1 class="title">CERTIFICATE OF COMPLETION</h1>
            <p class="subtitle">This is to certify that</p>
          </div>
          
          <div class="learner-name">${certificateData.learnerName}</div>
          
          <p class="completion-text">has successfully completed the course</p>
          
          <div class="course-title">"${certificateData.courseTitle}"</div>
          
          <div class="details">
            <div class="detail-section">
              <div class="detail-title">Course Information</div>
              <div class="detail-item">
                <span class="detail-label">Duration:</span>
                <span class="detail-value">${certificateData.courseDuration} minutes</span>
              </div>
              <div class="detail-item">
                <span class="detail-label">Total Lessons:</span>
                <span class="detail-value">${certificateData.totalLessons}</span>
              </div>
              <div class="detail-item">
                <span class="detail-label">Completion Date:</span>
                <span class="detail-value">${new Date(certificateData.completionDate).toLocaleDateString('en-US', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric'
                })}</span>
              </div>
            </div>
            
            <div class="detail-section">
              <div class="detail-title">Certificate Details</div>
              <div class="detail-item">
                <span class="detail-label">Certificate ID:</span>
                <span class="detail-value">${certificateData.serialHash}</span>
              </div>
              <div class="detail-item">
                <span class="detail-label">Grade:</span>
                <span class="detail-value">${certificateData.grade || 'Pass'}</span>
              </div>
              <div class="detail-item">
                <span class="detail-label">Status:</span>
                <span class="detail-value">Verified</span>
              </div>
            </div>
          </div>
          
          <div class="footer">
            <div class="issuer">Issued by: ${certificateData.issuedByName || 'MicroCourses Platform'}</div>
            <div class="signature">Digital Signature</div>
            <div class="verification">
              This certificate is digitally verified and can be verified online<br>
              Generated on ${new Date().toLocaleString()}
            </div>
          </div>
        </div>
      </body>
      </html>
    `;
  }
}

module.exports = CertificateService;
