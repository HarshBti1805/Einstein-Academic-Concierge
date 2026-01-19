# 🎓 Student Course Recommendation System

A LangChain-powered chatbot that recommends courses to students based on:
- **Conversational analysis** (student interests, passions, career goals)
- **Academic performance** (marks, grades, attendance)
- **School expectations** (best courses for best students)

## 🚀 Quick Start Guide

### Step 1: Set Up Environment Variables

Create a `.env` file in the `Salesforce` directory with your OpenAI API key:

```bash
OPENAI_API_KEY=your_openai_api_key_here
```

**Note:** You mentioned you've already added the OpenAI API key. If it's set as an environment variable in your system, you can skip this step. Otherwise, create the `.env` file.

### Step 2: Activate Virtual Environment

Since you already have a virtual environment set up, activate it:

**Windows PowerShell:**
```powershell
.\venv\Scripts\Activate.ps1
```

**Windows Command Prompt:**
```cmd
.\venv\Scripts\activate.bat
```

### Step 3: Install Dependencies (if needed)

All packages appear to be installed, but if you need to reinstall:

```bash
pip install -r requirements.txt
```

### Step 4: Run the Application

```bash
python app.py
```

## 📖 How to Use

1. **Start the app** - Run `python app.py`

2. **Select a student** - Choose from available students:
   - `STU001` - Alex Thompson (GPA: 3.7)
   - `STU002` - Sarah Chen (GPA: 3.9)
   - `STU003` - Marcus Johnson (GPA: 2.8)
   - `STU004` - Emily Rodriguez (GPA: 3.5)
   - `STU005` - David Kim (GPA: 3.2)

3. **Have a conversation** - Chat with the counselor about:
   - Your interests and passions
   - Career aspirations
   - Favorite subjects
   - Learning preferences

4. **Get recommendations** - Type `recommend` to get your personalized top 5 courses

5. **Exit** - Type `quit` to exit

## 🎯 Example Conversation

```
👤 You: I love coding and building apps. I want to work in tech.

🤖 Counselor: That's wonderful! Tell me more about what kind of apps 
   you enjoy building...

👤 You: I'm really into AI and machine learning. I think robots are cool.

🤖 Counselor: Fascinating! AI is a rapidly growing field...

👤 You: recommend
```

## 📁 Project Structure

```
Salesforce/
├── app.py                      # Main application
├── requirements.txt            # Dependencies
├── data/
│   ├── students_data.json     # Mock student data
│   └── courses_data.json      # 20 available courses
├── chroma_db/                 # Vector database (auto-created)
└── venv/                      # Virtual environment
```

## 🔧 Troubleshooting

**Issue: "OPENAI_API_KEY not found"**
- Create a `.env` file with your API key
- Or set it as a system environment variable

**Issue: Import errors**
- Make sure virtual environment is activated
- Run: `pip install -r requirements.txt`

**Issue: ChromaDB errors**
- Delete the `chroma_db` folder and restart
- The database will be recreated automatically

## 📊 Features

- ✅ Conversational AI using GPT-4
- ✅ Vector database for semantic course search
- ✅ Academic performance analysis
- ✅ Interest-based recommendations
- ✅ Priority-ranked course suggestions
- ✅ Mock data for testing
