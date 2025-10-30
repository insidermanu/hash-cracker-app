/**
 * PDF Export Utility for Hash Cracker History
 */

import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { CrackHistory } from './historyManager';

export function exportHistoryToPDF(history: CrackHistory[], stats: any) {
  const doc = new jsPDF();

  // Title
  doc.setFontSize(20);
  doc.setFont('helvetica', 'bold');
  doc.text('Hash Cracker - History Report', 14, 20);

  // Timestamp
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(`Generated: ${new Date().toLocaleString()}`, 14, 28);

  // Stats Summary
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('Summary Statistics', 14, 40);

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  const statsY = 48;
  doc.text(`Total Attempts: ${stats.totalAttempts}`, 14, statsY);
  doc.text(`Successful Cracks: ${stats.successfulCracks}`, 14, statsY + 6);
  doc.text(`Success Rate: ${stats.totalAttempts > 0 ? Math.round((stats.successfulCracks / stats.totalAttempts) * 100) : 0}%`, 14, statsY + 12);
  doc.text(`Total Passwords Tested: ${stats.totalPasswordsTested.toLocaleString()}`, 14, statsY + 18);
  doc.text(`Average Time: ${(stats.averageTime / 1000).toFixed(2)}s`, 14, statsY + 24);

  // History Table
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('Crack History', 14, statsY + 38);

  const tableData = history.map(entry => [
    new Date(entry.timestamp).toLocaleString(),
    entry.hashType.toUpperCase(),
    entry.mode.toUpperCase(),
    entry.attackMethod,
    entry.success ? '✓ Success' : '✗ Failed',
    entry.success && entry.password ? entry.password : '-',
    entry.attempts.toLocaleString(),
    (entry.timeTaken / 1000).toFixed(2) + 's',
    entry.ipAddress,
  ]);

  autoTable(doc, {
    startY: statsY + 44,
    head: [['Time', 'Hash', 'Mode', 'Method', 'Status', 'Password', 'Attempts', 'Time', 'IP']],
    body: tableData,
    styles: {
      fontSize: 7,
      cellPadding: 1.5,
      overflow: 'linebreak',
      cellWidth: 'wrap',
    },
    headStyles: {
      fillColor: [71, 85, 105],
      textColor: 255,
      fontStyle: 'bold',
      fontSize: 7,
    },
    alternateRowStyles: {
      fillColor: [249, 250, 251],
    },
    columnStyles: {
      0: { cellWidth: 22 },
      1: { cellWidth: 16, fontSize: 6 },
      2: { cellWidth: 12 },
      3: { cellWidth: 16 },
      4: { cellWidth: 16 },
      5: { cellWidth: 20, fontStyle: 'bold', fontSize: 6 },
      6: { cellWidth: 16 },
      7: { cellWidth: 12 },
      8: { cellWidth: 20, fontSize: 6 },
    },
    margin: { left: 10, right: 10 },
  });

  // Save the PDF
  doc.save(`hash-cracker-history-${Date.now()}.pdf`);
}
