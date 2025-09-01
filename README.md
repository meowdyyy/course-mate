# Course Management Platform (CourseMate)

Modernized MERN application focused on courses, enrollments, learning resources, real-time direct & group chat, and notifications. (Legacy assignments, grades, attendance, and inbox-style messaging have been fully removed.)

## Features Overview

This system supports two roles with role-based access control: Student and Admin.

### Student Features
- **Registration & Profile**: Simple signup and profile management
- **Course Enrollment**: Browse approved courses and enroll (capacity enforced)
- **Course Materials & Resources**: Access approved resources and materials after enrollment
- **Real-time Chat**: 1:1 and group (course-linked) conversations with presence, typing indicators, unread counts
- **Notifications**: View platform notifications
- **Dashboard**: Snapshot of enrollments, unread chats, notifications, recent resources

### Admin Features
- **Course Management**: Create, approve, and manage course content & resources
- **Content Upload**: Upload and curate course materials (PDFs, videos, docs)
- **User Management**: Activate/deactivate accounts & manage roles
- **Analytics (Simplified)**: Basic platform usage metrics (academic evaluation analytics removed)
- **Real-time Chat Participation**: Engage in direct/group chats

## Tech Stack (Active Modules)

### Frontend
- **React.js** - Modern UI framework with hooks
- **React Router** - Client-side routing and navigation
- **Tailwind CSS** - Utility-first CSS framework for responsive design
- **Headless UI** - Accessible UI components
- **Axios** - HTTP client for API communication
- **React Hot Toast** - Toast notifications
- **Heroicons** - Beautiful SVG icons

### Backend
- **Node.js** - JavaScript runtime environment
- **Express.js** - Fast web application framework
- **MongoDB** - NoSQL database for flexible data storage
- **Mongoose** - ODM for MongoDB with validation
- **JWT** - JSON Web Tokens for secure authentication
- **bcryptjs** - Password hashing for security
- **Express Validator** - Input validation and sanitization
- **Multer** - File upload handling middleware

## Installation & Setup

### Prerequisites
- Node.js (v14 or higher)
- MongoDB (local installation or MongoDB Atlas)
- npm or yarn package manager

### Backend Setup

1. **Navigate to backend directory**:
```bash
cd backend
```

2. **Install dependencies**:
```bash
npm install
```

3. **Create environment file (.env)**:
```env
NODE_ENV=development
PORT=5000
MONGODB_URI=[]
JWT_SECRET=your_super_secret_jwt_key_here_make_it_long_and_secure
JWT_EXPIRES_IN=7d

# Admin User (for initial setup)
ADMIN_EMAIL=admin@admin.com
ADMIN_PASSWORD=admin123
ADMIN_FIRST_NAME=Super
ADMIN_LAST_NAME=Admin

# Email Configuration (Optional)
EMAIL_FROM=noreply@coursemate.com
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your_email@gmail.com
EMAIL_PASS=your_app_password

# File Upload Settings
MAX_FILE_SIZE=10485760
UPLOAD_PATH=./uploads
CLIENT_URL=http://localhost:3000
```

4. **Create admin user**:
```bash
npm run create-admin
```

5. **Start the backend server**:
```bash
npm run dev
```

### Frontend Setup

1. **Navigate to frontend directory**:
```bash
cd frontend
```

2. **Install dependencies**:
```bash
npm install
```

3. **Start the development server**:
```bash
npm start
```

The application will be available at `http://localhost:3000`

## System Architecture (Current Scope)

### Authentication & Authorization
- **JWT-based authentication** with secure token management
- **Role-based access control** (Student, Admin)
- **Password hashing** using bcryptjs with salt rounds
- **Session management** with automatic token refresh

### Database Design (Active Collections)
- **Users**: Profiles, roles, status
- **Courses**: Course metadata & ownership
- **Enrollments**: Student-course relationships
- **Resources/Materials**: Uploaded course content
- **Conversations & Messages**: Real-time chat (conversation-scoped messages)
- **Notifications**: System notifications

Removed collections (legacy): Assignments, Submissions, Grades, Attendance, Inbox Messages.

## Key Features Implementation

### User Account System
- **Student Registration**: Free and immediate account activation
- **Admin Oversight**: Full control over course and system management

