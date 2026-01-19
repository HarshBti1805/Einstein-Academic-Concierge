"""
University Course Recommendation System - Flask API
Using LangChain, OpenAI, and Pinecone Vector Database
Recommends courses based on:
- Student conversation & interests
- Academic performance & branch alignment
- Schedule preferences
- Instructor teaching style preferences
- Credit requirements & workload balance
"""

import os
import json
from typing import List, Dict, Any, Optional
from dotenv import load_dotenv
from flask import Flask, request, jsonify
from flask_cors import CORS

from langchain_openai import OpenAIEmbeddings, ChatOpenAI
from langchain_pinecone import PineconeVectorStore
from langchain_core.documents import Document
from langchain_core.messages import HumanMessage, AIMessage, SystemMessage
from pinecone import Pinecone, ServerlessSpec

# Load environment variables
load_dotenv()

# Initialize Flask app
app = Flask(__name__)
CORS(app, origins=["http://localhost:3000", "http://127.0.0.1:3000"])

# Constants
DATA_DIR = os.path.join(os.path.dirname(__file__), "data")

# Pinecone Configuration
PINECONE_API_KEY = os.getenv("PINECONE_API_KEY", None)
PINECONE_INDEX_NAME = os.getenv("PINECONE_INDEX_NAME", "course-recommendations")
PINECONE_ENVIRONMENT = os.getenv("PINECONE_ENVIRONMENT", "us-east-1")

# Global variables for caching
vectorstore = None
courses_data = None
students_data = None
dashboard_data = None
seats_data = None

# Store active advisor sessions
advisor_sessions: Dict[str, 'UniversityCourseAdvisor'] = {}


def load_json_data(filename: str) -> Dict[str, Any]:
    """Load JSON data from the data directory."""
    filepath = os.path.join(DATA_DIR, filename)
    with open(filepath, 'r', encoding='utf-8') as f:
        return json.load(f)


def create_course_documents(courses_data: Dict[str, Any]) -> List[Document]:
    """Convert courses data into comprehensive LangChain Documents for vector storage."""
    documents = []
    
    for course in courses_data["courses"]:
        # Extract instructor info
        instructor = course.get('instructor', {})
        instructor_name = instructor.get('name', 'TBA')
        instructor_email = instructor.get('email', 'N/A')
        instructor_dept = instructor.get('department', 'N/A')
        toughness = instructor.get('toughness_rating', 'N/A')
        instructor_remarks = instructor.get('general_remarks', 'No remarks available')
        
        # Extract schedule info
        schedule = course.get('schedule', {})
        weekdays = schedule.get('weekdays', [])
        timings = schedule.get('timings', {})
        start_time = timings.get('start', 'TBA')
        end_time = timings.get('end', 'TBA')
        classroom = course.get('classroom_number', 'TBA')
        
        # Create rich text content for each course
        content = f"""
=== COURSE INFORMATION ===
Course: {course['name']}
Course ID: {course['course_id']}
Category: {course['category']}
Difficulty Level: {course['difficulty']}
Classroom: {classroom}

=== DESCRIPTION ===
{course['description']}

=== ACADEMIC REQUIREMENTS ===
Prerequisites: {', '.join(course['prerequisites']) if course['prerequisites'] else 'None required'}
Minimum GPA Recommended: {course['min_gpa_recommended']}
Ideal For: {course['ideal_for']}

=== SKILLS & CAREER ===
Skills Developed: {', '.join(course['skills_developed'])}
Career Paths: {', '.join(course['career_paths'])}

=== INSTRUCTOR INFORMATION ===
Professor: {instructor_name}
Department: {instructor_dept}
Email: {instructor_email}
Teaching Style/Toughness: {toughness}
Student Reviews & Notes: {instructor_remarks}

=== SCHEDULE ===
Days: {', '.join(weekdays) if weekdays else 'TBA'}
Time: {start_time} - {end_time}
Location: {classroom}

=== KEYWORDS ===
{', '.join(course['keywords'])}
"""
        
        doc = Document(
            page_content=content,
            metadata={
                "course_id": course['course_id'],
                "name": course['name'],
                "category": course['category'],
                "difficulty": course['difficulty'],
                "min_gpa": course['min_gpa_recommended'],
                "instructor_name": instructor_name,
                "toughness_rating": toughness,
                "weekdays": ", ".join(weekdays) if weekdays else "TBA",
                "start_time": start_time,
                "end_time": end_time,
                "classroom": classroom,
                "keywords": ", ".join(course['keywords'])
            }
        )
        documents.append(doc)
    
    return documents


