"""
University Course Recommendation System
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
from typing import List, Dict, Any
from dotenv import load_dotenv

from langchain_openai import OpenAIEmbeddings, ChatOpenAI
from langchain_pinecone import PineconeVectorStore
from langchain_core.documents import Document
from langchain_core.messages import HumanMessage, AIMessage, SystemMessage
from pinecone import Pinecone, ServerlessSpec

# Load environment variables
load_dotenv()

# Constants
DATA_DIR = os.path.join(os.path.dirname(__file__), "data")

# Pinecone Configuration
PINECONE_API_KEY = os.getenv("PINECONE_API_KEY", None)
PINECONE_INDEX_NAME = os.getenv("PINECONE_INDEX_NAME", "course-recommendations")
PINECONE_ENVIRONMENT = os.getenv("PINECONE_ENVIRONMENT", "us-east-1")

if not PINECONE_API_KEY:
    raise ValueError("PINECONE_API_KEY must be set in environment variables or .env file")


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


def get_student_profile(student_id: str, students_data: Dict[str, Any]) -> Dict[str, Any] | None:
    """Get a student's profile by their ID."""
    for student in students_data["students"]:
        if student["student_id"] == student_id:
            return student
    return None


def calculate_academic_analysis(student: Dict[str, Any]) -> Dict[str, Any]:
    """Calculate comprehensive academic metrics for the student."""
    academic_data = student["academic_data"]
    subjects = academic_data["subjects"]
    
    subject_scores = {}
    strong_subjects = []
    weak_subjects = []
    
    for subject in subjects:
        score = (subject["marks"] * 0.7) + (subject["attendance"] * 0.3)
        subject_scores[subject["name"]] = {
            "combined_score": score,
            "marks": subject["marks"],
            "attendance": subject["attendance"],
            "grade": subject["grade"],
            "remarks": subject["teacher_remarks"]
        }
        
        if score >= 85:
            strong_subjects.append(subject["name"])
        elif score < 65:
            weak_subjects.append(subject["name"])
    
    return {
        "overall_gpa": academic_data["overall_gpa"],
        "attendance_percentage": academic_data["attendance_percentage"],
        "academic_year": academic_data.get("academic_year", "N/A"),
        "total_credits": academic_data.get("totalCredits", 0),
        "credits_this_semester": academic_data.get("creditsThisSemester", 0),
        "subject_scores": subject_scores,
        "strong_subjects": strong_subjects,
        "weak_subjects": weak_subjects,
        "participation_score": student["behavioral_data"]["participation_score"],
        "discipline_score": student["behavioral_data"]["discipline_score"],
        "extracurricular": student["behavioral_data"]["extracurricular"]
    }


def create_student_context(student: Dict[str, Any], academic_analysis: Dict[str, Any]) -> str:
    """Create comprehensive student context for the LLM."""
    
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
Overall Attendance: {academic_analysis['attendance_percentage']}%
Total Credits Earned: {academic_analysis['total_credits']}
Credits This Semester: {academic_analysis['credits_this_semester']}

=== BEHAVIORAL METRICS ===
Participation Score: {academic_analysis['participation_score']}/10
Discipline Score: {academic_analysis['discipline_score']}/10

=== ACADEMIC STRENGTHS (Score >= 85) ===
{', '.join(academic_analysis['strong_subjects']) if academic_analysis['strong_subjects'] else 'None identified yet'}

=== AREAS FOR IMPROVEMENT (Score < 65) ===
{', '.join(academic_analysis['weak_subjects']) if academic_analysis['weak_subjects'] else 'None - performing well across subjects'}

=== EXTRACURRICULAR ACTIVITIES ===
{', '.join(academic_analysis['extracurricular'])}

=== DETAILED SUBJECT PERFORMANCE ===
"""
    
    for subject, data in academic_analysis['subject_scores'].items():
        context += f"""
