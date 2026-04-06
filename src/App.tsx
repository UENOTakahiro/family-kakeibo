import { HashRouter, Navigate, Route, Routes, Link, useLocation } from 'react-router-dom';
import {
  AppBar,
  Box,
  CircularProgress,
  IconButton,
  Tab,
  Tabs,
  Toolbar,
  Tooltip,
  Typography,
} from '@mui/material';
import { Logout as LogoutIcon } from '@mui/icons-material';
import { useAuth } from './hooks/useAuth';
import { LoginPage } from './pages/LoginPage';
import { TransactionsPage } from './pages/TransactionsPage';
import { AnalyticsPage } from './pages/AnalyticsPage';
import { BudgetPage } from './pages/BudgetPage';
import { SettingsPage } from './pages/SettingsPage';

const NAV_ITEMS = [
  { label: '履歴', path: '/transactions' },
  { label: '分析', path: '/analytics' },
  { label: '予算', path: '/budget' },
  { label: '設定', path: '/settings' },
];

function NavTabs() {
  const { pathname } = useLocation();
  const currentTab = NAV_ITEMS.findIndex(item => pathname.startsWith(item.path));
  return (
    <Tabs value={currentTab === -1 ? 0 : currentTab} textColor="inherit" indicatorColor="secondary"
      variant="scrollable" scrollButtons="auto" allowScrollButtonsMobile>
      {NAV_ITEMS.map(item => (
        <Tab key={item.path} label={item.label} component={Link} to={item.path} />
      ))}
    </Tabs>
  );
}

function Layout() {
  const { user, signOut } = useAuth();
  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default' }}>
      <AppBar position="static">
        <Toolbar>
          <Typography variant="h6" sx={{ mr: 2 }}>
            家計簿
          </Typography>
          <Box sx={{ flexGrow: 1, overflow: 'hidden', minWidth: 0 }}>
            <NavTabs />
          </Box>
          <Tooltip title={user?.displayName ?? ''}>
            <IconButton color="inherit" onClick={signOut}>
              <LogoutIcon />
            </IconButton>
          </Tooltip>
        </Toolbar>
      </AppBar>
      <Box sx={{ py: 2 }}>
        <Routes>
          <Route path="/" element={<Navigate to="/transactions" replace />} />
          <Route path="/transactions" element={<TransactionsPage />} />
          <Route path="/analytics" element={<AnalyticsPage />} />
          <Route path="/budget" element={<BudgetPage />} />
          <Route path="/settings" element={<SettingsPage />} />
        </Routes>
      </Box>
    </Box>
  );
}

function AppContent() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  if (!user) {
    return <LoginPage />;
  }

  return (
    <HashRouter>
      <Layout />
    </HashRouter>
  );
}

export default function App() {
  return <AppContent />;
}