def initialize_vector_store(documents: List[Document]) -> PineconeVectorStore:
    """Initialize Pinecone vector store with course documents."""
    embeddings = OpenAIEmbeddings()
    REQUIRED_DIMENSION = 1536
    
    print("   ☁️  Connecting to Pinecone...")
    pc = Pinecone(api_key=PINECONE_API_KEY)
    
    try:
        existing_indexes = [index.name for index in pc.list_indexes()]
    except Exception as e:
        print(f"   ⚠️  Error listing indexes: {e}")
        existing_indexes = []
    
    if PINECONE_INDEX_NAME in existing_indexes:
        print(f"   📂 Found existing Pinecone index: {PINECONE_INDEX_NAME}")
        index = pc.Index(PINECONE_INDEX_NAME)
        
        try:
            index_description = pc.describe_index(PINECONE_INDEX_NAME)
            index_dimension = index_description.dimension
            
            if index_dimension != REQUIRED_DIMENSION:
                print(f"   ⚠️  Dimension mismatch! Recreating index...")
                pc.delete_index(PINECONE_INDEX_NAME)
                import time
                time.sleep(3)
                pc.create_index(
                    name=PINECONE_INDEX_NAME,
                    dimension=REQUIRED_DIMENSION,
                    metric="cosine",
                    spec=ServerlessSpec(cloud="aws", region=PINECONE_ENVIRONMENT)
                )
                print("   ✅ New index created")
            else:
                stats = index.describe_index_stats()
                total_vectors = stats.get('total_vector_count', 0)
                
                if total_vectors > 0:
                    print(f"   ✅ Index contains {total_vectors} course vectors")
                    vectorstore = PineconeVectorStore(
                        index_name=PINECONE_INDEX_NAME,
                        embedding=embeddings,
                        pinecone_api_key=PINECONE_API_KEY
                    )
                    return vectorstore
                else:
                    print("   ⚠️  Index empty, populating...")
        except Exception as e:
            print(f"   ⚠️  Error: {e}, recreating...")
            try:
                pc.delete_index(PINECONE_INDEX_NAME)
                import time
                time.sleep(3)
            except:
                pass
    else:
        print(f"   🔨 Creating new Pinecone index...")
        try:
            pc.create_index(
                name=PINECONE_INDEX_NAME,
                dimension=REQUIRED_DIMENSION,
                metric="cosine",
                spec=ServerlessSpec(cloud="aws", region=PINECONE_ENVIRONMENT)
            )
            print(f"   ✅ Index created")
            import time
            time.sleep(3)
        except Exception as e:
            print(f"   ⚠️  Error: {e}")
    
    print(f"   📤 Uploading {len(documents)} courses...")
    try:
        vectorstore = PineconeVectorStore.from_documents(
            documents=documents,
            embedding=embeddings,
            index_name=PINECONE_INDEX_NAME,
            pinecone_api_key=PINECONE_API_KEY
        )
        print(f"   ✅ Uploaded {len(documents)} courses")
    except Exception as e:
        print(f"   ⚠️  Error: {e}")
        vectorstore = PineconeVectorStore(
            index_name=PINECONE_INDEX_NAME,
            embedding=embeddings,
            pinecone_api_key=PINECONE_API_KEY
        )
    
    return vectorstore


def get_student_profile(student_id: str) -> Dict[str, Any] | None:
    """Get a student's profile by their ID."""
    global students_data
    for student in students_data["students"]:
        if student["student_id"] == student_id:
            return student
    return None


