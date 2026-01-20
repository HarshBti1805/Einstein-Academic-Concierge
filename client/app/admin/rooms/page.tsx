"use client";

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { fontVariables } from "@/lib/fonts";
import { 
  Dimensions, 
  MapPin, 
  Users, 
  LayoutTemplate, 
  Wrench,
  Loader2,
  Plus,
  X,
  Building
} from 'lucide-react';

export default function AddRoomPage() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    name: '',
    capacity: 30,
    type: 'Lecture Hall',
    facilitiesString: ''
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
      const facilities = formData.facilitiesString.split(',').map(s => s.trim()).filter(Boolean);
      
      const res = await fetch('/api/rooms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            ...formData,
            facilities
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || 'Failed to create room');
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
          Add New Room
        </h1>
        <p className="text-gray-500">Register a new classroom, lab, or facility in the system.</p>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="bg-white/80 backdrop-blur-xl rounded-2xl p-8 border border-gray-200 shadow-xl shadow-gray-200/40"
      >
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <InputField 
              label="Room Name / Number" 
              name="name" 
              value={formData.name} 
              onChange={handleChange} 
              placeholder="e.g. Science Hall 101" 
              icon={<MapPin size={18} />}
              focusedField={focusedField}
              setFocusedField={setFocusedField}
            />
            
            <InputField 
              label="Seating Capacity" 
              name="capacity" 
              type="number"
              value={formData.capacity.toString()} 
              onChange={handleChange} 
              placeholder="30" 
              icon={<Users size={18} />}
              focusedField={focusedField}
              setFocusedField={setFocusedField}
            />
          </div>

          <SelectField 
            label="Room Type" 
            name="type" 
            value={formData.type} 
            onChange={handleChange} 
            icon={<LayoutTemplate size={18} />}
            options={[
              { value: 'Lecture Hall', label: 'Lecture Hall' },
              { value: 'Lab', label: 'Laboratory' },
              { value: 'Seminar Room', label: 'Seminar Room' },
              { value: 'Auditorium', label: 'Auditorium' },
              { value: 'Study Room', label: 'Study Room' }
            ]}
            focusedField={focusedField}
            setFocusedField={setFocusedField}
          />

          <div>
             <label className="block text-sm font-medium text-gray-500 mb-1.5 ml-1">Facilities</label>
             <div className={`relative group transition-all duration-300 ${focusedField === 'facilitiesString' ? 'transform scale-[1.01]' : ''}`}>
               <div className={`absolute inset-0 bg-gradient-to-r from-gray-200 to-gray-300 rounded-xl blur opacity-20 group-hover:opacity-40 transition-opacity ${focusedField === 'facilitiesString' ? 'opacity-50' : ''}`} />
               <div className="relative flex items-center bg-white/50 rounded-xl border border-gray-200 transition-colors focus-within:bg-white focus-within:border-gray-400">
                 <div className={`pl-4 text-gray-400 transition-colors ${focusedField === 'facilitiesString' ? 'text-gray-800' : ''}`}>
                   <Wrench size={18} />
                 </div>
                 <input
                   type="text"
                   name="facilitiesString"
                   value={formData.facilitiesString}
                   onChange={handleChange}
                   onFocus={() => setFocusedField('facilitiesString')}
                   onBlur={() => setFocusedField(null)}
                   className="w-full p-3.5 bg-transparent border-none outline-none text-gray-800 placeholder-gray-400 rounded-xl"
                   placeholder="e.g. Projector, Smart Board, AC, Computers"
                 />
               </div>
             </div>
             <p className="text-xs text-gray-400 mt-2 ml-1">Separate multiple facilities with commas.</p>
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
                  Creating Room...
                </>
              ) : (
                <>
                  <Building size={18} />
                  Create Room
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
          </div>
        </div>
      </div>
    );
  }
