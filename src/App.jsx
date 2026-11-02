import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useAuth } from './context/AuthContext';

// Member layout
import Sidebar from './components/Sidebar';
import Header from './components/Header';

// Admin layout
import AdminLayout from './layouts/AdminLayout';

// Member pages
import Dashboard from './pages/member/Dashboard';
import MachineGuide from './pages/member/MachineGuide';
import Courses from './pages/member/Courses';
import Player from './pages/member/Player';
import Trainers from './pages/member/Trainers';
import TrainerProfile from './pages/member/TrainerProfile';
import NutritionistProfile from './pages/member/NutritionistProfile';
import NutritionPlan from './pages/member/NutritionPlan';
import MySessions from './pages/member/MySessions';
import CourseDetail from './pages/member/CourseDetail';
import { ForgotPassword, ResetPassword } from './pages/PasswordReset';
import { MobileNavProvider } from './layouts/MobileNav';
import Nutritionists from './pages/member/Nutritionists';
import Shop from './pages/member/Shop';
import Attendance from './pages/member/Attendance';
import Classes from './pages/member/Classes';
import Profile from './pages/member/Profile';
import Payments from './pages/member/Payments';
import Notifications from './pages/member/Notifications';
import ChangePassword from './pages/member/ChangePassword';
import PaymentCallback from './pages/member/PaymentCallback';

// Admin pages
import AdminDashboard from './pages/admin/AdminDashboard';
import AdminMembers from './pages/admin/AdminMembers';
import AdminMachines from './pages/admin/AdminMachines';
import AdminFinance from './pages/admin/AdminFinance';
import AdminTrainers from './pages/admin/AdminTrainers';
import AdminFacilities from './pages/admin/AdminFacilities';
import AdminClasses from './pages/admin/AdminClasses';
import AdminStaff from './pages/admin/AdminStaff';
import AdminAnalytics from './pages/admin/AdminAnalytics';
import AdminReports from './pages/admin/AdminReports';
import AdminRegistrations from './pages/admin/AdminRegistrations';
import MemberLookup from './pages/admin/MemberLookup';
import AdminSettings from './pages/admin/AdminSettings';
import SiteContent from './pages/admin/SiteContent';
import SiteLists from './pages/admin/SiteLists';
import SitePlans from './pages/admin/SitePlans';
import SiteInbox from './pages/admin/SiteInbox';
import ShopOrders from './pages/admin/ShopOrders';
import ShopCatalog from './pages/admin/ShopCatalog';
import AdminNutrition from './pages/admin/AdminNutrition';
import TrainerHours from './pages/admin/TrainerHours';
import AdminSecurity from './pages/admin/AdminSecurity';

// Coach portal
import CoachLayout from './layouts/CoachLayout';
import CoachDashboard from './pages/coach/CoachDashboard';
import CoachSessions from './pages/coach/CoachSessions';
import CoachHours from './pages/coach/CoachHours';
import CoachCourses from './pages/coach/CoachCourses';
import CoachStudents from './pages/coach/CoachStudents';
import CoachClasses from './pages/coach/CoachClasses';
import CoachVideos from './pages/coach/CoachVideos';
import { CoachEarnings, CoachNotifications, CoachProfile, CoachReviews } from './pages/coach/CoachMore';
import { homeFor, isCoach, isStaff } from './utils/roleHome';

// Shared
import Login from './pages/Login';
import AdminLogin from './pages/AdminLogin';
import NotFound from './pages/NotFound';
import { tl } from './i18n';


/* ============================================
   LOADING SCREEN
   ============================================ */
function AuthLoader() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <div className="w-12 h-12 rounded-full border-4 border-primary-container/30 border-t-primary-container animate-spin" />
        <span className="font-label-md text-[11px] text-on-surface-variant uppercase tracking-widest">
          {tl("Authenticating...")}
        </span>
      </div>
    </div>
  );
}