def get_dashboard_for_student(student_id: str) -> Dict[str, Any] | None:
    """Get dashboard data for a student."""
    global dashboard_data
    return dashboard_data.get(student_id)


def calculate_academic_analysis(student: Dict[str, Any]) -> Dict[str, Any]:
    """Calculate comprehensive academic metrics for the student."""
    academic_data = student["academic_data"]
    subjects = academic_data["subjects"]
    branch = student.get("branch", "General")
    
    subject_scores = {}
    strong_subjects = []
    weak_subjects = []
    completed_subjects = []
    top_performers = []
    needs_attention = []
    
    scores_list = []
    for subject in subjects:
        score = (subject["marks"] * 0.7) + (subject["attendance"] * 0.3)
        subject_data = {
            "name": subject["name"],
            "combined_score": score,
            "marks": subject["marks"],
            "attendance": subject["attendance"],
            "grade": subject["grade"],
            "remarks": subject["teacher_remarks"]
        }
        subject_scores[subject["name"]] = subject_data
        scores_list.append(subject_data)
        completed_subjects.append(subject["name"])
        
        if score >= 85:
            strong_subjects.append(subject["name"])
        elif score < 65:
            weak_subjects.append(subject["name"])
    
    scores_list.sort(key=lambda x: x["combined_score"], reverse=True)
    top_performers = [s["name"] for s in scores_list[:3]]
    needs_attention = [s["name"] for s in scores_list[-3:] if s["combined_score"] < 80]
    
    core_avg = sum(s["marks"] for s in subjects) / len(subjects) if subjects else 0
    skill_areas = _identify_skill_areas(completed_subjects, branch)
    
    year = student.get("year_of_study", 1)
    gpa = academic_data["overall_gpa"]
    if year >= 2 and gpa >= 3.5:
        readiness_level = "Advanced"
    elif year >= 2 or gpa >= 3.0:
        readiness_level = "Intermediate"
    else:
        readiness_level = "Foundational"
    
    return {
        "overall_gpa": academic_data["overall_gpa"],
        "attendance_percentage": academic_data["attendance_percentage"],
        "academic_year": academic_data.get("academic_year", "N/A"),
        "total_credits": academic_data.get("totalCredits", 0),
        "credits_this_semester": academic_data.get("creditsThisSemester", 0),
        "subject_scores": subject_scores,
        "strong_subjects": strong_subjects,
        "weak_subjects": weak_subjects,
        "completed_subjects": completed_subjects,
        "top_performers": top_performers,
        "needs_attention": needs_attention,
        "core_average": round(core_avg, 1),
        "skill_areas": skill_areas,
        "readiness_level": readiness_level,
        "branch": branch,
        "participation_score": student["behavioral_data"]["participation_score"],
        "discipline_score": student["behavioral_data"]["discipline_score"],
        "extracurricular": student["behavioral_data"]["extracurricular"]
    }


def _identify_skill_areas(completed_subjects: List[str], branch: str) -> Dict[str, List[str]]:
    """Identify skill areas based on completed subjects and branch."""
    skill_keywords = {
        "programming": ["programming", "coding", "software", "web", "database", "algorithms"],
        "mathematics": ["math", "calculus", "statistics", "discrete", "algebra", "numerical"],
        "engineering": ["mechanics", "thermodynamics", "circuit", "materials", "design", "engineering"],
        "research": ["research", "methods", "analysis", "statistics", "experimental"],
        "communication": ["communication", "writing", "speech", "presentation", "technical"],
        "creative": ["art", "design", "creative", "theater", "performance", "acting"],
        "business": ["business", "management", "marketing", "finance", "accounting", "economics"],
        "psychology": ["psychology", "cognitive", "social", "behavioral", "developmental"],
        "science": ["biology", "chemistry", "physics", "science", "laboratory"]
    }
    
    identified_skills = {}
    
    for skill_area, keywords in skill_keywords.items():
        matching_subjects = []
        for subject in completed_subjects:
            subject_lower = subject.lower()
            if any(keyword in subject_lower for keyword in keywords):
                matching_subjects.append(subject)
        if matching_subjects:
            identified_skills[skill_area] = matching_subjects
    
    return identified_skills


