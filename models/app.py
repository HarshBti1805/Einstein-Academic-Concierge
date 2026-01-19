"""
Student Course Recommendation System
Using LangChain, OpenAI, and ChromaDB Vector Database
Recommends courses based on student conversation + academic performance
"""

import os
import json
from typing import List, Dict, Any
from dotenv import load_dotenv

from langchain_openai import OpenAIEmbeddings, ChatOpenAI
from langchain_chroma import Chroma
from langchain_core.documents import Document
from langchain_core.messages import HumanMessage, AIMessage, SystemMessage

# Load environment variables
load_dotenv()

# Constants
DATA_DIR = os.path.join(os.path.dirname(__file__), "data")
CHROMA_PERSIST_DIR = os.path.join(os.path.dirname(__file__), "chroma_db")


def load_json_data(filename: str) -> Dict[str, Any]:
    """Load JSON data from the data directory."""
    filepath = os.path.join(DATA_DIR, filename)
    with open(filepath, 'r', encoding='utf-8') as f:
        return json.load(f)


def create_course_documents(courses_data: Dict[str, Any]) -> List[Document]:
    """Convert courses data into LangChain Documents for vector storage."""
    documents = []
    
    for course in courses_data["courses"]:
        # Create rich text content for each course
        content = f"""
Course: {course['name']}
Category: {course['category']}
Difficulty: {course['difficulty']}
Course ID: {course['course_id']}

Description: {course['description']}

Skills Developed: {', '.join(course['skills_developed'])}
Career Paths: {', '.join(course['career_paths'])}
Prerequisites: {', '.join(course['prerequisites']) if course['prerequisites'] else 'None'}

Ideal For: {course['ideal_for']}
Minimum GPA Recommended: {course['min_gpa_recommended']}

Keywords: {', '.join(course['keywords'])}
"""
        
        doc = Document(
            page_content=content,
            metadata={
                "course_id": course['course_id'],
                "name": course['name'],
                "category": course['category'],
                "difficulty": course['difficulty'],
                "min_gpa": course['min_gpa_recommended'],
                "keywords": ", ".join(course['keywords'])
            }
        )
        documents.append(doc)
    
    return documents


def initialize_vector_store(documents: List[Document]) -> Chroma:
    """Initialize ChromaDB vector store with course documents."""
    embeddings = OpenAIEmbeddings()
    
    # Create or load the vector store
    vectorstore = Chroma.from_documents(
        documents=documents,
        embedding=embeddings,
        persist_directory=CHROMA_PERSIST_DIR,
        collection_name="courses"
    )
    
    return vectorstore


def get_student_profile(student_id: str, students_data: Dict[str, Any]) -> Dict[str, Any] | None:
    """Get a student's profile by their ID."""
    for student in students_data["students"]:
        if student["student_id"] == student_id:
            return student
    return None


def calculate_academic_score(student: Dict[str, Any]) -> Dict[str, Any]:
    """Calculate academic metrics and identify strengths/weaknesses."""
    subjects = student["academic_data"]["subjects"]
    
    # Calculate subject-wise performance
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
        "overall_gpa": student["academic_data"]["overall_gpa"],
        "attendance_percentage": student["academic_data"]["attendance_percentage"],
        "subject_scores": subject_scores,
        "strong_subjects": strong_subjects,
        "weak_subjects": weak_subjects,
        "participation_score": student["behavioral_data"]["participation_score"],
        "discipline_score": student["behavioral_data"]["discipline_score"],
        "extracurricular": student["behavioral_data"]["extracurricular"]
    }


def create_student_context(student: Dict[str, Any], academic_analysis: Dict[str, Any]) -> str:
    """Create a comprehensive student context string for the LLM."""
    context = f"""
=== STUDENT PROFILE ===
Name: {student['name']}
Class: {student['class']}
Age: {student['age']}

=== ACADEMIC PERFORMANCE ===
Overall GPA: {academic_analysis['overall_gpa']}/4.0
Attendance: {academic_analysis['attendance_percentage']}%
Participation Score: {academic_analysis['participation_score']}/10
Discipline Score: {academic_analysis['discipline_score']}/10

=== STRONG SUBJECTS ===
{', '.join(academic_analysis['strong_subjects']) if academic_analysis['strong_subjects'] else 'None identified'}

=== SUBJECTS NEEDING IMPROVEMENT ===
{', '.join(academic_analysis['weak_subjects']) if academic_analysis['weak_subjects'] else 'None identified'}

=== EXTRACURRICULAR ACTIVITIES ===
{', '.join(academic_analysis['extracurricular'])}

=== DETAILED SUBJECT PERFORMANCE ===
"""
    
    for subject, data in academic_analysis['subject_scores'].items():
        context += f"\n{subject}: {data['marks']}/100 (Grade: {data['grade']}, Attendance: {data['attendance']}%)"
        context += f"\n   Teacher's Remarks: {data['remarks']}"
    
    return context


