import React from 'react';
import ReactDOM from 'react-dom/client';
import { CssBaseline } from '@mui/material';
import { createTheme, ThemeProvider } from '@mui/material/styles';
import App from './App';

const theme = createTheme({
  palette: {
    mode: 'light',
    primary: { main: '#CC7E63' },
    secondary: { main: '#8A9A5B' },
    background: {
      default: '#F5F2ED',
      paper: '#FFFFFF',
    },
  },
  shape: {
    borderRadius: 24,
  },
  typography: {
    fontFamily: "'Manrope', sans-serif",
    h1: { fontFamily: "'Plus Jakarta Sans', sans-serif" },
    h2: { fontFamily: "'Plus Jakarta Sans', sans-serif" },
    h3: { fontFamily: "'Plus Jakarta Sans', sans-serif" },
    h4: { fontFamily: "'Plus Jakarta Sans', sans-serif" },
    h5: { fontFamily: "'Plus Jakarta Sans', sans-serif" },
    h6: { fontFamily: "'Plus Jakarta Sans', sans-serif" },
  },
  components: {
    MuiButton: { defaultProps: { disableElevation: true } },
    MuiChip: { styleOverrides: { root: { borderRadius: 999 } } },
    MuiLinearProgress: { styleOverrides: { root: { borderRadius: 999 } } },
  },
});

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <App />
    </ThemeProvider>
  </React.StrictMode>,
);