def create_student_context(student: Dict[str, Any], academic_analysis: Dict[str, Any]) -> str:
    """Create comprehensive student context for the LLM."""
    skill_areas_text = ""
    for skill, subjects in academic_analysis.get('skill_areas', {}).items():
        skill_areas_text += f"\n   • {skill.title()}: {', '.join(subjects)}"
    if not skill_areas_text:
        skill_areas_text = "\n   • Building foundational skills"
    
    context = f"""
╔══════════════════════════════════════════════════════════════╗
║                    STUDENT PROFILE                           ║
╚══════════════════════════════════════════════════════════════╝

=== PERSONAL INFORMATION ===
Name: {student['name']}
Email: {student.get('email', 'N/A')}
Roll Number: {student.get('roll_number', 'N/A')}
Age: {student.get('age', 'N/A')}

=== UNIVERSITY DETAILS ===
University: {student.get('university_name', 'N/A')}
Branch/Major: {student.get('branch', 'N/A')}
Year of Study: {student.get('year_of_study', 'N/A')}
Enrollment Year: {student.get('enrollment_year', 'N/A')}
Expected Graduation: {student.get('expectedGraduation', 'N/A')}

=== ACADEMIC STANDING ===
Academic Year: {academic_analysis['academic_year']}
Overall GPA: {academic_analysis['overall_gpa']}/4.0
Core Average: {academic_analysis.get('core_average', 'N/A')}/100
Overall Attendance: {academic_analysis['attendance_percentage']}%
Total Credits Earned: {academic_analysis['total_credits']}
Credits This Semester: {academic_analysis['credits_this_semester']}
Course Readiness Level: {academic_analysis.get('readiness_level', 'Foundational')}

=== BEHAVIORAL METRICS ===
Participation Score: {academic_analysis['participation_score']}/10
Discipline Score: {academic_analysis['discipline_score']}/10

=== TOP PERFORMING SUBJECTS ===
{', '.join(academic_analysis.get('top_performers', [])) if academic_analysis.get('top_performers') else 'N/A'}

=== SUBJECTS NEEDING ATTENTION ===
{', '.join(academic_analysis.get('needs_attention', [])) if academic_analysis.get('needs_attention') else 'None - performing well!'}

=== DEVELOPED SKILL AREAS ==={skill_areas_text}

=== COMPLETED COURSEWORK ===
{', '.join(academic_analysis.get('completed_subjects', [])) if academic_analysis.get('completed_subjects') else 'First semester'}

=== EXTRACURRICULAR ACTIVITIES ===
{', '.join(academic_analysis['extracurricular'])}
"""
    
    for subject, data in academic_analysis['subject_scores'].items():
        if data['combined_score'] >= 90:
            indicator = "🌟"
        elif data['combined_score'] >= 80:
            indicator = "✅"
        elif data['combined_score'] >= 70:
            indicator = "📊"
        else:
            indicator = "⚠️"
            
        context += f"""
{indicator} {subject}
   Marks: {data['marks']}/100 | Grade: {data['grade']} | Attendance: {data['attendance']}%
"""
    
    return context