class CourseRecommendationChatbot:
    """Main chatbot class for course recommendations."""
    
    def __init__(self, vectorstore: Chroma, student: Dict[str, Any], academic_analysis: Dict[str, Any]):
        self.vectorstore = vectorstore
        self.student = student
        self.academic_analysis = academic_analysis
        self.student_context = create_student_context(student, academic_analysis)
        
        # Initialize the LLM
        self.llm = ChatOpenAI(
            model="gpt-4o",
            temperature=0.7
        )
        
        # Conversation history
        self.conversation_history = []
        
        # Track discovered interests
        self.discovered_interests = []
        self.conversation_summary = ""
        
        # System prompt for the chatbot
        self.system_prompt = f"""You are a friendly and supportive academic counselor helping students discover the best courses for their future. 

You are currently talking with {student['name']}, a student in {student['class']}.

YOUR ROLE:
1. Have a natural, engaging conversation with the student
2. Learn about their interests, passions, dreams, and career aspirations
3. Ask about what subjects they enjoy and what activities excite them
4. Understand their learning style preferences
5. Be encouraging and supportive, especially about areas where they struggle

STUDENT'S ACADEMIC DATA:
{self.student_context}

CONVERSATION GUIDELINES:
- Be warm, friendly, and encouraging
- Ask open-ended questions to understand interests
- Show genuine interest in their responses
- Don't overwhelm with too many questions at once
- Acknowledge their strengths and gently encourage growth in weak areas
- Keep responses concise but meaningful

IMPORTANT: Do NOT recommend courses yet. First, have a meaningful conversation to understand the student's interests, dreams, and aspirations. The course recommendation will come later after gathering enough information."""

    def chat(self, user_message: str) -> str:
        """Process user message and return response."""
        # Add user message to history
        self.conversation_history.append(HumanMessage(content=user_message))
        
        # Build messages for the LLM
        messages = [SystemMessage(content=self.system_prompt)]
        messages.extend(self.conversation_history)
        
        # Get response from LLM
        response = self.llm.invoke(messages)
        
        # Add assistant response to history
        self.conversation_history.append(AIMessage(content=response.content))
        
        return response.content
    
    def analyze_conversation_interests(self) -> List[str]:
        """Analyze the conversation to extract student interests."""
        if len(self.conversation_history) < 2:
            return []
        
        # Create conversation text
        conversation_text = "\n".join([
            f"{'Student' if isinstance(msg, HumanMessage) else 'Counselor'}: {msg.content}"
            for msg in self.conversation_history
        ])
        
        analysis_prompt = f"""Analyze this conversation and extract the student's interests, passions, and career aspirations.

CONVERSATION:
{conversation_text}

Based on this conversation, list:
1. Main interests and passions expressed
2. Career aspirations mentioned
3. Preferred learning style (if apparent)
4. Any specific subjects or activities they enjoy
5. Key keywords that represent their interests

Provide your analysis in a structured format."""

        response = self.llm.invoke([SystemMessage(content=analysis_prompt)])
        self.conversation_summary = response.content
        
        return response.content
    
    def get_course_recommendations(self) -> str:
        """Generate final course recommendations based on conversation and academic data."""
        
        # First, analyze the conversation
        interest_analysis = self.analyze_conversation_interests()
        
        # Search for relevant courses in vector store
        # Combine academic strengths with discovered interests for search
        search_queries = []
        
        # Add strong subjects
        search_queries.extend(self.academic_analysis['strong_subjects'])
        
        # Add extracurricular activities
        search_queries.extend(self.academic_analysis['extracurricular'])
        
        # Create a combined search query
        search_query = f"Student interested in: {', '.join(search_queries)}. {interest_analysis}"
        
        # Search for relevant courses
        relevant_courses = self.vectorstore.similarity_search(search_query, k=10)
        
        # Create course context
        course_context = "\n\n".join([doc.page_content for doc in relevant_courses])
        
        # Generate recommendations
        recommendation_prompt = f"""You are an expert academic counselor. Based on the following information, recommend the TOP 5 COURSES for this student, sorted by priority (best fit first).

=== STUDENT ACADEMIC DATA ===
{self.student_context}

=== CONVERSATION ANALYSIS (Student's Expressed Interests) ===
{interest_analysis}

=== AVAILABLE COURSES ===
{course_context}

=== RECOMMENDATION CRITERIA ===
Consider these factors with the following weights:
1. Student's expressed interests and passions (35%)
2. Academic performance and strengths (30%)
3. Career aspirations mentioned (20%)
4. School's expectation to give best courses to best students (15%)

The school believes top performers deserve challenging, high-value courses, but student interest and fit are equally important.

=== YOUR TASK ===
Recommend exactly 5 courses, ranked by priority (1 = best fit).

For each course, provide:
1. Course Name and ID
2. Why this course is recommended (connecting to both interests AND academics)
3. How the student's strengths align with this course
4. Potential challenges and how to overcome them
5. Career opportunities this opens up
6. A confidence score (1-100) for this recommendation

Format your response in a clear, encouraging way that motivates the student."""

        response = self.llm.invoke([SystemMessage(content=recommendation_prompt)])
        
        return response.content


