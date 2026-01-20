"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { fontVariables } from "@/lib/fonts";
import { 
  BookOpen, 
  Hash, 
  MapPin, 
  Clock, 
  Calendar, 
  Layers, 
  FileText,
  Loader2,
  CheckCircle,
  AlertCircle
} from 'lucide-react';

export default function AddCoursePage() {
  const router = useRouter();
  const [rooms, setRooms] = useState<any[]>([]);
  const [formData, setFormData] = useState({
    courseId: '',
    name: '',
    category: 'Technology',
    difficulty: 'Intermediate',
    description: '',
    minGpaRecommended: 3.0,
    classroomNumber: '', // Legacy string
    roomId: '', // New relation
    // Basic schedule defaults
    days: [] as string[],
    startTime: '09:00',
    endTime: '10:30'
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [focusedField, setFocusedField] = useState<string | null>(null);

  useEffect(() => {
    // Fetch rooms for dropdown
    fetch('/api/rooms')
        .then(res => res.json())
        .then(data => setRooms(data))
        .catch(err => console.error(err));
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    if (error) setError('');
  };

  const handleDayChange = (day: string) => {
      const currentDays = formData.days;
      if (currentDays.includes(day)) {
          setFormData({ ...formData, days: currentDays.filter(d => d !== day) });
      } else {
          setFormData({ ...formData, days: [...currentDays, day] });
      }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
        const schedule = {
            weekdays: formData.days,
            timings: {
                start: formData.startTime,
                end: formData.endTime
            }
        };

      const res = await fetch('/api/courses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            ...formData,
            schedule,
            // For now passing classroomNumber as the room name if roomId is selected
            classroomNumber: formData.roomId ? rooms.find(r => r.id === formData.roomId)?.name : formData.classroomNumber
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || 'Failed to create course');
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
          Create New Course
        </h1>
        <p className="text-gray-500">Add a new course to the curriculum and assign resources.</p>
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
              label="Course ID" 
              name="courseId" 
              value={formData.courseId} 
              onChange={handleChange} 
              placeholder="e.g. CS101" 
              icon={<Hash size={18} />}
              focusedField={focusedField}
              setFocusedField={setFocusedField}
            />
            
            <SelectField 
              label="Category" 
              name="category" 
              value={formData.category} 
              onChange={handleChange} 
              icon={<Layers size={18} />}
              options={[
                { value: 'Technology', label: 'Technology' },
                { value: 'Science', label: 'Science' },
                { value: 'Arts', label: 'Arts' },
                { value: 'Business', label: 'Business' }
              ]}
              focusedField={focusedField}
              setFocusedField={setFocusedField}
            />
          </div>

          <InputField 
            label="Course Name" 
            name="name" 
            value={formData.name} 
            onChange={handleChange} 
            placeholder="Introduction to Computer Science" 
            icon={<BookOpen size={18} />}
            focusedField={focusedField}
            setFocusedField={setFocusedField}
          />

          <div>
             <label className="block text-sm font-medium text-gray-500 mb-1.5 ml-1">Description</label>
             <div className={`relative group transition-all duration-300 ${focusedField === 'description' ? 'transform scale-[1.01]' : ''}`}>
                <div className={`absolute inset-0 bg-gradient-to-r from-gray-200 to-gray-300 rounded-xl blur opacity-20 group-hover:opacity-40 transition-opacity ${focusedField === 'description' ? 'opacity-50' : ''}`} />
                <div className="relative flex bg-white/50 rounded-xl border border-gray-200 transition-colors focus-within:bg-white focus-within:border-gray-400">
                   <div className={`pl-4 pt-4 text-gray-400 transition-colors ${focusedField === 'description' ? 'text-gray-800' : ''}`}>
                      <FileText size={18} />
                   </div>
                   <textarea
                     name="description"
                     value={formData.description}
                     onChange={handleChange}
                     onFocus={() => setFocusedField('description')}
                     onBlur={() => setFocusedField(null)}
                     className="w-full p-3.5 bg-transparent border-none outline-none text-gray-800 placeholder-gray-400 rounded-xl min-h-[100px] resize-y"
                     required
                     placeholder="Brief overview of the course curriculum..."
                   />
                </div>
             </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <SelectField 
              label="Assigned Room" 
              name="roomId" 
              value={formData.roomId} 
              onChange={handleChange} 
              icon={<MapPin size={18} />}
              options={[
                { value: '', label: 'Select a Room' },
                ...rooms.map(room => ({ value: room.id, label: `${room.name} (${room.capacity} seats)` }))
              ]}
              focusedField={focusedField}
              setFocusedField={setFocusedField}
            />
          </div>

          <div className="bg-gray-50/50 rounded-xl p-6 border border-gray-100">
             <label className="block text-sm font-medium text-gray-500 mb-4 flex items-center gap-2">
                <Calendar size={18} />
                Weekly Schedule
             </label>
             
             <div className="space-y-4">
                <div className="flex flex-wrap gap-2">
                    {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'].map(day => (
                        <button
                            key={day}
                            type="button"
                            onClick={() => handleDayChange(day)}
                            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 border ${
                                formData.days.includes(day) 
                                ? 'bg-gray-900 text-white border-gray-900 shadow-lg shadow-gray-200' 
                                : 'bg-white text-gray-500 border-gray-200 hover:bg-gray-100'
                            }`}
                        >
                            {day.substring(0, 3)}
                        </button>
                    ))}
                </div>
                
                <div className="flex items-center gap-4 pt-2">
                    <div className="relative flex-1">
                        <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                            <Clock size={16} />
                        </div>
                        <input 
                            type="time" 
                            name="startTime" 
                            value={formData.startTime} 
                            onChange={handleChange} 
                            className="w-full pl-10 pr-4 py-2 bg-white border border-gray-200 rounded-lg text-sm text-gray-800 focus:outline-none focus:border-gray-400" 
                        />
                    </div>
                    <span className="text-gray-400 text-sm">to</span>
                    <div className="relative flex-1">
                        <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                            <Clock size={16} />
                        </div>
                        <input 
                            type="time" 
                            name="endTime" 
                            value={formData.endTime} 
                            onChange={handleChange} 
                            className="w-full pl-10 pr-4 py-2 bg-white border border-gray-200 rounded-lg text-sm text-gray-800 focus:outline-none focus:border-gray-400" 
                        />
                    </div>
                </div>
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
                  Creating Course...
                </>
              ) : (
                <>
                  <BookOpen size={18} />
                  Create Course
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

function SelectField({ label, name, value, onChange, icon, options, focusedField, setFocusedField }: any) {
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
            <select
              name={name}
              value={value}
              onChange={onChange}
              onFocus={() => setFocusedField(name)}
              onBlur={() => setFocusedField(null)}
              className="w-full p-3.5 bg-transparent border-none outline-none text-gray-800 rounded-xl appearance-none cursor-pointer"
            >
                {options.map((opt: any) => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
            </select>
            {/* Custom arrow could be added here */}
          </div>
        </div>
      </div>
    );
  }
