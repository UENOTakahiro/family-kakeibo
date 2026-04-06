import { useEffect, useState } from 'react';
import {
  Badge,
  Box,
  Button,
  Card,
  CardActionArea,
  CardContent,
  Chip,
  CircularProgress,
  Collapse,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  FormControl,
  IconButton,
  InputAdornment,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import {
  Add as AddIcon,
  Delete as DeleteIcon,
  FilterList as FilterListIcon,
  Search as SearchIcon,
  Close as CloseIcon,
} from '@mui/icons-material';
import dayjs from 'dayjs';
import {
  subscribeTransactions,
  addTransaction,
  updateTransaction,
  deleteTransaction,
  subscribeSettings,
} from '../lib/firebase';
import type { Transaction, TransactionInput, Settings } from '../types';

const DEFAULT_SETTINGS: Settings = {
  categories: ['食費', '交通費', '日用品', '娯楽', '医療', '外食', 'その他'],
  members: ['メンバー1', 'メンバー2'],
};

const CATEGORY_COLORS: Record<string, string> = {
  食費: '#FF6B6B',
  交通費: '#4ECDC4',
  日用品: '#45B7D1',
  娯楽: '#96CEB4',
  医療: '#FFEAA7',
  外食: '#DDA0DD',
  その他: '#D3D3D3',
};

// 追加・編集共用ダイアログ
function TransactionDialog({
  open,
  onClose,
  settings,
  editTarget,
}: {
  open: boolean;
  onClose: () => void;
  settings: Settings;
  editTarget: Transaction | null; // null なら新規追加
}) {
  const isEdit = editTarget !== null;

  const [date, setDate] = useState(dayjs().format('YYYY-MM-DD'));
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('');
  const [member, setMember] = useState('');
  const [description, setDescription] = useState('');
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState('');

  // 編集対象が変わったらフォームを初期化
  useEffect(() => {
    if (editTarget) {
      setDate(editTarget.date);
      setAmount(String(editTarget.amount));
      setCategory(editTarget.category);
      setMember(editTarget.member);
      setDescription(editTarget.description);
    } else {
      setDate(dayjs().format('YYYY-MM-DD'));
      setAmount('');
      setCategory('');
      setMember('');
      setDescription('');
    }
    setError('');
  }, [editTarget, open]);

  async function handleSave() {
    if (!amount || !category || !member) {
      setError('金額・カテゴリ・メンバーは必須です。');
      return;
    }
    const parsedAmount = parseInt(amount.replace(/,/g, ''), 10);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      setError('金額は正の整数で入力してください。');
      return;
    }
    setSaving(true);
    try {
      const input: TransactionInput = { date, amount: parsedAmount, category, member, description };
      if (isEdit) {
        await updateTransaction(editTarget!.id, input);
      } else {
        await addTransaction(input);
      }
      onClose();
    } catch {
      setError('保存に失敗しました。');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!editTarget) return;
    if (!window.confirm('この支出を削除しますか？')) return;
    setDeleting(true);
    try {
      await deleteTransaction(editTarget.id);
      onClose();
    } catch {
      setError('削除に失敗しました。');
    } finally {
      setDeleting(false);
    }
  }

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>{isEdit ? '支出を編集' : '支出を追加'}</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 1 }}>
          <TextField
            label="日付"
            type="date"
            value={date}
            onChange={e => setDate(e.target.value)}
            InputLabelProps={{ shrink: true }}
            fullWidth
          />
          <TextField
            label="金額（円）"
            type="number"
            value={amount}
            onChange={e => setAmount(e.target.value)}
            inputProps={{ min: 1 }}
            fullWidth
          />
          <FormControl fullWidth>
            <InputLabel>カテゴリ</InputLabel>
            <Select value={category} label="カテゴリ" onChange={e => setCategory(e.target.value)}>
              {settings.categories.map(cat => (
                <MenuItem key={cat} value={cat}>{cat}</MenuItem>
              ))}
            </Select>
          </FormControl>
          <FormControl fullWidth>
            <InputLabel>メンバー</InputLabel>
            <Select value={member} label="メンバー" onChange={e => setMember(e.target.value)}>
              {settings.members.map(m => (
                <MenuItem key={m} value={m}>{m}</MenuItem>
              ))}
            </Select>
          </FormControl>
          <TextField
            label="メモ（任意）"
            value={description}
            onChange={e => setDescription(e.target.value)}
            multiline
            rows={2}
            fullWidth
          />
          {error && (
            <Typography color="error" variant="body2">{error}</Typography>
          )}
        </Stack>
      </DialogContent>
      <DialogActions sx={{ justifyContent: 'space-between', px: 3, pb: 2 }}>
        {/* 削除ボタン（編集時のみ表示） */}
        {isEdit ? (
          <Button
            color="error"
            startIcon={<DeleteIcon />}
            onClick={handleDelete}
            disabled={deleting}
          >
            {deleting ? <CircularProgress size={20} /> : '削除'}
          </Button>
        ) : (
          <Box />
        )}
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button onClick={onClose}>キャンセル</Button>
          <Button variant="contained" onClick={handleSave} disabled={saving}>
            {saving ? <CircularProgress size={20} /> : '保存'}
          </Button>
        </Box>
      </DialogActions>
    </Dialog>
  );
}