def display_students(students_data: Dict[str, Any]) -> None:
    """Display available students for selection."""
    print("\n" + "=" * 60)
    print("📚 AVAILABLE STUDENTS")
    print("=" * 60)
    
    for student in students_data["students"]:
        print(f"\n  [{student['student_id']}] {student['name']}")
        print(f"      Class: {student['class']} | GPA: {student['academic_data']['overall_gpa']}")


def main():
    """Main function to run the course recommendation chatbot."""
    print("\n" + "=" * 60)
    print("🎓 STUDENT COURSE RECOMMENDATION SYSTEM")
    print("=" * 60)
    print("Powered by LangChain + OpenAI + ChromaDB")
    print("=" * 60)
    
    # Load data
    print("\n📊 Loading data...")
    students_data = load_json_data("students_data.json")
    courses_data = load_json_data("courses_data.json")
    
    # Create course documents and initialize vector store
    print("🔧 Initializing vector database...")
    course_documents = create_course_documents(courses_data)
    vectorstore = initialize_vector_store(course_documents)
    
    # Display available students
    display_students(students_data)
    
    # Student selection
    print("\n" + "-" * 60)
    student_id = input("Enter Student ID (e.g., STU001): ").strip().upper()
    
    student = get_student_profile(student_id, students_data)
    if not student:
        print("❌ Student not found! Please try again.")
        return
    
    # Calculate academic analysis
    academic_analysis = calculate_academic_score(student)
    
    # Initialize chatbot
    print(f"\n✅ Loaded profile for: {student['name']}")
    print("-" * 60)
    
    chatbot = CourseRecommendationChatbot(vectorstore, student, academic_analysis)
    
    # Welcome message
    print(f"\n🤖 Counselor: Hello {student['name']}! I'm your academic counselor.")
    print("   I'm here to help you discover the best courses for your future.")
    print("   Let's have a chat about your interests, dreams, and aspirations!")
    print("\n   (Type 'recommend' to get course recommendations)")
    print("   (Type 'quit' to exit)")
    print("-" * 60)
    
    # Conversation loop
    while True:
        user_input = input("\n👤 You: ").strip()
        
        if not user_input:
            continue
        
        if user_input.lower() == 'quit':
            print("\n👋 Goodbye! Best of luck with your academic journey!")
            break
        
        if user_input.lower() == 'recommend':
            if len(chatbot.conversation_history) < 4:
                print("\n🤖 Counselor: Let's chat a bit more first! I want to understand")
                print("   your interests better before making recommendations.")
                print("   Tell me - what subjects or activities excite you the most?")
                continue
            
            print("\n" + "=" * 60)
            print("🎯 GENERATING PERSONALIZED COURSE RECOMMENDATIONS...")
            print("=" * 60)
            print("(Analyzing your conversation and academic data...)")
            
            recommendations = chatbot.get_course_recommendations()
            
            print("\n" + "=" * 60)
            print("📋 YOUR PERSONALIZED COURSE RECOMMENDATIONS")
            print("=" * 60)
            print(recommendations)
            print("\n" + "=" * 60)
            
            continue_chat = input("\nWould you like to discuss these recommendations? (yes/no): ").strip().lower()
            if continue_chat != 'yes':
                print("\n👋 Thank you for using the Course Recommendation System!")
                print("   Good luck with your academic journey! 🌟")
                break
        else:
            response = chatbot.chat(user_input)
            print(f"\n🤖 Counselor: {response}")


if __name__ == "__main__":
    main()