### Course Enrollment System
- **Capacity Management**: Automatic enrollment limits with real-time availability
- **Approval Workflow**: Admin approval required for course activation
- **Enrollment Validation**: Prevents duplicate enrollments and capacity overflow

### Communication System
- **Real-time Chat**: Socket.IO-powered direct & group conversations (course-linked groups, invites, typing, presence, unread counts)
- **User Search**: Filtered search for course-enrolled users when inviting to groups
- **Notification System**: Platform event notifications

## Security Features

- **Input Validation**: Comprehensive validation using Express Validator
- **File Upload Security**: Restricted file types, size limits, and secure storage
- **Authentication Middleware**: Protected routes with role verification
- **Data Encryption**: Bcrypt password hashing with secure salt rounds
- **Role-based Access**: Granular permissions based on user roles and verification status

## User Experience

### Responsive Design
- **Mobile-First Approach**: Optimized for all device sizes
- **Intuitive Navigation**: Clean and organized interface with role-based menus
- **Accessible Components**: ARIA-compliant UI elements
- **Fast Loading**: Optimized performance with efficient data loading

### Dashboard Overview
- **Student**: Enrollments, unread chat aggregate, recent chats, notifications, recent resources
- **Admin**: Course management quick stats, user management shortcuts, notifications

## API Documentation

### Authentication Endpoints
- `POST /api/auth/register` - User registration (students immediate)
- `POST /api/auth/login` - User login
- `GET /api/auth/me` - Get current user profile
- `PUT /api/auth/profile` - Update user profile information

### Course Management
- `GET /api/courses` - List courses with filtering and approval status
- `POST /api/courses` - Create new course (admin only, requires approval)
- `GET /api/courses/:id` - Get course details with enrollment information
- `PUT /api/courses/:id/approve` - Approve course (admin only)

### Enrollment System
- `POST /api/enrollments` - Enroll in approved course
- `GET /api/enrollments/student/:id` - Get student enrollments with progress
- `DELETE /api/enrollments/:id` - Drop from course

### Real-time Chat
- `GET /api/chat/conversations` - List conversations
- `POST /api/chat/conversations` - Start or fetch direct conversation
- `GET /api/chat/conversations/:id/messages` - Paginated messages
- `POST /api/chat/conversations/:id/read` - Mark read
- `POST /api/chat/groups` - Create group conversation (course-linked)
- `GET /api/chat/groups` - List group conversations
- `GET /api/chat/group-invites` - Pending group invites
- `POST /api/chat/groups/:id/invite` - Invite members
- `POST /api/chat/groups/:id/respond` - Accept/reject invite
- `POST /api/chat/groups/:id/leave` - Leave group
- `DELETE /api/chat/groups/:id` - Delete group (creator)
- `GET /api/chat/search-users` - Search users (optionally constrained by course)

### User Management (Admin only)
- `GET /api/users` - List users
- `PUT /api/users/:id` - Update user
- `GET /api/admin/users` - Comprehensive user management interface

## Production Deployment

### Environment Setup
- Set up production MongoDB database with proper indexes
- Configure environment variables for production security
- Set up file storage system for uploaded content
- Configure email service for notifications and verification

### Security Checklist
- [x] Environment variables secured
- [x] Database connection with authentication
- [x] File upload directories with proper permissions
- [x] HTTPS enabled for production
- [x] Rate limiting configured
- [x] Input validation on all endpoints

## System Workflow

### Student Journey (Current)
1. **Registration**: Create account
2. **Course Discovery**: Browse & enroll
3. **Learning**: Access materials & resources
4. **Collaboration**: Engage via direct/group chat
5. **Stay Informed**: Receive notifications

### Course Ownership
Courses have an `owner` field referencing the user (currently an admin) who created the course.

### Admin Workflow (Current)
1. **Create & Approve Courses**
2. **Manage Users**
3. **Monitor Resources & Conversations**

## Key Metrics

### Platform Statistics
- **User Base**: Students and Administrators
- **Course Capacity**: Unlimited courses with enrollment limits
- **File Handling**: Secure upload/download with type restrictions
- **Performance**: Optimized for educational workflows
- **Scalability**: Designed for institutional growth

---

**CourseMate - Focused Course & Communication Platform**

*Streamlined learning resources, enrollment, and real-time collaboration.*

---