class UniversityCourseAdvisor:
    """Advanced chatbot for university course recommendations."""
    
    def __init__(self, vectorstore: PineconeVectorStore, student: Dict[str, Any], 
                 academic_analysis: Dict[str, Any], courses_data: Dict[str, Any]):
        self.vectorstore = vectorstore
        self.student = student
        self.academic_analysis = academic_analysis
        self.courses_data = courses_data
        self.student_context = create_student_context(student, academic_analysis)
        
        self.llm = ChatOpenAI(model="gpt-4o", temperature=0.7)
        self.conversation_history = []
        
        self.preferences = {
            "schedule_preference": None,
            "preferred_days": None,
            "instructor_style": None,
            "workload_preference": None,
            "interests": [],
            "career_goals": [],
            "avoid_times": []
        }
        
        self.system_prompt = self._create_system_prompt()
    
    def _create_system_prompt(self) -> str:
        """Create comprehensive system prompt for the advisor."""
        branch = self.student.get('branch', 'their program')
        year = self.student.get('year_of_study', 1)
        gpa = self.academic_analysis.get('overall_gpa', 3.0)
        top_subjects = self.academic_analysis.get('top_performers', [])
        
        return f"""You're a friendly academic advisor chatting with {self.student['name']}, a Year {year} {branch} student.

THEIR QUICK PROFILE:
- GPA: {gpa}/4.0
- Strong in: {', '.join(top_subjects[:2]) if top_subjects else 'building skills'}
- Hobbies: {', '.join(self.academic_analysis.get('extracurricular', [])[:2])}

YOUR PERSONALITY:
- Chill, friendly, like talking to a helpful older student
- Use casual language (contractions, simple words)
- Be curious about THEM as a person, not just academics
- React naturally to what they say

CONVERSATION RULES:
1. Keep responses SHORT - 2-4 sentences max
2. Ask ONE question at a time
3. NO bullet points or lists in conversation
4. NO asterisks or markdown formatting
5. Sound like a real person texting, not a formal advisor
6. Build on what they just said before asking something new
7. DO NOT recommend courses yet - just get to know them

GOOD EXAMPLES:
- "Oh nice, that sounds fun! What got you into that?"
- "I get that, morning classes can be rough haha. Any particular reason?"
- "That's cool! So are you thinking more hands-on stuff or theory?"

BAD EXAMPLES (don't do this):
- "**Great choice!** Here are some options: • Option 1 • Option 2"
- "I'd recommend considering the following courses based on your profile..."
- Long paragraphs explaining everything at once

Just have a natural chat. Learn about their interests, schedule preferences, what kind of classes they enjoy. Keep it flowing!"""

    def chat(self, user_message: str) -> str:
        """Process user message and return response."""
        self.conversation_history.append(HumanMessage(content=user_message))
        
        messages = [SystemMessage(content=self.system_prompt)]
        messages.extend(self.conversation_history)
        
        response = self.llm.invoke(messages)
        self.conversation_history.append(AIMessage(content=response.content))
        
        return response.content
    
    def get_conversation_length(self) -> int:
        """Get the number of messages in conversation."""
        return len(self.conversation_history)
    
    def analyze_conversation(self) -> str:
        """Analyze conversation to extract preferences for course matching."""
        conversation_text = "\n".join([
            f"{'Student' if isinstance(msg, HumanMessage) else 'Advisor'}: {msg.content}"
            for msg in self.conversation_history
        ])
        
        analysis_prompt = f"""From this chat, extract key info about what courses would suit this student:

{conversation_text}

Summarize in plain text (no markdown):
- Their interests
- Schedule preferences (morning/afternoon/evening, days off)
- Career goals if mentioned
- Learning style preferences
- Keywords that match course topics"""

        response = self.llm.invoke([SystemMessage(content=analysis_prompt)])
        return response.content
    
    def get_course_recommendations(self) -> List[Dict[str, Any]]:
        """Generate comprehensive course recommendations."""
        global seats_data
        
        preference_analysis = self.analyze_conversation()
        
        branch = self.student.get('branch', 'general')
        year = self.student.get('year_of_study', 1)
        readiness = self.academic_analysis.get('readiness_level', 'Foundational')
        skill_areas = list(self.academic_analysis.get('skill_areas', {}).keys())
        completed = self.academic_analysis.get('completed_subjects', [])
        top_subjects = self.academic_analysis.get('top_performers', [])
        
        search_query = f"""
University courses for a {branch} student in year {year}.
COMPLETED COURSEWORK: {', '.join(completed)}
TOP PERFORMING AREAS: {', '.join(top_subjects)}
DEVELOPED SKILLS: {', '.join(skill_areas)}
COURSE LEVEL NEEDED: {readiness} level courses
STUDENT ACTIVITIES: {', '.join(self.academic_analysis['extracurricular'])}
EXPRESSED PREFERENCES AND INTERESTS:
{preference_analysis}
"""
        
        relevant_courses = self.vectorstore.similarity_search(search_query, k=10)
        
        # Build recommendations from search results
        recommendations = []
        seen_courses = set()
        priority = 1
        
        for doc in relevant_courses:
            course_id = doc.metadata.get('course_id')
            if course_id in seen_courses:
                continue
            seen_courses.add(course_id)
            
            # Find full course data
            course_full = None
            for c in self.courses_data['courses']:
                if c['course_id'] == course_id:
                    course_full = c
                    break
            
            if not course_full:
                continue
            
            # Get seat data
            seat_info = seats_data.get('courses', {}).get(course_id, {})
            total_seats = seat_info.get('totalSeats', 100)
            occupied_seats = len(seat_info.get('occupiedSeats', []))
            booking_status = seat_info.get('bookingStatus', 'open')
            
            instructor = course_full.get('instructor', {})
            schedule = course_full.get('schedule', {})
            weekdays = schedule.get('weekdays', [])
            timings = schedule.get('timings', {})
            
            schedule_str = f"{'/'.join(weekdays)} {timings.get('start', 'TBA')}-{timings.get('end', 'TBA')}"
            
            recommendations.append({
                "code": course_id,
                "name": course_full['name'],
                "credits": 3,  # Default credits
                "instructor": instructor.get('name', 'TBA'),
                "schedule": schedule_str,
                "priority": priority,
                "reason": f"Matches your interest in {course_full['category']} and {readiness.lower()} level readiness",
                "totalSeats": total_seats,
                "occupiedSeats": occupied_seats,
                "bookingStatus": booking_status,
                "category": course_full['category'],
                "difficulty": course_full['difficulty']
            })
            
            priority += 1
            if priority > 5:
                break
        
        return recommendations


