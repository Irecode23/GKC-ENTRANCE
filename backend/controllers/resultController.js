const Result = require('../models/Result');
const Student = require('../models/Student');
const ExcelJS = require('exceljs');
const PDFDocument = require('pdfkit');
const path = require('path');
const fs = require('fs');

// Get all results
const getAllResults = async (req, res) => {
  try {
    const results = await Result.find()
      .populate('student', 'studentId fullName gender dateOfBirth classSeekingAdmission')
      .sort({ 'student.sequenceNumber': 1 });
    res.json(results);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Get result for a single student
const getStudentResult = async (req, res) => {
  try {
    const result = await Result.findOne({ student: req.params.studentId })
      .populate('student', 'studentId fullName gender dateOfBirth classSeekingAdmission');
    if (!result) return res.status(404).json({ message: 'Result not found' });
    res.json(result);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Update result status
const updateResultStatus = async (req, res) => {
  try {
    const { status } = req.body;
    if (!['ADMITTED', 'RESIT', 'PENDING'].includes(status)) {
      return res.status(400).json({ message: 'Invalid status' });
    }
    const result = await Result.findOneAndUpdate(
      { student: req.params.studentId },
      { status },
      { new: true }
    );
    if (!result) return res.status(404).json({ message: 'Result not found' });
    res.json({ message: 'Status updated', result });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Analytics summary
const getAnalytics = async (req, res) => {
  try {
    const totalRegistered = await Student.countDocuments();
    const ExamSession = require('../models/ExamSession');
    const submitted = await ExamSession.countDocuments({ status: 'submitted' });
    const active = await ExamSession.countDocuments({ status: 'active' });
    const absent = totalRegistered - submitted - active;

    const results = await Result.find({ status: { $ne: 'PENDING' } });
    const scores = results.map((r) => r.totalPercentage);

    const highest = scores.length ? Math.max(...scores) : 0;
    const lowest = scores.length ? Math.min(...scores) : 0;
    const average = scores.length ? parseFloat((scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(2)) : 0;

    res.json({
      totalRegistered,
      totalPresent: submitted + active,
      totalAbsent: Math.max(0, absent),
      totalSubmitted: submitted,
      totalActive: active,
      highestScore: highest,
      lowestScore: lowest,
      averageScore: average,
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Export single student result as PDF
const exportSingleResult = async (req, res) => {
  try {
    const result = await Result.findOne({ student: req.params.studentId })
      .populate('student', 'studentId fullName gender dateOfBirth classSeekingAdmission');

    if (!result) return res.status(404).json({ message: 'Result not found' });

    const student = result.student;
    const doc = new PDFDocument({ size: 'A4', margin: 50 });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=GKC_Result_${student.studentId.replace(/\//g, '_')}.pdf`);
    doc.pipe(res);

    const pageWidth = 595.28;
    const margin = 50;
    const contentWidth = pageWidth - margin * 2;

    // ── Logo ──────────────────────────────────────────────────
    const logoPath = path.join(__dirname, '../logo.png');
    if (fs.existsSync(logoPath)) {
      doc.image(logoPath, pageWidth / 2 - 40, 40, { width: 80 });
    }

    let y = 130;

    // ── School Header ─────────────────────────────────────────
    doc.font('Helvetica-Bold').fontSize(16).fillColor('#1a1a1a')
      .text('GREAT KHILAFAT COLLEGE', margin, y, { align: 'center', width: contentWidth });
    y += 22;

    doc.font('Helvetica').fontSize(10).fillColor('#cc0000')
      .text('FORMERLY MUSLIM CHILDREN PRIVATE SCHOOL (MCPS)', margin, y, { align: 'center', width: contentWidth });
    y += 16;

    doc.fillColor('#333333').fontSize(10)
      .text('81B, Simpson Street, Yaba, Lagos', margin, y, { align: 'center', width: contentWidth });
    y += 14;

    doc.text('09068842565, 08023339691', margin, y, { align: 'center', width: contentWidth });
    y += 14;

    doc.text('greatkhilafatcollege@gmail.com', margin, y, { align: 'center', width: contentWidth });
    y += 20;

    // ── Divider ───────────────────────────────────────────────
    doc.moveTo(margin, y).lineTo(pageWidth - margin, y).strokeColor('#cccccc').lineWidth(1).stroke();
    y += 14;

    // ── Exam Title ────────────────────────────────────────────
    doc.font('Helvetica-Bold').fontSize(12).fillColor('#1a5276')
      .text('2025/2026 ENTRANCE EXAMINATION RESULTS', margin, y, { align: 'center', width: contentWidth, underline: true });
    y += 24;

    // ── Candidate Info Section ────────────────────────────────
    const sectionHeaderBg = '#1a5276';
    const rowHeight = 26;
    const labelWidth = 200;
    const valueWidth = contentWidth - labelWidth;

    // Section header
    doc.rect(margin, y, contentWidth, rowHeight).fill(sectionHeaderBg);
    doc.font('Helvetica-Bold').fontSize(11).fillColor('white')
      .text("CANDIDATE'S INFORMATION", margin, y + 7, { align: 'center', width: contentWidth });
    y += rowHeight;

    const infoRows = [
      ['NAME', student.fullName],
      ['DATE OF BIRTH (DD/MM/YYYY)', student.dateOfBirth ? new Date(student.dateOfBirth).toLocaleDateString('en-GB') : '—'],
      ['GENDER', student.gender],
      ['EXAMINATION NUMBER', student.studentId],
      ['CLASS SEEKING ADMISSION INTO', student.classSeekingAdmission || '—'],
    ];

    infoRows.forEach((row, i) => {
      const bg = i % 2 === 0 ? '#eaf2fb' : '#ffffff';
      doc.rect(margin, y, contentWidth, rowHeight).fill(bg);

      // Label
      doc.rect(margin, y, labelWidth, rowHeight).stroke('#cccccc');
      doc.font('Helvetica-Bold').fontSize(10).fillColor('#1a1a1a')
        .text(row[0], margin + 6, y + 8, { width: labelWidth - 10 });

      // Value
      doc.rect(margin + labelWidth, y, valueWidth, rowHeight).stroke('#cccccc');
      doc.font('Helvetica').fontSize(10).fillColor('#1a1a1a')
        .text(row[1], margin + labelWidth + 6, y + 8, { width: valueWidth - 10 });

      y += rowHeight;
    });

    y += 16;

    // ── Results Section ───────────────────────────────────────
    doc.rect(margin, y, contentWidth, rowHeight).fill(sectionHeaderBg);
    doc.font('Helvetica-Bold').fontSize(11).fillColor('white')
      .text('RESULTS', margin, y + 7, { align: 'center', width: contentWidth });
    y += rowHeight;

    // Table header
    const col1 = 35;   // S/N
    const col2 = 220;  // Subject
    const col3 = 90;   // Obtainable
    const col4 = 90;   // Marks Obtained
    const col5 = contentWidth - col1 - col2 - col3 - col4; // Percentage

    const tableHeaderY = y;
    doc.rect(margin, y, contentWidth, rowHeight * 2).fill('#bdd7ee');

    // S/N
    doc.rect(margin, y, col1, rowHeight * 2).stroke('#999999');
    doc.font('Helvetica-Bold').fontSize(9).fillColor('#1a1a1a')
      .text('S/N', margin + 2, y + 10, { width: col1 - 4, align: 'center' });

    // SUBJECTS
    doc.rect(margin + col1, y, col2, rowHeight * 2).stroke('#999999');
    doc.text('SUBJECTS', margin + col1 + 4, y + 10, { width: col2 - 8, align: 'center' });

    // OBTAINABLE MARKS
    doc.rect(margin + col1 + col2, y, col3, rowHeight).stroke('#999999');
    doc.text('OBTAINABLE', margin + col1 + col2 + 2, y + 2, { width: col3 - 4, align: 'center' });
    doc.text('MARKS', margin + col1 + col2 + 2, y + 12, { width: col3 - 4, align: 'center' });

    // MARKS OBTAINED
    doc.rect(margin + col1 + col2 + col3, y, col4, rowHeight).stroke('#999999');
    doc.text('MARKS', margin + col1 + col2 + col3 + 2, y + 2, { width: col4 - 4, align: 'center' });
    doc.text('OBTAINED', margin + col1 + col2 + col3 + 2, y + 12, { width: col4 - 4, align: 'center' });

    // PERCENTAGE
    doc.rect(margin + col1 + col2 + col3 + col4, y, col5, rowHeight).stroke('#999999');
    doc.text('PERCENTAGE', margin + col1 + col2 + col3 + col4 + 2, y + 2, { width: col5 - 4, align: 'center' });
    doc.text('(%)', margin + col1 + col2 + col3 + col4 + 2, y + 12, { width: col5 - 4, align: 'center' });

    y += rowHeight;

    // Second header row borders
    doc.rect(margin + col1 + col2, y, col3, rowHeight).stroke('#999999');
    doc.rect(margin + col1 + col2 + col3, y, col4, rowHeight).stroke('#999999');
    doc.rect(margin + col1 + col2 + col3 + col4, y, col5, rowHeight).stroke('#999999');
    y += rowHeight;

    // Subject rows
    result.subjectResults.forEach((sr, idx) => {
      const bg = idx % 2 === 0 ? '#ffffff' : '#f5f5f5';
      doc.rect(margin, y, contentWidth, rowHeight).fill(bg);

      doc.rect(margin, y, col1, rowHeight).stroke('#cccccc');
      doc.font('Helvetica').fontSize(10).fillColor('#1a1a1a')
        .text(String(idx + 1), margin + 2, y + 8, { width: col1 - 4, align: 'center' });

      doc.rect(margin + col1, y, col2, rowHeight).stroke('#cccccc');
      doc.text(sr.subjectName.toUpperCase(), margin + col1 + 6, y + 8, { width: col2 - 10 });

      doc.rect(margin + col1 + col2, y, col3, rowHeight).stroke('#cccccc');
      doc.text(String(sr.obtainableMarks), margin + col1 + col2 + 2, y + 8, { width: col3 - 4, align: 'center' });

      doc.rect(margin + col1 + col2 + col3, y, col4, rowHeight).stroke('#cccccc');
      doc.text(String(sr.marksObtained), margin + col1 + col2 + col3 + 2, y + 8, { width: col4 - 4, align: 'center' });

      doc.rect(margin + col1 + col2 + col3 + col4, y, col5, rowHeight).stroke('#cccccc');
      doc.text(`${sr.percentage}%`, margin + col1 + col2 + col3 + col4 + 2, y + 8, { width: col5 - 4, align: 'center' });

      y += rowHeight;
    });

    // Total row
    doc.rect(margin, y, contentWidth, rowHeight).fill('#dce6f1');
    doc.rect(margin, y, col1 + col2, rowHeight).stroke('#999999');
    doc.font('Helvetica-Bold').fontSize(10).fillColor('#1a1a1a')
      .text('TOTAL', margin + 4, y + 8, { width: col1 + col2 - 8, align: 'center' });

    doc.rect(margin + col1 + col2, y, col3, rowHeight).stroke('#999999');
    doc.text(String(result.totalObtainable), margin + col1 + col2 + 2, y + 8, { width: col3 - 4, align: 'center' });

    doc.rect(margin + col1 + col2 + col3, y, col4, rowHeight).stroke('#999999');
    doc.text(String(result.totalMarksObtained), margin + col1 + col2 + col3 + 2, y + 8, { width: col4 - 4, align: 'center' });

    doc.rect(margin + col1 + col2 + col3 + col4, y, col5, rowHeight).stroke('#999999');
    doc.text(`${result.totalPercentage}%`, margin + col1 + col2 + col3 + col4 + 2, y + 8, { width: col5 - 4, align: 'center' });

    y += rowHeight + 16;

    // Status row
    doc.rect(margin, y, contentWidth, rowHeight + 4).fill(result.status === 'ADMITTED' ? '#e8f5e9' : '#fdecea');
    doc.rect(margin, y, col1 + col2, rowHeight + 4).stroke('#999999');
    doc.font('Helvetica-Bold').fontSize(11).fillColor('#1a1a1a')
      .text('STATUS', margin + 4, y + 9, { width: col1 + col2 - 8, align: 'center' });

    doc.rect(margin + col1 + col2, y, contentWidth - col1 - col2, rowHeight + 4).stroke('#999999');
    const statusColor = result.status === 'ADMITTED' ? '#006400' : '#cc0000';
    doc.font('Helvetica-Bold').fontSize(13).fillColor(statusColor)
      .text(result.status, margin + col1 + col2 + 4, y + 8, { width: contentWidth - col1 - col2 - 8, align: 'center' });

    y += rowHeight + 24;

    // ── Footer ────────────────────────────────────────────────
    doc.moveTo(margin, y).lineTo(pageWidth - margin, y).strokeColor('#cccccc').lineWidth(1).stroke();
    y += 10;
    doc.font('Helvetica').fontSize(8).fillColor('#888888')
      .text(`Generated on ${new Date().toLocaleDateString('en-GB')} | Great Khilafat College CBT System`, margin, y, { align: 'center', width: contentWidth });

    doc.end();
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Export all results to Excel
const exportAllResults = async (req, res) => {
  try {
    const results = await Result.find({ status: { $ne: 'PENDING' } })
      .populate('student', 'studentId fullName gender dateOfBirth classSeekingAdmission');

    if (!results.length) return res.status(404).json({ message: 'No results to export' });

    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet('All Results');

    const headerFont = { name: 'Times New Roman', bold: true, size: 11 };
    const bodyFont = { name: 'Times New Roman', size: 10 };
    const centerAlign = { horizontal: 'center', vertical: 'middle' };
    const thinBorder = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };

    const subjects = results[0].subjectResults.map((s) => s.subjectName);

    ws.columns = [
      { header: 'S/N', key: 'sn', width: 5 },
      { header: 'EXAM NUMBER', key: 'examNo', width: 18 },
      { header: 'FULL NAME', key: 'name', width: 28 },
      { header: 'GENDER', key: 'gender', width: 8 },
      ...subjects.map((s) => ({ header: s.toUpperCase(), key: s, width: 14 })),
      { header: 'TOTAL', key: 'total', width: 10 },
      { header: 'PERCENTAGE', key: 'pct', width: 12 },
      { header: 'STATUS', key: 'status', width: 10 },
    ];

    ws.getRow(1).font = headerFont;
    ws.getRow(1).alignment = centerAlign;
    ws.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFBDD7EE' } };

    results.forEach((r, idx) => {
      const row = {
        sn: idx + 1,
        examNo: r.student.studentId,
        name: r.student.fullName,
        gender: r.student.gender,
        total: r.totalMarksObtained,
        pct: `${r.totalPercentage}%`,
        status: r.status,
      };
      r.subjectResults.forEach((sr) => { row[sr.subjectName] = sr.marksObtained; });

      const wsRow = ws.addRow(row);
      wsRow.font = bodyFont;
      wsRow.eachCell((cell) => {
        cell.border = thinBorder;
        cell.alignment = centerAlign;
      });
      wsRow.getCell('name').alignment = { horizontal: 'left', vertical: 'middle' };
    });

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename=GKC_All_Results.xlsx');
    await wb.xlsx.write(res);
    res.end();
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

module.exports = { getAllResults, getStudentResult, updateResultStatus, getAnalytics, exportSingleResult, exportAllResults };