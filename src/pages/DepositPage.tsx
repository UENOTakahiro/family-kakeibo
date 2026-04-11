import { useEffect, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  CircularProgress,
  Divider,
  FormControl,
  IconButton,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { Delete as DeleteIcon } from '@mui/icons-material';
import dayjs from 'dayjs';
import {
  subscribeDeposits,
  addDeposit,
  deleteDeposit,
  subscribeSettings,
  updateSettings,
} from '../lib/firebase';
import type { Deposit, Settings } from '../types';

const DEFAULT_SETTINGS: Settings = {
  categories: [],
  members: [],
};

export function DepositPage() {
  const [deposits, setDeposits] = useState<Deposit[]>([]);
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [targetInput, setTargetInput] = useState('');
  const [savingTarget, setSavingTarget] = useState(false);
  const [targetSaved, setTargetSaved] = useState(false);

  const [formMember, setFormMember] = useState('');
  const [formDate, setFormDate] = useState(dayjs().format('YYYY-MM-DD'));
  const [formAmount, setFormAmount] = useState('');
  const [formNote, setFormNote] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');

  useEffect(() => {
    const unsub1 = subscribeDeposits(setDeposits);
    const unsub2 = subscribeSettings(s => {
      setSettings(s);
      setTargetInput(s.monthlyDepositTarget ? String(s.monthlyDepositTarget) : '');
    });
    return () => { unsub1(); unsub2(); };
  }, []);

  // メンバーが確定したら初期値を設定
  useEffect(() => {
    if (settings.members.length > 0 && !formMember) {
      setFormMember(settings.members[0]);
    }
  }, [settings.members, formMember]);

  async function handleSaveTarget() {
    const parsed = parseInt(targetInput, 10);
    if (isNaN(parsed) || parsed <= 0) return;
    setSavingTarget(true);
    try {
      await updateSettings({ monthlyDepositTarget: parsed });
      setTargetSaved(true);
      setTimeout(() => setTargetSaved(false), 2000);
    } finally {
      setSavingTarget(false);
    }
  }

  async function handleAddDeposit() {
    const amount = parseInt(formAmount, 10);
    if (!formMember) { setFormError('メンバーを選択してください。'); return; }
    if (isNaN(amount) || amount <= 0) { setFormError('金額を正しく入力してください。'); return; }
    if (!formDate) { setFormError('日付を入力してください。'); return; }
    setFormError('');
    setSubmitting(true);
    try {
      await addDeposit({ date: formDate, amount, member: formMember, note: formNote.trim() });
      setFormAmount('');
      setFormNote('');
      setFormDate(dayjs().format('YYYY-MM-DD'));
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(id: string) {
    await deleteDeposit(id);
  }

  // 月別グループ化
  const byMonth = deposits.reduce<Record<string, Deposit[]>>((acc, d) => {
    const ym = d.date.slice(0, 7);
    if (!acc[ym]) acc[ym] = [];
    acc[ym].push(d);
    return acc;
  }, {});
  const sortedMonths = Object.keys(byMonth).sort((a, b) => b.localeCompare(a));

  // 累計未入金計算
  const target = settings.monthlyDepositTarget ?? 0;
  const shortfalls = computeShortfalls(deposits, settings.members, target);

  return (
    <Box sx={{ maxWidth: 720, mx: 'auto', p: 2 }}>
      <Typography variant="h6" fontWeight="bold" gutterBottom>
        入金管理
      </Typography>

      {/* ① 月次入金目標 */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
            月次入金目標（1人あたり）
          </Typography>
          <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
            <TextField
              label="目標額（円）"
              type="number"
              size="small"
              value={targetInput}
              onChange={e => setTargetInput(e.target.value)}
              sx={{ width: 180 }}
            />
            <Button
              variant="contained"
              size="small"
              onClick={handleSaveTarget}
              disabled={savingTarget}
            >
              {savingTarget ? <CircularProgress size={16} /> : '保存'}
            </Button>
            {targetSaved && (
              <Typography variant="body2" color="success.main">
                保存しました
              </Typography>
            )}
          </Box>
        </CardContent>
      </Card>

      {/* ② 入金を記録 */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
            入金を記録
          </Typography>
          <Stack spacing={2}>
            <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
              <FormControl size="small" sx={{ minWidth: 140 }}>
                <InputLabel>メンバー</InputLabel>
                <Select
                  value={formMember}
                  label="メンバー"
                  onChange={e => setFormMember(e.target.value)}
                >
                  {settings.members.map(m => (
                    <MenuItem key={m} value={m}>{m}</MenuItem>
                  ))}
                </Select>
              </FormControl>
              <TextField
                label="日付"
                type="date"
                size="small"
                value={formDate}
                onChange={e => setFormDate(e.target.value)}
                InputLabelProps={{ shrink: true }}
                sx={{ width: 160 }}
              />
              <TextField
                label="金額（円）"
                type="number"
                size="small"
                value={formAmount}
                onChange={e => setFormAmount(e.target.value)}
                sx={{ width: 140 }}
              />
              <TextField
                label="メモ（任意）"
                size="small"
                value={formNote}
                onChange={e => setFormNote(e.target.value)}
                sx={{ width: 180 }}
              />
            </Box>
            {formError && <Alert severity="error">{formError}</Alert>}
            <Button
              variant="contained"
              onClick={handleAddDeposit}
              disabled={submitting}
              sx={{ alignSelf: 'flex-start' }}
            >
              {submitting ? <CircularProgress size={20} /> : '入金を記録'}
            </Button>
          </Stack>
        </CardContent>
      </Card>

      {/* ③ 累計未入金額 */}
      {target > 0 && settings.members.length > 0 && (
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
              累計未入金額
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
              目標: 月¥{target.toLocaleString()} × 経過月数
            </Typography>
            <Stack spacing={1}>
              {shortfalls.map(({ member, target: tgt, actual, shortfall, months }) => (
                <Box
                  key={member}
                  sx={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    p: 1.5,
                    borderRadius: 1,
                    bgcolor: shortfall > 0 ? 'error.50' : 'success.50',
                    border: 1,
                    borderColor: shortfall > 0 ? 'error.200' : 'success.200',
                  }}
                >
                  <Box>
                    <Typography variant="body1" fontWeight="bold">{member}</Typography>
                    <Typography variant="body2" color="text.secondary">
                      目標: ¥{tgt.toLocaleString()}（{months}ヶ月分）　実績: ¥{actual.toLocaleString()}
                    </Typography>
                  </Box>
                  <Typography
                    variant="body1"
                    fontWeight="bold"
                    color={shortfall > 0 ? 'error.main' : 'success.main'}
                  >
                    {shortfall > 0
                      ? `未入金 ¥${shortfall.toLocaleString()}`
                      : `達成 (+¥${(-shortfall).toLocaleString()})`}
                  </Typography>
                </Box>
              ))}
            </Stack>
          </CardContent>
        </Card>
      )}

      {/* ④ 月別入金状況 */}
      <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
        月別入金状況
      </Typography>
      {sortedMonths.length === 0 ? (
        <Typography variant="body2" color="text.secondary">
          入金記録がありません。
        </Typography>
      ) : (
        <Stack spacing={2}>
          {sortedMonths.map(ym => {
            const [year, month] = ym.split('-');
            const label = `${year}年${parseInt(month, 10)}月`;
            const monthDeposits = byMonth[ym];
            const monthTotal = monthDeposits.reduce((s, d) => s + d.amount, 0);
            return (
              <Card key={ym}>
                <CardContent sx={{ pb: '12px !important' }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                    <Typography variant="subtitle2" fontWeight="bold">{label}</Typography>
                    <Typography variant="subtitle2" color="text.secondary">
                      合計 ¥{monthTotal.toLocaleString()}
                    </Typography>
                  </Box>
                  <Divider sx={{ mb: 1 }} />
                  <Stack spacing={0.5}>
                    {monthDeposits.map(d => (
                      <Box
                        key={d.id}
                        sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
                      >
                        <Box>
                          <Typography variant="body2" component="span" fontWeight="medium">
                            {d.member}
                          </Typography>
                          <Typography variant="body2" component="span" sx={{ mx: 1 }}>
                            ¥{d.amount.toLocaleString()}
                          </Typography>
                          {d.note && (
                            <Typography variant="body2" component="span" color="text.secondary">
                              {d.note}
                            </Typography>
                          )}
                        </Box>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Typography variant="caption" color="text.secondary">
                            {d.date}
                          </Typography>
                          <IconButton
                            size="small"
                            onClick={() => handleDelete(d.id)}
                            color="error"
                          >
                            <DeleteIcon fontSize="small" />
                          </IconButton>
                        </Box>
                      </Box>
                    ))}
                  </Stack>
                </CardContent>
              </Card>
            );
          })}
        </Stack>
      )}
    </Box>
  );
}

function computeShortfalls(
  deposits: Deposit[],
  members: string[],
  monthlyTarget: number,
) {
  if (deposits.length === 0 || monthlyTarget === 0 || members.length === 0) {
    return members.map(member => ({ member, target: 0, actual: 0, shortfall: 0, months: 0 }));
  }

  const allMonths = deposits.map(d => d.date.slice(0, 7));
  const earliest = allMonths.reduce((a, b) => (a < b ? a : b));
  const current = dayjs().format('YYYY-MM');

  const start = dayjs(earliest + '-01');
  const end = dayjs(current + '-01');
  const months = end.diff(start, 'month') + 1;

  return members.map(member => {
    const actual = deposits
      .filter(d => d.member === member)
      .reduce((s, d) => s + d.amount, 0);
    const tgt = monthlyTarget * months;
    return { member, target: tgt, actual, shortfall: tgt - actual, months };
  });
}
