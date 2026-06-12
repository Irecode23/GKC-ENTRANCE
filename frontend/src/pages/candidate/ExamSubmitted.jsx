import React from 'react';

export default function ExamSubmitted() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-brand-dark to-brand-green flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-8 text-center">
        <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-green-100 flex items-center justify-center">
          <svg className="w-10 h-10 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h1 className="text-2xl font-bold text-gray-800 mb-3">Examination Submitted</h1>
        <p className="text-gray-600 leading-relaxed">
          Your examination has been submitted successfully. Thank you for participating in the entrance examination.
        </p>
        <div className="mt-6 p-4 bg-brand-light rounded-xl text-sm text-brand-green font-medium">
         Results will be out soon.
        </div>
      </div>
    </div>
  );
}