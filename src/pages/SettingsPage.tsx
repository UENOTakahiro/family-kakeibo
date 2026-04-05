import { useEffect, useState } from 'react';
import {
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  List,
  ListItem,
  ListItemText,
  Stack,
  TextField,
  Typography,
  Alert,
} from '@mui/material';
import { useAuth } from '../hooks/useAuth';
import { subscribeSettings, updateSettings } from '../lib/firebase';
import type { Settings } from '../types';

const DEFAULT_SETTINGS: Settings = {
  categories: ['食費', '交通費', '日用品', '娯楽', '医療', '外食', 'その他'],
  members: ['メンバー1', 'メンバー2'],
};

type DialogType = 'category' | 'member' | null;

export function SettingsPage() {
  const { user, signOut } = useAuth();
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [dialogType, setDialogType] = useState<DialogType>(null);
  const [inputValue, setInputValue] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    const unsubscribe = subscribeSettings(setSettings);
    return unsubscribe;
  }, []);

  function openDialog(type: DialogType) {
    setDialogType(type);
    setInputValue('');
    setError('');
  }

  async function handleAdd() {
    const trimmed = inputValue.trim();
    if (!trimmed) return;

    if (dialogType === 'category') {
      if (settings.categories.includes(trimmed)) {
        setError('そのカテゴリはすでに存在します。');
        return;
      }
      await updateSettings({ categories: [...settings.categories, trimmed] });
    } else {
      if (settings.members.includes(trimmed)) {
        setError('そのメンバーはすでに存在します。');
        return;
      }
      await updateSettings({ members: [...settings.members, trimmed] });
    }
    setDialogType(null);
  }

  async function handleRemoveCategory(cat: string) {
    await updateSettings({ categories: settings.categories.filter(c => c !== cat) });
  }

  async function handleRemoveMember(m: string) {
    await updateSettings({ members: settings.members.filter(member => member !== m) });
  }

  return (
    <Box sx={{ maxWidth: 600, mx: 'auto', p: 2 }}>
      {/* アカウント */}
      <Typography variant="h6" fontWeight="bold" gutterBottom>
        設定
      </Typography>

      <List disablePadding sx={{ bgcolor: '#fff', borderRadius: 1, mb: 2 }}>
        <ListItem>
          <ListItemText
            primary={user?.displayName ?? ''}
            secondary={user?.email ?? ''}
          />
        </ListItem>
        <Divider />
        <ListItem
          onClick={signOut}
          sx={{ cursor: 'pointer', '&:hover': { bgcolor: '#f5f5f5' } }}
        >
          <ListItemText primary="ログアウト" sx={{ color: 'error.main' }} />
        </ListItem>
      </List>

      <Divider sx={{ mb: 2 }} />

      {/* カテゴリ */}
      <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
        カテゴリ
      </Typography>
      <Stack direction="row" flexWrap="wrap" gap={1} sx={{ mb: 1 }}>
        {settings.categories.map(cat => (
          <Chip
            key={cat}
            label={cat}
            onDelete={() => handleRemoveCategory(cat)}
          />
        ))}
      </Stack>
      <Button
        variant="outlined"
        size="small"
        onClick={() => openDialog('category')}
        sx={{ mb: 3 }}
      >
        ＋ カテゴリを追加
      </Button>

      <Divider sx={{ mb: 2 }} />

      {/* メンバー */}
      <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
        メンバー
      </Typography>
      <Stack direction="row" flexWrap="wrap" gap={1} sx={{ mb: 1 }}>
        {settings.members.map(m => (
          <Chip
            key={m}
            label={m}
            onDelete={() => handleRemoveMember(m)}
          />
        ))}
      </Stack>
      <Button
        variant="outlined"
        size="small"
        onClick={() => openDialog('member')}
      >
        ＋ メンバーを追加
      </Button>

      {/* 追加ダイアログ */}
      <Dialog open={dialogType !== null} onClose={() => setDialogType(null)} maxWidth="xs" fullWidth>
        <DialogTitle>
          {dialogType === 'category' ? 'カテゴリを追加' : 'メンバーを追加'}
        </DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            fullWidth
            variant="outlined"
            value={inputValue}
            onChange={e => { setInputValue(e.target.value); setError(''); }}
            placeholder={dialogType === 'category' ? '例: 教育費' : '例: 共通'}
            onKeyDown={e => { if (e.key === 'Enter') handleAdd(); }}
            sx={{ mt: 1 }}
          />
          {error && <Alert severity="error" sx={{ mt: 1 }}>{error}</Alert>}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogType(null)}>キャンセル</Button>
          <Button variant="contained" onClick={handleAdd}>追加</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
