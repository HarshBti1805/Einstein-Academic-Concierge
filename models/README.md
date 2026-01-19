# 🎓 Student Course Recommendation System - Flask API

A LangChain-powered chatbot API that recommends courses to students based on:
- **Conversational analysis** (student interests, passions, career goals)
- **Academic performance** (marks, grades, attendance)
- **Schedule preferences & workload balance**
- **Instructor teaching style preferences**

## 🚀 Quick Start Guide

### Step 1: Set Up Environment Variables

Create a `.env` file in the `models` directory:

```bash
# Required
OPENAI_API_KEY=your_openai_api_key_here
PINECONE_API_KEY=your_pinecone_api_key_here

# Optional Pinecone Configuration
PINECONE_INDEX_NAME=course-recommendations  # Default: "course-recommendations"
PINECONE_ENVIRONMENT=us-east-1               # AWS region for serverless (default: "us-east-1")
```

**Note:** 
- **PINECONE_API_KEY is REQUIRED** - Get it from: https://www.pinecone.io/
- The app uses Pinecone Cloud (serverless) for vector storage
- Index will be created automatically if it doesn't exist

### Step 2: Activate Virtual Environment

**Windows PowerShell:**
```powershell
.\venv\Scripts\Activate.ps1
```

**Windows Command Prompt:**
```cmd
.\venv\Scripts\activate.bat
```

### Step 3: Install Dependencies

```bash
pip install -r requirements.txt
```

### Step 4: Run the Flask API

```bash
python app.py
```

The API will start at `http://localhost:5000`

## 🔌 API Endpoints

### Health Check
```
GET /api/health
```
Returns the status of the API and whether all components are loaded.

### Get Student Profile
```
GET /api/student/<student_id>
```
Returns student profile, academic analysis, and dashboard data.

**Example:**
```bash
curl http://localhost:5000/api/student/STU001
```

### Start Chat Session
```
POST /api/chat/start
Content-Type: application/json

{
  "student_id": "STU001"
}
```
Initializes a new chat session for the student and returns a welcome message.

### Send Message
```
POST /api/chat/message
Content-Type: application/json

{
  "student_id": "STU001",
  "message": "I'm interested in programming and AI"
}
```
Sends a message to the AI advisor and receives a response.

**Response:**
```json
{
  "response": "That's exciting! AI and programming are...",
  "conversation_length": 2,
  "can_recommend": false
}
```

### Get Recommendations
```
POST /api/chat/recommend
Content-Type: application/json

{
  "student_id": "STU001"
}
```
Generates personalized course recommendations based on the conversation.

**Response:**
```json
{
  "recommendations": [
    {
      "code": "CS101",
      "name": "Advanced Programming & Software Development",
      "credits": 3,
      "instructor": "Dr. Michael Chen",
      "schedule": "Mon/Wed/Fri 10:00 AM-11:30 AM",
      "priority": 1,
      "reason": "Matches your interest in programming...",
      "totalSeats": 260,
      "occupiedSeats": 178,
      "bookingStatus": "open"
    }
  ],
  "message": "Based on our conversation..."
}
```

### Get All Courses
```
GET /api/courses
```
Returns all available courses with full details.

### Get Seat Availability
```
GET /api/seats
GET /api/seats/<course_id>
```
Returns seat availability for all courses or a specific course.

## 🔗 Frontend Integration

The API is designed to work with the Next.js frontend. The frontend will:

1. **Auto-detect API availability** - Falls back to local mode if API is not running
2. **Start chat session** - Calls `/api/chat/start` when user visits assistant page
3. **Send messages** - Calls `/api/chat/message` for each user message
4. **Get recommendations** - Calls `/api/chat/recommend` when user requests recommendations
5. **Store recommendations** - Saves to sessionStorage for the bookings page

### Running Both Frontend and Backend

**Terminal 1 - Start Flask API:**
```bash
cd models
python app.py
```

**Terminal 2 - Start Next.js Frontend:**
```bash
cd client
npm run dev
```

## 📁 Project Structure

```
models/
├── app.py                      # Flask API application
├── requirements.txt            # Python dependencies
├── .env                        # Environment variables (create this)
├── data/
│   ├── students_data.json      # Student profiles (5 students)
│   ├── courses_data.json       # Course catalog (20 courses)
│   ├── dashboard_data.json     # Student dashboard data
│   ├── seats_data.json         # Seat availability data
│   └── chat_data.json          # Chat configuration
└── venv/                       # Virtual environment
```

## 📊 Available Students

| ID | Name | Branch | GPA | Year |
|----|------|--------|-----|------|
| STU001 | Alex Thompson | Computer Science | 3.7 | 1 |
| STU002 | Sarah Chen | Engineering | 3.9 | 2 |
| STU003 | Marcus Johnson | Performing Arts | 2.8 | 1 |
| STU004 | Emily Rodriguez | Psychology | 3.5 | 3 |
| STU005 | David Kim | Business Administration | 3.2 | 2 |

## ☁️ Pinecone Cloud Configuration

This app uses **Pinecone Cloud (Serverless)** for vector storage.

### Setup Steps:

1. **Sign up for Pinecone**: https://www.pinecone.io/ (Free tier available!)
2. **Get your API key** from the Pinecone dashboard
3. **Set environment variables** in `.env`
4. **The index will be created automatically** on first run

**Benefits of Pinecone:**
- ✅ Fully managed cloud service
- ✅ Serverless - scales automatically
- ✅ Fast similarity search
- ✅ Free tier available (100K vectors)
- ✅ Production-ready and reliable

## 🔧 Troubleshooting

**Issue: "OPENAI_API_KEY not found"**
- Create a `.env` file with your API key
- Or set it as a system environment variable

**Issue: Import errors**
- Make sure virtual environment is activated
- Run: `pip install -r requirements.txt`

**Issue: Pinecone connection fails**
- Verify your `PINECONE_API_KEY` is correct
- Check your Pinecone dashboard to ensure the API key is active

**Issue: CORS errors from frontend**
- The API includes CORS configuration for `localhost:3000`
- Ensure the frontend is running on the expected port

**Issue: Chat session not found**
- Sessions are stored in memory and reset on server restart
- The frontend will automatically create a new session if needed

## 📊 Features

- ✅ RESTful Flask API with CORS support
- ✅ Conversational AI using GPT-4
- ✅ Pinecone Cloud vector database for semantic course search
- ✅ Academic performance analysis
- ✅ Interest-based recommendations
- ✅ Real-time seat availability
- ✅ Session-based chat with history
- ✅ Graceful fallback to local mode in frontend
