"use client";

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { fontVariables } from "@/lib/fonts";
import { 
  UserPlus, 
  Mail, 
  Hash, 
  School, 
  BookOpen, 
  Calendar, 
  User, 
  Loader2,
  CheckCircle,
  AlertCircle 
} from 'lucide-react';

export default function AddStudentPage() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    studentId: '',
    name: '',
    email: '',
    rollNumber: '',
    universityName: 'Metropolitan State University',
    branch: '',
    enrollmentYear: new Date().getFullYear(),
    expectedGraduation: new Date().getFullYear() + 4,
    yearOfStudy: 1,
    age: 18
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [focusedField, setFocusedField] = useState<string | null>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    if (error) setError('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/students', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || 'Failed to create student');
      }

      router.push('/admin');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8"
      >
        <h1 className="text-3xl font-bold bg-gradient-to-r from-gray-900 via-gray-700 to-gray-500 bg-clip-text text-transparent mb-2" style={{ fontFamily: "var(--font-vonique), sans-serif" }}>
          Register New Student
        </h1>
        <p className="text-gray-500">Enter the student's details to add them to the university database.</p>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="bg-white/80 backdrop-blur-xl rounded-2xl p-8 border border-gray-200 shadow-xl shadow-gray-200/40"
      >
        {error && (
          <motion.div 
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            className="bg-red-50 border border-red-200 text-red-600 p-4 rounded-xl mb-6 flex items-center gap-3"
          >
            <AlertCircle size={20} />
            <p>{error}</p>
          </motion.div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <InputField 
              label="Student ID" 
              name="studentId" 
              value={formData.studentId} 
              onChange={handleChange} 
              placeholder="e.g. STU2024001" 
              icon={<Hash size={18} />}
              focusedField={focusedField}
              setFocusedField={setFocusedField}
            />
            
            <InputField 
              label="Roll Number" 
              name="rollNumber" 
              value={formData.rollNumber} 
              onChange={handleChange} 
              placeholder="e.g. CS-24-001" 
              icon={<Hash size={18} />}
              focusedField={focusedField}
              setFocusedField={setFocusedField}
            />
            
            <InputField 
              label="Full Name" 
              name="name" 
              value={formData.name} 
              onChange={handleChange} 
              placeholder="John Doe" 
              icon={<User size={18} />}
              focusedField={focusedField}
              setFocusedField={setFocusedField}
            />
            
            <InputField 
              label="Email Address" 
              name="email" 
              type="email"
              value={formData.email} 
              onChange={handleChange} 
              placeholder="john.doe@university.edu" 
              icon={<Mail size={18} />}
              focusedField={focusedField}
              setFocusedField={setFocusedField}
            />
            
            <InputField 
              label="University Name" 
              name="universityName" 
              value={formData.universityName} 
              onChange={handleChange} 
              placeholder="University Name" 
              icon={<School size={18} />}
              focusedField={focusedField}
              setFocusedField={setFocusedField}
            />
            
            <InputField 
              label="Branch / Department" 
              name="branch" 
              value={formData.branch} 
              onChange={handleChange} 
              placeholder="e.g. Computer Science" 
              icon={<BookOpen size={18} />}
              focusedField={focusedField}
              setFocusedField={setFocusedField}
            />
            
            <div className="grid grid-cols-2 gap-4">
              <InputField 
                label="Enrollment Year" 
                name="enrollmentYear" 
                type="number"
                value={formData.enrollmentYear.toString()} 
                onChange={handleChange} 
                placeholder="2024" 
                icon={<Calendar size={18} />}
                focusedField={focusedField}
                setFocusedField={setFocusedField}
              />
              
              <InputField 
                label="Graduation Year" 
                name="expectedGraduation" 
                type="number"
                value={formData.expectedGraduation.toString()} 
                onChange={handleChange} 
                placeholder="2028" 
                icon={<Calendar size={18} />}
                focusedField={focusedField}
                setFocusedField={setFocusedField}
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
               <InputField 
                label="Year of Study" 
                name="yearOfStudy" 
                type="number"
                value={formData.yearOfStudy.toString()} 
                onChange={handleChange} 
                placeholder="1" 
                icon={<BookOpen size={18} />}
                focusedField={focusedField}
                setFocusedField={setFocusedField}
              />
              
              <InputField 
                label="Age" 
                name="age" 
                type="number"
                value={formData.age.toString()} 
                onChange={handleChange} 
                placeholder="18" 
                icon={<User size={18} />}
                focusedField={focusedField}
                setFocusedField={setFocusedField}
              />
            </div>
          </div>

          <div className="pt-4 flex justify-end">
            <motion.button
              type="submit"
              disabled={loading}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="bg-gray-900 text-white py-3 px-8 rounded-xl font-medium shadow-lg shadow-gray-200 flex items-center gap-2 hover:bg-black transition-colors disabled:opacity-70 disabled:cursor-not-allowed"
            >
              {loading ? (
                <>
                  <Loader2 size={18} className="animate-spin" />
                  Creating Student...
                </>
              ) : (
                <>
                  <UserPlus size={18} />
                  Create Student Account
                </>
              )}
            </motion.button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}

function InputField({ label, name, type = "text", value, onChange, placeholder, icon, focusedField, setFocusedField }: any) {
  const isFocused = focusedField === name;
  
  return (
    <div>
      <label className="block text-sm font-medium text-gray-500 mb-1.5 ml-1">{label}</label>
      <div className={`relative group transition-all duration-300 ${isFocused ? 'transform scale-[1.01]' : ''}`}>
        <div className={`absolute inset-0 bg-gradient-to-r from-gray-200 to-gray-300 rounded-xl blur opacity-20 group-hover:opacity-40 transition-opacity ${isFocused ? 'opacity-50' : ''}`} />
        
        <div className="relative flex items-center bg-white/50 rounded-xl border border-gray-200 transition-colors focus-within:bg-white focus-within:border-gray-400">
          <div className={`pl-4 text-gray-400 transition-colors ${isFocused ? 'text-gray-800' : ''}`}>
            {icon}
          </div>
          <input
            type={type}
            name={name}
            value={value}
            onChange={onChange}
            onFocus={() => setFocusedField(name)}
            onBlur={() => setFocusedField(null)}
            className="w-full p-3.5 bg-transparent border-none outline-none text-gray-800 placeholder-gray-400 rounded-xl"
            required
            placeholder={placeholder}
          />
        </div>
      </div>
    </div>
  );
}
