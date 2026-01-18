"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

interface StudentData {
  name: string;
  rollNumber: string;
  email: string;
}

interface Course {
  code: string;
  name: string;
  credits: number;
  grade: string;
  attendance: number;
}

// Circular progress component
const CircularProgress = ({ percentage, size = 120, strokeWidth = 8, color = "blue", label, value }: {
  percentage: number;
  size?: number;
  strokeWidth?: number;
  color?: string;
  label: string;
  value: string | number;
}) => {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (percentage / 100) * circumference;
  const colorClasses = {
    blue: "stroke-blue-600",
    green: "stroke-green-600",
    purple: "stroke-purple-600",
    orange: "stroke-orange-600",
  };

  return (
    <div className="flex flex-col items-center">
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="transform -rotate-90">
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke="currentColor"
            strokeWidth={strokeWidth}
            fill="none"
            className="text-gray-200"
          />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke="currentColor"
            strokeWidth={strokeWidth}
            fill="none"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            strokeLinecap="round"
            className={`${colorClasses[color as keyof typeof colorClasses]} transition-all duration-1000 ease-out`}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <div className="text-2xl font-bold text-gray-900">{value}</div>
          <div className="text-xs text-gray-500 mt-1">{label}</div>
        </div>
      </div>
    </div>
  );
};

