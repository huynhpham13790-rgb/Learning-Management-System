import { Navigate, Route, Routes } from 'react-router-dom';
import { useAuth } from './context/AuthContext.jsx';
import Layout from './components/Layout.jsx';
import Login from './pages/Login.jsx';
import Register from './pages/Register.jsx';
import Dashboard from './pages/Dashboard.jsx';
import Courses from './pages/Courses.jsx';
import CourseDetail from './pages/CourseDetail.jsx';
import Lesson from './pages/Lesson.jsx';
import Assignments from './pages/Assignments.jsx';
import AssignmentDetail from './pages/AssignmentDetail.jsx';
import Quiz from './pages/Quiz.jsx';
import LearningPath from './pages/LearningPath.jsx';
import Tutor from './pages/Tutor.jsx';
import Leaderboard from './pages/Leaderboard.jsx';
import Profile from './pages/Profile.jsx';
import AdminDashboard from './pages/admin/AdminDashboard.jsx';
import AdminUsers from './pages/admin/AdminUsers.jsx';
import AdminCourses from './pages/admin/AdminCourses.jsx';
import AdminAssignments from './pages/admin/AdminAssignments.jsx';
import AdminSubmissions from './pages/admin/AdminSubmissions.jsx';
import AdminQuizzes from './pages/admin/AdminQuizzes.jsx';

function RequireAuth({ children, roles }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="pad muted">Đang tải…</div>;
  if (!user) return <Navigate to="/login" replace />;
  if (roles && !roles.includes(user.role)) return <Navigate to="/" replace />;
  return children;
}

const staff = ['admin', 'teacher'];

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route
        element={
          <RequireAuth>
            <Layout />
          </RequireAuth>
        }
      >
        <Route index element={<Dashboard />} />
        <Route path="courses" element={<Courses />} />
        <Route path="courses/:id" element={<CourseDetail />} />
        <Route path="lessons/:id" element={<Lesson />} />
        <Route path="assignments" element={<Assignments />} />
        <Route path="assignments/:id" element={<AssignmentDetail />} />
        <Route path="quizzes/:id" element={<Quiz />} />
        <Route path="learning-path" element={<LearningPath />} />
        <Route path="tutor" element={<Tutor />} />
        <Route path="leaderboard" element={<Leaderboard />} />
        <Route path="profile" element={<Profile />} />
        <Route path="admin" element={<RequireAuth roles={staff}><AdminDashboard /></RequireAuth>} />
        <Route path="admin/users" element={<RequireAuth roles={['admin']}><AdminUsers /></RequireAuth>} />
        <Route path="admin/courses" element={<RequireAuth roles={staff}><AdminCourses /></RequireAuth>} />
        <Route path="admin/assignments" element={<RequireAuth roles={staff}><AdminAssignments /></RequireAuth>} />
        <Route path="admin/assignments/:id" element={<RequireAuth roles={staff}><AdminSubmissions /></RequireAuth>} />
        <Route path="admin/quizzes" element={<RequireAuth roles={staff}><AdminQuizzes /></RequireAuth>} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
