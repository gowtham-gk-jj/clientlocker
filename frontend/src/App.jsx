
import {
  BrowserRouter,
  Routes,
  Route,
  Navigate
} from "react-router-dom";

import { AuthProvider, useAuth } from "./context/AuthContext";

import MainLayout from "./components/layout/MainLayout";

import Home from "./pages/public/Home";
import About from "./pages/public/About";
import Login from "./pages/auth/Login";

import ClientMagicLogin from "./pages/auth/ClientMagicLogin";
import MagicLinkVerify from "./pages/auth/MagicLinkVerify";

import StaffDashboard from "./pages/staff/StaffDashboard";
import StaffClientDetails from "./pages/staff/StaffClientDetails";

import PartnerDashboard from "./pages/partner/PartnerDashboard";
import PartnerClients from "./pages/partner/PartnerClients";
import PartnerAssignClient from "./pages/partner/PartnerAssignClient";
import ActivityLog from "./pages/partner/ActivityLog";

import AuditorDashboard from "./pages/auditor/AuditorDashboard";
import AuditorClientDetails from "./pages/auditor/AuditorClientDetails";

import ClientDashboard from "./pages/client/ClientDashboard";

// ==========================================
// AUTHENTICATION LOADING
// ==========================================

function AuthLoading() {
  return (
    <div className="auth-loading">
      <div className="auth-spinner"></div>
      <p>Loading ClientLocker...</p>
    </div>
  );
}

// ==========================================
// ROLE PROTECTED ROUTE
// ==========================================

function RoleProtectedRoute({ children, allowedRoles }) {
  const { user, isAuthenticated, loading } = useAuth();

  if (loading) {
    return <AuthLoading />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (!allowedRoles.includes(user?.role)) {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
}

// ==========================================
// DASHBOARD REDIRECT
// ==========================================

function DashboardRedirect() {
  const { user, loading } = useAuth();

  if (loading) {
    return <AuthLoading />;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  const roleRoutes = {
    partner: "/partner/dashboard",
    staff: "/staff/dashboard",
    client: "/client/dashboard",
    auditor: "/auditor/dashboard"
  };

  return (
    <Navigate
      to={roleRoutes[user.role] || "/login"}
      replace
    />
  );
}

// ==========================================
// MAIN APPLICATION ROUTES
// ==========================================

function AppRoutes() {
  const { isAuthenticated } = useAuth();

  return (
    <Routes>

      {/* PUBLIC WEBSITE */}

      <Route element={<MainLayout />}>
        <Route path="/" element={<Home />} />
        <Route path="/about" element={<About />} />
      </Route>

      {/* LOGIN ROUTES */}

      <Route
        path="/login"
        element={
          isAuthenticated
            ? <DashboardRedirect />
            : <Login />
        }
      />

      <Route
        path="/client/login"
        element={
          isAuthenticated
            ? <DashboardRedirect />
            : <ClientMagicLogin />
        }
      />

      {/* MAGIC LINK VERIFICATION */}

      <Route
        path="/client/magic-login"
        element={<MagicLinkVerify />}
      />

      {/* MAIN DASHBOARD REDIRECT */}

      <Route
        path="/dashboard"
        element={<DashboardRedirect />}
      />

      {/* ======================================
          PARTNER ROUTES
      ====================================== */}

      <Route
        path="/partner/dashboard"
        element={
          <RoleProtectedRoute allowedRoles={["partner"]}>
            <PartnerDashboard />
          </RoleProtectedRoute>
        }
      />

      <Route
        path="/partner/clients"
        element={
          <RoleProtectedRoute allowedRoles={["partner"]}>
            <PartnerClients />
          </RoleProtectedRoute>
        }
      />

      <Route
        path="/partner/assignments"
        element={
          <RoleProtectedRoute allowedRoles={["partner"]}>
            <PartnerAssignClient />
          </RoleProtectedRoute>
        }
      />

      {/* TASK 7: PARTNER ACTIVITY LOG */}

      <Route
        path="/partner/activity"
        element={
          <RoleProtectedRoute allowedRoles={["partner"]}>
            <ActivityLog />
          </RoleProtectedRoute>
        }
      />

      {/* ======================================
          STAFF ROUTES
      ====================================== */}

      <Route
        path="/staff"
        element={
          <RoleProtectedRoute allowedRoles={["staff"]}>
            <Navigate to="/staff/dashboard" replace />
          </RoleProtectedRoute>
        }
      />

      <Route
        path="/staff/dashboard"
        element={
          <RoleProtectedRoute allowedRoles={["staff"]}>
            <StaffDashboard />
          </RoleProtectedRoute>
        }
      />

      <Route
        path="/staff/clients/:clientId"
        element={
          <RoleProtectedRoute allowedRoles={["partner", "staff"]}>
            <StaffClientDetails />
          </RoleProtectedRoute>
        }
      />

      {/* ======================================
          AUDITOR ROUTES
      ====================================== */}

      <Route
        path="/auditor/dashboard"
        element={
          <RoleProtectedRoute allowedRoles={["auditor"]}>
            <AuditorDashboard />
          </RoleProtectedRoute>
        }
      />

      {/* AUDITOR CLIENT DOCUMENTS - READ ONLY */}

      <Route
        path="/auditor/clients/:clientId"
        element={
          <RoleProtectedRoute allowedRoles={["auditor"]}>
            <AuditorClientDetails />
          </RoleProtectedRoute>
        }
      />

      {/* ======================================
          CLIENT ROUTES
      ====================================== */}

      <Route
        path="/client/dashboard"
        element={
          <RoleProtectedRoute allowedRoles={["client"]}>
            <ClientDashboard />
          </RoleProtectedRoute>
        }
      />

      {/* UNKNOWN ROUTES */}

      <Route
        path="*"
        element={<Navigate to="/" replace />}
      />

    </Routes>
  );
}

// ==========================================
// MAIN APP
// ==========================================

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
