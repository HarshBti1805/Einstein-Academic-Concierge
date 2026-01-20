"use client";

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { fontVariables } from "@/lib/fonts";
import { 
  UploadCloud, 
  FileJson, 
  AlertCircle, 
  CheckCircle, 
  Trash2,
  Loader2,
  Copy
} from 'lucide-react';

export default function BulkUploadPage() {
  const [jsonInput, setJsonInput] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');

  const handleUpload = async () => {
    setStatus('loading');
    setMessage('');

    try {
      let data;
      try {
        data = JSON.parse(jsonInput);
      } catch (e) {
        throw new Error("Invalid JSON format. Please check your syntax.");
      }

      if (!Array.isArray(data)) {
        throw new Error("Input must be an array of student objects.");
      }

      const res = await fetch('/api/students/bulk', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: jsonInput,
      });

      const result = await res.json();

      if (!res.ok) {
        throw new Error(result.message || "Upload failed");
      }

      setStatus('success');
      setMessage(`Successfully processed ${result.count} students.`);
      setJsonInput('');
    } catch (err: any) {
      setStatus('error');
      setMessage(err.message);
    }
  };

  const copyExample = () => {
    const example = `[
  {
    "studentId": "STU101",
    "name": "Jane Doe",
    "email": "jane@example.com",
    "rollNumber": "R101",
    "universityName": "Einstein University",
    "branch": "CS",
    "yearOfStudy": 1
  }
]`;
    setJsonInput(example);
  };

  return (
    <div className="max-w-5xl mx-auto">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8"
      >
        <h1 className="text-3xl font-bold bg-gradient-to-r from-gray-900 via-gray-700 to-gray-500 bg-clip-text text-transparent mb-2" style={{ fontFamily: "var(--font-vonique), sans-serif" }}>
          Bulk Student Upload
        </h1>
        <p className="text-gray-500">Upload multiple student records at once using JSON format.</p>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.1 }}
          className="lg:col-span-2"
        >
          <div className="bg-white/80 backdrop-blur-xl border border-gray-200 rounded-2xl p-6 shadow-xl shadow-gray-200/40 flex flex-col h-[600px]">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2 text-gray-700 font-medium">
                <FileJson size={20} className="text-indigo-600" />
                <span>JSON Editor</span>
              </div>
              <button 
                onClick={copyExample}
                className="text-xs flex items-center gap-1.5 text-indigo-600 hover:text-indigo-700 font-medium transition-colors bg-indigo-50 px-3 py-1.5 rounded-lg"
              >
                <Copy size={14} />
                Load Example
              </button>
            </div>
            
            <textarea
              value={jsonInput}
              onChange={(e) => setJsonInput(e.target.value)}
              placeholder="// Paste your student data array here..."
              className="flex-1 w-full bg-slate-50 border border-gray-200 rounded-xl p-4 font-mono text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all resize-none"
              spellCheck={false}
            />
            
            <div className="mt-4 flex justify-between items-center">
              <button
                onClick={() => setJsonInput('')}
                className="text-gray-400 hover:text-gray-600 transition-colors p-2"
                title="Clear input"
              >
                <Trash2 size={18} />
              </button>
              
              <motion.button
                onClick={handleUpload}
                disabled={status === 'loading' || !jsonInput.trim()}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="bg-gray-900 text-white px-6 py-2.5 rounded-xl font-medium shadow-lg shadow-gray-200 flex items-center gap-2 hover:bg-black transition-colors disabled:opacity-70 disabled:cursor-not-allowed"
              >
                {status === 'loading' ? (
                  <>
                    <Loader2 size={18} className="animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    <UploadCloud size={18} />
                    Upload Data
                  </>
                )}
              </motion.button>
            </div>
          </div>
        </motion.div>

        <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
            className="space-y-6"
        >
            <div className="bg-white/60 backdrop-blur-xl border border-gray-200 rounded-2xl p-6">
                <h3 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
                    <AlertCircle size={18} className="text-gray-400" />
                    Instructions
                </h3>
                <ul className="space-y-3 text-sm text-gray-500">
                    <li className="flex gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-gray-400 mt-1.5 shrink-0" />
                        Ensure your JSON is a valid array of objects.
                    </li>
                    <li className="flex gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-gray-400 mt-1.5 shrink-0" />
                        Required fields: studentId, name, email, rollNumber.
                    </li>
                    <li className="flex gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-gray-400 mt-1.5 shrink-0" />
                        Duplicates will be automatically skipped.
                    </li>
                </ul>
            </div>

            <AnimatePresence mode="wait">
                {message && (
                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 10 }}
                        className={`p-6 rounded-2xl border ${
                            status === 'success' 
                                ? 'bg-emerald-50 border-emerald-100' 
                                : 'bg-red-50 border-red-100'
                        }`}
                    >
                        <div className="flex items-center gap-3 mb-2">
                            {status === 'success' ? (
                                <CheckCircle className="text-emerald-600" size={24} />
                            ) : (
                                <AlertCircle className="text-red-600" size={24} />
                            )}
                            <h4 className={`font-semibold ${
                                status === 'success' ? 'text-emerald-900' : 'text-red-900'
                            }`}>
                                {status === 'success' ? 'Upload Complete' : 'Upload Failed'}
                            </h4>
                        </div>
                        <p className={`text-sm ${
                            status === 'success' ? 'text-emerald-700' : 'text-red-700'
                        }`}>
                            {message}
                        </p>
                    </motion.div>
                )}
            </AnimatePresence>
        </motion.div>
      </div>
    </div>
  );
}
