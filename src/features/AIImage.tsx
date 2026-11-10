import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert, Avatar, Box, Button as MuiButton, Card, CardContent, Checkbox, Chip, Dialog, DialogActions,
  DialogContent, DialogTitle, Fade, FormControl, FormHelperText, InputLabel, LinearProgress,
  FormControlLabel, MenuItem, Paper, Select as MuiSelect, Skeleton, Stack, Step, StepLabel, Stepper,
  Typography, useMediaQuery, useTheme,
} from '@mui/material';
import { CheckCircle2, CircleAlert, FileImage, FlaskConical, ImagePlus, Microscope, RotateCcw, Save, ShieldCheck, UploadCloud } from 'lucide-react';
import { PageTitle, toast } from '../components/UI';
import { useDemo } from '../store/demoStore';
import { canWrite, scoped } from '../domain/selectors';
import { getActiveAccount } from '../auth/authService';
import { diaryService } from '../services/diaryService';
import { createImageAnalysisService, imageDiseaseScenarios, IMAGE_RESULT_NOTICE, validateImageFile } from '../ai/imageAnalysisService';
import type { ImageAnalysisResult } from '../types/imageAnalysis';

const analyzer = createImageAnalysisService();
const demoMode = import.meta.env.VITE_AI_IMAGE_MODE !== 'api';
const steps = ['Tiếp nhận ảnh', 'Chuẩn bị hình ảnh', 'Đối chiếu dữ liệu', 'Tổng hợp nhận định', 'Hoàn tất'];
const delay = (time: number) => new Promise(resolve => window.setTimeout(resolve, time));
const formatBytes = (bytes: number) => bytes >= 1024 * 1024 ? `${(bytes / (1024 * 1024)).toFixed(1)} MB` : `${Math.max(1, Math.round(bytes / 1024))} KB`;

