import { Navigate, Route, Routes } from 'react-router-dom';
import Navbar from './components/Navbar';
import ProtectedRoute from './components/ProtectedRoute';
import GroupLayout from './components/GroupLayout';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import MyGroupsPage from './pages/MyGroupsPage';
import CreateGroupPage from './pages/CreateGroupPage';
import GroupDashboardPage from './pages/GroupDashboardPage';
import MembersPage from './pages/MembersPage';
import ExpensesPage from './pages/ExpensesPage';
import AddExpensePage from './pages/AddExpensePage';
import SettlementsPage from './pages/SettlementsPage';
import AddSettlementPage from './pages/AddSettlementPage';
import BalancesPage from './pages/BalancesPage';
import SettlementPlanPage from './pages/SettlementPlanPage';
import AuditLogPage from './pages/AuditLogPage';
import NotFoundPage from './pages/NotFoundPage';

export default function App() {
  return (
    <div className="app-shell">
      <Navbar />
      <Routes>
        <Route path="/" element={<Navigate to="/groups" replace />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />

        <Route element={<ProtectedRoute />}>
          <Route path="/groups" element={<MyGroupsPage />} />
          <Route path="/groups/create" element={<CreateGroupPage />} />
          <Route path="/groups/:groupId" element={<GroupLayout />}>
            <Route index element={<GroupDashboardPage />} />
            <Route path="members" element={<MembersPage />} />
            <Route path="expenses" element={<ExpensesPage />} />
            <Route path="expenses/new" element={<AddExpensePage />} />
            <Route path="settlements" element={<SettlementsPage />} />
            <Route path="settlements/new" element={<AddSettlementPage />} />
            <Route path="balances" element={<BalancesPage />} />
            <Route path="settlement-plan" element={<SettlementPlanPage />} />
            <Route path="audit-log" element={<AuditLogPage />} />
          </Route>
        </Route>

        <Route path="*" element={<NotFoundPage />} />
      </Routes>
      <footer className="app-footer">
        <div className="container">HouseBalance · Explainable household expense settlement</div>
      </footer>
    </div>
  );
}

