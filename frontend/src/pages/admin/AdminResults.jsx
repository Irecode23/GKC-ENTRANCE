import React, { useState, useEffect } from 'react';
import AdminLayout from '../../components/admin/AdminLayout';
import api from '../../utils/api';

export default function AdminResults() {
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [exporting, setExporting] = useState(null);
  const [success, setSuccess] = useState('');

  const fetchResults = () => {
    api.get('/results')
      .then(({ data }) => setResults(data))
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchResults(); }, []);

  const handleStatusChange = async (studentId, status) => {
    try {
      await api.put(`/results/${studentId}/status`, { status });
      setSuccess(`Status updated to ${status}.`);
      fetchResults();
    } catch (err) {
      alert(err.response?.data?.message || 'Update failed');
    }
  };

  const handleExportSingle = async (studentId, examNo) => {
    setExporting(studentId);
    try {
      const response = await api.get(`/results/${studentId}/export`, { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([response.data], { type: 'application/pdf' }));
      const a = document.createElement('a');
      a.href = url;
      a.download = `GKC_Result_${examNo.replace(/\//g, '_')}.pdf`;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      alert('Export failed. Result may not exist yet.');
    } finally {
      setExporting(null);
    }
  };

  const handleExportAll = async () => {
    setExporting('all');
    try {
      const response = await api.get('/results/export-all', { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const a = document.createElement('a');
      a.href = url;
      a.download = 'GKC_All_Results.xlsx';
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      alert('Export failed. No results may exist yet.');
    } finally {
      setExporting(null);
    }
  };

  const filtered = results.filter((r) => {
    const matchSearch =
      r.student?.fullName?.toLowerCase().includes(search.toLowerCase()) ||
      r.student?.studentId?.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === 'ALL' || r.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const admittedCount = results.filter((r) => r.status === 'ADMITTED').length;
  const resitCount = results.filter((r) => r.status === 'RESIT').length;

  // Get all unique subject names across all results
  const allSubjects = [];
  results.forEach((r) => {
    r.subjectResults?.forEach((sr) => {
      if (!allSubjects.includes(sr.subjectName)) {
        allSubjects.push(sr.subjectName);
      }
    });
  });

  return (
    <AdminLayout title="Results">
      {success && (
        <div className="mb-4 p-3 bg-green-50 border border-green-200 text-green-700 rounded-xl text-sm flex justify-between">
          {success}
          <button onClick={() => setSuccess('')}>✕</button>
        </div>
      )}

      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-2xl p-4 shadow-sm border-l-4 border-green-700 text-center">
          <p className="text-xs text-gray-400 mb-1">Total Results</p>
          <p className="text-2xl font-bold text-gray-800">{results.length}</p>
        </div>
        <div className="bg-white rounded-2xl p-4 shadow-sm border-l-4 border-green-400 text-center">
          <p className="text-xs text-gray-400 mb-1">Admitted</p>
          <p className="text-2xl font-bold text-green-700">{admittedCount}</p>
        </div>
        <div className="bg-white rounded-2xl p-4 shadow-sm border-l-4 border-red-400 text-center">
          <p className="text-xs text-gray-400 mb-1">Resit</p>
          <p className="text-2xl font-bold text-red-700">{resitCount}</p>
        </div>
      </div>

      {/* Filters + export all */}
      <div className="flex flex-wrap gap-3 mb-6">
        <input
          type="text"
          placeholder="Search by name or exam number..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1 min-w-48 px-4 py-2 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-green-700"
        />
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-4 py-2 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-green-700"
        >
          <option value="ALL">All Statuses</option>
          <option value="ADMITTED">Admitted</option>
          <option value="RESIT">Resit</option>
          <option value="PENDING">Pending</option>
        </select>
        <button
          onClick={handleExportAll}
          disabled={exporting === 'all' || !results.length}
          className="px-5 py-2 bg-yellow-500 text-white rounded-xl text-sm font-semibold hover:bg-yellow-600 disabled:opacity-60 transition-colors"
        >
          {exporting === 'all' ? 'Exporting...' : '⬇ Export All (Excel)'}
        </button>
      </div>

      {/* Results table */}
      <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
        <div className="p-4 border-b">
          <h3 className="font-semibold text-gray-700">
            Results — {filtered.length} record{filtered.length !== 1 ? 's' : ''}
          </h3>
        </div>
        {loading ? (
          <p className="p-6 text-gray-400">Loading results...</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-gray-500 text-xs uppercase">
                <tr>
                  <th className="px-4 py-3 text-left">Exam No</th>
                  <th className="px-4 py-3 text-left">Name</th>
                  <th className="px-4 py-3 text-center">Total</th>
                  <th className="px-4 py-3 text-center">Score %</th>
                  {allSubjects.map((subjectName) => (
                    <th key={subjectName} className="px-3 py-3 text-center whitespace-nowrap">
                      {subjectName}
                    </th>
                  ))}
                  <th className="px-4 py-3 text-center">Status</th>
                  <th className="px-4 py-3 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filtered.map((r) => (
                  <tr key={r._id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-mono text-xs text-green-700 font-semibold">
                      {r.student?.studentId}
                    </td>
                    <td className="px-4 py-3 font-medium text-gray-800">{r.student?.fullName}</td>
                    <td className="px-4 py-3 text-center font-semibold">
                      {r.totalMarksObtained}/{r.totalObtainable}
                    </td>
                    <td className="px-4 py-3 text-center font-semibold">
                      <span className={r.totalPercentage >= 50 ? 'text-green-600' : 'text-red-500'}>
                        {r.totalPercentage}%
                      </span>
                    </td>
                    {allSubjects.map((subjectName) => {
                      const sr = r.subjectResults?.find((s) => s.subjectName === subjectName);
                      return (
                        <td key={subjectName} className="px-3 py-3 text-center text-gray-600 text-xs">
                          {sr ? `${sr.marksObtained}/${sr.obtainableMarks}` : '—'}
                        </td>
                      );
                    })}
                    <td className="px-4 py-3 text-center">
                      <select
                        value={r.status}
                        onChange={(e) => handleStatusChange(r.student._id, e.target.value)}
                        className={`text-xs font-semibold rounded-lg px-2 py-1 border-0 focus:outline-none cursor-pointer ${
                          r.status === 'ADMITTED'
                            ? 'bg-green-100 text-green-700'
                            : r.status === 'RESIT'
                            ? 'bg-red-100 text-red-700'
                            : 'bg-gray-100 text-gray-600'
                        }`}
                      >
                        <option value="ADMITTED">ADMITTED</option>
                        <option value="RESIT">RESIT</option>
                        <option value="PENDING">PENDING</option>
                      </select>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <button
                        onClick={() => handleExportSingle(r.student._id, r.student.studentId)}
                        disabled={exporting === r.student._id}
                        className="px-3 py-1 bg-green-50 text-green-700 text-xs rounded-lg hover:bg-green-100 font-medium disabled:opacity-60"
                      >
                        {exporting === r.student._id ? '...' : '⬇ PDF'}
                      </button>
                    </td>
                  </tr>
                ))}
                {!filtered.length && (
                  <tr>
                    <td colSpan={10} className="px-4 py-12 text-center text-gray-400">
                      <p className="text-4xl mb-3">📋</p>
                      <p>No results yet. Results will appear here once candidates submit their examinations.</p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}