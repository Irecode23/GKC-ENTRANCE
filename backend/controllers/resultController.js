const Result = require('../models/Result');
const Student = require('../models/Student');
const ExcelJS = require('exceljs');

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

// Update result status (ADMITTED / RESIT)
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

// Export a single student result to Excel matching the GKC template exactly
const exportSingleResult = async (req, res) => {
  try {
    const result = await Result.findOne({ student: req.params.studentId })
      .populate('student', 'studentId fullName gender dateOfBirth classSeekingAdmission');

    if (!result) return res.status(404).json({ message: 'Result not found' });

    const student = result.student;
    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet('Result');

    // ── Styles ────────────────────────────────────────────────────
    const headerFont = { name: 'Times New Roman', bold: true, size: 12 };
    const bodyFont = { name: 'Times New Roman', size: 11 };
    const centerAlign = { horizontal: 'center', vertical: 'middle' };
    const leftAlign = { horizontal: 'left', vertical: 'middle' };
    const thinBorder = {
      top: { style: 'thin' }, left: { style: 'thin' },
      bottom: { style: 'thin' }, right: { style: 'thin' },
    };

    ws.columns = [
      { width: 6 }, { width: 32 }, { width: 5 }, { width: 5 }, { width: 5 }, { width: 16 }
    ];

    // Row 1: School name
    ws.mergeCells('A1:F1');
    ws.getCell('A1').value = 'GREAT KHILAFAT COLLEGE';
    ws.getCell('A1').font = { name: 'Times New Roman', bold: true, size: 14 };
    ws.getCell('A1').alignment = centerAlign;

    // Row 2: Formerly
    ws.mergeCells('A2:F2');
    ws.getCell('A2').value = 'FORMERLY MUSLIM CHILDREN PRIVATE SCHOOL (MCPS)';
    ws.getCell('A2').font = { name: 'Times New Roman', size: 11 };
    ws.getCell('A2').alignment = centerAlign;

    // Row 3: Address
    ws.mergeCells('A3:F3');
    ws.getCell('A3').value = '81B, SIMPSON STREET,  YABA, LAGOS';
    ws.getCell('A3').font = bodyFont;
    ws.getCell('A3').alignment = centerAlign;

    // Row 4: Phone
    ws.mergeCells('A4:F4');
    ws.getCell('A4').value = '09068842565, 08023339691';
    ws.getCell('A4').font = bodyFont;
    ws.getCell('A4').alignment = centerAlign;

    // Row 5: Email
    ws.mergeCells('A5:F5');
    ws.getCell('A5').value = 'greatkhilafatcollege@gmail.com';
    ws.getCell('A5').font = bodyFont;
    ws.getCell('A5').alignment = centerAlign;

    // Row 6: blank
    ws.getRow(6).height = 6;

    // Row 7: Title
    ws.mergeCells('A7:F7');
    ws.getCell('A7').value = '2025/2026 ENTRANCE EXAMINATION RESULTS';
    ws.getCell('A7').font = { name: 'Times New Roman', bold: true, size: 12, underline: true };
    ws.getCell('A7').alignment = centerAlign;

    // Row 8: Candidate Info heading
    ws.mergeCells('A8:F8');
    ws.getCell('A8').value = "CANDIDATE'S INFORMATION";
    ws.getCell('A8').font = headerFont;
    ws.getCell('A8').alignment = centerAlign;
    ws.getCell('A8').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD9D9D9' } };

    // Candidate info rows
    const infoRows = [
      ['NAME', student.fullName],
      ['DATE OF BIRTH (DD/MM/YYYY)', student.dateOfBirth
        ? new Date(student.dateOfBirth).toLocaleDateString('en-GB') : ''],
      ['GENDER', student.gender],
      ['EXAMINATION NUMBER', student.studentId],
      ['CLASS SEEKING ADMISSION INTO', student.classSeekingAdmission || ''],
    ];

    let rowIndex = 9;
    for (const [label, value] of infoRows) {
      ws.mergeCells(`A${rowIndex}:B${rowIndex}`);
      ws.getCell(`A${rowIndex}`).value = label;
      ws.getCell(`A${rowIndex}`).font = headerFont;
      ws.getCell(`A${rowIndex}`).alignment = leftAlign;
      ws.getCell(`A${rowIndex}`).border = thinBorder;

      ws.mergeCells(`C${rowIndex}:F${rowIndex}`);
      ws.getCell(`C${rowIndex}`).value = value;
      ws.getCell(`C${rowIndex}`).font = bodyFont;
      ws.getCell(`C${rowIndex}`).alignment = leftAlign;
      ws.getCell(`C${rowIndex}`).border = thinBorder;

      ws.getRow(rowIndex).height = 20;
      rowIndex++;
    }

    rowIndex++; // blank row

    // Results section header
    ws.mergeCells(`A${rowIndex}:F${rowIndex}`);
    ws.getCell(`A${rowIndex}`).value = 'RESULTS';
    ws.getCell(`A${rowIndex}`).font = headerFont;
    ws.getCell(`A${rowIndex}`).alignment = centerAlign;
    ws.getCell(`A${rowIndex}`).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD9D9D9' } };
    rowIndex++;

    // Table header row 1
    const colHeaders1 = ['S/N', 'SUBJECTS', '', '', '', 'OBTAINABLE MARKS'];
    colHeaders1.forEach((h, i) => {
      const col = String.fromCharCode(65 + i);
      ws.getCell(`${col}${rowIndex}`).value = h;
      ws.getCell(`${col}${rowIndex}`).font = headerFont;
      ws.getCell(`${col}${rowIndex}`).alignment = centerAlign;
      ws.getCell(`${col}${rowIndex}`).border = thinBorder;
      ws.getCell(`${col}${rowIndex}`).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFBDD7EE' } };
    });
    rowIndex++;

    // Table header row 2: MARKS OBTAINED | PERCENTAGE
    const colHeaders2 = ['', '', '', '', '', 'MARKS OBTAINED'];
    ws.getCell(`F${rowIndex}`).value = 'MARKS OBTAINED';
    ws.getCell(`F${rowIndex}`).font = headerFont;
    ws.getCell(`F${rowIndex}`).alignment = centerAlign;
    ws.getCell(`F${rowIndex}`).border = thinBorder;
    ws.getCell(`F${rowIndex}`).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFBDD7EE' } };
    // Add percentage col — extend to G
    ws.getColumn(7).width = 16;
    ws.getCell(`G${rowIndex - 1}`).value = 'PERCENTAGE (%)';
    ws.getCell(`G${rowIndex - 1}`).font = headerFont;
    ws.getCell(`G${rowIndex - 1}`).alignment = centerAlign;
    ws.getCell(`G${rowIndex - 1}`).border = thinBorder;
    ws.getCell(`G${rowIndex - 1}`).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFBDD7EE' } };
    rowIndex++;

    // Subject result rows
    result.subjectResults.forEach((sr, idx) => {
      ws.getCell(`A${rowIndex}`).value = idx + 1;
      ws.getCell(`B${rowIndex}`).value = sr.subjectName.toUpperCase();
      ws.getCell(`F${rowIndex - 1}`).value = sr.obtainableMarks; // obtainable
      ws.getCell(`F${rowIndex}`).value = sr.marksObtained;
      ws.getCell(`G${rowIndex}`).value = `${sr.percentage}%`;

      ['A', 'B', 'F', 'G'].forEach((col) => {
        ws.getCell(`${col}${rowIndex}`).font = bodyFont;
        ws.getCell(`${col}${rowIndex}`).alignment = centerAlign;
        ws.getCell(`${col}${rowIndex}`).border = thinBorder;
      });
      ws.getCell(`B${rowIndex}`).alignment = leftAlign;
      ws.getRow(rowIndex).height = 22;
      rowIndex++;
    });

    // Total row
    ws.mergeCells(`A${rowIndex}:E${rowIndex}`);
    ws.getCell(`A${rowIndex}`).value = 'TOTAL (AVERAGE)';
    ws.getCell(`A${rowIndex}`).font = headerFont;
    ws.getCell(`A${rowIndex}`).alignment = centerAlign;
    ws.getCell(`A${rowIndex}`).border = thinBorder;
    ws.getCell(`F${rowIndex}`).value = result.totalObtainable;
    ws.getCell(`F${rowIndex + 1}`).value = result.totalMarksObtained;
    ws.getCell(`G${rowIndex}`).value = `${result.totalPercentage}%`;
    ['F', 'G'].forEach((col) => {
      ws.getCell(`${col}${rowIndex}`).font = headerFont;
      ws.getCell(`${col}${rowIndex}`).alignment = centerAlign;
      ws.getCell(`${col}${rowIndex}`).border = thinBorder;
    });
    ws.getRow(rowIndex).height = 22;
    rowIndex += 2;

    // Status row
    ws.mergeCells(`A${rowIndex}:E${rowIndex}`);
    ws.getCell(`A${rowIndex}`).value = 'STATUS';
    ws.getCell(`A${rowIndex}`).font = headerFont;
    ws.getCell(`A${rowIndex}`).alignment = centerAlign;
    ws.getCell(`A${rowIndex}`).border = thinBorder;
    ws.mergeCells(`F${rowIndex}:G${rowIndex}`);
    ws.getCell(`F${rowIndex}`).value = result.status;
    ws.getCell(`F${rowIndex}`).font = { ...headerFont, color: { argb: result.status === 'ADMITTED' ? 'FF006400' : 'FFCC0000' } };
    ws.getCell(`F${rowIndex}`).alignment = centerAlign;
    ws.getCell(`F${rowIndex}`).border = thinBorder;
    ws.getRow(rowIndex).height = 22;

    // Send file
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename=GKC_Result_${student.studentId.replace(/\//g, '_')}.xlsx`);

    await wb.xlsx.write(res);
    res.end();
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

    // Dynamic headers based on subjects in first result
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