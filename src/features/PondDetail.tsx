import React, { useRef, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Fish, MapPin, NotebookPen, PackageCheck, Plus, Waves, Play } from 'lucide-react';
import { PageTitle, Card, Button, Table, Status, Badge, Empty, Modal, Select, toast, Confirm } from '../components/UI';
import { useDemo, getLabel } from '../store/demoStore';
import { dateVi, daysSince, num, kg, canWrite } from '../domain/selectors';
import { pondImageFor } from '../domain/aquacultureImages';
import { diaryService, type DiaryCollection, type DiaryRecord } from '../services/diaryService';
import { getActiveAccount } from '../auth/authService';
import { saveFarmingCycle } from '../services/farmingOperationsService';
import Harvests from './Harvests';
import ScopedForecast from './ScopedForecast';

type PondTab = 'overview' | 'cycles' | 'journal' | 'harvests' | 'forecast';
type JournalKind = 'all' | 'feed' | 'medication' | 'environment' | 'growth' | 'health';
type WritableJournalKind = DiaryCollection;
type JournalEntry = { id: string; kind: Exclude<JournalKind, 'all'>; collection: DiaryCollection; date: string; cycleId: string; detail: string; notes?: string; record: DiaryRecord };

export default function PondDetail() {
  const { id } = useParams();
  const { db, role } = useDemo();
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const tab = (['overview','cycles','journal','harvests','forecast'].includes(params.get('tab')||'') ? params.get('tab') : 'overview') as PondTab;
  const setTab = (value:PondTab) => { const next = new URLSearchParams(params); next.set('tab',value); next.delete('add'); setParams(next,{replace:true}); };
  const [journalKind, setJournalKind] = useState<JournalKind>('all');
  const [journalEditor, setJournalEditor] = useState(false);
  const [writeKind, setWriteKind] = useState<WritableJournalKind>('feedDiaries');
  const [journalForm, setJournalForm] = useState<any>({});
  const [editingEntry, setEditingEntry] = useState<JournalEntry | null>(null);
  const [selectedEntry, setSelectedEntry] = useState<JournalEntry | null>(null);
  const [deletingEntry, setDeletingEntry] = useState<JournalEntry | null>(null);
  const [savingJournal, setSavingJournal] = useState(false);
  const savingJournalRef = useRef(false);
  const journalInitialRef = useRef('');
  const [discardJournalOpen, setDiscardJournalOpen] = useState(false);
  const [pondActionAlert, setPondActionAlert] = useState<{title:string;message:string}|null>(null);
  const [cycleToStart, setCycleToStart] = useState<any>(null);
  const [journalCycleFilter, setJournalCycleFilter] = useState('all');
  const [journalFrom, setJournalFrom] = useState('');
  const [journalTo, setJournalTo] = useState('');
  const [journalOrder, setJournalOrder] = useState<'newest' | 'oldest'>('newest');
  const [journalPage, setJournalPage] = useState(0);
  const pond = db.ponds.find((item: any) => item.id === id);

  if (!pond) return <PageTitle title="Không tìm thấy bể nuôi" description="Hồ sơ không tồn tại trong dữ liệu hiện có hoặc nằm ngoài phạm vi truy cập."/>;

  const cycles = db.farmingCycles.filter((item: any) => item.pondId === pond.id).sort((a: any, b: any) => b.stockingDate.localeCompare(a.stockingDate));
  const cycleIds = new Set(cycles.map((item: any) => item.id));
  const activeCycles = cycles.filter((item: any) => ['active', 'harvesting'].includes(item.status));
  const openCycles = cycles.filter((item: any) => item.status !== 'completed');
  const activeSpecies = [...new Set(activeCycles.map((item: any) => getLabel(db, 'species', item.speciesId)))].join(', ') || 'Chưa có vụ đang hoạt động';
  const harvests = db.harvests.filter((item: any) => cycleIds.has(item.cycleId)).sort((a: any, b: any) => b.date.localeCompare(a.date));
  const kindMap: Record<DiaryCollection, Exclude<JournalKind, 'all'>> = { feedDiaries: 'feed', medicationDiaries: 'medication', environmentObservations: 'environment', growthObservations: 'growth', healthEvents: 'health' };
  const detailFor = (collection: DiaryCollection, item: any) => {
    if (collection === 'feedDiaries') return `${item.productName || getLabel(db, 'feedProducts', item.productId)} · ${kg(item.amountKg)}${item.feedingTimes ? ` · ${item.feedingTimes} lần` : ''}`;
    if (collection === 'medicationDiaries') return `${item.productName || (item.productId ? getLabel(db, 'medicationProducts', item.productId, 'name') : 'Thuốc / chế phẩm')} · ${num(item.amount ?? item.quantity, 2)} ${item.unit || 'đơn vị'}`;
    if (collection === 'environmentObservations') return [['Nhiệt độ', item.temperature, '°C'], ['pH', item.ph, ''], ['Độ mặn', item.salinity, '‰'], ['Oxy', item.oxygen, ' mg/L'], ['Độ kiềm', item.alkalinity, ' mg/L']].filter(([, value]) => value !== '' && value != null).map(([name, value, unit]) => `${name} ${value}${unit}`).join(' · ') || 'Chưa có thông số';
    if (collection === 'growthObservations') return `Khối lượng ${item.averageGrams ? `${num(item.averageGrams, 1)} g` : '—'} · Chiều dài ${item.averageLengthCm ? `${num(item.averageLengthCm, 1)} cm` : '—'} · Mẫu ${item.sampleCount || '—'}`;
    if (collection === 'healthEvents' && item.analysisResult) return `${item.analysisResult.species || 'Thủy sản'} · ${item.analysisResult.suspectedCondition || item.analysisResult.signGroup || 'Kết quả tham khảo'}`;
    return item.summary || item.observation || 'Ghi nhận sức khỏe';
  };
  const diaryRows: JournalEntry[] = [...db.feedDiaries.map((record: any) => ({ collection: 'feedDiaries' as const, record })), ...db.medicationDiaries.map((record: any) => ({ collection: 'medicationDiaries' as const, record })), ...db.environmentObservations.map((record: any) => ({ collection: 'environmentObservations' as const, record })), ...db.growthObservations.map((record: any) => ({ collection: 'growthObservations' as const, record })), ...db.healthEvents.map((record: any) => ({ collection: 'healthEvents' as const, record }))];
  const allLogs: JournalEntry[] = diaryRows.filter(({ record }) => cycleIds.has(record.cycleId)).map(({ collection, record }) => ({ id: record.id, kind: kindMap[collection], collection, date: record.date, cycleId: record.cycleId, detail: detailFor(collection, record), notes: record.notes || record.status || '', record })).sort((a, b) => journalOrder === 'newest' ? b.date.localeCompare(a.date) : a.date.localeCompare(b.date));
  const filteredLogs = allLogs.filter((item) => (journalKind === 'all' || item.kind === journalKind) && (journalCycleFilter === 'all' || item.cycleId === journalCycleFilter) && (!journalFrom || item.date >= journalFrom) && (!journalTo || item.date <= journalTo));
  const pageSize = 20;
  const shownLogs = filteredLogs.slice(journalPage * pageSize, (journalPage + 1) * pageSize);
  const labelForKind: Record<Exclude<JournalKind, 'all'>, string> = { feed: 'Thức ăn', medication: 'Thuốc / chế phẩm', environment: 'Môi trường', growth: 'Tăng trưởng', health: 'Sức khỏe' };
  const journalFieldLabels: Record<string, string> = { productId: 'Mã sản phẩm', productName: 'Tên sản phẩm', productGroup: 'Nhóm sản phẩm', purpose: 'Mục đích', amountKg: 'Lượng thức ăn (kg)', feedingTimes: 'Số lần cho ăn', feedingTime: 'Thời gian cho ăn', amount: 'Lượng sử dụng', quantity: 'Số lượng', unit: 'Đơn vị', dosage: 'Liều lượng đã dùng', dosageUnit: 'Đơn vị liều lượng', temperature: 'Nhiệt độ (°C)', ph: 'pH', salinity: 'Độ mặn (‰)', oxygen: 'Oxy hòa tan (mg/L)', alkalinity: 'Độ kiềm', averageGrams: 'Khối lượng trung bình (g)', averageLengthCm: 'Chiều dài trung bình (cm)', sampleCount: 'Số lượng mẫu', growthStatus: 'Tình trạng tăng trưởng', summary: 'Tình trạng quan sát', observation: 'Quan sát', symptoms: 'Dấu hiệu bất thường', mortalityCount: 'Số lượng hao hụt', treatment: 'Biện pháp đã thực hiện', measurementTime: 'Giờ đo', notes: 'Ghi chú' };
  const tabItems: { id: PondTab; label: string }[] = [
    { id: 'overview', label: 'Tổng quan bể' }, { id: 'cycles', label: 'Vụ nuôi' },
    { id: 'journal', label: 'Nhật ký bể nuôi' }, { id: 'harvests', label: 'Thu hoạch' }, { id:'forecast',label:'Dự báo sản lượng' }
  ];
  const writableKinds = ([
    { id: 'feedDiaries', label: 'Thức ăn' }, { id: 'medicationDiaries', label: 'Thuốc / chế phẩm' },
    { id: 'environmentObservations', label: 'Môi trường' }, { id: 'growthObservations', label: 'Tăng trưởng' }, { id: 'healthEvents', label: 'Sức khỏe' }
  ] as { id: WritableJournalKind; label: string }[]).filter((item) => role === 'coop' ? Boolean(getActiveAccount()?.permissions?.includes('diaries:create') || getActiveAccount()?.permissions?.includes(`${item.id}:create`)) : canWrite(role, item.id));
  const canManageDiary = (collection: DiaryCollection, action: 'update' | 'delete') => role === 'admin' || (role === 'farmer' && canWrite(role, collection)) || (role === 'coop' && Boolean(getActiveAccount()?.permissions?.includes(`diaries:${action}`) || getActiveAccount()?.permissions?.includes(`${collection}:${action}`)));
  const openJournalEditor = () => {
    if (!cycles.length) return toast('Bể chưa có vụ nuôi. Vui lòng tạo vụ nuôi trước khi ghi nhật ký.', 'error');
    const kind = writableKinds[0]?.id || 'feedDiaries';
    setWriteKind(kind);
    setEditingEntry(null);
    const initial = { cycleId: activeCycles[0]?.id || cycles[0]?.id || '', date: new Date().toISOString().slice(0, 10), productId: '', productName: '', amountKg: '', feedingTimes: '', feedingTime: '', amount: '', quantity: '', unit: '', productGroup: '', purpose: '', dosage: '', dosageUnit: '', temperature: '', ph: '', salinity: '', oxygen: '', alkalinity: '', averageGrams: '', averageLengthCm: '', sampleCount: '', growthStatus: '', summary: '', observation: '', symptoms: '', mortalityCount: '', treatment: '', notes: '' };
    journalInitialRef.current = JSON.stringify({ form: initial, kind });
    setJournalForm(initial);
    setJournalEditor(true);
  };
  const openEditJournal = (entry: JournalEntry) => {
    if (!canManageDiary(entry.collection, 'update')) return toast('Bạn không có quyền chỉnh sửa loại nhật ký này.', 'error');
    const initial = { ...entry.record };
    journalInitialRef.current = JSON.stringify({ form: initial, kind: entry.collection });
    setEditingEntry(entry); setWriteKind(entry.collection); setJournalForm(initial); setJournalEditor(true);
  };
  const requestCloseJournal = () => {
    if (savingJournal) return;
    if (JSON.stringify({ form: journalForm, kind: writeKind }) !== journalInitialRef.current) { setDiscardJournalOpen(true); return; }
    setJournalEditor(false); setEditingEntry(null);
  };
  const discardJournalChanges = () => { setDiscardJournalOpen(false); setJournalEditor(false); setEditingEntry(null); };
  const openAddCycle = () => {
    if (openCycles.length) { setPondActionAlert({ title: 'Bể đang có vụ nuôi hoạt động', message: 'Bể nuôi này đang có một vụ nuôi chưa kết thúc. Vui lòng hoàn tất hoặc kết thúc vụ nuôi hiện tại trước khi tạo vụ nuôi mới.' }); return; }
    navigate(`/cycles?pond=${pond.id}&add=1`);
  };
  const startPreparedCycle = () => {
    if (!cycleToStart) return;
    try {
      saveFarmingCycle({ ...cycleToStart, status: 'active' });
      setCycleToStart(null);
      toast(`Đã chuyển vụ ${cycleToStart.code} sang trạng thái Đang nuôi.`);
    } catch (error) {
      toast(error instanceof Error ? error.message : 'Không thể cập nhật trạng thái vụ nuôi.', 'error');
    }
  };
  const saveJournal = async () => {
    if (savingJournalRef.current) return;
    if (!writableKinds.some((item) => item.id === writeKind)) return toast('Vai trò hiện tại chỉ được xem nhật ký, không được ghi mới.', 'error');
    try {
      savingJournalRef.current = true; setSavingJournal(true);
      const payload = { ...journalForm };
      for (const key of ['amountKg','feedingTimes','amount','quantity','dosage','temperature','ph','salinity','oxygen','alkalinity','averageGrams','averageLengthCm','sampleCount','mortalityCount']) payload[key] = payload[key] === '' || payload[key] == null ? null : Number(payload[key]);
      if (editingEntry) await diaryService.update(editingEntry.id, writeKind, payload, pond.id);
      else await diaryService.create(writeKind, payload, pond.id);
      setJournalEditor(false);
      setEditingEntry(null);
      journalInitialRef.current = '';
      toast(editingEntry ? 'Đã cập nhật nhật ký bể nuôi.' : 'Đã lưu nhật ký cho bể nuôi.');
    } catch (error) {
      toast(error instanceof Error ? `Không lưu được nhật ký: ${error.message}` : 'Không lưu được nhật ký. Vui lòng thử lại.', 'error');
    } finally { savingJournalRef.current = false; setSavingJournal(false); }
  };
  const deleteJournal = async () => { if (!deletingEntry) return; try { await diaryService.delete(deletingEntry.id); setDeletingEntry(null); setSelectedEntry(null); toast('Đã xóa nhật ký.'); } catch (error) { toast(error instanceof Error ? error.message : 'Không xóa được nhật ký.', 'error'); } };

  return <>
    <nav className="pond-breadcrumb" aria-label="Đường dẫn bể nuôi"><Link to="/areas">Vùng nuôi</Link><span>/</span><Link to={`/areas/${pond.areaId}`}>{getLabel(db,'aquacultureAreas',pond.areaId)}</Link><span>/</span><Link to={`/areas/${pond.areaId}/farms/${pond.farmerId}`}>{getLabel(db,'farmers',pond.farmerId)}</Link><span>/</span><strong>{pond.code}</strong></nav>
    <PageTitle kicker="HỒ SƠ BỂ NUÔI / GIS" title={pond.name} description={`${pond.code} · ${getLabel(db, 'aquacultureAreas', pond.areaId)} · ${getLabel(db, 'farmers', pond.farmerId)}`} actions={<>
      <Button variant="secondary" onClick={() => navigate(-1)}><ArrowLeft size={15}/> Quay lại</Button>
      <Button onClick={() => navigate(`/gis?entity=${pond.id}`)}><MapPin size={16}/> Xem trên GIS</Button>
    </>}/>
    <div className="tabline">{tabItems.map((item) => <button key={item.id} className={tab === item.id ? 'active' : ''} onClick={() => setTab(item.id)}>{item.label}</button>)}</div>

    {tab === 'overview' && <>
      <figure className="pond-detail-photo"><img src={pondImageFor(pond.id)} alt={`Ảnh tham khảo bể nuôi · ${pond.name}`}/><figcaption>Ảnh minh họa, không phải ảnh chụp bể này · <a href="/images/eel-illustration.md" target="_blank" rel="noreferrer">Nguồn ảnh</a></figcaption></figure>
      <div className="detail-hero"><div className="metric-icon"><Waves size={30}/></div><div><h2>Thông tin bể nuôi</h2><p>Trạng thái: {pond.status === 'active' ? 'Đang hoạt động' : pond.status || 'Chưa cập nhật'} · Loài đang nuôi: {activeSpecies}. Quy trình nuôi sẽ hiển thị khi có dữ liệu được ghi nhận.</p></div><Status status={pond.status || 'unknown'}/></div>
      <div className="cards-grid">
        <Card className="metric"><div><h4>DIỆN TÍCH</h4><strong>{num(pond.areaM2??pond.areaHa*10000, 1)} m²</strong><small>Diện tích theo hồ sơ ao</small></div><div className="metric-icon"><Waves size={22}/></div></Card>
        <Card className="metric"><div><h4>VỤ NUÔI</h4><strong>{cycles.length}</strong><small>{activeCycles.length} vụ đang hoạt động</small></div><div className="metric-icon blue"><Fish size={22}/></div></Card>
        <Card className="metric"><div><h4>NHẬT KÝ</h4><strong>{num(allLogs.length)}</strong><small>Bản ghi của bể này</small></div><div className="metric-icon amber"><NotebookPen size={22}/></div></Card>
        <Card className="metric"><div><h4>SẢN LƯỢNG</h4><strong>{num(harvests.reduce((sum: number, item: any) => sum + item.quantityKg, 0) / 1000, 2)} tấn</strong><small>Đã thu hoạch</small></div><div className="metric-icon purple"><PackageCheck size={22}/></div></Card>
      </div>
      <Card><div className="card-head"><div><h3>Hồ sơ liên kết</h3><p>Thông tin vùng nuôi và hộ quản lý ao</p></div></div><div className="split-stat">
        <div><small>Hộ nuôi</small><strong style={{ fontSize: 13 }}>{getLabel(db, 'farmers', pond.farmerId)}</strong></div>
        <div><small>Vùng nuôi</small><strong style={{ fontSize: 13 }}>{getLabel(db, 'aquacultureAreas', pond.areaId)}</strong></div>
        <div><small>Hợp tác xã</small><strong style={{ fontSize: 13 }}>{getLabel(db, 'cooperatives', db.aquacultureAreas.find((area: any) => area.id === pond.areaId)?.coopId)}</strong></div>
      </div></Card>
      <div className="infobar" style={{ marginTop: 16 }}>Tọa độ ao: {pond.lat ?? 'Chưa có'}, {pond.lng ?? 'chưa có'} · Loài nuôi và nhật ký được tổng hợp từ các vụ gắn với bể này.</div>
    </>}

    {tab === 'cycles' && <Card title="Các vụ nuôi của bể" subtitle="Thông tin giống, thời gian thả và trạng thái từng vụ" action={<Button onClick={openAddCycle}><Plus size={16}/> Thêm vụ</Button>}>
      {cycles.length ? <Table headers={['Mã vụ', 'Loài', 'Ngày thả', 'Số ngày', 'Trạng thái', 'Nguồn giống', 'Thao tác']}>{cycles.map((cycle: any) => <tr key={cycle.id}><td><b>{cycle.code}</b></td><td>{getLabel(db, 'species', cycle.speciesId)}</td><td>{dateVi(cycle.stockingDate)}</td><td>{daysSince(cycle.stockingDate)}</td><td><Status status={cycle.status}/></td><td>{getLabel(db, 'seedBatches', cycle.seedBatchId, 'code')}</td><td>{cycle.status === 'preparing' && canWrite(role, 'farmingCycles') && <Button variant="secondary" onClick={() => setCycleToStart(cycle)}><Play size={14}/> Bắt đầu thả giống</Button>}</td></tr>)}</Table> : <Empty title="Bể chưa có vụ nuôi"/>}
    </Card>}

    {tab === 'journal' && <Card title="Nhật ký bể nuôi" subtitle={`${num(allLogs.length)} bản ghi gắn với ${pond.name}`} action={writableKinds.length ? <Button onClick={openJournalEditor}><Plus size={16}/> Ghi nhật ký</Button> : <Badge tone="neutral">Chỉ xem theo vai trò</Badge>}>
      {!writableKinds.length && <div className="infobar" style={{marginBottom:14}}>Vai trò lãnh đạo địa phương có quyền xem số liệu tổng hợp; chỉ Admin, nông dân được giao bể và HTX theo phạm vi mới được ghi nhật ký.</div>}
      <div className="tabline">{(['all', 'feed', 'medication', 'environment', 'growth', 'health'] as JournalKind[]).map((kind) => <button key={kind} className={journalKind === kind ? 'active' : ''} onClick={() => { setJournalKind(kind); setJournalPage(0); }}>{kind === 'all' ? 'Tất cả' : labelForKind[kind]}</button>)}</div>
      <div className="journal-filters"><label>Vụ nuôi <select value={journalCycleFilter} onChange={event => { setJournalCycleFilter(event.target.value); setJournalPage(0); }}><option value="all">Tất cả vụ</option>{cycles.map((cycle: any) => <option value={cycle.id} key={cycle.id}>{cycle.code}</option>)}</select></label><label>Từ ngày <input type="date" value={journalFrom} onChange={event => { setJournalFrom(event.target.value); setJournalPage(0); }}/></label><label>Đến ngày <input type="date" value={journalTo} onChange={event => { setJournalTo(event.target.value); setJournalPage(0); }}/></label><label>Sắp xếp <select value={journalOrder} onChange={event => { setJournalOrder(event.target.value as 'newest' | 'oldest'); setJournalPage(0); }}><option value="newest">Mới nhất</option><option value="oldest">Cũ nhất</option></select></label></div>
      {shownLogs.length ? <Table className="journal-table" headers={['Ngày', 'Loại nhật ký', 'Vụ nuôi', 'Thông tin ghi nhận', 'Ghi chú', 'Thao tác']}>{shownLogs.map((entry) => <tr key={`${entry.kind}-${entry.id}`}><td>{dateVi(entry.date)}</td><td><Badge tone="blue">{labelForKind[entry.kind]}</Badge></td><td>{cycles.find((cycle: any) => cycle.id === entry.cycleId)?.code || entry.cycleId}</td><td>{entry.detail}</td><td>{entry.notes || '—'}</td><td><div className="journal-actions"><Button variant="secondary" onClick={() => setSelectedEntry(entry)}>Xem</Button>{canManageDiary(entry.collection, 'update') && <Button variant="secondary" onClick={() => openEditJournal(entry)}>Sửa</Button>}{canManageDiary(entry.collection, 'delete') && <Button variant="secondary" onClick={() => setDeletingEntry(entry)}>Xóa</Button>}</div></td></tr>)}</Table> : <Empty title="Không có bản ghi nhật ký phù hợp bộ lọc"/>}
      {filteredLogs.length > 0 && <div className="journal-pagination"><span>Hiển thị {journalPage * pageSize + 1}–{Math.min((journalPage + 1) * pageSize, filteredLogs.length)} / {filteredLogs.length} bản ghi</span><Button variant="secondary" disabled={journalPage === 0} onClick={() => setJournalPage(value => Math.max(0, value - 1))}>Trước</Button><Button variant="secondary" disabled={(journalPage + 1) * pageSize >= filteredLogs.length} onClick={() => setJournalPage(value => value + 1)}>Tiếp</Button></div>}
    </Card>}

    {tab === 'harvests' && <Harvests key={pond.id} pondId={pond.id}/>}
    {tab === 'forecast' && <ScopedForecast key={pond.id} scope={{kind:'pond',id:pond.id}}/>}
    <Modal title={editingEntry ? 'Chỉnh sửa nhật ký bể nuôi' : 'Ghi nhật ký bể nuôi'} open={journalEditor} onClose={requestCloseJournal} wide className="diary-editor pond-detail-dialog" closeOnBackdrop={false}>
      <div className="form-grid">
        <div className="field full"><label>Bể nuôi</label><input value={`${pond.code} · ${pond.name}`} readOnly/></div>
        <div className="field full"><label>Loại nhật ký</label><Select value={writeKind} onChange={(value) => { setWriteKind(value as WritableJournalKind); setJournalForm((form: any) => ({ ...form, productId: '', productName: '' })); }} options={writableKinds.map((item) => ({ value: item.id, label: item.label }))}/></div>
        <div className="field full"><label>Vụ nuôi *</label><Select value={journalForm.cycleId || ''} onChange={(value) => setJournalForm((form: any) => ({ ...form, cycleId: value }))} options={cycles.map((cycle: any) => ({ value: cycle.id, label: `${cycle.code} · ${getLabel(db, 'species', cycle.speciesId)}` }))}/></div>
        <div className="field"><label>Ngày ghi *</label><input type="date" value={journalForm.date || ''} onChange={(event) => setJournalForm((form: any) => ({ ...form, date: event.target.value }))}/></div>
        <div className="field"><label>Người ghi nhận</label><input value={getActiveAccount()?.name || (role === 'admin' ? 'Quản trị viên' : 'Nông dân')} readOnly/></div>
        {writeKind === 'feedDiaries' && <><div className="field"><label>Loại thức ăn</label><Select value={journalForm.productId || ''} onChange={(value) => setJournalForm((form: any) => ({ ...form, productId: value }))} options={db.feedProducts.map((item: any) => ({ value: item.id, label: item.name }))}/></div><div className="field"><label>Tên thức ăn</label><input value={journalForm.productName || ''} onChange={event => setJournalForm((form: any) => ({ ...form, productName: event.target.value }))}/></div><div className="field"><label>Lượng thức ăn (kg) *</label><input type="number" min="0.1" step="0.1" value={journalForm.amountKg ?? ''} onChange={(event) => setJournalForm((form: any) => ({ ...form, amountKg: event.target.value }))}/></div><div className="field"><label>Số lần cho ăn</label><input type="number" min="1" step="1" value={journalForm.feedingTimes ?? ''} onChange={event => setJournalForm((form: any) => ({ ...form, feedingTimes: event.target.value }))}/></div><div className="field full"><label>Thời gian cho ăn</label><input value={journalForm.feedingTime || ''} onChange={event => setJournalForm((form: any) => ({ ...form, feedingTime: event.target.value }))} placeholder="Ví dụ: 07:00, 17:00"/></div></>}
        {writeKind === 'medicationDiaries' && <><div className="field"><label>Sản phẩm có trong danh mục</label><Select value={journalForm.productId || ''} onChange={(value) => setJournalForm((form: any) => ({ ...form, productId: value }))} options={db.medicationProducts.map((item: any) => ({ value: item.id, label: item.name }))}/></div><div className="field"><label>Tên thuốc/chế phẩm *</label><input value={journalForm.productName || ''} onChange={event => setJournalForm((form: any) => ({ ...form, productName: event.target.value }))}/></div><div className="field"><label>Nhóm sản phẩm</label><input value={journalForm.productGroup || ''} onChange={event => setJournalForm((form: any) => ({ ...form, productGroup: event.target.value }))}/></div><div className="field"><label>Mục đích sử dụng</label><input value={journalForm.purpose || ''} onChange={event => setJournalForm((form: any) => ({ ...form, purpose: event.target.value }))}/></div><div className="field"><label>Liều lượng đã sử dụng</label><input type="number" min="0" step="0.01" value={journalForm.dosage ?? ''} onChange={event => setJournalForm((form: any) => ({ ...form, dosage: event.target.value }))}/></div><div className="field"><label>Đơn vị liều lượng</label><input value={journalForm.dosageUnit || ''} onChange={event => setJournalForm((form: any) => ({ ...form, dosageUnit: event.target.value }))}/></div><div className="field"><label>Số lượng *</label><input type="number" min="0.01" step="0.01" value={journalForm.amount ?? ''} onChange={event => setJournalForm((form: any) => ({ ...form, amount: event.target.value }))}/></div><div className="field"><label>Đơn vị *</label><input value={journalForm.unit || ''} onChange={event => setJournalForm((form: any) => ({ ...form, unit: event.target.value }))} placeholder="kg, lít, g..."/></div></>}
        {writeKind === 'environmentObservations' && <><div className="field"><label>Giờ đo</label><input type="time" value={journalForm.measurementTime || ''} onChange={event => setJournalForm((form: any) => ({ ...form, measurementTime: event.target.value }))}/></div>{[['temperature', 'Nhiệt độ nước (°C)'], ['ph', 'pH'], ['salinity', 'Độ mặn (‰)'], ['oxygen', 'Oxy hòa tan (mg/L)'], ['alkalinity', 'Độ kiềm']].map(([key, label]) => <div className="field" key={key}><label>{label}</label><input type="number" step="0.1" value={journalForm[key] ?? ''} onChange={(event) => setJournalForm((form: any) => ({ ...form, [key]: event.target.value }))}/></div>)}</>}
        {writeKind === 'growthObservations' && <><div className="field"><label>Khối lượng trung bình (g) *</label><input type="number" min="0.1" step="0.1" value={journalForm.averageGrams ?? ''} onChange={(event) => setJournalForm((form: any) => ({ ...form, averageGrams: event.target.value }))}/></div><div className="field"><label>Chiều dài trung bình (cm)</label><input type="number" min="0" step="0.1" value={journalForm.averageLengthCm ?? ''} onChange={event => setJournalForm((form: any) => ({ ...form, averageLengthCm: event.target.value }))}/></div><div className="field"><label>Số lượng mẫu</label><input type="number" min="0" step="1" value={journalForm.sampleCount ?? ''} onChange={event => setJournalForm((form: any) => ({ ...form, sampleCount: event.target.value }))}/></div><div className="field"><label>Tình trạng tăng trưởng</label><input value={journalForm.growthStatus || ''} onChange={event => setJournalForm((form: any) => ({ ...form, growthStatus: event.target.value }))}/></div></>}
        {writeKind === 'healthEvents' && <><div className="field full"><label>Tình trạng quan sát được *</label><textarea value={journalForm.summary || ''} onChange={event => setJournalForm((form: any) => ({ ...form, summary: event.target.value }))}/></div><div className="field"><label>Dấu hiệu bất thường</label><input value={journalForm.symptoms || ''} onChange={event => setJournalForm((form: any) => ({ ...form, symptoms: event.target.value }))}/></div><div className="field"><label>Số lượng hao hụt</label><input type="number" min="0" step="1" value={journalForm.mortalityCount ?? ''} onChange={event => setJournalForm((form: any) => ({ ...form, mortalityCount: event.target.value }))}/></div><div className="field full"><label>Biện pháp đã thực hiện</label><textarea value={journalForm.treatment || ''} onChange={event => setJournalForm((form: any) => ({ ...form, treatment: event.target.value }))}/></div></>}
        <div className="field full"><label>Ghi chú</label><textarea value={journalForm.notes || ''} onChange={(event) => setJournalForm((form: any) => ({ ...form, notes: event.target.value }))}/></div>
        <div className="field full"><small>Ảnh đính kèm chưa được hỗ trợ trong kho dữ liệu DEMO.</small></div>
      </div>
      <div className="modal-footer"><Button variant="secondary" onClick={requestCloseJournal}>Hủy</Button><Button onClick={saveJournal} disabled={savingJournal}>{savingJournal ? 'Đang lưu…' : editingEntry ? 'Lưu thay đổi' : 'Lưu nhật ký'}</Button></div>
    </Modal>
    <Modal title="Chi tiết nhật ký" open={Boolean(selectedEntry)} onClose={() => setSelectedEntry(null)} className="pond-detail-dialog" closeOnBackdrop={false}>{selectedEntry && <div className="journal-detail"><p><b>Loại:</b> {labelForKind[selectedEntry.kind]}</p><p><b>Bể nuôi:</b> {pond.code} · {pond.name}</p><p><b>Vụ nuôi:</b> {cycles.find((cycle: any) => cycle.id === selectedEntry.cycleId)?.code || selectedEntry.cycleId}</p><p><b>Ngày ghi nhận:</b> {dateVi(selectedEntry.date)}</p>{Object.entries(selectedEntry.record).filter(([key, value]) => !['id','pondId','cycleId','date','createdAt','createdBy','updatedAt','updatedBy','source','status','analysisResult'].includes(key) && value !== '' && value != null).map(([key, value]) => <p key={key}><b>{journalFieldLabels[key] || key}:</b> {typeof value === 'object' ? JSON.stringify(value) : String(value)}</p>)}{selectedEntry.record.analysisResult && <div className="journal-analysis-result"><strong>{selectedEntry.record.analysisResult.disclaimer}</strong><p>{selectedEntry.record.analysisResult.species} · {selectedEntry.record.analysisResult.suspectedCondition || 'Chưa xác định'}</p><p>Dấu hiệu: {(selectedEntry.record.analysisResult.observedSigns || []).join(' ')}</p><p>Khuyến nghị: {(selectedEntry.record.analysisResult.recommendations || []).join(' ')}</p>{selectedEntry.record.imageRef && <img src={selectedEntry.record.imageRef} alt="Ảnh mẫu đã đối chiếu"/>}</div>}<p><b>Người ghi:</b> {selectedEntry.record.createdBy || 'Dữ liệu nhập trước đó'}</p><p><b>Tạo lúc:</b> {selectedEntry.record.createdAt ? new Date(selectedEntry.record.createdAt).toLocaleString('vi-VN') : '—'}</p>{selectedEntry.record.updatedAt && <p><b>Cập nhật lúc:</b> {new Date(selectedEntry.record.updatedAt).toLocaleString('vi-VN')} · {selectedEntry.record.updatedBy}</p>}<p><b>Nguồn:</b> {selectedEntry.record.source === 'USER_INPUT' ? 'Người dùng nhập' : selectedEntry.record.source || 'Dữ liệu hiện có'}</p></div>}</Modal>
    <Modal title="Xác nhận xóa nhật ký" open={Boolean(deletingEntry)} onClose={() => setDeletingEntry(null)} className="pond-detail-dialog" closeOnBackdrop={false}>{deletingEntry && <><p>Bạn có chắc muốn xóa bản ghi <b>{labelForKind[deletingEntry.kind]}</b> ngày <b>{dateVi(deletingEntry.date)}</b> của vụ <b>{cycles.find((cycle: any) => cycle.id === deletingEntry.cycleId)?.code || deletingEntry.cycleId}</b>?</p><div className="modal-footer"><Button variant="secondary" onClick={() => setDeletingEntry(null)}>Hủy</Button><Button onClick={deleteJournal}>Xóa nhật ký</Button></div></>}</Modal>
    <Modal title="Bạn có thay đổi chưa được lưu" open={discardJournalOpen} onClose={() => setDiscardJournalOpen(false)} className="pond-detail-dialog" closeOnBackdrop={false}><p>Bạn có thay đổi chưa được lưu. Bạn có chắc chắn muốn đóng biểu mẫu không?</p><div className="modal-footer"><Button variant="secondary" onClick={() => setDiscardJournalOpen(false)}>Tiếp tục chỉnh sửa</Button><Button variant="danger" onClick={discardJournalChanges}>Bỏ thay đổi</Button></div></Modal>
    <Modal title={pondActionAlert?.title || ''} open={Boolean(pondActionAlert)} onClose={() => setPondActionAlert(null)} className="pond-detail-dialog" closeOnBackdrop={false}><p>{pondActionAlert?.message}</p><div className="modal-footer"><Button onClick={() => setPondActionAlert(null)}>Đã hiểu</Button></div></Modal>
    <Confirm open={cycleToStart !== null} title="Chuyển vụ nuôi sang Đang nuôi?" description={`Xác nhận đã thả giống cho vụ ${cycleToStart?.code || ''}? Trạng thái sẽ chuyển từ Chuẩn bị sang Đang nuôi.`} onCancel={() => setCycleToStart(null)} onConfirm={startPreparedCycle} closeOnBackdrop={false}/>
    <div style={{ height: 18 }}/>
  </>;
}