📚 {subject}
   Marks: {data['marks']}/100 | Grade: {data['grade']} | Attendance: {data['attendance']}%
   Teacher's Remarks: {data['remarks']}
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
        
        # Student preferences (discovered through conversation)
        self.preferences = {
            "schedule_preference": None,  # morning/afternoon/evening
            "preferred_days": None,       # specific days
            "instructor_style": None,     # strict/fair/lenient
            "workload_preference": None,  # heavy/moderate/light
            "interests": [],
            "career_goals": [],
            "avoid_times": []
        }
        
        self.system_prompt = self._create_system_prompt()
    
    def _create_system_prompt(self) -> str:
        """Create comprehensive system prompt for the advisor."""
        return f"""You are an experienced university academic advisor helping {self.student['name']} select courses for the upcoming semester.

=== YOUR ROLE ===
You are a warm, knowledgeable, and supportive academic counselor at {self.student.get('university_name', 'the university')}. Your job is to help students choose the best courses that align with their:
1. Academic interests and career goals
2. Schedule preferences and time availability
3. Learning style and instructor preferences
4. Current academic standing and workload capacity
5. Branch/Major requirements

=== STUDENT INFORMATION ===
{self.student_context}

=== CONVERSATION OBJECTIVES ===
Throughout the conversation, naturally discover:

1. **INTERESTS & CAREER GOALS**
   - What subjects genuinely excite them?
   - What career do they envision?
   - Any specific industries or roles they're targeting?

2. **SCHEDULE PREFERENCES**
   - Do they prefer morning, afternoon, or evening classes?
   - Are there specific days they want to keep free?
   - Do they have part-time work, internships, or other commitments?
   - Any time slots they absolutely cannot attend?

3. **INSTRUCTOR PREFERENCES**
   - Do they thrive with strict professors who push them?
   - Or do they prefer fair/supportive teaching styles?
   - Do they learn better in lecture-heavy or hands-on classes?
   - How important are professor ratings to them?

4. **WORKLOAD CONSIDERATIONS**
   - How many credits are they planning to take?
   - Do they want a challenging semester or a balanced one?
   - Are they involved in extracurriculars that need time?
   - Any personal circumstances affecting study time?

5. **PREREQUISITES & PROGRESSION**
   - Are there specific courses required for their major?
   - Any courses they need to graduate on time?

=== CONVERSATION GUIDELINES ===
- Be conversational and friendly, not interrogative
- Ask ONE or TWO questions at a time, then respond to their answers
- Show empathy and understanding
- Reference their academic data naturally when relevant
- Don't overwhelm them with too many questions at once
- Build rapport before diving into preferences
- Remember and reference what they've told you previously

=== IMPORTANT ===
- Do NOT recommend specific courses yet - that comes at the end
- Focus on understanding the WHOLE student
- The more you learn, the better your recommendations will be
- Be encouraging about their strengths, supportive about challenges"""

    def chat(self, user_message: str) -> str:
        """Process user message and return response."""
        self.conversation_history.append(HumanMessage(content=user_message))
        
        messages = [SystemMessage(content=self.system_prompt)]
        messages.extend(self.conversation_history)
        
        response = self.llm.invoke(messages)
        self.conversation_history.append(AIMessage(content=response.content))
        
        return response.content
    
    def analyze_conversation(self) -> Dict[str, Any]:
        """Analyze conversation to extract all preferences and insights."""
        conversation_text = "\n".join([
            f"{'Student' if isinstance(msg, HumanMessage) else 'Advisor'}: {msg.content}"
            for msg in self.conversation_history
        ])
        
        analysis_prompt = f"""Analyze this academic advising conversation and extract detailed information about the student's preferences.

=== CONVERSATION ===
{conversation_text}

=== EXTRACT THE FOLLOWING ===
Provide a structured JSON-like analysis with these categories:

1. **INTERESTS & PASSIONS**
   - Main academic interests
   - Specific topics or fields mentioned
   - Activities they enjoy

2. **CAREER ASPIRATIONS**
   - Career goals mentioned
   - Industries of interest
   - Job roles they're targeting

3. **SCHEDULE PREFERENCES**
   - Preferred time of day (morning/afternoon/evening)
   - Preferred days
   - Times to avoid
   - Other commitments mentioned (work, clubs, etc.)

4. **INSTRUCTOR PREFERENCES**
   - Teaching style preference (strict/fair/lenient)
   - Learning environment preference
   - Any specific instructor traits mentioned

5. **WORKLOAD PREFERENCES**
   - Desired course load (heavy/moderate/light)
   - Challenge level they want
   - Time available for studying

6. **KEY KEYWORDS**
   - List of important keywords representing their interests

7. **SPECIAL CONSIDERATIONS**
   - Any unique circumstances
   - Constraints or requirements mentioned
   - Personal situations affecting course selection

Be thorough and extract as much relevant information as possible."""

        response = self.llm.invoke([SystemMessage(content=analysis_prompt)])
        return response.content
    
    def get_course_recommendations(self) -> str:
        """Generate comprehensive course recommendations."""
        
        # Analyze the conversation
        preference_analysis = self.analyze_conversation()
        
        # Build search query from preferences and academic data
        search_components = []
        search_components.extend(self.academic_analysis['strong_subjects'])
        search_components.extend(self.academic_analysis['extracurricular'])
        search_components.append(self.student.get('branch', ''))
        
        search_query = f"""
Student studying {self.student.get('branch', 'general')} in year {self.student.get('year_of_study', 1)}.
Strong in: {', '.join(self.academic_analysis['strong_subjects'])}
Activities: {', '.join(self.academic_analysis['extracurricular'])}
Preferences and interests: {preference_analysis}
"""
        
        # Search for relevant courses
        relevant_courses = self.vectorstore.similarity_search(search_query, k=15)
        course_context = "\n\n---\n\n".join([doc.page_content for doc in relevant_courses])
        
        # Generate recommendations
        recommendation_prompt = f"""You are an expert university academic advisor creating a personalized course schedule for {self.student['name']}.

╔══════════════════════════════════════════════════════════════╗
║              STUDENT PROFILE & ACADEMIC DATA                 ║
╚══════════════════════════════════════════════════════════════╝
{self.student_context}

╔══════════════════════════════════════════════════════════════╗
║         CONVERSATION ANALYSIS & PREFERENCES                  ║
╚══════════════════════════════════════════════════════════════╝
{preference_analysis}

╔══════════════════════════════════════════════════════════════╗
║                  AVAILABLE COURSES                           ║
╚══════════════════════════════════════════════════════════════╝
{course_context}

╔══════════════════════════════════════════════════════════════╗
║              RECOMMENDATION CRITERIA                         ║
╚══════════════════════════════════════════════════════════════╝
Weight each factor accordingly:
1. Student's expressed interests & career goals (25%)
2. Academic strengths & GPA alignment (20%)
3. Schedule preference match (15%)
4. Instructor style compatibility (15%)
5. Workload balance & credit considerations (10%)
6. Branch/Major relevance (10%)
7. Prerequisite fulfillment (5%)

╔══════════════════════════════════════════════════════════════╗
║                    YOUR TASK                                 ║
╚══════════════════════════════════════════════════════════════╝
Recommend exactly 5 courses, ranked by overall fit (best first).

For EACH course, provide:

🎯 **[RANK] COURSE NAME (Course ID)**
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📋 **Why This Course:**
[Explain how it matches their interests, career goals, and academic profile]

👨‍🏫 **About the Instructor:**
[Instructor name, teaching style, and why they'd be a good fit for this student]

📅 **Schedule Details:**
[Days, times, classroom - and how it fits their schedule preferences]

📊 **Academic Fit:**
[How it aligns with their GPA, prerequisites, and workload preferences]

💼 **Career Connection:**
[How this course helps their career goals]

⚠️ **Potential Challenges:**
[Any difficulties they might face and how to overcome them]

🎯 **Match Score: X/100**
[Overall recommendation confidence]

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

After listing all 5 courses, provide:

📆 **PROPOSED WEEKLY SCHEDULE**
Create a visual weekly schedule showing how these courses fit together.

💡 **ADDITIONAL ADVICE**
Any tips for success in these courses.

Make the response encouraging, personalized, and actionable!"""

        response = self.llm.invoke([SystemMessage(content=recommendation_prompt)])
        return response.content


