import { useEffect, useState } from 'react';
import {
  Box,
  Card,
  CardActionArea,
  CardContent,
  Chip,
  CircularProgress,
  LinearProgress,
  Stack,
  Typography,
} from '@mui/material';
import {
  TrendingUp as TrendingUpIcon,
  TrendingDown as TrendingDownIcon,
  AccountBalanceWallet as WalletIcon,
} from '@mui/icons-material';
import dayjs from 'dayjs';
import { useNavigate } from 'react-router-dom';
import { subscribeTransactions, subscribeBudget } from '../lib/firebase';
import type { Transaction, Budget } from '../types';

const CATEGORY_COLORS: Record<string, string> = {
  食費: '#FF6B6B',
  交通費: '#4ECDC4',
  日用品: '#45B7D1',
  娯楽: '#96CEB4',
  医療: '#FFEAA7',
  外食: '#DDA0DD',
  その他: '#D3D3D3',
};

const FALLBACK_COLORS = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7'];

function categoryColor(cat: string, index: number) {
  return CATEGORY_COLORS[cat] ?? FALLBACK_COLORS[index % FALLBACK_COLORS.length];
}

export function DashboardPage() {
  const navigate = useNavigate();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [budget, setBudget] = useState<Budget | null>(null);
  const [loading, setLoading] = useState(true);

  const currentMonth = dayjs().format('YYYY-MM');
  const today = dayjs().format('YYYY年M月D日');

  useEffect(() => {
    const unsub1 = subscribeTransactions(data => {
      setTransactions(data);
      setLoading(false);
    });
    const unsub2 = subscribeBudget(currentMonth, setBudget);
    return () => { unsub1(); unsub2(); };
  }, [currentMonth]);

  const monthTransactions = transactions.filter(t => t.date.startsWith(currentMonth));
  const totalExpense = monthTransactions.reduce((s, t) => s + t.amount, 0);
  const budgetTotal = budget?.total ?? 0;
  const budgetRemaining = budgetTotal > 0 ? budgetTotal - totalExpense : null;
  const budgetPct = budgetTotal > 0 ? Math.min((totalExpense / budgetTotal) * 100, 100) : 0;

  // カテゴリ別集計（上位3件）
  const categoryRanking = Object.entries(
    monthTransactions.reduce<Record<string, number>>((acc, t) => {
      acc[t.category] = (acc[t.category] ?? 0) + t.amount;
      return acc;
    }, {}),
  )
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 3);

  // 先月との比較
  const lastMonth = dayjs().subtract(1, 'month').format('YYYY-MM');
  const lastMonthTotal = transactions
    .filter(t => t.date.startsWith(lastMonth))
    .reduce((s, t) => s + t.amount, 0);
  const diffFromLastMonth = totalExpense - lastMonthTotal;

  // 最近の支出（5件）
  const recentTransactions = transactions.slice(0, 5);

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', mt: 8 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ maxWidth: 720, mx: 'auto', p: 2 }}>
      <Typography variant="body2" color="text.secondary" gutterBottom>
        {today}
      </Typography>
      <Typography variant="h6" fontWeight="bold" sx={{ mb: 2 }}>
        今月のサマリー
      </Typography>

      {/* 支出合計カード */}
      <Card sx={{ mb: 2, bgcolor: 'primary.main', color: 'primary.contrastText' }}>
        <CardContent>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
            <WalletIcon fontSize="small" />
            <Typography variant="body2">{currentMonth} の支出合計</Typography>
          </Box>
          <Typography variant="h3" fontWeight="bold">
            ¥{totalExpense.toLocaleString()}
          </Typography>

          {/* 先月比 */}
          {lastMonthTotal > 0 && (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 1 }}>
              {diffFromLastMonth > 0 ? (
                <TrendingUpIcon fontSize="small" />
              ) : (
                <TrendingDownIcon fontSize="small" />
              )}
              <Typography variant="body2">
                先月比 {diffFromLastMonth > 0 ? '+' : ''}
                ¥{Math.abs(diffFromLastMonth).toLocaleString()}
              </Typography>
            </Box>
          )}
        </CardContent>
      </Card>

      {/* 予算カード */}
      {budgetTotal > 0 && (
        <Card sx={{ mb: 2 }}>
          <CardContent>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
              <Typography variant="subtitle2" fontWeight="bold">
                予算
              </Typography>
              <Typography
                variant="subtitle2"
                fontWeight="bold"
                color={budgetRemaining !== null && budgetRemaining < 0 ? 'error' : 'success.main'}
              >
                {budgetRemaining !== null && budgetRemaining < 0
                  ? `¥${Math.abs(budgetRemaining).toLocaleString()} 超過`
                  : `残り ¥${(budgetRemaining ?? 0).toLocaleString()}`}
              </Typography>
            </Box>
            <LinearProgress
              variant="determinate"
              value={budgetPct}
              color={budgetPct >= 100 ? 'error' : budgetPct >= 80 ? 'warning' : 'primary'}
              sx={{ height: 10, borderRadius: 5, mb: 0.5 }}
            />
            <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
              <Typography variant="caption" color="text.secondary">
                ¥{totalExpense.toLocaleString()} 使用
              </Typography>
              <Typography variant="caption" color="text.secondary">
                ¥{budgetTotal.toLocaleString()} 予算
              </Typography>
            </Box>
          </CardContent>
        </Card>
      )}

      {/* カテゴリ別トップ3 */}
      {categoryRanking.length > 0 && (
        <Card sx={{ mb: 2 }}>
          <CardContent>
            <Typography variant="subtitle2" fontWeight="bold" gutterBottom>
              カテゴリ別トップ3
            </Typography>
            <Stack spacing={1.5}>
              {categoryRanking.map(({ name, value }, i) => {
                const pct = totalExpense > 0 ? (value / totalExpense) * 100 : 0;
                return (
                  <Box key={name}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Box
                          sx={{
                            width: 10,
                            height: 10,
                            borderRadius: '50%',
                            bgcolor: categoryColor(name, i),
                            flexShrink: 0,
                          }}
                        />
                        <Typography variant="body2">{name}</Typography>
                      </Box>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Typography variant="caption" color="text.secondary">
                          {pct.toFixed(0)}%
                        </Typography>
                        <Typography variant="body2" fontWeight="bold">
                          ¥{value.toLocaleString()}
                        </Typography>
                      </Box>
                    </Box>
                    <LinearProgress
                      variant="determinate"
                      value={pct}
                      sx={{
                        height: 5,
                        borderRadius: 3,
                        bgcolor: 'grey.100',
                        '& .MuiLinearProgress-bar': { bgcolor: categoryColor(name, i) },
                      }}
                    />
                  </Box>
                );
              })}
            </Stack>
          </CardContent>
        </Card>
      )}

      {/* 最近の支出 */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
        <Typography variant="subtitle2" fontWeight="bold">
          最近の支出
        </Typography>
        <Typography
          variant="caption"
          color="primary"
          sx={{ cursor: 'pointer' }}
          onClick={() => navigate('/transactions')}
        >
          すべて見る
        </Typography>
      </Box>

      {recentTransactions.length === 0 ? (
        <Typography color="text.secondary" textAlign="center" sx={{ mt: 2 }}>
          まだ記録がありません
        </Typography>
      ) : (
        <Stack spacing={1}>
          {recentTransactions.map(t => (
            <Card key={t.id} variant="outlined">
              <CardActionArea onClick={() => navigate('/transactions')}>
                <CardContent sx={{ py: 1.5, '&:last-child': { pb: 1.5 } }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <Box>
                      <Typography variant="caption" color="text.secondary">
                        {t.date}
                      </Typography>
                      <Typography variant="body2" fontWeight="medium">
                        {t.description || t.category}
                      </Typography>
                      <Stack direction="row" spacing={0.5} sx={{ mt: 0.5 }}>
                        <Chip
                          label={t.category}
                          size="small"
                          sx={{ bgcolor: CATEGORY_COLORS[t.category] ?? '#D3D3D3', height: 18, fontSize: 11 }}
                        />
                        <Chip label={t.member} size="small" sx={{ height: 18, fontSize: 11 }} />
                      </Stack>
                    </Box>
                    <Typography variant="body1" fontWeight="bold" sx={{ ml: 2, flexShrink: 0 }}>
                      ¥{t.amount.toLocaleString()}
                    </Typography>
                  </Box>
                </CardContent>
              </CardActionArea>
            </Card>
          ))}
        </Stack>
      )}
    </Box>
  );
}
