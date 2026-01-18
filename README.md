# Predictive Auto-Registration Agent (Edu)

> **How might we design a predictive, autonomous registration agent that uses student goals, course demand data, and personal constraints to optimize a student's schedule and secure waitlist spots without constant manual intervention?**

## Overview

The Predictive Auto-Registration Agent (Edu) is an intelligent system designed to transform the stressful course registration experience into a seamless, self-service solution. By leveraging predictive analytics, autonomous monitoring, and conversational AI, the agent proactively manages student enrollment, optimizes schedules, and handles waitlist management—all while maintaining complete transparency and user control.

### The Problem

Traditional course registration presents significant challenges:

- **Stressful experience**: Students face anxiety during registration windows, competing for limited spots
- **Suboptimal schedules**: Manual selection often leads to conflicts, missed prerequisites, or inefficient course sequencing
- **High administrative burden**: Waitlist management requires constant manual monitoring and intervention
- **Missed opportunities**: Students miss prerequisites or fail to secure spots in high-demand courses
- **Registration holds and blocks**: Time-consuming resolution of administrative issues

### The Solution

A self-service experience that combines:

- **Conversational interface** powered by Einstein Copilot for natural language interactions
- **Visual schedule builder** for intuitive course planning
- **Autonomous monitoring** that works 24/7 to secure enrollment opportunities
- **Predictive scheduling** that optimizes course selection based on multiple variables
- **Transparent decision-making** with explainable AI and audit trails

## Core Features

### 🎯 Predictive Scheduling

Optimize course selection based on multiple variables including:
- Student academic goals and graduation timeline
- Course demand data and historical availability
- Prerequisite requirements and course sequencing
- Professor ratings and course quality metrics
- Personal constraints (work schedules, preferences, etc.)

### 🤖 Autonomous Waitlist Management

An intelligent agent that:
- Monitors course availability in real-time
- Automatically registers students when spots open
- Handles conflicts and prioritizes based on student goals
- Provides proactive notifications about status changes
- Manages multiple waitlists simultaneously

### ⚖️ Constraints Satisfaction

Intelligently balances competing priorities:
- **Academic goals**: Graduation requirements, major/minor requirements, GPA optimization
- **Prerequisites**: Ensures proper course sequencing
- **Personal constraints**: Work schedules, time preferences, location preferences
- **Course availability**: Real-time enrollment data and historical demand patterns

### 🔍 Transparency

Every automated decision is explainable:
- Clear reasoning for course prioritization
- Confidence levels for predictions
- Complete audit trail of all actions
- Real-time status updates with actionable recommendations

### 💬 User Experience

**Conversational Interface (Einstein Copilot)**
- Natural language queries: *"Am I on track to graduate in Spring 2026?"*
- Scenario testing: *"What if I drop Calculus II this semester?"*
- Constraint updates: *"I got a job, can't take classes before 10am"*
- Real-time assistance and guidance

**Visual Schedule Builder**
- Interactive course planning interface
- Drag-and-drop schedule adjustments
- Conflict detection and resolution suggestions
- Visual representation of course load and time distribution

## How It Works

### Conversational Agent

The conversational interface powered by Einstein Copilot enables students to interact with the system using natural language:

- **Natural language queries**: Ask questions about academic progress, course availability, or registration status
- **Scenario testing**: Explore "what-if" scenarios to understand the impact of schedule changes before committing
- **Constraint updates**: Easily communicate new personal constraints or preferences that the system will incorporate into future planning

### Autonomous Monitoring

The agent operates continuously through multiple phases:

#### Pre-Registration Phase
- Monitors when registration windows open
- Alerts about registration holds, blocks, or administrative issues
- Prepares optimized course plans based on current goals and constraints
- Validates prerequisites and course availability

#### During Registration Phase
- Executes registration plan in priority order
- Handles real-time conflicts as they arise
- Automatically adjusts strategy based on availability
- Provides live updates on registration progress

#### Post-Registration Phase
- Continuously monitors waitlists for enrolled courses
- Automatically attempts enrollment when spots become available
- Manages multiple waitlist positions strategically
- Tracks and reports on waitlist movement

#### Notifications
- Proactive updates on status changes
- Action recommendations when intervention is needed
- Alerts for important deadlines or opportunities
- Summary reports of automated actions taken

## Transparency & Trust Mechanisms

Building trust through complete visibility and control:

### Explainable AI

Every automated decision includes clear explanations:
- **Scoring factors**: *"Prioritized because: required for major, high historical demand, good professor ratings"*
- **Decision rationale**: Understand why specific courses were selected or actions were taken
- **Alternative options**: See what other paths were considered and why they weren't chosen

### Confidence Levels

- Display certainty of waitlist success predictions
- Show probability of course availability
- Indicate reliability of schedule recommendations
- Help students make informed decisions

### Audit Trail

Complete logging of all automated actions:
- Timestamped log of every registration attempt
- Record of all waitlist monitoring activities
- History of constraint updates and preference changes
- Track all system decisions and their outcomes

### Override Controls

Students maintain full control:
- Easy manual intervention at any point
- Ability to pause or disable autonomous actions
- Manual registration override when needed
- Custom priority adjustments

### What-If Simulator

Test different scenarios before committing:
- Explore impact of dropping or adding courses
- Simulate different graduation timelines
- Test constraint changes before applying
- Visualize multiple schedule options side-by-side

## Architecture

The system is built with a modern, scalable architecture:

- **Client**: Next.js application with React for the user interface
- **Server**: Node.js backend for API and business logic
- **Models**: Python-based predictive models and AI components
- **Integration**: Salesforce Einstein Copilot for conversational interface
- **Data**: SIS (Student Information System) integration for course data and enrollment

## Getting Started

### Prerequisites

- Node.js (v18 or higher)
- Python (v3.8 or higher)
- Salesforce org with Einstein Copilot enabled
- Access to SIS API or data export

### Installation

1. Clone the repository
2. Install client dependencies:
   ```bash
   cd client
   npm install
   ```

3. Install server dependencies:
   ```bash
   cd server
   npm install
   ```

4. Set up Python environment:
   ```bash
   cd models
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   pip install -r requirements.txt
   ```

5. Configure environment variables (see `.env.example`)

6. Start the development servers:
   ```bash
   # Terminal 1: Client
   cd client
   npm run dev

   # Terminal 2: Server
   cd server
   npm start

   # Terminal 3: Models
   cd models
   python app.py
   ```

## Future Enhancements

- Multi-student family account management
- Integration with academic advising systems
- Advanced ML models for demand prediction
- Mobile app for on-the-go monitoring
- Integration with calendar systems
- Social features for course planning with peers

## Contributing

Contributions are welcome! Please read our contributing guidelines before submitting pull requests.

## License

[Specify your license here]

## Contact

For questions or support, please [open an issue](link-to-issues) or contact the development team.

---

**Built with ❤️ for students who deserve a better registration experience**
