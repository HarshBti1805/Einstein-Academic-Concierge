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

export default function Dashboard() {
  const router = useRouter();
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

  const attendanceData = [92, 88, 85, 90, 95, 82];
  const gradePoints: { [key: string]: number } = {
    "A": 4.0, "A-": 3.7, "B+": 3.3, "B": 3.0, "B-": 2.7,
    "C+": 2.3, "C": 2.0, "C-": 1.7, "D": 1.0, "F": 0.0
  };

  useEffect(() => {
    // Get student data from sessionStorage
    const data = sessionStorage.getItem("studentData");
    if (data) {
      setStudentData(JSON.parse(data));
    } else {
      // If no data, redirect to login
      router.push("/");
    }
  }, [router]);

  if (!studentData) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-gray-500">Loading...</div>
      </div>
    );
  }

  const maxAttendance = Math.max(...attendanceData);
  const minAttendance = Math.min(...attendanceData);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
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
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Academic Year</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">{currentYear}</p>
              </div>
              <div className="h-12 w-12 rounded-lg bg-blue-100 flex items-center justify-center">
                <svg className="h-6 w-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Overall Attendance</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">{overallAttendance}%</p>
              </div>
              <div className="h-12 w-12 rounded-lg bg-green-100 flex items-center justify-center">
                <svg className="h-6 w-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
            <div className="mt-4">
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-green-500 h-2 rounded-full transition-all"
                  style={{ width: `${overallAttendance}%` }}
                ></div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Current GPA</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">{overallGPA}</p>
              </div>
              <div className="h-12 w-12 rounded-lg bg-purple-100 flex items-center justify-center">
                <svg className="h-6 w-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
            </div>
            <div className="mt-4">
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-purple-500 h-2 rounded-full transition-all"
                  style={{ width: `${(overallGPA / 4.0) * 100}%` }}
                ></div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Credits</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">
                  {courses.reduce((sum, course) => sum + course.credits, 0)}
                </p>
              </div>
              <div className="h-12 w-12 rounded-lg bg-orange-100 flex items-center justify-center">
                <svg className="h-6 w-6 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                </svg>
              </div>
            </div>
            <p className="text-xs text-gray-500 mt-2">{courses.length} Courses</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Attendance Chart */}
          <div className="lg:col-span-2 bg-white rounded-xl shadow-sm p-6 border border-gray-200">
            <h2 className="text-xl font-bold text-gray-900 mb-6">Attendance Analytics</h2>
            <div className="space-y-4">
              {courses.map((course, index) => {
                const percentage = course.attendance;
                const color = percentage >= 90 ? "bg-green-500" : percentage >= 80 ? "bg-yellow-500" : "bg-red-500";
                return (
                  <div key={course.code} className="flex items-center gap-4">
                    <div className="w-24 text-sm font-medium text-gray-700">{course.code}</div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm text-gray-600">{course.name}</span>
                        <span className="text-sm font-semibold text-gray-900">{percentage}%</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-3">
                        <div
                          className={`${color} h-3 rounded-full transition-all`}
                          style={{ width: `${percentage}%` }}
                        ></div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Grade Distribution */}
          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
            <h2 className="text-xl font-bold text-gray-900 mb-6">Grade Distribution</h2>
            <div className="space-y-4">
              {["A", "A-", "B+", "B", "B-", "C+", "C"].map((grade) => {
                const count = courses.filter((c) => c.grade === grade).length;
                const percentage = (count / courses.length) * 100;
                if (count === 0) return null;
                return (
                  <div key={grade} className="flex items-center gap-3">
                    <div className="w-12 text-sm font-semibold text-gray-700">{grade}</div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-1">
                        <div className="w-full bg-gray-200 rounded-full h-4">
                          <div
                            className="bg-gradient-to-r from-blue-500 to-indigo-600 h-4 rounded-full transition-all"
                            style={{ width: `${percentage}%` }}
                          ></div>
                        </div>
                        <span className="ml-2 text-sm font-medium text-gray-900">{count}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Courses Table */}
        <div className="mt-8 bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-xl font-bold text-gray-900">My Courses</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Course Code</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Course Name</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Credits</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Grade</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Attendance</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {courses.map((course) => {
                  const gradeColor =
                    course.grade === "A" ? "bg-green-100 text-green-800" :
                    course.grade.startsWith("A") ? "bg-blue-100 text-blue-800" :
                    course.grade.startsWith("B") ? "bg-yellow-100 text-yellow-800" :
                    "bg-gray-100 text-gray-800";
                  
                  const attendanceColor =
                    course.attendance >= 90 ? "text-green-600" :
                    course.attendance >= 80 ? "text-yellow-600" :
                    "text-red-600";

                  return (
                    <tr key={course.code} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-semibold text-gray-900">{course.code}</div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-gray-900">{course.name}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-600">{course.credits}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${gradeColor}`}>
                          {course.grade}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className={`text-sm font-semibold ${attendanceColor}`}>
                          {course.attendance}%
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">
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

        {/* Performance Trend Chart */}
        <div className="mt-8 bg-white rounded-xl shadow-sm p-6 border border-gray-200">
          <h2 className="text-xl font-bold text-gray-900 mb-6">Performance Trend</h2>
          <div className="h-64 flex items-end justify-between gap-2">
            {courses.map((course, index) => {
              const height = (gradePoints[course.grade] / 4.0) * 100;
              const color = gradePoints[course.grade] >= 3.7 ? "bg-green-500" :
                           gradePoints[course.grade] >= 3.0 ? "bg-blue-500" :
                           gradePoints[course.grade] >= 2.0 ? "bg-yellow-500" : "bg-red-500";
              return (
                <div key={course.code} className="flex-1 flex flex-col items-center group">
                  <div className="w-full flex flex-col items-center">
                    <div
                      className={`w-full ${color} rounded-t-lg transition-all hover:opacity-80 cursor-pointer relative group-hover:scale-105`}
                      style={{ height: `${height}%` }}
                      title={`${course.code}: ${course.grade} (${gradePoints[course.grade]})`}
                    >
                    </div>
                  </div>
                  <div className="mt-2 text-xs font-medium text-gray-600 text-center transform -rotate-45 origin-top-left whitespace-nowrap">
                    {course.code}
                  </div>
                  <div className="mt-8 text-xs font-semibold text-gray-900">{course.grade}</div>
                </div>
              );
            })}
          </div>
          <div className="mt-4 flex items-center justify-center gap-6 text-sm text-gray-600">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded bg-green-500"></div>
              <span>A Range (3.7-4.0)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded bg-blue-500"></div>
              <span>B Range (3.0-3.6)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded bg-yellow-500"></div>
              <span>C Range (2.0-2.9)</span>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
