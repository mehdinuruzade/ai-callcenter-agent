# Architecture Diagrams Guide

This document explains the three architecture diagrams included in the project.

## 📊 Available Diagrams

### 1. System Architecture Diagram
**File:** `architecture-diagram.png`

**Purpose:** High-level overview of the entire system architecture

**What it shows:**
- User/Caller interaction with the system
- Twilio voice integration
- Application server components (Next.js)
- WebSocket handlers (Twilio and OpenAI)
- Service layers (Real-time and Vector)
- External dependencies (PostgreSQL, Pinecone, OpenAI)
- Key features list
- Call flow summary
- Technology stack

**Use this when:**
- Explaining the system to stakeholders
- Understanding how components interact
- Planning infrastructure
- Onboarding new developers

---

### 2. Call Flow Sequence Diagram
**File:** `call-flow-diagram.png`

**Purpose:** Step-by-step visualization of what happens during a phone call

**What it shows:**
- 21 sequential steps from call initiation to completion
- Interactions between: Caller, Twilio, App Server, OpenAI, Database
- Four distinct phases:
  1. **Initialization Phase** (Steps 1-6)
     - Phone call received
     - Webhook triggered
     - Business lookup
     - Call log creation
     - TwiML response
  
  2. **WebSocket Connection Phase** (Steps 7-8)
     - Twilio WebSocket established
     - OpenAI WebSocket established
  
  3. **Audio Streaming Phase** (Steps 9-18)
     - Audio streaming bidirectionally
     - RAG knowledge base queries (when needed)
     - Vector search for relevant content
     - AI response generation
  
  4. **Completion Phase** (Steps 19-21)
     - Call hangup
     - Transcript saving
     - Statistics update

**Use this when:**
- Understanding the call lifecycle
- Debugging call issues
- Implementing new features
- Performance optimization
- Explaining to technical team

---

### 3. Database Schema Diagram
**File:** `database-schema.png`

**Purpose:** Visual representation of the database structure and relationships

**What it shows:**
- **6 Main Tables:**
  1. **User** - Admin/manager accounts
  2. **Business** - Business/organization entities
  3. **PhoneNumber** - Twilio phone numbers
  4. **RAGContent** - Knowledge base content
  5. **Configuration** - Business-specific settings
  6. **CallLog** - Call history and transcripts

- **Relationships:**
  - User → Business (1:N) - One user can manage multiple businesses
  - Business → PhoneNumber (1:N) - Multiple phone numbers per business
  - Business → RAGContent (1:N) - Multiple knowledge base items
  - Business → Configuration (1:N) - Multiple config settings
  - Business → CallLog (1:N) - Multiple call records

- **Field Details:**
  - Primary Keys (PK)
  - Foreign Keys (FK)
  - Data types
  - Constraints (Unique, Optional)

**Use this when:**
- Understanding data relationships
- Writing database queries
- Planning data migrations
- Adding new features
- Database optimization

---

## 🎯 How to Use These Diagrams

### For Project Presentations
1. Start with **System Architecture** for high-level overview
2. Deep dive into **Call Flow** for technical details
3. Reference **Database Schema** for data structure questions

### For Development
1. Keep **Call Flow** diagram open while coding call handling logic
2. Reference **Database Schema** when writing queries or models
3. Use **System Architecture** to understand service dependencies

### For Troubleshooting
1. **Call Flow** → Identify which step is failing
2. **System Architecture** → Check service connectivity
3. **Database Schema** → Verify data integrity

### For Documentation
- Include relevant diagram in:
  - Technical specifications
  - API documentation
  - Developer onboarding materials
  - System design reviews

---

## 📝 Diagram Descriptions

### System Architecture Highlights

**Top Section:**
- Shows the user journey from making a call through Twilio to the app

**Middle Section (Application Server):**
- Three main handler types: WebSocket handlers and API routes
- Two service layers: Real-time (for calls) and Vector (for RAG)
- Database service using Prisma ORM

**Bottom Section:**
- Three external services each with their purpose
- Clear arrows showing data flow

**Side Panels:**
- Left: Key Features checklist
- Right: Detailed call flow steps

**Footer:**
- Complete technology stack breakdown

### Call Flow Diagram Features

**Timeline Layout:**
- Vertical columns for each actor/component
- Horizontal arrows showing message flow
- Numbered steps for easy reference

**Color Coding:**
- Orange: User/Caller actions
- Green: Twilio operations
- Blue: App Server operations
- Purple: OpenAI interactions
- Dark Blue: Database operations
- Red: Call termination

**Phase Boxes:**
- Yellow: Connection setup
- Blue: WebSocket phase
- Pink: Audio streaming
- Green: Knowledge base queries
- Orange: Completion

**Legend:**
- Solid lines: Requests
- Dotted lines: Responses

### Database Schema Features

**Table Design:**
- Color-coded by function:
  - Blue: User management
  - Green: Business/Phone
  - Purple: Content/Config
  - Orange: Call logs

**Relationship Lines:**
- Show cardinality (1:N)
- Clear foreign key connections
- Visual flow from parent to child

**Field Information:**
- Field names
- Data types
- Constraints (PK, FK, Unique)
- Optional fields marked with "?"

---

## 🔍 Reading Tips

### For Non-Technical Viewers

**System Architecture:**
- Focus on the boxes and what they represent
- Follow the arrows to see how data flows
- Read the "Call Flow" summary on the right

**Call Flow:**
- Follow the numbers sequentially (1-21)
- Each phase box describes what's happening
- Colored boxes group related operations

**Database Schema:**
- Each box is a data table
- Lines show how tables are connected
- Think of it as filing cabinets connected to each other

### For Technical Viewers

**System Architecture:**
- Note the service separation and responsibilities
- Identify bottlenecks and scaling points
- Plan resource allocation

**Call Flow:**
- Analyze latency at each step
- Identify error handling points
- Plan monitoring and logging

**Database Schema:**
- Review indexes needed
- Plan query optimization
- Consider data access patterns

---

## 🎨 Diagram Formats

All diagrams are:
- **Format:** PNG (high quality)
- **Resolution:** 2000-2400px wide
- **Color:** Full color with consistent theme
- **Text:** Clear, readable fonts
- **Use:** Can be included in presentations, docs, wikis

---

## 🔄 Keeping Diagrams Updated

When making system changes:

1. **Architecture Changes** → Update `architecture-diagram.png`
   - Adding new services
   - Changing technology stack
   - New integrations

2. **Process Changes** → Update `call-flow-diagram.png`
   - New steps in call flow
   - Different sequence
   - Additional phases

3. **Database Changes** → Update `database-schema.png`
   - New tables
   - New relationships
   - Field changes

You can regenerate diagrams by running the Python scripts in the project root:
- `create_architecture_diagram.py`
- `create_call_flow_diagram.py`
- `create_database_schema.py`

---

## 📚 Related Documentation

- **ARCHITECTURE.md** - Text-based architecture documentation
- **API.md** - Detailed API specifications
- **README.md** - Complete project documentation

---

## 💡 Tips for Understanding

1. **Start Simple:** Begin with the System Architecture
2. **Follow the Flow:** Use the Call Flow to see how things happen
3. **Understand the Data:** Check the Database Schema to see what's stored
4. **Connect the Dots:** See how diagrams relate to code structure
5. **Ask Questions:** Use diagrams to identify what you don't understand

---

These diagrams are your visual guide to the AI Call Center Agent system. Keep them handy while working with the codebase!