// Pie chart component
const PieChart = ({ data }: { data: Record<string, number> }) => {
  const total = Object.values(data).reduce((sum, val) => sum + val, 0);
  const colors = ["#3B82F6", "#10B981", "#F59E0B", "#EF4444", "#8B5CF6", "#EC4899"];
  let currentAngle = 0;
  const radius = 80;
  const centerX = 100;
  const centerY = 100;

  const segments = Object.entries(data).map(([grade, count], index) => {
    const percentage = (count / total) * 100;
    const angle = (count / total) * 360;
    const startAngle = currentAngle;
    currentAngle += angle;

    const startAngleRad = (startAngle * Math.PI) / 180;
    const endAngleRad = (currentAngle * Math.PI) / 180;

    const x1 = centerX + radius * Math.cos(startAngleRad);
    const y1 = centerY + radius * Math.sin(startAngleRad);
    const x2 = centerX + radius * Math.cos(endAngleRad);
    const y2 = centerY + radius * Math.sin(endAngleRad);

    const largeArcFlag = angle > 180 ? 1 : 0;

    const pathData = [
      `M ${centerX} ${centerY}`,
      `L ${x1} ${y1}`,
      `A ${radius} ${radius} 0 ${largeArcFlag} 1 ${x2} ${y2}`,
      "Z",
    ].join(" ");

    return {
      path: pathData,
      color: colors[index % colors.length],
      grade,
      count,
      percentage,
    };
  });

  return (
    <div className="flex items-center justify-center">
      <svg width="200" height="200" viewBox="0 0 200 200" className="transform -rotate-90">
        {segments.map((segment, index) => (
          <g key={index}>
            <path
              d={segment.path}
              fill={segment.color}
              className="transition-all hover:opacity-80"
              style={{ transformOrigin: "100px 100px" }}
            />
          </g>
        ))}
      </svg>
      <div className="ml-8 space-y-2">
        {segments.map((segment, index) => (
          <div key={index} className="flex items-center gap-2">
            <div
              className="w-4 h-4 rounded"
              style={{ backgroundColor: segment.color }}
            ></div>
            <span className="text-sm text-gray-700">
              {segment.grade}: {segment.count} ({segment.percentage.toFixed(0)}%)
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};

// Line chart component for performance trend
const LineChart = ({ courses, gradePoints }: { courses: Course[]; gradePoints: Record<string, number> }) => {
  const padding = 6;
  const leftPadding = 8;
  const bottomPadding = 10;
  const chartHeight = 100 - padding - bottomPadding;
  const chartWidth = 100 - leftPadding - padding;
  
  const points = courses.map((course, index) => {
    const value = gradePoints[course.grade];
    const normalizedValue = value / 4.0;
    const x = leftPadding + (index / Math.max(1, courses.length - 1)) * chartWidth;
    const y = padding + (1 - normalizedValue) * chartHeight;
    return { x, y, value, course, normalizedValue };
  });

  const pathData = points
    .map((point, index) => `${index === 0 ? "M" : "L"} ${point.x} ${point.y}`)
    .join(" ");

  // Y-axis labels (GPA values)
  const yAxisLabels = [0, 1, 2, 3, 4];
  const yAxisPositions = yAxisLabels.map((label) => {
    const normalized = label / 4.0;
    return {
      y: padding + (1 - normalized) * chartHeight,
      label: label.toString(),
    };
  });

  return (
    <div className="relative w-full pl-10">
      <div className="relative h-96 w-full">
        <svg viewBox="0 0 100 100" className="w-full h-full" preserveAspectRatio="xMidYMid meet">
          {/* Grid lines */}
          {yAxisPositions.map((pos, idx) => (
            <line
              key={idx}
              x1={leftPadding}
              y1={pos.y}
              x2={100 - padding}
              y2={pos.y}
              stroke="#E5E7EB"
              strokeWidth="0.4"
              strokeDasharray="2,2"
            />
          ))}
          
          {/* Y-axis labels */}
          {yAxisPositions.map((pos, idx) => (
            <text
              key={idx}
              x={leftPadding - 1.5}
              y={pos.y + 1.2}
              textAnchor="end"
              fontSize="3"
              fill="#4B5563"
              className="font-semibold"
            >
              {pos.label}
            </text>
          ))}
          
          {/* Area under curve */}
          <path
            d={`${pathData} L ${100 - padding} ${padding + chartHeight} L ${leftPadding} ${padding + chartHeight} Z`}
            fill="url(#gradient)"
            opacity="0.25"
          />
          
          {/* Line */}
          <path
            d={pathData}
            fill="none"
            stroke="#3B82F6"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          
          {/* Points with tooltips */}
          {points.map((point, index) => (
            <g key={index}>
              <circle
                cx={point.x}
                cy={point.y}
                r="3"
                fill="#3B82F6"
                stroke="white"
                strokeWidth="1.5"
                className="hover:r-5 transition-all cursor-pointer"
              />
              {/* Value label above point */}
              <text
                x={point.x}
                y={point.y - 5}
                textAnchor="middle"
                fontSize="3.2"
                fill="#111827"
                className="font-bold"
              >
                {point.value.toFixed(1)}
              </text>
            </g>
          ))}
          
          {/* X-axis labels positioned at exact data point locations */}
          {points.map((point, index) => (
            <g key={`label-${index}`}>
              <text
                x={point.x}
                y={padding + chartHeight + 5}
                textAnchor="middle"
                fontSize="3"
                fill="#1F2937"
                className="font-bold"
              >
                {point.course.code}
              </text>
              <text
                x={point.x}
                y={padding + chartHeight + 8.5}
                textAnchor="middle"
                fontSize="2.5"
                fill="#6B7280"
                className="font-medium"
              >
                {point.course.grade}
              </text>
            </g>
          ))}
          
          <defs>
            <linearGradient id="gradient" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#3B82F6" stopOpacity="0.4" />
              <stop offset="100%" stopColor="#3B82F6" stopOpacity="0.1" />
            </linearGradient>
          </defs>
        </svg>
      </div>
      
      {/* Y-axis label */}
      <div className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-8 transform -rotate-90 text-sm font-bold text-gray-700 whitespace-nowrap">
        GPA
      </div>
    </div>
  );
};

export default function Dashboard() {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [studentData, setStudentData] = useState<StudentData | null>(null);

  // Sample data - in real app, this would come from API
  const universityName = "State University of Technology";
  const currentYear = "2024-2025";
  const overallAttendance = 87.5;
  const overallGPA = 3.65;

  const courses: Course[] = [
    { code: "CS301", name: "Data Structures & Algorithms", credits: 3, grade: "A", attendance: 92 },
    { code: "CS302", name: "Database Systems", credits: 3, grade: "A-", attendance: 88 },
    { code: "MATH205", name: "Calculus II", credits: 4, grade: "B+", attendance: 85 },
    { code: "PHYS201", name: "Physics for Engineers", credits: 3, grade: "A", attendance: 90 },
    { code: "ENG101", name: "Technical Writing", credits: 2, grade: "A-", attendance: 95 },
    { code: "CS303", name: "Software Engineering", credits: 3, grade: "B+", attendance: 82 },
  ];

  const gradePoints: { [key: string]: number } = {
    "A": 4.0, "A-": 3.7, "B+": 3.3, "B": 3.0, "B-": 2.7,
    "C+": 2.3, "C": 2.0, "C-": 1.7, "D": 1.0, "F": 0.0
  };

  useEffect(() => {
    // Only run on client side after mount - use setTimeout to avoid synchronous setState warning
    const timer = setTimeout(() => {
      const data = sessionStorage.getItem("studentData");
      if (data) {
        try {
          const parsed = JSON.parse(data);
          setStudentData(parsed);
          setMounted(true);
        } catch {
          router.push("/");
        }
      } else {
        router.push("/");
      }
    }, 0);
    return () => clearTimeout(timer);
  }, [router]);

  // Prevent hydration mismatch - show consistent loading state until client-side data is loaded
  // This ensures server and client render the same initial HTML
  if (!mounted || !studentData) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 flex items-center justify-center">
        <div className="text-gray-500">Loading...</div>
      </div>
    );
  }

  // Calculate grade distribution for pie chart
  const gradeDistribution = courses.reduce((acc, course) => {
    acc[course.grade] = (acc[course.grade] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const totalCredits = courses.reduce((sum, course) => sum + course.credits, 0);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-sm shadow-sm border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Student Dashboard</h1>
              <p className="text-sm text-gray-600 mt-1">{universityName}</p>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-right">
                <p className="text-sm font-medium text-gray-900">{studentData.name}</p>
                <p className="text-xs text-gray-500">{studentData.rollNumber}</p>
              </div>
              <button
                onClick={() => {
                  sessionStorage.removeItem("studentData");
                  router.push("/");
                }}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Quick Action Button */}
        <div className="mb-8 flex justify-center">
          <button
            onClick={() => router.push("/assistant")}
            className="group relative inline-flex items-center justify-center gap-3 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 px-8 py-4 text-lg font-semibold text-white shadow-lg shadow-blue-500/30 transition-all hover:from-blue-700 hover:to-indigo-700 hover:shadow-xl hover:shadow-blue-500/40 hover:scale-105 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 active:scale-95"
          >
            <svg
              className="h-6 w-6 transition-transform group-hover:scale-110"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 6v6m0 0v6m0-6h6m-6 0H6"
              />
            </svg>
            Book Your Courses
            <svg
              className="h-5 w-5 transition-transform group-hover:translate-x-1"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 5l7 7-7 7"
              />
            </svg>
          </button>
        </div>

        {/* Enhanced Stats Cards with Circular Progress */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-200 hover:shadow-xl transition-shadow">
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-sm font-medium text-gray-600">Academic Year</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">{currentYear}</p>
              </div>
              <div className="h-14 w-14 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center shadow-lg">
                <svg className="h-7 w-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-200 hover:shadow-xl transition-shadow">
            <CircularProgress
              percentage={overallAttendance}
              size={100}
              strokeWidth={8}
              color="green"
              label="Attendance"
              value={`${overallAttendance}%`}
            />
          </div>

          <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-200 hover:shadow-xl transition-shadow">
            <CircularProgress
              percentage={(overallGPA / 4.0) * 100}
              size={100}
              strokeWidth={8}
              color="purple"
              label="GPA"
              value={overallGPA}
            />
          </div>

          <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-200 hover:shadow-xl transition-shadow">
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Credits</p>
                <p className="text-3xl font-bold text-gray-900 mt-1">{totalCredits}</p>
                <p className="text-xs text-gray-500 mt-1">{courses.length} Courses</p>
              </div>
              <div className="h-14 w-14 rounded-xl bg-gradient-to-br from-orange-500 to-orange-600 flex items-center justify-center shadow-lg">
                <svg className="h-7 w-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                </svg>
              </div>
            </div>
          </div>
        </div>

        {/* Charts Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Attendance Chart */}
          <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-200">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-gray-900">Attendance Analytics</h2>
              <div className="h-10 w-10 rounded-lg bg-green-100 flex items-center justify-center">
                <svg className="h-5 w-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
            </div>
            <div className="space-y-4">
              {courses.map((course) => {
                const percentage = course.attendance;
                const color = percentage >= 90 ? "from-green-500 to-emerald-600" : 
                             percentage >= 80 ? "from-yellow-500 to-orange-500" : 
                             "from-red-500 to-pink-600";
                return (
                  <div key={course.code} className="group">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-3">
                        <div className="w-16 text-sm font-semibold text-gray-700">{course.code}</div>
                        <span className="text-sm text-gray-600 truncate">{course.name}</span>
                      </div>
                      <span className="text-sm font-bold text-gray-900">{percentage}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
                      <div
                        className={`h-3 rounded-full bg-gradient-to-r ${color} transition-all duration-1000 ease-out group-hover:shadow-lg`}
                        style={{ width: `${percentage}%` }}
                      ></div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Grade Distribution Pie Chart */}
          <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-200">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-gray-900">Grade Distribution</h2>
              <div className="h-10 w-10 rounded-lg bg-purple-100 flex items-center justify-center">
                <svg className="h-5 w-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 3.055A9.001 9.001 0 1020.945 13H11V3.055z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.488 9H15V3.512A9.025 9.025 0 0120.488 9z" />
                </svg>
              </div>
            </div>
            <PieChart data={gradeDistribution} />
          </div>
        </div>

        {/* Performance Trend Line Chart */}
        <div className="bg-white rounded-2xl shadow-lg p-4 border border-gray-200 mb-8">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-xl font-bold text-gray-900">Performance Trend</h2>
            <div className="h-10 w-10 rounded-lg bg-blue-100 flex items-center justify-center">
              <svg className="h-5 w-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" />
              </svg>
            </div>
          </div>
          <LineChart courses={courses} gradePoints={gradePoints} />
          <div className="mt-4 flex items-center justify-center gap-8 text-sm font-medium text-gray-700">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded bg-green-500 shadow-sm"></div>
              <span>A Range (3.7-4.0)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded bg-blue-500 shadow-sm"></div>
              <span>B Range (3.0-3.6)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded bg-yellow-500 shadow-sm"></div>
              <span>C Range (2.0-2.9)</span>
            </div>
          </div>
        </div>

        {/* Enhanced Courses Table */}
        <div className="bg-white rounded-2xl shadow-lg border border-gray-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-gray-50 to-white">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold text-gray-900">My Courses</h2>
              <div className="h-10 w-10 rounded-lg bg-indigo-100 flex items-center justify-center">
                <svg className="h-5 w-5 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                </svg>
              </div>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gradient-to-r from-gray-50 to-gray-100">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Course Code</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Course Name</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Credits</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Grade</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Attendance</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Status</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {courses.map((course) => {
                  const gradeColor =
                    course.grade === "A" ? "bg-gradient-to-r from-green-100 to-emerald-100 text-green-800" :
                    course.grade.startsWith("A") ? "bg-gradient-to-r from-blue-100 to-cyan-100 text-blue-800" :
                    course.grade.startsWith("B") ? "bg-gradient-to-r from-yellow-100 to-amber-100 text-yellow-800" :
                    "bg-gradient-to-r from-gray-100 to-slate-100 text-gray-800";
                  
                  const attendanceColor =
                    course.attendance >= 90 ? "text-green-600" :
                    course.attendance >= 80 ? "text-yellow-600" :
                    "text-red-600";

                  return (
                    <tr key={course.code} className="hover:bg-gradient-to-r hover:from-blue-50 hover:to-indigo-50 transition-all">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-bold text-gray-900">{course.code}</div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-gray-900 font-medium">{course.name}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-600 font-semibold">{course.credits}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-3 py-1.5 text-xs font-bold rounded-full ${gradeColor} shadow-sm`}>
                          {course.grade}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <div className={`text-sm font-bold ${attendanceColor}`}>
                            {course.attendance}%
                          </div>
                          <div className="w-16 bg-gray-200 rounded-full h-2">
                            <div
                              className={`h-2 rounded-full transition-all ${
                                course.attendance >= 90 ? "bg-green-500" :
                                course.attendance >= 80 ? "bg-yellow-500" : "bg-red-500"
                              }`}
                              style={{ width: `${course.attendance}%` }}
                            ></div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="inline-flex px-3 py-1.5 text-xs font-semibold rounded-full bg-gradient-to-r from-blue-100 to-indigo-100 text-blue-800 shadow-sm">
                          Enrolled
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  );
}
