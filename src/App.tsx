import React from 'react';
import { HashRouter, Routes, Route, useLocation, Link } from 'react-router-dom';
import Navbar from './components/layout/Navbar';
import ProtectedRoute from './components/layout/ProtectedRoute';
import Home from './pages/Home';
import Login from './pages/Login';
import Attendance from './pages/Attendance';
import Announcements from './pages/Announcements';
import SOS from './pages/SOS';
import BloodBank from './pages/BloodBank';
import Complaints from './pages/Complaints';
import Gallery from './pages/Gallery';
import Help from './pages/Help';
import AdminDashboard from './pages/Admin/Dashboard';
import QuizSystem from './pages/Quiz';
import Reports from './pages/Reports';
import CalendarPage from './pages/CalendarPage';
import Leaderboard from './pages/Leaderboard';
import VolunteerID from './pages/VolunteerID';
import PerformanceDashboard from './pages/Performance';
import Resources from './pages/Resources';
import HomeArrival from './pages/HomeArrival';
import AlumniNetwork from './pages/Alumni';
import NSSAssistant from './components/Assistant/NSSAssistant';
import Profile from './pages/Profile';
import HODDashboard from './pages/HOD/HODDashboard';

// Layout wrapper to conditionally show navbar
function Layout({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  const hideNavbarOn = ['/login', '/hod'];
  const shouldHideNavbar = hideNavbarOn.includes(location.pathname) || location.pathname.startsWith('/hod') || location.pathname.startsWith('/admin');
  const shouldHideAssistant = shouldHideNavbar;

  return (
    <>
      {!shouldHideNavbar && <Navbar />}
      <main>
        {children}
      </main>
      {!shouldHideAssistant && <NSSAssistant />}
    </>
  );
}

export default function App() {
  return (
    <HashRouter>
      <Layout>
        <Routes>
          <Route path="/login" element={<Login />} />
          
          {/* Publicly Accessible Routes */}
          <Route path="/" element={<Home />} />
          <Route path="/announcements" element={<Announcements />} />
          <Route path="/gallery" element={<Gallery />} />
          
          <Route element={<ProtectedRoute />}>
            {/* Protected Volunteer Routes */}
            <Route path="/attendance" element={<Attendance />} />
            <Route path="/sos" element={<SOS />} />
            <Route path="/bloodbank" element={<BloodBank />} />
            <Route path="/help" element={<Help />} />
            <Route path="/complaints" element={<Complaints />} />
            <Route path="/quiz" element={<QuizSystem />} />
            <Route path="/reports" element={<Reports />} />
            <Route path="/calendar" element={<CalendarPage />} />
            <Route path="/leaderboard" element={<Leaderboard />} />
            <Route path="/id-card" element={<VolunteerID />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="/performance" element={<PerformanceDashboard />} />
            <Route path="/resources" element={<Resources />} />
            <Route path="/home-arrival" element={<HomeArrival />} />
            <Route path="/alumni" element={<AlumniNetwork />} />
          </Route>

          <Route element={<ProtectedRoute role="admin" />}>
            <Route path="/admin" element={<AdminDashboard />} />
          </Route>

          <Route element={<ProtectedRoute role="hod" />}>
            <Route path="/hod" element={<HODDashboard />} />
          </Route>

          {/* Catch-all route to handle 404s/mismatches */}
          <Route path="*" element={
            <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
              <div className="text-center">
                <h1 className="text-4xl font-black text-slate-900 mb-4">404</h1>
                <p className="text-slate-500 mb-8 uppercase tracking-widest font-bold">Route Not Found</p>
                <Link to="/" className="bg-blue-600 text-white px-8 py-3 rounded-xl font-bold">
                  Go Home
                </Link>
              </div>
            </div>
          } />
        </Routes>
      </Layout>
    </HashRouter>
  );
}
