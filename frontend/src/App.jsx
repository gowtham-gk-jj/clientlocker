
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

import StaffDashboard from "./pages/staff/StaffDashboard";
import StaffClientDetails from "./pages/staff/StaffClientDetails";

import PartnerDashboard from "./pages/partner/PartnerDashboard";
import PartnerClients from "./pages/partner/PartnerClients";
import PartnerAssignClient from "./pages/partner/PartnerAssignClient";

import AuditorDashboard from "./pages/auditor/AuditorDashboard";
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
// PROTECTED ROUTE
// ==========================================

function ProtectedRoute({ children }) {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return <AuthLoading />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return children;
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

      {/* LOGIN */}

      <Route
        path="/login"
        element={
          isAuthenticated
            ? <DashboardRedirect />
            : <Login />
        }
      />

      {/* MAIN DASHBOARD REDIRECT */}

      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <DashboardRedirect />
          </ProtectedRoute>
        }
      />
      {/* PARTNER ROUTES */}

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
<Route
  path="/auditor/dashboard"
  element={
    <RoleProtectedRoute allowedRoles={["auditor"]}>
      <AuditorDashboard />
    </RoleProtectedRoute>
  }
/>
      {/* ==================================
          STAFF ROUTES
      ================================== */}

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
          <RoleProtectedRoute allowedRoles={["staff"]}>
            <StaffClientDetails />
          </RoleProtectedRoute>
        }
      />

      {/* ==================================
          OTHER ROLE DASHBOARDS
      ================================== */}

      <Route
        path="/partner/dashboard"
        element={
          <RoleProtectedRoute allowedRoles={["partner"]}>
            <DashboardPlaceholder role="partner" />
          </RoleProtectedRoute>
        }
      />

      <Route
        path="/client/dashboard"
        element={
          <RoleProtectedRoute allowedRoles={["client"]}>
            <DashboardPlaceholder role="client" />
          </RoleProtectedRoute>
        }
      />

      <Route
        path="/auditor/dashboard"
        element={
          <RoleProtectedRoute allowedRoles={["auditor"]}>
            <DashboardPlaceholder role="auditor" />
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
// TEMPORARY DASHBOARD PLACEHOLDER
// ==========================================

function DashboardPlaceholder({ role }) {
  const { user, logout } = useAuth();

  return (
    <div style={{
      padding: "40px",
      fontFamily: "Arial, sans-serif"
    }}>
      <h1>Welcome to ClientLocker</h1>

      <p>Name: {user?.name}</p>
      <p>Email: {user?.email}</p>
      <p>Role: {role}</p>

      <button onClick={logout}>
        Logout
      </button>
    </div>
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
