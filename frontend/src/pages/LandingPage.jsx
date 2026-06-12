import React from 'react';
import { Link } from 'react-router-dom';

export default function LandingPage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6"
      style={{ background: 'linear-gradient(135deg, #1a4a6b, #1e6b8a, #2980b9)' }}>

      {/* Logo */}
      <div className="w-24 h-24 rounded-full flex items-center justify-center mb-6 shadow-2xl"
        style={{ background: 'linear-gradient(135deg, #f6d365, #fda085)' }}>
        <span className="text-3xl font-extrabold text-white">GKC</span>
      </div>

      {/* School name */}
      <h1 className="text-4xl font-extrabold text-white text-center mb-2">
        Great Khilafat College
      </h1>
      <p className="text-blue-100 text-sm mb-1">Formerly Muslim Children Private School (MCPS)</p>
      <p className="text-blue-200 text-xs mb-10">81B, Simpson Street, Yaba, Lagos</p>

      {/* Card */}
      <div className="w-full max-w-md rounded-3xl shadow-2xl overflow-hidden"
        style={{ backgroundColor: 'rgba(255,255,255,0.12)', backdropFilter: 'blur(12px)', border: '1px solid rgba(255,255,255,0.2)' }}>

        <div className="px-8 pt-8 pb-4 text-center">
          <div className="inline-block px-4 py-1 rounded-full text-xs font-semibold mb-3"
            style={{ backgroundColor: 'rgba(255,255,255,0.15)', color: '#e0f0ff' }}>
            ENTRANCE EXAMINATION PORTAL
          </div>
          <h2 className="text-2xl font-bold text-white mb-1">2025/2026</h2>
          <p className="text-blue-100 text-sm">Computer Based Test (CBT) System</p>
        </div>

        <div className="mx-8 h-px" style={{ backgroundColor: 'rgba(255,255,255,0.15)' }}></div>

        <div className="px-8 py-6">
          <Link
            to="/login"
            className="block w-full py-4 text-center rounded-2xl text-base font-bold transition-all transform hover:scale-105 shadow-lg"
            style={{ background: 'linear-gradient(135deg, #f6d365, #fda085)', color: '#1a3a4a' }}
          >
            Candidate Login →
          </Link>

          <div className="mt-5 space-y-2">
            <div className="flex items-center gap-2 text-xs text-blue-100">
              <span>✓</span> Ensure you have your Student ID before proceeding
            </div>
            <div className="flex items-center gap-2 text-xs text-blue-100">
              <span>✓</span> Contact the examination office if not yet registered
            </div>
            <div className="flex items-center gap-2 text-xs text-blue-100">
              <span>✓</span> Use a stable internet connection during the examination
            </div>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="mt-10 flex gap-8 text-center">
        <div>
          <p className="text-2xl font-bold text-white">3</p>
          <p className="text-blue-200 text-xs">Subjects</p>
        </div>
        <div className="w-px bg-white opacity-20"></div>
        <div>
          <p className="text-2xl font-bold text-white">2 Hrs</p>
          <p className="text-blue-200 text-xs">Duration</p>
        </div>
        <div className="w-px bg-white opacity-20"></div>
        <div>
          <p className="text-2xl font-bold text-white">150</p>
          <p className="text-blue-200 text-xs">Total Marks</p>
        </div>
      </div>

      {/* Footer */}
      <p className="mt-10 text-blue-200 text-xs">
        © 2025/2026 Great Khilafat College — CBT Examination Portal
      </p>
    </div>
  );
}