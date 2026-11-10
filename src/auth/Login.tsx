import React, { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Alert, Accordion, AccordionDetails, AccordionSummary, Box, Button, Checkbox, CircularProgress, FormControlLabel, IconButton, InputAdornment, Paper, TextField, Typography } from '@mui/material';
import { ArrowRight, BarChart3, ChevronDown, Eye, EyeOff, LockKeyhole, MapPinned, ShieldCheck, UserRound, UsersRound, Waves } from 'lucide-react';
import { useAuth } from './AuthContext';
import { demoCredentials, demoMode, roleHome } from './authService';

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [username, setUsername] = useState(() => localStorage.getItem('smartaqua-last-username') || (demoMode ? 'admin' : ''));
  const [password, setPassword] = useState('');
  const [show, setShow] = useState(false);
  const [remember, setRemember] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setError('');
    try {
      const account = await login(username, password);
      if (remember) localStorage.setItem('smartaqua-last-username', account.username);
      else localStorage.removeItem('smartaqua-last-username');
      navigate((location.state as any)?.from || roleHome(account.role), { replace: true });
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Không thể đăng nhập. Vui lòng thử lại.');
    } finally {
      setBusy(false);
    }
  };

  const useDemo = (user: string, pass: string) => {
    setUsername(user);
    setPassword(pass);
    setError('');
  };

  return <Box sx={{ minHeight: '100svh', display: 'grid', gridTemplateColumns: { xs: '1fr', md: '56.5fr 43.5fr' }, background: '#ECF6FF', overflow: 'hidden' }}>
    <Box sx={{
      display: { xs: 'none', md: 'flex' }, position: 'relative', minHeight: '100svh', overflow: 'hidden', alignItems: 'flex-end',
      p: { md: '52px 5.2vw 48px', xl: '64px 6.2vw 54px' }, color: '#fff',
      backgroundImage: 'linear-gradient(180deg,rgba(4,31,65,.03) 15%,rgba(4,28,62,.22) 42%,rgba(3,27,67,.94) 100%),linear-gradient(90deg,rgba(4,35,78,.23),transparent 78%),url(/images/TraiLuon01.jpg)',
      backgroundPosition: 'center', backgroundSize: 'cover',
      '&:after': { content: '""', position: 'absolute', width: 620, height: 330, right: '-22%', bottom: '-22%', border: '1px solid rgba(63,194,255,.48)', borderRadius: '50%', transform: 'rotate(-24deg)', boxShadow: '0 0 0 30px rgba(63,194,255,.035),0 0 0 62px rgba(63,194,255,.035)' }
    }}>
      <Box sx={{ position: 'relative', zIndex: 1, width: '100%', maxWidth: 700 }}>
        {/* <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.6, mb: 3.2 }}>
          <Box sx={{ width: 54, height: 54, display: 'grid', placeItems: 'center', borderRadius: '50%', bgcolor: '#0878F9', boxShadow: '0 8px 24px #007BFF55' }}><Waves size={31} strokeWidth={2.5} /></Box>
          <Typography sx={{ fontSize: 29, fontWeight: 750, letterSpacing: '-.65px' }}>SmartAqua</Typography>
        </Box> */}
        <Typography component="h4" sx={{ maxWidth: 800, fontWeight: 760, fontSize: { md: 38, lg: 40, xl: 48 }, lineHeight: 1.16, letterSpacing: '-1.5px', textShadow: '0 2px 18px #001c3e66' }}>
          Nền tảng quản lý nuôi lươn<Box component="span" sx={{ display: 'block', color: '#42D9F4' }}>Thành phố Cần Thơ</Box>
        </Typography>
        <Typography sx={{ mt: 2, maxWidth: 650, fontSize: { md: 15.5, lg: 17 }, lineHeight: 1.7, color: '#F1F7FF', textShadow: '0 1px 8px #00152e88' }}>
          Quản lý vùng nuôi, hộ nuôi và bể nuôi trên một nền tảng thống nhất; kết nối bản đồ GIS, sản xuất và trợ lý AI.
        </Typography>
        <Box sx={{ display: 'flex', gap: 1.4, flexWrap: 'wrap', mt: 3.1 }}>
          {[[MapPinned, 'Bản đồ GIS', '#087CF4'], [BarChart3, 'Theo dõi sản xuất', '#00B8B0'], [ShieldCheck, 'Phân quyền dữ liệu', '#7256F4']].map(([Icon, label, color]: any) => <Box key={label} sx={{ display: 'flex', alignItems: 'center', gap: 1.2, py: 1, px: 1.3, border: '1px solid rgba(132,199,255,.34)', borderRadius: 2.5, bgcolor: 'rgba(5,37,83,.56)', backdropFilter: 'blur(8px)' }}>
            <Box sx={{ display: 'grid', placeItems: 'center', width: 36, height: 36, borderRadius: 1.8, bgcolor: color }}><Icon size={19} /></Box>
            <Typography sx={{ fontWeight: 650, fontSize: 13.5, whiteSpace: 'nowrap' }}>{label}</Typography>
          </Box>)}
        </Box>
      </Box>
    </Box>

    <Box sx={{ position: 'relative', minHeight: '100svh', display: 'grid', placeItems: 'center', overflow: 'hidden', p: { xs: 2, sm: 4, lg: 5 }, background: 'radial-gradient(ellipse at 96% 5%,rgba(194,229,255,.82) 0,rgba(194,229,255,0) 35%),radial-gradient(ellipse at 8% 100%,rgba(187,226,255,.68) 0,rgba(187,226,255,0) 40%),linear-gradient(145deg,#F9FCFF 0%,#EDF7FF 55%,#F8FCFF 100%)',
      '&:before': { content: '""', pointerEvents: 'none', position: 'absolute', width: 740, height: 740, top: -520, right: -350, borderRadius: '50%', border: '1px solid rgba(95,177,235,.16)', boxShadow: '0 0 0 34px rgba(95,177,235,.035),0 0 0 72px rgba(95,177,235,.03)' },
      '&:after': { content: '""', pointerEvents: 'none', position: 'absolute', width: 920, height: 360, bottom: -270, right: -190, borderRadius: '50%', border: '1px solid rgba(75,163,226,.20)', transform: 'rotate(16deg)', boxShadow: '0 0 0 30px rgba(75,163,226,.035),0 0 0 64px rgba(75,163,226,.03)' }
    }}>
      <Box sx={{ position: 'relative', zIndex: 1, width: '100%', maxWidth: 575 }}>
        <Box sx={{ display: { xs: 'flex', md: 'none' }, alignItems: 'center', justifyContent: 'center', gap: 1.1, mb: 2.3, color: '#1F5CA9' }}>
          <Box sx={{ display: 'grid', placeItems: 'center', width: 43, height: 43, bgcolor: '#1479EE', color: 'white', borderRadius: '50%' }}><Waves size={25} /></Box><Typography sx={{ fontSize: 24, fontWeight: 750 }}>SmartAqua</Typography>
        </Box>
        <Paper elevation={0} sx={{ p: { xs: 2.6, sm: 4, md: 4.5 }, border: '1px solid rgba(255,255,255,.9)', borderRadius: { xs: 4, sm: 5 }, bgcolor: 'rgba(255,255,255,.91)', boxShadow: '0 24px 76px rgba(50,112,169,.14),0 4px 18px rgba(45,93,143,.05)', backdropFilter: 'blur(16px)' }}>
          <Typography component="h2" sx={{ fontWeight: 760, fontSize: { xs: 26, sm: 31 }, lineHeight: 1.25, letterSpacing: '-.75px', color: '#102957' }}>Đăng nhập SmartAqua Eel</Typography>
          <Typography sx={{ mt: .8, mb: 3.2, color: '#63799C', fontSize: 14.5 }}>Đăng nhập để tiếp tục vào không gian làm việc của bạn.</Typography>
          <Box component="form" onSubmit={submit} noValidate>
            <TextField fullWidth label="Tên đăng nhập" autoComplete="username" value={username} onChange={event => setUsername(event.target.value)} required autoFocus sx={{ mb: 2 }} InputProps={{ startAdornment: <InputAdornment position="start"><UserRound size={19} color="#234A85" /></InputAdornment> }} />
            <TextField fullWidth label="Mật khẩu" placeholder="Nhập mật khẩu của bạn" type={show ? 'text' : 'password'} autoComplete="current-password" value={password} onChange={event => setPassword(event.target.value)} required sx={{ mb: 1 }} InputProps={{ startAdornment: <InputAdornment position="start"><LockKeyhole size={19} color="#234A85" /></InputAdornment>, endAdornment: <InputAdornment position="end"><IconButton aria-label={show ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'} onClick={() => setShow(value => !value)} edge="end">{show ? <EyeOff size={19} /> : <Eye size={19} />}</IconButton></InputAdornment> }} />
            <FormControlLabel sx={{ mb: 1.5, color: '#183765', '& .MuiFormControlLabel-label': { fontSize: 14 } }} control={<Checkbox checked={remember} onChange={event => setRemember(event.target.checked)} />} label="Ghi nhớ tài khoản trên thiết bị này" />
            {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
            <Button type="submit" fullWidth variant="contained" disabled={busy || !username || !password} endIcon={busy ? <CircularProgress size={17} color="inherit" /> : <ArrowRight size={20} />} sx={{ height: 55, borderRadius: 2.8, fontSize: 16, fontWeight: 700, background: 'linear-gradient(105deg,#0862D6 0%,#1677E8 68%,#3688F4 100%)', boxShadow: '0 8px 18px rgba(15,101,215,.23)', '&:hover': { background: 'linear-gradient(105deg,#0756BE,#146BCF)' } }}>{busy ? 'Đang đăng nhập…' : 'Đăng nhập'}</Button>
          </Box>
          {demoMode && <Accordion disableGutters elevation={0} sx={{ mt: 2.7, border: '1px solid #D9E9FB', borderRadius: '14px!important', bgcolor: '#F4F9FF', '&:before': { display: 'none' }, '&.Mui-expanded': { my: 2.7 } }}>
            <AccordionSummary expandIcon={<ChevronDown size={20} color="#173D78" />} sx={{ minHeight: 66, '& .MuiAccordionSummary-content': { alignItems: 'center', gap: 1.4, my: 1 } }}>
              <Box sx={{ display: 'grid', placeItems: 'center', width: 40, height: 40, flexShrink: 0, borderRadius: 2.5, color: '#086ADF', bgcolor: '#E1F0FF' }}><UsersRound size={21} /></Box>
              <Box><Typography sx={{ fontWeight: 700, fontSize: 14, color: '#17345E' }}>Tài khoản dùng thử SmartAqua</Typography><Typography sx={{ fontSize: 12.5, color: '#7286A4' }}>Chọn vai trò để tự điền thông tin đăng nhập</Typography></Box>
            </AccordionSummary>
            <AccordionDetails sx={{ pt: 0 }}>{demoCredentials.map(item => <Box key={item.username} sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1, borderTop: '1px solid #E3EDF8', py: 1.1 }}>
              <Box sx={{ minWidth: 0 }}><Typography sx={{ fontSize: 13, fontWeight: 650 }}>{item.role}</Typography><Typography sx={{ fontSize: 12, color: 'text.secondary', overflowWrap: 'anywhere' }}>{item.username} · {item.password}</Typography></Box>
              <Button size="small" onClick={() => useDemo(item.username, item.password)} sx={{ flexShrink: 0 }}>Điền</Button>
            </Box>)}</AccordionDetails>
          </Accordion>}
          {!demoMode && <Alert severity="info" sx={{ mt: 2 }}>Đăng nhập qua dịch vụ xác thực SmartAqua. Tài khoản dùng thử không khả dụng.</Alert>}
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: .9, mt: 2.8, color: '#6D82A2' }}><LockKeyhole size={14} /><Typography sx={{ fontSize: 12.5 }}>Kết nối được bảo vệ · SmartAqua Eel</Typography></Box>
        </Paper>
      </Box>
    </Box>
  </Box>;
}

