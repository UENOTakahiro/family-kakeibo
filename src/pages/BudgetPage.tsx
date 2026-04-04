import { useEffect, useState } from 'react';
import {
  Box,
  Button,
  Card,
  CardContent,
  CircularProgress,
  FormControl,
  InputLabel,
  LinearProgress,
  MenuItem,
  Select,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import dayjs from 'dayjs';
import { subscribeBudget, setBudget, subscribeTransactions, subscribeSettings } from '../lib/firebase';
import type { Budget, Transaction, Settings } from '../types';

const DEFAULT_SETTINGS: Settings = {
  categories: ['食費', '交通費', '日用品', '娯楽', '医療', '外食', 'その他'],
  members: [],
};

export function BudgetPage() {
  const [budget, setBudgetState] = useState<Budget | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [selectedMonth, setSelectedMonth] = useState(dayjs().format('YYYY-MM'));
  const [editTotal, setEditTotal] = useState('');
  const [editByCategory, setEditByCategory] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  const monthOptions = Array.from({ length: 6 }, (_, i) =>
    dayjs().subtract(i, 'month').format('YYYY-MM'),
  );

  useEffect(() => {
    const unsub1 = subscribeBudget(selectedMonth, b => {
      setBudgetState(b);
      setEditTotal(b?.total ? String(b.total) : '');
      setEditByCategory(
        Object.fromEntries(
          Object.entries(b?.byCategory ?? {}).map(([k, v]) => [k, String(v)]),
        ),
      );
    });
    const unsub2 = subscribeTransactions(setTransactions);
    const unsub3 = subscribeSettings(setSettings);
    return () => { unsub1(); unsub2(); unsub3(); };
  }, [selectedMonth]);

  const monthTransactions = transactions.filter(t => t.date.startsWith(selectedMonth));

  async function handleSave() {
    setSaving(true);
    try {
      const newBudget: Budget = {
        total: parseInt(editTotal || '0', 10),
        byCategory: Object.fromEntries(
          Object.entries(editByCategory)
            .filter(([, v]) => v !== '' && !isNaN(parseInt(v, 10)))
            .map(([k, v]) => [k, parseInt(v, 10)]),
        ),
      };
      await setBudget(selectedMonth, newBudget);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Box sx={{ maxWidth: 720, mx: 'auto', p: 2 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h6" fontWeight="bold">
          予算管理
        </Typography>
        <FormControl size="small" sx={{ minWidth: 140 }}>
          <InputLabel>月</InputLabel>
          <Select value={selectedMonth} label="月" onChange={e => setSelectedMonth(e.target.value)}>
            {monthOptions.map(m => (
              <MenuItem key={m} value={m}>
                {m}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      </Box>

      {/* 月全体の予算 */}
      <Card sx={{ mb: 2 }}>
        <CardContent>
          <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
            月の総予算
          </Typography>
          <TextField
            label="予算（円）"
            type="number"
            value={editTotal}
            onChange={e => setEditTotal(e.target.value)}
            size="small"
            sx={{ mb: 1 }}
          />
          {budget?.total && editTotal && (
            <Box sx={{ mt: 1 }}>
              <BudgetProgress
                label="全体"
                budget={parseInt(editTotal, 10)}
                actual={monthTransactions.reduce((s, t) => s + t.amount, 0)}
              />
            </Box>
          )}
        </CardContent>
      </Card>

      {/* カテゴリ別予算 */}
      <Card sx={{ mb: 2 }}>
        <CardContent>
          <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
            カテゴリ別予算
          </Typography>
          <Stack spacing={2}>
            {settings.categories.map(cat => {
              const actual = monthTransactions
                .filter(t => t.category === cat)
                .reduce((s, t) => s + t.amount, 0);
              const budgetVal = parseInt(editByCategory[cat] || '0', 10);
              return (
                <Box key={cat}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 0.5 }}>
                    <Typography variant="body2" sx={{ width: 80, flexShrink: 0 }}>
                      {cat}
                    </Typography>
                    <TextField
                      size="small"
                      type="number"
                      placeholder="予算"
                      value={editByCategory[cat] ?? ''}
                      onChange={e =>
                        setEditByCategory(prev => ({ ...prev, [cat]: e.target.value }))
                      }
                      sx={{ width: 120 }}
                    />
                    <Typography variant="body2" color="text.secondary">
                      実績 ¥{actual.toLocaleString()}
                    </Typography>
                  </Box>
                  {budgetVal > 0 && (
                    <LinearProgress
                      variant="determinate"
                      value={Math.min((actual / budgetVal) * 100, 100)}
                      color={actual > budgetVal ? 'error' : 'primary'}
                      sx={{ height: 6, borderRadius: 3 }}
                    />
                  )}
                </Box>
              );
            })}
          </Stack>
        </CardContent>
      </Card>

      <Button variant="contained" onClick={handleSave} disabled={saving} fullWidth>
        {saving ? <CircularProgress size={20} /> : '予算を保存'}
      </Button>
    </Box>
  );
}

function BudgetProgress({ label, budget, actual }: { label: string; budget: number; actual: number }) {
  const pct = budget > 0 ? Math.min((actual / budget) * 100, 100) : 0;
  const over = actual > budget;
  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
        <Typography variant="body2">{label}</Typography>
        <Typography variant="body2" color={over ? 'error' : 'text.secondary'}>
          ¥{actual.toLocaleString()} / ¥{budget.toLocaleString()}
        </Typography>
      </Box>
      <LinearProgress
        variant="determinate"
        value={pct}
        color={over ? 'error' : 'primary'}
        sx={{ height: 8, borderRadius: 4 }}
      />
    </Box>
  );
}