def initialize_app():
    """Initialize the application with data and vector store."""
    global vectorstore, courses_data, students_data, dashboard_data, seats_data
    
    if not PINECONE_API_KEY:
        print("⚠️  Warning: PINECONE_API_KEY not set. Using mock mode.")
        return
    
    print("\n📊 Loading data...")
    students_data = load_json_data("students_data.json")
    courses_data = load_json_data("courses_data.json")
    dashboard_data = load_json_data("dashboard_data.json")
    seats_data = load_json_data("seats_data.json")
    print(f"   ✅ Loaded {len(students_data['students'])} students")
    print(f"   ✅ Loaded {len(courses_data['courses'])} courses")
    
    print("\n🔧 Initializing vector database...")
    course_documents = create_course_documents(courses_data)
    vectorstore = initialize_vector_store(course_documents)
    print("   ✅ Vector store ready")


# ============== API ROUTES ==============

@app.route('/api/health', methods=['GET'])
def health_check():
    """Health check endpoint."""
    return jsonify({
        "status": "healthy",
        "vectorstore_ready": vectorstore is not None,
        "students_loaded": students_data is not None,
        "courses_loaded": courses_data is not None
    })


@app.route('/api/student/<student_id>', methods=['GET'])
def get_student(student_id: str):
    """Get student profile by ID."""
    student = get_student_profile(student_id)
    if not student:
        return jsonify({"error": "Student not found"}), 404
    
    academic_analysis = calculate_academic_analysis(student)
    dashboard = get_dashboard_for_student(student_id)
    
    return jsonify({
        "student": student,
        "academic_analysis": academic_analysis,
        "dashboard": dashboard
    })


