import { useEffect, useState } from 'react';
import {
  Alert,
  Box,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Divider,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  Typography,
} from '@mui/material';
import {
  ArrowForward as ArrowForwardIcon,
  CheckCircle as CheckCircleIcon,
  Info as InfoIcon,
} from '@mui/icons-material';
import dayjs from 'dayjs';
import { subscribeTransactions, subscribeSettings } from '../lib/firebase';
import type { Transaction, Settings } from '../types';

interface Transfer {
  from: string;
  to: string;
  amount: number;
}

/** 最小トランザクション数で清算する貪欲アルゴリズム */
function calcSettlement(balances: Record<string, number>): Transfer[] {
  // 正: 受け取るべき (払いすぎ), 負: 支払うべき (払い不足)
  const creditors: { name: string; amount: number }[] = [];
  const debtors: { name: string; amount: number }[] = [];

  for (const [name, balance] of Object.entries(balances)) {
    const rounded = Math.round(balance);
    if (rounded > 0) creditors.push({ name, amount: rounded });
    else if (rounded < 0) debtors.push({ name, amount: -rounded });
  }

  creditors.sort((a, b) => b.amount - a.amount);
  debtors.sort((a, b) => b.amount - a.amount);

  const transfers: Transfer[] = [];

  let ci = 0;
  let di = 0;
  while (ci < creditors.length && di < debtors.length) {
    const credit = creditors[ci];
    const debt = debtors[di];
    const amount = Math.min(credit.amount, debt.amount);

    transfers.push({ from: debt.name, to: credit.name, amount });

    credit.amount -= amount;
    debt.amount -= amount;

    if (credit.amount === 0) ci++;
    if (debt.amount === 0) di++;
  }

  return transfers;
}

const MONTH_ALL = 'all';