const MONTH_ALL = 'all';

export function TransactionsPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<Transaction | null>(null);

  // フィルター状態
  const [searchText, setSearchText] = useState('');
  const [filterMonth, setFilterMonth] = useState(dayjs().format('YYYY-MM'));
  const [filterCategories, setFilterCategories] = useState<string[]>([]);
  const [filterMember, setFilterMember] = useState('');
  const [filterOpen, setFilterOpen] = useState(false);

  const currentMonth = dayjs().format('YYYY-MM');

  // 過去12ヶ月の選択肢
  const monthOptions = [
    { value: MONTH_ALL, label: 'すべての月' },
    ...Array.from({ length: 12 }, (_, i) => {
      const m = dayjs().subtract(i, 'month').format('YYYY-MM');
      return { value: m, label: m };
    }),
  ];

  useEffect(() => {
    const unsub1 = subscribeTransactions(data => {
      setTransactions(data);
      setLoading(false);
    });
    const unsub2 = subscribeSettings(setSettings);
    return () => { unsub1(); unsub2(); };
  }, []);

  function openAdd() {
    setEditTarget(null);
    setDialogOpen(true);
  }

  function openEdit(t: Transaction) {
    setEditTarget(t);
    setDialogOpen(true);
  }

  function toggleCategory(cat: string) {
    setFilterCategories(prev =>
      prev.includes(cat) ? prev.filter(c => c !== cat) : [...prev, cat],
    );
  }

  function clearFilters() {
    setSearchText('');
    setFilterMonth(currentMonth);
    setFilterCategories([]);
    setFilterMember('');
  }

  // フィルター適用
  const filtered = transactions.filter(t => {
    if (filterMonth !== MONTH_ALL && !t.date.startsWith(filterMonth)) return false;
    if (filterCategories.length > 0 && !filterCategories.includes(t.category)) return false;
    if (filterMember && t.member !== filterMember) return false;
    if (searchText) {
      const q = searchText.toLowerCase();
      if (!t.description.toLowerCase().includes(q) && !t.category.toLowerCase().includes(q)) return false;
    }
    return true;
  });

  const filteredTotal = filtered.reduce((s, t) => s + t.amount, 0);

  // アクティブなフィルター数（月フィルターはデフォルトが今月なので変更時のみカウント）
  const activeFilterCount =
    (filterMonth !== currentMonth ? 1 : 0) +
    (filterCategories.length > 0 ? 1 : 0) +
    (filterMember ? 1 : 0) +
    (searchText ? 1 : 0);

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', mt: 8 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ maxWidth: 720, mx: 'auto', p: 2 }}>
      {/* 合計カード */}
      <Card sx={{ mb: 2 }}>
        <CardContent>
          <Typography variant="body2" color="text.secondary">
            {filterMonth === MONTH_ALL ? '全期間' : filterMonth} の合計支出
            {activeFilterCount > 0 && '（フィルター適用中）'}
          </Typography>
          <Typography variant="h4" fontWeight="bold">
            ¥{filteredTotal.toLocaleString()}
          </Typography>
          {activeFilterCount > 0 && (
            <Typography variant="caption" color="text.secondary">
              {filtered.length} 件
            </Typography>
          )}
        </CardContent>
      </Card>

      {/* 検索バー + 追加ボタン */}
      <Box sx={{ display: 'flex', gap: 1, mb: 1 }}>
        <TextField
          size="small"
          placeholder="キーワード検索..."
          value={searchText}
          onChange={e => setSearchText(e.target.value)}
          sx={{ flexGrow: 1 }}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon fontSize="small" />
              </InputAdornment>
            ),
            endAdornment: searchText ? (
              <InputAdornment position="end">
                <IconButton size="small" onClick={() => setSearchText('')}>
                  <CloseIcon fontSize="small" />
                </IconButton>
              </InputAdornment>
            ) : null,
          }}
        />
        <Badge badgeContent={activeFilterCount} color="primary">
          <IconButton
            onClick={() => setFilterOpen(v => !v)}
            color={filterOpen ? 'primary' : 'default'}
            sx={{ border: 1, borderColor: filterOpen ? 'primary.main' : 'divider', borderRadius: 1 }}
          >
            <FilterListIcon />
          </IconButton>
        </Badge>
        <Button variant="contained" startIcon={<AddIcon />} onClick={openAdd} sx={{ flexShrink: 0 }}>
          追加
        </Button>
      </Box>

      {/* フィルターパネル */}
      <Collapse in={filterOpen}>
        <Card variant="outlined" sx={{ mb: 1, p: 1.5 }}>
          <Stack spacing={1.5}>
            {/* 月 */}
            <FormControl size="small" fullWidth>
              <InputLabel>月</InputLabel>
              <Select value={filterMonth} label="月" onChange={e => setFilterMonth(e.target.value)}>
                {monthOptions.map(opt => (
                  <MenuItem key={opt.value} value={opt.value}>{opt.label}</MenuItem>
                ))}
              </Select>
            </FormControl>

            {/* メンバー */}
            <FormControl size="small" fullWidth>
              <InputLabel>メンバー</InputLabel>
              <Select
                value={filterMember}
                label="メンバー"
                onChange={e => setFilterMember(e.target.value)}
              >
                <MenuItem value="">すべて</MenuItem>
                {settings.members.map(m => (
                  <MenuItem key={m} value={m}>{m}</MenuItem>
                ))}
              </Select>
            </FormControl>

            {/* カテゴリ（チップ） */}
            <Box>
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>
                カテゴリ
              </Typography>
              <Stack direction="row" flexWrap="wrap" gap={0.5}>
                {settings.categories.map(cat => (
                  <Chip
                    key={cat}
                    label={cat}
                    size="small"
                    onClick={() => toggleCategory(cat)}
                    variant={filterCategories.includes(cat) ? 'filled' : 'outlined'}
                    sx={{
                      bgcolor: filterCategories.includes(cat)
                        ? (CATEGORY_COLORS[cat] ?? '#D3D3D3')
                        : undefined,
                    }}
                  />
                ))}
              </Stack>
            </Box>

            {/* クリアボタン */}
            {activeFilterCount > 0 && (
              <Button size="small" onClick={clearFilters} color="inherit" sx={{ alignSelf: 'flex-start' }}>
                フィルターをクリア
              </Button>
            )}
          </Stack>
        </Card>
      </Collapse>

      <Divider sx={{ mb: 2 }} />

      <Stack spacing={1}>
        {filtered.length === 0 && (
          <Typography color="text.secondary" textAlign="center" sx={{ mt: 4 }}>
            {transactions.length === 0 ? 'まだ記録がありません' : '条件に一致する支出がありません'}
          </Typography>
        )}
        {filtered.map(t => (
          <Card key={t.id} variant="outlined">
            <CardActionArea onClick={() => openEdit(t)}>
              <CardContent sx={{ py: 1.5, '&:last-child': { pb: 1.5 } }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <Box>
                    <Typography variant="caption" color="text.secondary">
                      {t.date}
                    </Typography>
                    <Typography variant="body1" fontWeight="medium">
                      {t.description || t.category}
                    </Typography>
                    <Stack direction="row" spacing={0.5} sx={{ mt: 0.5 }}>
                      <Chip
                        label={t.category}
                        size="small"
                        sx={{ bgcolor: CATEGORY_COLORS[t.category] ?? '#D3D3D3', height: 20 }}
                      />
                      <Chip label={t.member} size="small" sx={{ height: 20 }} />
                    </Stack>
                  </Box>
                  <Typography variant="h6" fontWeight="bold" sx={{ ml: 2 }}>
                    ¥{t.amount.toLocaleString()}
                  </Typography>
                </Box>
              </CardContent>
            </CardActionArea>
          </Card>
        ))}
      </Stack>

      <TransactionDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        settings={settings}
        editTarget={editTarget}
      />
    </Box>
  );
}
