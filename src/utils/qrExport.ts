import QRCode from 'qrcode';
import { jsPDF } from 'jspdf';

/**
 * Generates an SVG or PNG data URL for a given public emergency token.
 */
export async function generateQRDataUrl(publicToken: string): Promise<string> {
  const origin = window.location.origin;
  const emergencyUrl = `${origin}/e/${publicToken}`;
  return QRCode.toDataURL(emergencyUrl, {
    width: 600,
    margin: 2,
    errorCorrectionLevel: 'H',
    color: {
      dark: '#0F172A',
      light: '#FFFFFF'
    }
  });
}

/**
 * Downloads high-resolution PNG of the Emergency QR Code.
 */
export async function downloadQRPng(publicToken: string, displayName: string) {
  const dataUrl = await generateQRDataUrl(publicToken);
  const link = document.createElement('a');
  link.href = dataUrl;
  link.download = `EMP_Emergency_QR_${displayName.replace(/\s+/g, '_')}_${publicToken}.png`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

/**
 * Generates and downloads a print-ready PDF ID badge/card.
 */
export async function downloadQRPdf(publicToken: string, displayName: string, bloodGroup?: string) {
  const dataUrl = await generateQRDataUrl(publicToken);
  
  // Standard CR80 badge dimensions (85.6mm x 53.98mm)
  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: [85.6, 54]
  });

  // Background Header Banner
  doc.setFillColor(15, 23, 42); // Navy
  doc.rect(0, 0, 85.6, 12, 'F');

  // Red Emergency Accent Strip
  doc.setFillColor(220, 38, 38); // Red
  doc.rect(0, 12, 85.6, 1.5, 'F');

  // Header Title
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(255, 255, 255);
  doc.text('EMERGENCY MEDICAL ID (EMP)', 4, 8);

  doc.setFontSize(6.5);
  doc.setTextColor(203, 213, 225);
  doc.text('SCAN IN CASE OF EMERGENCY', 81, 8, { align: 'right' });

  // Add QR Code Image
  doc.addImage(dataUrl, 'PNG', 4, 16, 34, 34);

  // Individual Details on Right
  doc.setTextColor(15, 23, 42);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text(displayName.toUpperCase(), 41, 22);

  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 116, 139);
  doc.text('Scan for Critical Medical Data', 41, 27);
  doc.text('& Emergency Contacts', 41, 31);

  if (bloodGroup && bloodGroup !== 'Unknown') {
    doc.setFillColor(254, 242, 242);
    doc.rect(41, 34, 28, 7, 'F');
    doc.setTextColor(220, 38, 38);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7);
    doc.text(`BLOOD GROUP: ${bloodGroup}`, 43, 38.5);
  }

  // Token ID reference at bottom
  doc.setFontSize(5.5);
  doc.setTextColor(148, 163, 184);
  doc.setFont('helvetica', 'normal');
  doc.text(`Token: ${publicToken} | HTTPS Verified`, 41, 48);

  doc.save(`EMP_Emergency_Card_${displayName.replace(/\s+/g, '_')}.pdf`);
}

/**
 * Triggers native browser print dialog.
 */
export function triggerPrint() {
  window.print();
}
