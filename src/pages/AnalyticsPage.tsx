import { useEffect, useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  CircularProgress,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  Typography,
} from '@mui/material';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
} from 'recharts';
import dayjs from 'dayjs';
import { subscribeTransactions, subscribeBudget } from '../lib/firebase';
import type { Transaction, Budget } from '../types';

const PIE_COLORS = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7', '#DDA0DD', '#D3D3D3', '#FFB347'];

function formatYen(value: number) {
  return `¥${value.toLocaleString()}`;
}

export function AnalyticsPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [budget, setBudgetState] = useState<Budget | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedMonth, setSelectedMonth] = useState(dayjs().format('YYYY-MM'));

  // 過去6ヶ月の選択肢を生成
  const monthOptions = Array.from({ length: 6 }, (_, i) =>
    dayjs().subtract(i, 'month').format('YYYY-MM'),
  );

  useEffect(() => {
    const unsub1 = subscribeTransactions(data => {
      setTransactions(data);
      setLoading(false);
    });
    return unsub1;
  }, []);

  useEffect(() => {
    const unsub = subscribeBudget(selectedMonth, setBudgetState);
    return unsub;
  }, [selectedMonth]);

  const monthTransactions = transactions.filter(t => t.date.startsWith(selectedMonth));
  const totalAmount = monthTransactions.reduce((sum, t) => sum + t.amount, 0);

  // カテゴリ別集計
  const categoryData = Object.entries(
    monthTransactions.reduce<Record<string, number>>((acc, t) => {
      acc[t.category] = (acc[t.category] ?? 0) + t.amount;
      return acc;
    }, {}),
  )
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value);

  // メンバー別集計
  const memberData = Object.entries(
    monthTransactions.reduce<Record<string, number>>((acc, t) => {
      acc[t.member] = (acc[t.member] ?? 0) + t.amount;
      return acc;
    }, {}),
  ).map(([name, value]) => ({ name, value }));

  // 過去6ヶ月の推移
  const trendData = monthOptions
    .map(month => ({
      month,
      合計: transactions
        .filter(t => t.date.startsWith(month))
        .reduce((sum, t) => sum + t.amount, 0),
    }))
    .reverse();

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', mt: 8 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ maxWidth: 800, mx: 'auto', p: 2 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h6" fontWeight="bold">
          分析
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

      {/* 合計 + 予算 */}
      <Card sx={{ mb: 2 }}>
        <CardContent>
          <Typography variant="body2" color="text.secondary">
            {selectedMonth} の合計支出
          </Typography>
          <Typography variant="h4" fontWeight="bold">
            ¥{totalAmount.toLocaleString()}
          </Typography>
          {budget?.total && (
            <Typography variant="body2" color={totalAmount > budget.total ? 'error' : 'success.main'}>
              予算 ¥{budget.total.toLocaleString()} に対して{' '}
              {totalAmount > budget.total ? '超過' : `残り ¥${(budget.total - totalAmount).toLocaleString()}`}
            </Typography>
          )}
        </CardContent>
      </Card>

      <Stack spacing={2}>
        {/* 月別推移グラフ */}
        <Card>
          <CardContent>
            <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
              月別支出推移
            </Typography>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={trendData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis tickFormatter={v => `¥${(v / 1000).toFixed(0)}k`} />
                <Tooltip formatter={(v: number) => formatYen(v)} />
                <Bar dataKey="合計" fill="#4ECDC4" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* カテゴリ別円グラフ */}
        {categoryData.length > 0 && (
          <Card>
            <CardContent>
              <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
                カテゴリ別内訳
              </Typography>
              <ResponsiveContainer width="100%" height={280}>
                <PieChart>
                  <Pie
                    data={categoryData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={100}
                    label={({ name, percent }) =>
                      `${name} ${(percent * 100).toFixed(0)}%`
                    }
                  >
                    {categoryData.map((_, index) => (
                      <Cell key={index} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(v: number) => formatYen(v)} />
                </PieChart>
              </ResponsiveContainer>
              <Stack spacing={0.5} sx={{ mt: 1 }}>
                {categoryData.map(({ name, value }) => (
                  <Box key={name} sx={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Typography variant="body2">{name}</Typography>
                    <Typography variant="body2" fontWeight="bold">
                      ¥{value.toLocaleString()}
                    </Typography>
                  </Box>
                ))}
              </Stack>
            </CardContent>
          </Card>
        )}

        {/* メンバー別集計 */}
        {memberData.length > 0 && (
          <Card>
            <CardContent>
              <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
                メンバー別支出
              </Typography>
              <ResponsiveContainer width="100%" height={180}>
                <BarChart data={memberData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" tickFormatter={v => `¥${(v / 1000).toFixed(0)}k`} />
                  <YAxis type="category" dataKey="name" width={60} />
                  <Tooltip formatter={(v: number) => formatYen(v)} />
                  <Bar dataKey="value" fill="#FF6B6B" radius={[0, 4, 4, 0]} name="支出" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}
      </Stack>
    </Box>
  );
}