@app.route('/api/chat/start', methods=['POST'])
def start_chat():
    """Start a new chat session for a student."""
    global advisor_sessions
    
    data = request.json
    student_id = data.get('student_id')
    
    if not student_id:
        return jsonify({"error": "student_id is required"}), 400
    
    student = get_student_profile(student_id)
    if not student:
        return jsonify({"error": "Student not found"}), 404
    
    if vectorstore is None:
        return jsonify({"error": "System not initialized. Check API keys."}), 500
    
    academic_analysis = calculate_academic_analysis(student)
    
    # Create new advisor session
    advisor = UniversityCourseAdvisor(vectorstore, student, academic_analysis, courses_data)
    advisor_sessions[student_id] = advisor
    
    # Generate welcome message - casual and short
    first_name = student['name'].split()[0]
    welcome_message = f"""Hey {first_name}! Ready to figure out your courses for next semester?

I see you're doing well in {academic_analysis.get('top_performers', ['your classes'])[0] if academic_analysis.get('top_performers') else 'your classes'} - nice work!

So what's been on your mind lately? Any subjects you're excited about or dreading? 😄"""
    
    return jsonify({
        "session_id": student_id,
        "message": welcome_message,
        "student_name": student['name']
    })


@app.route('/api/chat/message', methods=['POST'])
def send_message():
    """Send a message in an existing chat session."""
    global advisor_sessions
    
    data = request.json
    student_id = data.get('student_id')
    message = data.get('message')
    
    if not student_id or not message:
        return jsonify({"error": "student_id and message are required"}), 400
    
    advisor = advisor_sessions.get(student_id)
    if not advisor:
        # Try to create a new session
        student = get_student_profile(student_id)
        if not student:
            return jsonify({"error": "Session not found. Please start a new chat."}), 404
        
        if vectorstore is None:
            return jsonify({"error": "System not initialized"}), 500
            
        academic_analysis = calculate_academic_analysis(student)
        advisor = UniversityCourseAdvisor(vectorstore, student, academic_analysis, courses_data)
        advisor_sessions[student_id] = advisor
    
    try:
        response = advisor.chat(message)
        conversation_length = advisor.get_conversation_length()
        
        return jsonify({
            "response": response,
            "conversation_length": conversation_length,
            "can_recommend": conversation_length >= 4
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route('/api/chat/recommend', methods=['POST'])
def get_recommendations():
    """Get course recommendations based on the conversation."""
    global advisor_sessions
    
    data = request.json
    student_id = data.get('student_id')
    
    if not student_id:
        return jsonify({"error": "student_id is required"}), 400
    
    advisor = advisor_sessions.get(student_id)
    if not advisor:
        return jsonify({"error": "No active session. Please start a chat first."}), 404
    
    try:
        recommendations = advisor.get_course_recommendations()
        
        # Generate recommendation message - casual
        rec_message = f"""Alright, based on our chat I've pulled together {len(recommendations)} courses that I think you'd actually enjoy!

I tried to match what you told me about your interests and schedule. Take a look below - you can drag them around to set your priorities, then head to bookings to grab your seats."""
        
        return jsonify({
            "recommendations": recommendations,
            "message": rec_message
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route('/api/courses', methods=['GET'])
def get_all_courses():
    """Get all available courses."""
    if courses_data is None:
        return jsonify({"error": "Courses not loaded"}), 500
    
    return jsonify(courses_data)


@app.route('/api/seats', methods=['GET'])
def get_all_seats():
    """Get seat availability for all courses."""
    if seats_data is None:
        return jsonify({"error": "Seat data not loaded"}), 500
    
    return jsonify(seats_data)


@app.route('/api/seats/<course_id>', methods=['GET'])
def get_course_seats(course_id: str):
    """Get seat availability for a specific course."""
    if seats_data is None:
        return jsonify({"error": "Seat data not loaded"}), 500
    
    course_seats = seats_data.get('courses', {}).get(course_id)
    if not course_seats:
        return jsonify({"error": "Course not found"}), 404
    
    return jsonify(course_seats)


# ============== MAIN ==============

if __name__ == "__main__":
    print("\n" + "═" * 70)
    print("🎓 UNIVERSITY COURSE RECOMMENDATION API")
    print("═" * 70)
    print("Powered by LangChain + OpenAI GPT-4 + Pinecone Vector DB")
    print("═" * 70)
    
    initialize_app()
    
    print("\n🚀 Starting Flask server...")
    print("   API available at: http://localhost:5000")
    print("   Health check: http://localhost:5000/api/health")
    print("═" * 70 + "\n")
    
    app.run(host='0.0.0.0', port=5000, debug=True)
