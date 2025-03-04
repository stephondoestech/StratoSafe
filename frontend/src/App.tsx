import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import Layout from './components/Layout';
import { useAuth } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import MfaVerification from './components/MfaVerification';
import MfaSetup from './components/MfaSetup';
import BackupCodes from './components/BackupCodes';
import AccountSecurity from './components/AccountSecurity';

function App() {
  const { isAuthenticated, requiresMfa } = useAuth();

  return (
    <Routes>
      <Route path="/" element={<Layout />}>
        {/* Auth Routes */}
        <Route index element={isAuthenticated ? <Navigate to="/dashboard" /> : <Login />} />
        <Route path="login" element={isAuthenticated ? <Navigate to="/dashboard" /> : <Login />} />
        <Route path="register" element={isAuthenticated ? <Navigate to="/dashboard" /> : <Register />} />
        
        {/* MFA Verification during login */}
        <Route 
          path="mfa/verify" 
          element={requiresMfa ? <MfaVerification /> : <Navigate to="/login" />} 
        />
        
        {/* Protected Routes */}
        <Route 
          path="dashboard" 
          element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          } 
        />
        
        {/* Account & MFA Settings Routes */}
        <Route 
          path="account/security" 
          element={
            <ProtectedRoute>
              <AccountSecurity />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="account/mfa/setup" 
          element={
            <ProtectedRoute>
              <MfaSetup />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="account/mfa/backup-codes" 
          element={
            <ProtectedRoute>
              <BackupCodes />
            </ProtectedRoute>
          } 
        />
        
        <Route path="*" element={<Navigate to="/" />} />
      </Route>
    </Routes>
  );
}

export default App;