/* ============================================
   SMART REDIRECT FOR ROOT "/"
   Sends logged-in users to dashboard/admin
   Sends guests to /login
   ============================================ */
function RootRedirect() {
  const { user, isAuthenticated, loading } = useAuth();

  if (loading) return <AuthLoader />;

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // Admins go to /admin, coaches to /coach, members to /dashboard
  return <Navigate to={homeFor(user)} replace />;
}


/* ============================================
   MEMBER PROTECTED ROUTE
   ============================================ */
const CHANGE_PASSWORD_PATH = '/dashboard/change-password';

function ProtectedRoute({ children }) {
  const { user, isAuthenticated, loading, mustChangePassword } = useAuth();
  const { pathname } = useLocation();

  if (loading) return <AuthLoader />;
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  // must_change_password (e.g. after an admin reset): nothing else until it's changed
  // (the API enforces the same — every other call returns 403 password_change_required).
  // Shown without the member layout, whose header/sidebar would call locked endpoints.
  if (mustChangePassword) {
    return pathname === CHANGE_PASSWORD_PATH
      ? <ChangePassword forced />
      : <Navigate to={CHANGE_PASSWORD_PATH} replace />;
  }
  // Admins and managers use the console and coaches the coach portal, never the member pages.
  if (isStaff(user) || isCoach(user)) return <Navigate to={homeFor(user)} replace />;

  return children;
}


/* ============================================
   ADMIN PROTECTED ROUTE
   ============================================ */
function AdminProtectedRoute({ children }) {
  const { user, isAuthenticated, loading, mustChangePassword } = useAuth();

  if (loading) return <AuthLoader />;

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (mustChangePassword) {
    return <Navigate to={CHANGE_PASSWORD_PATH} replace />;
  }

  if (!isStaff(user)) {
    return <Navigate to={homeFor(user)} replace />;
  }

  return children;
}


/* ============================================
   COACH PROTECTED ROUTE
   ============================================ */
function CoachProtectedRoute({ children }) {
  const { user, isAuthenticated, loading, mustChangePassword } = useAuth();

  if (loading) return <AuthLoader />;
  if (!isAuthenticated) return <Navigate to="/coach/login" replace />;
  if (mustChangePassword) return <Navigate to={CHANGE_PASSWORD_PATH} replace />;
  if (!isCoach(user)) return <Navigate to={homeFor(user)} replace />;
  return children;
}


/* ============================================
   MEMBER LAYOUT
   ============================================ */
function MemberLayout({ children }) {
  return (
    <MobileNavProvider>
      <Sidebar />
      <div className="lg:pl-64 min-w-0 overflow-x-hidden">
        <Header />
        <main className="w-full min-w-0 pt-16 bg-background min-h-screen">{children}</main>
      </div>
    </MobileNavProvider>
  );
}


/* ============================================
   APP
   ============================================ */
