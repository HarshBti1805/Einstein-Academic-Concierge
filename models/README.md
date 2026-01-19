# 🎓 Student Course Recommendation System

A LangChain-powered chatbot that recommends courses to students based on:
- **Conversational analysis** (student interests, passions, career goals)
- **Academic performance** (marks, grades, attendance)
- **School expectations** (best courses for best students)

## 🚀 Quick Start Guide

### Step 1: Set Up Environment Variables

Create a `.env` file in the `Salesforce` directory:

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
└── venv/                      # Virtual environment
```

## ☁️ Pinecone Cloud Deployment

This app uses **Pinecone Cloud (Serverless)** for vector storage - perfect for production!

### Setup Steps:

1. **Sign up for Pinecone**: https://www.pinecone.io/ (Free tier available!)
2. **Get your API key** from the Pinecone dashboard
3. **Set environment variables** in your deployment platform:
   ```bash
   PINECONE_API_KEY=your_api_key_here
   PINECONE_INDEX_NAME=course-recommendations  # Optional
   PINECONE_ENVIRONMENT=us-east-1               # Optional (AWS region)
   ```

4. **The index will be created automatically** on first run

**Benefits of Pinecone:**
- ✅ Fully managed cloud service (no local storage)
- ✅ Serverless - scales automatically
- ✅ Fast similarity search
- ✅ Free tier available (100K vectors)
- ✅ Works across multiple deployment instances
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
- Ensure you have sufficient quota (free tier: 100K vectors)
- Check the index name matches your Pinecone project

**Issue: Index creation fails**
- Verify your AWS region (`PINECONE_ENVIRONMENT`) is valid
- Check Pinecone dashboard for any account limitations
- Ensure your API key has permission to create indexes

## 📊 Features

- ✅ Conversational AI using GPT-4
- ✅ Pinecone Cloud vector database for semantic course search
- ✅ Academic performance analysis
- ✅ Interest-based recommendations
- ✅ Priority-ranked course suggestions
- ✅ Mock data for testing
- ✅ Production-ready cloud deployment