def display_students(students_data: Dict[str, Any]) -> None:
    """Display available students for selection."""
    print("\n" + "=" * 70)
    print("🎓 AVAILABLE STUDENTS")
    print("=" * 70)
    
    for student in students_data["students"]:
        academic = student["academic_data"]
        print(f"""
  [{student['student_id']}] {student['name']}
      📧 {student.get('email', 'N/A')}
      🏫 {student.get('university_name', 'N/A')} - {student.get('branch', 'N/A')}
      📅 Year {student.get('year_of_study', 'N/A')} | GPA: {academic['overall_gpa']}/4.0
      📚 Credits: {academic.get('totalCredits', 0)} total | {academic.get('creditsThisSemester', 0)} this semester
""")


def main():
    """Main function to run the course recommendation system."""
    print("\n" + "═" * 70)
    print("🎓 UNIVERSITY COURSE RECOMMENDATION SYSTEM")
    print("═" * 70)
    print("Powered by LangChain + OpenAI GPT-4 + Pinecone Vector DB")
    print("═" * 70)
    
    # Load data
    print("\n📊 Loading data...")
    students_data = load_json_data("students_data.json")
    courses_data = load_json_data("courses_data.json")
    print(f"   ✅ Loaded {len(students_data['students'])} students")
    print(f"   ✅ Loaded {len(courses_data['courses'])} courses")
    
    # Initialize vector store
    print("\n🔧 Initializing vector database...")
    course_documents = create_course_documents(courses_data)
    vectorstore = initialize_vector_store(course_documents)
    
    # Display available students
    display_students(students_data)
    
    # Student selection
    print("-" * 70)
    student_id = input("Enter Student ID (e.g., STU001): ").strip().upper()
    
    student = get_student_profile(student_id, students_data)
    if not student:
        print("❌ Student not found! Please try again.")
        return
    
    # Calculate academic analysis
    academic_analysis = calculate_academic_analysis(student)
    
    # Initialize advisor
    advisor = UniversityCourseAdvisor(vectorstore, student, academic_analysis, courses_data)
    
    # Welcome message
    print("\n" + "═" * 70)
    print(f"✅ Welcome, {student['name']}!")
    print("═" * 70)
    print(f"""
📋 Your Profile:
   🏫 {student.get('university_name', 'University')}
   📚 {student.get('branch', 'N/A')} - Year {student.get('year_of_study', 'N/A')}
   📊 GPA: {academic_analysis['overall_gpa']}/4.0
   ✨ Strong in: {', '.join(academic_analysis['strong_subjects']) if academic_analysis['strong_subjects'] else 'Building skills'}
""")
    print("-" * 70)
    print("""
🤖 Academic Advisor: Hello! I'm your academic advisor, and I'm here to help 
   you choose the perfect courses for next semester.

   Before I make recommendations, I'd love to learn more about:
   • Your interests and career goals
   • Your schedule preferences
   • What kind of teaching style works best for you
   • How challenging you want your semester to be

   Let's start with a simple question: What subjects or topics are you 
   most excited about exploring this semester?

   💡 Commands:
      • Type 'recommend' when ready for course suggestions
      • Type 'profile' to see your full academic profile
      • Type 'quit' to exit
""")
    print("-" * 70)
    
    # Conversation loop
    while True:
        user_input = input("\n👤 You: ").strip()
        
        if not user_input:
            continue
        
        if user_input.lower() == 'quit':
            print("\n👋 Goodbye! Best of luck with your course selection!")
            break
        
        if user_input.lower() == 'profile':
            print("\n" + create_student_context(student, academic_analysis))
            continue
        
        if user_input.lower() == 'recommend':
            if len(advisor.conversation_history) < 4:
                print("""
🤖 Advisor: I'd love to give you recommendations, but I want to make sure 
   they're truly personalized! Let's chat a bit more first.
   
   Tell me:
   • What times of day do you prefer for classes?
   • Do you like strict professors or more relaxed ones?
   • What career are you aiming for?
""")
                continue
            
            print("\n" + "═" * 70)
            print("🎯 GENERATING YOUR PERSONALIZED COURSE RECOMMENDATIONS...")
            print("═" * 70)
            print("(Analyzing your preferences, schedule, and academic data...)")
            print("(This may take a moment...)\n")
            
            recommendations = advisor.get_course_recommendations()
            
            print("\n" + "═" * 70)
            print("📋 YOUR PERSONALIZED COURSE RECOMMENDATIONS")
            print("═" * 70)
            print(recommendations)
            print("\n" + "═" * 70)
            
            continue_chat = input("\nWould you like to discuss these recommendations? (yes/no): ").strip().lower()
            if continue_chat != 'yes':
                print("\n🎓 Thank you for using the Course Recommendation System!")
                print("   Good luck with your semester! 🌟")
                break
        else:
            response = advisor.chat(user_input)
            print(f"\n🤖 Advisor: {response}")


if __name__ == "__main__":
    main()