function App() {
  return (
    <Routes>
      {/* ============ PUBLIC / AUTH ============ */}
      <Route path="/login" element={<Login />} />
      <Route path="/admin/login" element={<AdminLogin />} />
      <Route path="/coach/login" element={<AdminLogin variant="coach" />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/reset-password" element={<ResetPassword />} />
      <Route path="/admin/forgot-password" element={<ForgotPassword staff />} />
      <Route path="/admin/reset-password" element={<ResetPassword staff />} />

      {/* ============ ROOT — smart redirect ============ */}
      <Route path="/" element={<RootRedirect />} />

      {/* ============ ADMIN — admin/manager only ============ */}
      <Route
        path="/admin/*"
        element={
          <AdminProtectedRoute>
            <AdminLayout />
          </AdminProtectedRoute>
        }
      >
        <Route index element={<AdminDashboard />} />
        <Route path="members" element={<AdminMembers />} />
        <Route path="trainers" element={<AdminTrainers />} />
        <Route path="staff" element={<AdminStaff />} />
        <Route path="machines" element={<AdminMachines />} />
        <Route path="facilities" element={<AdminFacilities />} />
        <Route path="classes" element={<AdminClasses />} />
        <Route path="finance" element={<AdminFinance />} />
        <Route path="reports" element={<AdminReports />} />
        <Route path="analytics" element={<AdminAnalytics />} />
        <Route path="cms" element={<Navigate to="/admin/site-lists?list=articles" replace />} />
        <Route path="registrations" element={<AdminRegistrations />} />
        <Route path="member-lookup" element={<MemberLookup />} />
        <Route path="settings" element={<AdminSettings />} />
        <Route path="site-content" element={<SiteContent />} />
        <Route path="site-lists" element={<SiteLists />} />
        <Route path="site-plans" element={<SitePlans />} />
        <Route path="site-inbox" element={<SiteInbox />} />
        <Route path="shop" element={<ShopCatalog />} />
        <Route path="nutrition" element={<AdminNutrition />} />
        <Route path="shop-orders" element={<ShopOrders />} />
        <Route path="trainer-hours" element={<TrainerHours />} />
        <Route path="facility-pricing" element={<Navigate to="/admin/facilities" replace />} />
        <Route path="change-password" element={<ChangePassword />} />
        <Route path="security" element={<AdminSecurity />} />
        <Route path="*" element={<Navigate to="/admin" replace />} />
      </Route>

      {/* ============ COACH PORTAL — trainers ============ */}
      <Route
        path="/coach/*"
        element={
          <CoachProtectedRoute>
            <CoachLayout />
          </CoachProtectedRoute>
        }
      >
        <Route index element={<CoachDashboard />} />
        <Route path="sessions" element={<CoachSessions />} />
        <Route path="hours" element={<CoachHours />} />
        <Route path="courses" element={<CoachCourses />} />
        <Route path="courses/:courseId" element={<CoachCourses />} />
        <Route path="students" element={<CoachStudents />} />
        <Route path="classes" element={<CoachClasses />} />
        <Route path="videos" element={<CoachVideos />} />
        <Route path="reviews" element={<CoachReviews />} />
        <Route path="earnings" element={<CoachEarnings />} />
        <Route path="notifications" element={<CoachNotifications />} />
        <Route path="profile" element={<CoachProfile />} />
        <Route path="change-password" element={<ChangePassword />} />
        <Route path="*" element={<Navigate to="/coach" replace />} />
      </Route>

      {/* ============ MEMBER — authenticated users ============ */}
      <Route
        path="/dashboard/*"
        element={
          <ProtectedRoute>
            <MemberLayout>
              <Routes>
                <Route index element={<Dashboard />} />
                <Route path="machine-guide" element={<MachineGuide />} />
                <Route path="courses" element={<Courses />} />
                <Route path="courses/:id" element={<CourseDetail />} />
                <Route path="player" element={<Player />} />
                <Route path="player/:courseId" element={<Player />} />
                <Route path="trainers" element={<Trainers />} />
                <Route path="trainers/:id" element={<TrainerProfile />} />
                <Route path="nutritionists" element={<Nutritionists />} />
                <Route path="nutritionists/:id" element={<NutritionistProfile />} />
                <Route path="nutrition-plan" element={<NutritionPlan />} />
                <Route path="my-sessions" element={<MySessions />} />
                <Route path="shop" element={<Shop />} />
                <Route path="attendance" element={<Attendance />} />
                <Route path="classes" element={<Classes />} />
                <Route path="profile" element={<Profile />} />
                <Route path="payments" element={<Payments />} />
                <Route path="payments/callback" element={<PaymentCallback />} />
                <Route path="notifications" element={<Notifications />} />
                <Route path="change-password" element={<ChangePassword />} />
                <Route path="*" element={<NotFound />} />
              </Routes>
            </MemberLayout>
          </ProtectedRoute>
        }
      />

      {/* ============ CATCH-ALL → login ============ */}
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
}

export default App;