export function SettlementPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [settings, setSettings] = useState<Settings>({ categories: [], members: [] });
  const [loading, setLoading] = useState(true);
  const [selectedMonth, setSelectedMonth] = useState(dayjs().format('YYYY-MM'));

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

  const EXCLUDED_MEMBER = '共通';

  // 精算対象: 対象月 & settlementTarget=true & メンバーが"共通"でない
  const target = (selectedMonth === MONTH_ALL ? transactions : transactions.filter(t => t.date.startsWith(selectedMonth)))
    .filter(t => t.settlementTarget && t.member !== EXCLUDED_MEMBER);

  const totalAmount = target.reduce((s, t) => s + t.amount, 0);

  // 精算対象外の件数（表示用）
  const excludedCount = (selectedMonth === MONTH_ALL ? transactions : transactions.filter(t => t.date.startsWith(selectedMonth))).length - target.length;

  // 精算対象メンバー（"共通"を除く）
  const settlementMembers = settings.members.filter(m => m !== EXCLUDED_MEMBER);

  // メンバーごとの支出合計
  const spentByMember: Record<string, number> = {};
  for (const m of settlementMembers) spentByMember[m] = 0;
  for (const t of target) {
    if (!(t.member in spentByMember)) spentByMember[t.member] = 0;
    spentByMember[t.member] += t.amount;
  }

  const memberCount = settlementMembers.length;
  const fairShare = memberCount > 0 ? totalAmount / memberCount : 0;

  // 残高: 正 = 払いすぎ（受け取るべき）、負 = 払い不足（払うべき）
  const balances: Record<string, number> = {};
  for (const [name, spent] of Object.entries(spentByMember)) {
    balances[name] = spent - fairShare;
  }

  const transfers = calcSettlement(balances);

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', mt: 8 }}>
        <CircularProgress />
      </Box>
    );
  }

  const hasData = target.length > 0 || excludedCount > 0;

  return (
    <Box sx={{ maxWidth: 720, mx: 'auto', p: 2 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h6" fontWeight="bold">
          精算
        </Typography>
        <FormControl size="small" sx={{ minWidth: 160 }}>
          <InputLabel>期間</InputLabel>
          <Select value={selectedMonth} label="期間" onChange={e => setSelectedMonth(e.target.value)}>
            {monthOptions.map(opt => (
              <MenuItem key={opt.value} value={opt.value}>{opt.label}</MenuItem>
            ))}
          </Select>
        </FormControl>
      </Box>

      {!hasData ? (
        <Alert severity="info">対象期間の支出データがありません。</Alert>
      ) : (
        <Stack spacing={2}>
          {/* 合計 + 一人当たり */}
          <Card>
            <CardContent>
              <Stack direction="row" justifyContent="space-between">
                <Box>
                  <Typography variant="caption" color="text.secondary">合計支出</Typography>
                  <Typography variant="h5" fontWeight="bold">¥{totalAmount.toLocaleString()}</Typography>
                </Box>
                <Box sx={{ textAlign: 'right' }}>
                  <Typography variant="caption" color="text.secondary">一人当たり（均等割）</Typography>
                  <Typography variant="h5" fontWeight="bold">¥{Math.round(fairShare).toLocaleString()}</Typography>
                </Box>
              </Stack>
            </CardContent>
          </Card>

          {/* 除外件数の注記 */}
          {excludedCount > 0 && (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, color: 'text.secondary' }}>
              <InfoIcon fontSize="small" />
              <Typography variant="caption">
                「共通」支出・精算対象外に設定された支出（{excludedCount}件）は計算から除いています
              </Typography>
            </Box>
          )}

          {/* メンバー別内訳 */}
          <Card>
            <CardContent>
              <Typography variant="subtitle2" fontWeight="bold" gutterBottom>
                メンバー別支出
              </Typography>
              <Stack spacing={1} divider={<Divider />}>
                {Object.entries(spentByMember).map(([name, spent]) => {
                  const balance = Math.round(balances[name]);
                  const isOver = balance > 0;
                  const isEven = balance === 0;
                  return (
                    <Box key={name} sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', pt: 1 }}>
                      <Box>
                        <Typography variant="body2" fontWeight="medium">{name}</Typography>
                        <Typography variant="caption" color="text.secondary">
                          支出 ¥{spent.toLocaleString()}
                        </Typography>
                      </Box>
                      <Box sx={{ textAlign: 'right' }}>
                        {isEven ? (
                          <Chip label="精算不要" size="small" color="default" />
                        ) : (
                          <>
                            <Chip
                              label={isOver ? '受け取り' : '支払い'}
                              size="small"
                              color={isOver ? 'success' : 'error'}
                              sx={{ mb: 0.5 }}
                            />
                            <Typography
                              variant="body2"
                              fontWeight="bold"
                              color={isOver ? 'success.main' : 'error.main'}
                            >
                              {isOver ? '+' : ''}¥{balance.toLocaleString()}
                            </Typography>
                          </>
                        )}
                      </Box>
                    </Box>
                  );
                })}
              </Stack>
            </CardContent>
          </Card>

          {/* 精算リスト */}
          <Card>
            <CardContent>
              <Typography variant="subtitle2" fontWeight="bold" gutterBottom>
                精算方法
              </Typography>
              {transfers.length === 0 ? (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, color: 'success.main', mt: 1 }}>
                  <CheckCircleIcon />
                  <Typography variant="body2">精算は不要です</Typography>
                </Box>
              ) : (
                <Stack spacing={1.5} sx={{ mt: 1 }}>
                  {transfers.map((tr, i) => (
                    <Box
                      key={i}
                      sx={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 1,
                        p: 1.5,
                        bgcolor: 'grey.50',
                        borderRadius: 2,
                        border: 1,
                        borderColor: 'divider',
                      }}
                    >
                      <Typography variant="body2" fontWeight="bold" sx={{ flexShrink: 0 }}>
                        {tr.from}
                      </Typography>
                      <ArrowForwardIcon fontSize="small" color="action" />
                      <Typography variant="body2" fontWeight="bold" sx={{ flexShrink: 0 }}>
                        {tr.to}
                      </Typography>
                      <Box sx={{ flexGrow: 1 }} />
                      <Typography variant="body1" fontWeight="bold" color="primary">
                        ¥{tr.amount.toLocaleString()}
                      </Typography>
                    </Box>
                  ))}
                </Stack>
              )}
            </CardContent>
          </Card>
        </Stack>
      )}
    </Box>
  );
}
