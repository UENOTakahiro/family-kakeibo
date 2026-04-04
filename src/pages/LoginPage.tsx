import { Box, Button, CircularProgress, Paper, Typography } from '@mui/material';
import { Google as GoogleIcon } from '@mui/icons-material';
import { useState } from 'react';
import { useAuth } from '../hooks/useAuth';

export function LoginPage() {
  const { signInWithGoogle } = useAuth();
  const [loading, setLoading] = useState(false);

  async function handleSignIn() {
    setLoading(true);
    try {
      await signInWithGoogle();
    } finally {
      setLoading(false);
    }
  }

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        bgcolor: '#f5f5f5',
      }}
    >
      <Paper sx={{ p: 4, textAlign: 'center', maxWidth: 400, width: '100%', mx: 2 }}>
        <Typography variant="h4" fontWeight="bold" gutterBottom>
          家族の家計簿
        </Typography>
        <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
          家族みんなで使える家計簿アプリ
        </Typography>
        {loading ? (
          <CircularProgress />
        ) : (
          <Button
            variant="contained"
            size="large"
            startIcon={<GoogleIcon />}
            onClick={handleSignIn}
            fullWidth
          >
            Google でログイン
          </Button>
        )}
      </Paper>
    </Box>
  );
}