export function AIImage() {
  const { db, role } = useDemo();
  const theme = useTheme();
  const mobile = useMediaQuery(theme.breakpoints.down('sm'));
  const fileInput = useRef<HTMLInputElement>(null);
  const busyRef = useRef(false);
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState('');
  const [dimensions, setDimensions] = useState<{ width: number; height: number } | null>(null);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState(0);
  const [activeStep, setActiveStep] = useState(0);
  const [result, setResult] = useState<ImageAnalysisResult | null>(null);
  const [error, setError] = useState('');
  const [saveOpen, setSaveOpen] = useState(false);
  const [pondId, setPondId] = useState('');
  const [cycleId, setCycleId] = useState('');
  const [confirmed, setConfirmed] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loadingSample, setLoadingSample] = useState(false);

  useEffect(() => () => { if (previewUrl.startsWith('blob:')) URL.revokeObjectURL(previewUrl); }, [previewUrl]);

  const ponds = scoped(db, role, 'ponds');
  const cycles = useMemo(() => (db.farmingCycles as any[]).filter(cycle => cycle.pondId === pondId), [db.farmingCycles, pondId]);
  const writableByRole = role === 'admin' || canWrite(role, 'healthEvents') || (role === 'coop' && Boolean(
    getActiveAccount()?.permissions?.includes('diaries:create') || getActiveAccount()?.permissions?.includes('healthEvents:create'),
  ));

  const clearResult = () => { setResult(null); setError(''); setProgress(0); setActiveStep(0); };
  const chooseFile = async (candidate?: File) => {
    if (!candidate || busyRef.current) return;
    try {
      await validateImageFile(candidate);
      setFile(candidate);
      setPreviewUrl(URL.createObjectURL(candidate));
      setDimensions(null);
      clearResult();
      setPondId(''); setCycleId(''); setConfirmed(false);
    } catch (issue) {
      setError(issue instanceof Error ? issue.message : 'Không thể mở ảnh này.');
      toast(issue instanceof Error ? issue.message : 'Không thể mở ảnh này.', 'error');
    } finally {
      if (fileInput.current) fileInput.current.value = '';
    }
  };

  const chooseSample = async () => {
    const sample = imageDiseaseScenarios[0];
    if (!sample || busyRef.current || loadingSample) return;
    setLoadingSample(true);
    try {
      const response = await fetch(sample.referenceImage);
      if (!response.ok) throw new Error('Không mở được ảnh mẫu. Vui lòng thử lại.');
      const blob = await response.blob();
      await chooseFile(new File([blob],sample.referenceFileName,{type:blob.type||'image/jpeg'}));
    } catch (issue) { setError(issue instanceof Error ? issue.message : 'Không tải được ảnh mẫu.'); }
    finally { setLoadingSample(false); }
  };

  const analyze = async () => {
    if (busyRef.current) return;
    if (!file) { setError('Hãy chọn hoặc tải ảnh lên trước khi phân tích.'); return; }
    busyRef.current = true;
    const startedAt = Date.now();
    setBusy(true); setResult(null); setError(''); setProgress(5); setActiveStep(0);
    try {
      await validateImageFile(file);
      setProgress(14); await delay(900);
      setActiveStep(1); setProgress(30); await delay(900);
      setActiveStep(2); setProgress(48);
      const analysis = await analyzer.analyzeImage(file);
      setProgress(62); await delay(1_000);
      setActiveStep(3); setProgress(80);
      const remaining = Math.max(0, 5_000 - (Date.now() - startedAt));
      const progressTicks = 10;
      for (let tick = 1; tick <= progressTicks && remaining > 0; tick += 1) {
        await delay(remaining / progressTicks);
        setProgress(80 + Math.floor(tick * 1.9));
      }
      setActiveStep(4); setProgress(100); setResult(analysis);
      toast(analysis.suspectedCondition ? 'Đã hoàn tất phân tích hình ảnh.' : 'Chưa có dữ liệu phù hợp để đưa ra nhận định.', analysis.suspectedCondition ? 'ok' : 'error');
    } catch (issue) {
      const message = issue instanceof Error ? issue.message : 'Không thể hoàn tất phân tích hình ảnh.';
      setError(message); toast(message, 'error');
    } finally {
      busyRef.current = false;
      setBusy(false);
    }
  };

  const reset = () => {
    setFile(null); setPreviewUrl(''); setDimensions(null); clearResult();
    setPondId(''); setCycleId(''); setConfirmed(false);
    if (fileInput.current) fileInput.current.value = '';
  };

  const openSaveDialog = () => {
    if (!result?.suspectedCondition || !result.referenceImage || !writableByRole) return;
    const firstPond = ponds[0];
    const firstCycle = (db.farmingCycles as any[]).find(cycle => cycle.pondId === firstPond?.id && ['active', 'harvesting'].includes(cycle.status));
    setPondId(firstPond?.id || ''); setCycleId(firstCycle?.id || ''); setConfirmed(false); setSaveOpen(true);
  };

  const saveToDiary = async () => {
    if (saving) return;
    if (!pondId || !cycleId) { toast('Chọn bể nuôi và vụ nuôi trước khi lưu.', 'error'); return; }
    if (!confirmed) { toast('Xác nhận đây là kết quả mô phỏng trước khi lưu.', 'error'); return; }
    if (!result?.suspectedCondition || !result.referenceImage) return;
    setSaving(true);
    try {
      await diaryService.create('healthEvents', {
        cycleId,
        date: new Date().toISOString().slice(0, 10),
        summary: `${IMAGE_RESULT_NOTICE}. Đối tượng: ${result.species}. Nhận định tham khảo: nghi ngờ ${result.suspectedCondition}.`,
        observation: result.signGroup || '',
        symptoms: result.observedSigns.join(' '),
        status: 'Chưa xác nhận',
        treatment: 'Chưa ghi nhận phác đồ; cần đánh giá chuyên môn và xét nghiệm phù hợp.',
        analysisResult: result,
        imageRef: result.referenceImage,
        imageStorage: 'static-demo-reference',
        sourceType: 'simulated_image_analysis',
        verificationStatus: 'unconfirmed',
        notes: 'Lưu nhận định mô phỏng từ dữ liệu hình ảnh tham chiếu; chưa phải chẩn đoán xác nhận.',
      }, pondId);
      setSaveOpen(false);
      toast('Đã lưu kết quả tham khảo vào nhật ký sức khỏe của bể.');
    } catch (issue) {
      toast(issue instanceof Error ? issue.message : 'Không lưu được kết quả vào nhật ký.', 'error');
    } finally {
      setSaving(false);
    }
  };

  return <>
    <PageTitle
      kicker="AI THỊ GIÁC"
      title="Phân tích hình ảnh lươn"
      description={demoMode?'Trải nghiệm phân tích dấu hiệu bệnh từ ảnh mẫu lươn. Tải ảnh của bạn hoặc dùng ảnh mẫu để bắt đầu.':'Tải ảnh lươn để nhận đánh giá từ dịch vụ phân tích đã cấu hình.'}
      actions={<Chip icon={<ShieldCheck size={16}/>} label={demoMode?'CHẾ ĐỘ MÔ PHỎNG':'KẾT QUẢ THAM KHẢO'} color="primary" variant="outlined"/>}
    />

    <Box className="image-analysis-layout">
      <Box className="image-analysis-left-column">
      <Card className="image-input-panel" variant="outlined">
        <CardContent>
          <Stack direction="row" alignItems="center" justifyContent="space-between" gap={1} mb={1.5}>
            <Box>
              <Typography variant="h6" fontWeight={750}>Tải ảnh cần phân tích</Typography>
              <Typography variant="body2" color="text.secondary">Chọn ảnh từ thiết bị hoặc chụp trực tiếp.</Typography>
            </Box>
            <Chip icon={<ShieldCheck size={15}/>} label={demoMode?'Tại thiết bị':'Dịch vụ AI'} size="small" color="info" variant="outlined"/>
          </Stack>

          <Box className={`image-dropzone ${file ? 'has-image' : ''}`} onDragOver={event => event.preventDefault()} onDrop={event => { event.preventDefault(); void chooseFile(event.dataTransfer.files?.[0]); }}>
            <input ref={fileInput} className="image-file-input" type="file" accept="image/png,image/jpeg,image/webp,image/gif" disabled={busy||loadingSample} capture="environment" aria-label="Chọn ảnh lươn" onChange={event => void chooseFile(event.target.files?.[0])}/>
            {file && previewUrl ? <Box className="image-preview-frame"><img src={previewUrl} alt="Ảnh lươn đã chọn" onLoad={event => setDimensions({ width: event.currentTarget.naturalWidth, height: event.currentTarget.naturalHeight })}/><Chip className="image-file-chip" size="small" icon={<FileImage size={14}/>} label={file.name}/></Box> : <Box className="image-empty-preview"><ImagePlus size={36}/><Typography fontWeight={700}>Thả ảnh vào đây</Typography><Typography variant="body2" color="text.secondary">hoặc chọn tệp từ thiết bị</Typography><MuiButton disabled={loadingSample} variant="outlined" startIcon={<UploadCloud size={17}/>} onClick={() => fileInput.current?.click()} sx={{ minHeight: 46, mt: 1.5 }}>Chọn ảnh</MuiButton></Box>}
          </Box>

          {file && <Stack className="image-metadata" direction="row" flexWrap="wrap" gap={1} mt={1.2}><Chip size="small" label={file.type.split('/')[1]?.toUpperCase() || 'Ảnh'}/><Chip size="small" label={formatBytes(file.size)}/><Chip size="small" label={dimensions ? `${dimensions.width} × ${dimensions.height} px` : 'Đang đọc kích thước…'}/></Stack>}
          {error && <Alert severity="error" sx={{ mt: 1.5 }}>{error}</Alert>}
          {busy && <Box mt={2}><Stack direction="row" justifyContent="space-between" mb={0.5}><Typography variant="caption">{steps[activeStep]}</Typography><Typography variant="caption">{progress}%</Typography></Stack><LinearProgress variant="determinate" value={progress}/><Stepper activeStep={activeStep} alternativeLabel className="image-stepper">{steps.map(label => <Step key={label}><StepLabel>{label}</StepLabel></Step>)}</Stepper></Box>}
          <Stack direction={{ xs: 'column', sm: 'row' }} gap={1} mt={2}>
            <MuiButton variant="contained" size="large" startIcon={<Microscope size={18}/>} disabled={!file || busy || loadingSample} onClick={() => void analyze()} sx={{ minHeight: 48, flex: 1 }}>{busy ? 'Đang phân tích hình ảnh…' : 'Bắt đầu phân tích'}</MuiButton>
            {file && <MuiButton variant="outlined" size="large" startIcon={<RotateCcw size={17}/>} disabled={busy} onClick={reset} sx={{ minHeight: 48 }}>Xóa ảnh</MuiButton>}
          </Stack>
          <Typography variant="caption" color="text.secondary" display="block" mt={1}>Chấp nhận JPG, PNG, GIF, WebP · tối đa 8 MB.</Typography>
          {demoMode && imageDiseaseScenarios[0] && <button type="button" className="image-demo-sample" onClick={()=>void chooseSample()} disabled={busy||loadingSample} aria-label="Dùng ảnh mẫu lươn phù đầu, đỏ đầu"><img src={imageDiseaseScenarios[0].referenceImage} alt="Ảnh mẫu lươn có dấu hiệu đỏ đầu"/><span><small>THỬ VỚI ẢNH MẪU</small><strong>Phù đầu, đỏ đầu, xuất huyết</strong><span>{loadingSample?'Đang mở ảnh…':'Dùng ảnh mẫu này →'}</span></span></button>}
        </CardContent>
      </Card>

      <Card className="image-process-panel" variant="outlined">
        <CardContent>
          <Stack direction="row" alignItems="center" spacing={1} mb={1.4}>
            <Avatar sx={{ width: 34, height: 34, bgcolor: '#e8f2ff', color: '#1f5ca9' }}><ShieldCheck size={18}/></Avatar>
            <Box><Typography variant="subtitle1" fontWeight={750}>Quy trình kiểm tra</Typography><Typography variant="caption" color="text.secondary">Các bước xử lý hình ảnh</Typography></Box>
          </Stack>
          <Stack spacing={1.15}>
            {[
              ['Tiếp nhận ảnh', 'Kiểm tra định dạng, dung lượng và khả năng đọc ảnh.'],
              ['Đối chiếu ảnh', demoMode?'Ảnh mẫu có kịch bản bệnh được chuẩn bị sẵn. Ảnh khác sẽ báo chưa có nhận định.':'Gửi ảnh đến dịch vụ phân tích đã cấu hình.'],
              ['Tổng hợp nhận định', 'Hiển thị dấu hiệu, nguyên nhân có thể và hướng dẫn kiểm tra.'],
              ['Xác minh chuyên môn', 'Liên hệ chuyên gia và xét nghiệm phù hợp trước khi xử lý.'],
            ].map(([title, description], index) => <Box key={title} className="image-process-row"><Avatar className="image-process-index">{index + 1}</Avatar><Box><Typography variant="body2" fontWeight={700}>{title}</Typography><Typography variant="caption" color="text.secondary">{description}</Typography></Box></Box>)}
          </Stack>
          <Alert severity="info" icon={<CircleAlert size={17}/>} sx={{ mt: 1.4 }}>{demoMode?'Mô phỏng từ ảnh mẫu, chưa phải mô hình AI chẩn đoán. Ảnh được đối chiếu tại thiết bị.':'Ảnh được gửi đến dịch vụ phân tích của hệ thống.'}</Alert>
        </CardContent>
      </Card>
      {result?.suspectedCondition && <Card className="image-guidance-panel" variant="outlined">
        <CardContent>
          <Typography variant="subtitle1" fontWeight={750} mb={1.1}>Để kết quả tham khảo phù hợp hơn</Typography>
          <Stack spacing={1}>
            <Box className="image-guidance-row"><CheckCircle2 size={17}/><Typography variant="body2">Dùng ảnh gốc, không cắt hoặc chỉnh sửa trước khi tải lên.</Typography></Box>
            <Box className="image-guidance-row"><CheckCircle2 size={17}/><Typography variant="body2">Chọn ảnh đủ sáng, lấy nét vào dấu hiệu cần kiểm tra.</Typography></Box>
            <Box className="image-guidance-row"><CheckCircle2 size={17}/><Typography variant="body2">Đối chiếu thêm hành vi, môi trường và tình trạng của cả đàn.</Typography></Box>
          </Stack>
        </CardContent>
      </Card>}
      </Box>

      <Card className="image-result-panel" variant="outlined">
        <CardContent>
          <Stack direction={{ xs: 'column', sm: 'row' }} alignItems={{ xs: 'flex-start', sm: 'center' }} justifyContent="space-between" gap={1} mb={1.5}>
            <Box><Typography variant="h6" fontWeight={750}>Kết quả phân tích ảnh</Typography><Typography variant="body2" color="text.secondary">Dấu hiệu, nguyên nhân có thể và hướng dẫn kiểm tra.</Typography></Box>
            <Chip label="CHƯA XÁC NHẬN" color="primary" variant="outlined"/>
          </Stack>

          {busy && <Fade in><Box><Skeleton variant="rounded" height={150} sx={{ mb: 1.5 }}/><Skeleton variant="rounded" height={78} sx={{ mb: 1 }}/><Skeleton variant="rounded" height={210}/></Box></Fade>}
          {!busy && result && <Fade in><Box>
            <Alert severity="warning" icon={<CircleAlert size={20}/>} className="image-disclaimer"><strong>{result.disclaimer}</strong></Alert>
            {!result.suspectedCondition ? <Paper className="image-unknown-result" variant="outlined"><Avatar sx={{ bgcolor: '#eaf2fb', color: '#1f5ca9' }}><FileImage size={20}/></Avatar><Box><Typography fontWeight={750}>Chưa có nhận định phù hợp</Typography><Typography variant="body2">{result.verificationNotice}</Typography><Typography variant="caption" color="text.secondary">Hệ thống không tự suy đoán bệnh khi chưa có dữ liệu đối chiếu phù hợp.</Typography></Box></Paper> : <>
              <Box className="image-result-hero"><img src={previewUrl} alt="Ảnh được phân tích"/><Box flex={1}><Typography variant="overline">{result.mode==='demo'?'KẾT QUẢ MÔ PHỎNG · LƯƠN':'ĐỐI TƯỢNG NUÔI'}</Typography><Typography variant="h5" fontWeight={800}>{result.species}</Typography><Typography variant="body2" color="text.secondary" fontStyle="italic">{result.scientificName}</Typography><Box className="image-condition"><Typography variant="caption" fontWeight={700}>NGHI NGỜ · CHƯA XÁC NHẬN</Typography><Typography fontWeight={750}>{result.suspectedCondition}</Typography><Typography variant="body2">{result.conditionSummary}</Typography></Box></Box></Box>
              <Box className="image-result-meta"><Paper variant="outlined"><Typography variant="caption">Mức xác nhận</Typography><Typography fontWeight={750}>Chưa xác định</Typography><Typography variant="caption">Cần đánh giá và xét nghiệm</Typography></Paper><Paper variant="outlined"><Typography variant="caption">Nhóm dấu hiệu</Typography><Typography fontWeight={750}>{result.signGroup}</Typography><Typography variant="caption">Dữ liệu tham khảo</Typography></Paper><Paper variant="outlined"><Typography variant="caption">Nguồn kết quả</Typography><Typography fontWeight={750}>Dữ liệu hình ảnh</Typography><Typography variant="caption">Chưa xác nhận bệnh</Typography></Paper></Box>
              <Paper className="image-result-section" variant="outlined"><Typography variant="subtitle1" fontWeight={750}>Dấu hiệu quan sát</Typography><Box component="ul">{result.observedSigns.map(sign => <li key={sign}>{sign}</li>)}</Box></Paper>
              <Box className="image-advice-grid"><Paper className="image-causes" variant="outlined"><Typography variant="subtitle1" fontWeight={750}>Nguyên nhân có thể</Typography><ul>{result.possibleCauses.map(cause => <li key={cause}>{cause}</li>)}</ul></Paper><Paper className="image-recommendations" variant="outlined"><Typography variant="subtitle1" fontWeight={750}>Khuyến nghị kiểm tra và quản lý</Typography><ol>{result.recommendations.map(item => <li key={item}><CheckCircle2 size={15}/><span>{item}</span></li>)}</ol></Paper></Box>
              <Alert severity="info" icon={<ShieldCheck size={18}/>} sx={{ mt: 1.4 }}><strong>Lưu ý về thuốc và điều trị:</strong> {result.treatmentNotice}</Alert>
              {result.verificationNotice && <Typography variant="caption" color="text.secondary" display="block" mt={1}>Xác minh: {result.verificationNotice} Nguồn: {result.evidenceSource}</Typography>}
              {Boolean(result.references?.length) && <Paper className="image-result-section" variant="outlined"><Typography variant="subtitle1" fontWeight={750}>Nguồn tham khảo</Typography><Box component="ul" className="image-reference-links">{result.references?.map(reference=><li key={reference.url}><a href={reference.url} target="_blank" rel="noreferrer">{reference.title} ↗</a>{reference.description&&<Typography variant="caption" color="text.secondary" display="block">{reference.description}</Typography>}</li>)}</Box></Paper>}
            </>}
          </Box></Fade>}

          {!busy && !result && <Box className="image-result-empty"><Microscope size={34}/><Typography fontWeight={750}>Kết quả sẽ hiển thị tại đây</Typography><Typography variant="body2" color="text.secondary">Tải ảnh cần kiểm tra, sau đó bắt đầu phân tích để xem nhận định và khuyến nghị.</Typography></Box>}
          {!busy && result?.suspectedCondition && <Box className="image-result-footer"><Alert severity="warning" icon={<FlaskConical size={19}/>}><strong>Kết quả tham khảo</strong><br/>Chưa thay thế chẩn đoán chuyên môn. Cần liên hệ cán bộ thủy sản và xét nghiệm phù hợp để xác nhận.</Alert><Stack direction={{ xs: 'column', sm: 'row' }} gap={1}><MuiButton variant="outlined" startIcon={<Save size={17}/>} onClick={openSaveDialog} disabled={!writableByRole}>Lưu vào nhật ký bể nuôi</MuiButton><MuiButton variant="outlined" startIcon={<RotateCcw size={17}/>} onClick={() => { clearResult(); void analyze(); }} disabled={busy}>Phân tích ảnh này lại</MuiButton><MuiButton variant="contained" startIcon={<UploadCloud size={17}/>} onClick={() => fileInput.current?.click()}>Tải ảnh khác</MuiButton></Stack></Box>}
        </CardContent>
      </Card>
    </Box>

    <Dialog open={saveOpen} onClose={() => !saving && setSaveOpen(false)} fullScreen={mobile} fullWidth maxWidth="sm">
      <DialogTitle>Lưu nhận định tham khảo vào bể nuôi</DialogTitle>
      <DialogContent dividers><Stack spacing={2}>
        <Alert severity="warning"><strong>{IMAGE_RESULT_NOTICE}</strong><br/>{result?.species} · Nghi ngờ: {result?.suspectedCondition}</Alert>
        <FormControl fullWidth><InputLabel id="analysis-pond-label">Bể nuôi</InputLabel><MuiSelect labelId="analysis-pond-label" label="Bể nuôi" value={pondId} onChange={event => { const nextPond = String(event.target.value); setPondId(nextPond); const nextCycle = (db.farmingCycles as any[]).find(cycle => cycle.pondId === nextPond && ['active', 'harvesting'].includes(cycle.status)); setCycleId(nextCycle?.id || ''); }}>{ponds.map((pond: any) => <MenuItem key={pond.id} value={pond.id}>{pond.code} · {pond.name}</MenuItem>)}</MuiSelect></FormControl>
        <FormControl fullWidth disabled={!pondId}><InputLabel id="analysis-cycle-label">Vụ nuôi</InputLabel><MuiSelect labelId="analysis-cycle-label" label="Vụ nuôi" value={cycleId} onChange={event => setCycleId(String(event.target.value))}>{cycles.map((cycle: any) => <MenuItem key={cycle.id} value={cycle.id}>{cycle.code} · {cycle.status}</MenuItem>)}</MuiSelect><FormHelperText>Chỉ hiển thị vụ nuôi thuộc bể đã chọn.</FormHelperText></FormControl>
        <Paper variant="outlined" sx={{ p: 1.5 }}><Typography variant="subtitle2" fontWeight={700}>Thông tin sẽ ghi trong nhật ký sức khỏe</Typography><Typography variant="body2">Dấu hiệu: {result?.signGroup}. Trạng thái xác minh: chưa xác nhận. Ảnh gốc không được sao chép vào localStorage.</Typography></Paper>
        <FormControlLabel control={<Checkbox checked={confirmed} onChange={event => setConfirmed(event.target.checked)} />} label="Tôi hiểu đây là kết quả mô phỏng, chưa xác nhận bệnh"/>
      </Stack></DialogContent>
      <DialogActions sx={{ p: 2 }}><MuiButton onClick={() => setSaveOpen(false)} disabled={saving}>Hủy</MuiButton><MuiButton variant="contained" onClick={() => void saveToDiary()} disabled={saving || !confirmed || !pondId || !cycleId}>{saving ? 'Đang lưu…' : 'Xác nhận và lưu'}</MuiButton></DialogActions>
    </Dialog>
  </>;
}
