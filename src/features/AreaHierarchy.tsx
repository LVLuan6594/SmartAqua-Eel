import React, { useMemo, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { ArrowLeft, ChevronRight, CirclePlus, Fish, Pencil, Store, Trash2, Waves, MapPinned } from 'lucide-react';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Badge, Button, Card, Confirm, Empty, PageTitle, SearchBox, Status, Table, toast } from '../components/UI';
import { useDemo, store } from '../store/demoStore';
import { canCreate, canWrite, num, scoped } from '../domain/selectors';
import { areaAnalytics } from '../domain/analytics/areaAnalytics';
import { farmImageFor, pondImageFor, regionImageFor } from '../domain/aquacultureImages';
import type { RecordItem } from '../types/models';
import ScopedForecast from './ScopedForecast';
import EntityForecastTabs from './EntityForecastTabs';

export default function AreaHierarchy() {
  const { areaId, farmId } = useParams();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const { db, role } = useDemo();
  const [query, setQuery] = useState('');
  const [year, setYear] = useState<number | 'all'>(2026);
  const [unitId, setUnitId] = useState('');
  const [speciesId, setSpeciesId] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<RecordItem | null>(null);
  const areas = scoped(db, role, 'aquacultureAreas');
  const farms = scoped(db, role, 'farmers');
  const ponds = scoped(db, role, 'ponds');
  const area = areaId ? areas.find((item) => item.id === areaId) : null;
  const farm = farmId ? farms.find((item) => item.id === farmId && item.areaId === areaId) : null;
  const canManageAreas = canWrite(role, 'aquacultureAreas');
  const canManageFarms = canWrite(role, 'farmers');
  const canManagePonds = canWrite(role, 'ponds');
  const canAddAreas = canCreate(role, 'aquacultureAreas');
  const canAddFarms = canCreate(role, 'farmers');
  const canAddPonds = canCreate(role, 'ponds');

  const overview = useMemo(() => areaAnalytics(db, role, { year, unitId: unitId || undefined, speciesId: speciesId || undefined }), [db, role, year, unitId, speciesId]);
  const areaStats = overview.areas.map((row) => ({ area: areas.find((item) => item.id === row.areaId)!, ...row, farmCount: row.farmerCount, pondArea: row.pondAreaHa })).filter((row) => row.area);
  const selectedAreaStats = useMemo(() => area ? areaAnalytics(db, role, { areaId: area.id, year, speciesId: speciesId || undefined }) : null, [db, role, area, year, speciesId]);

  const regionPonds = area ? ponds.filter((pond) => pond.areaId === area.id) : [];
  const regionFarms = area ? farms.filter((row) => row.areaId === area.id) : [];
  const farmPonds = farm ? regionPonds.filter((pond) => pond.farmerId === farm.id) : [];
  const filteredAreas = areaStats.filter(({ area: item }) => `${item.name} ${item.code}`.toLocaleLowerCase('vi').includes(query.toLocaleLowerCase('vi')));
  const filteredFarms = regionFarms.filter((item) => `${item.name} ${item.code}`.toLocaleLowerCase('vi').includes(query.toLocaleLowerCase('vi')));

  const goManage = (collection: 'areas' | 'farmers' | 'ponds', params = '') => navigate(`/${collection === 'areas' ? 'areas/manage' : collection}${params}`);
  const deleteRecord = () => {
    if (!deleteTarget) return;
    const kind = deleteTarget.id === area?.id ? 'aquacultureAreas' : 'farmers';
    const hasChildren = kind === 'aquacultureAreas'
      ? db.farmers.some((item: RecordItem) => item.areaId === deleteTarget.id) || db.ponds.some((item: RecordItem) => item.areaId === deleteTarget.id)
      : db.ponds.some((item: RecordItem) => item.farmerId === deleteTarget.id);
    if (hasChildren) {
      toast(kind === 'aquacultureAreas' ? 'Vùng nuôi còn trang trại hoặc bể liên kết, chưa thể xóa.' : 'Trang trại còn bể nuôi liên kết, chưa thể xóa.', 'error');
      setDeleteTarget(null);
      return;
    }
    if (kind === 'aquacultureAreas') store.transaction((draft) => {
      draft.aquacultureAreas = draft.aquacultureAreas.filter((item: RecordItem) => item.id !== deleteTarget.id);
      draft.gisFeatures = draft.gisFeatures.filter((item: RecordItem) => item.entityId !== deleteTarget.id);
      return draft;
    }, `Xóa vùng nuôi ${deleteTarget.code}`);
    else store.remove(kind, deleteTarget.id);
    setDeleteTarget(null);
    toast('Đã xóa hồ sơ');
  };

  if (areaId && !area) return <><PageTitle title="Không tìm thấy vùng nuôi" description="Vùng nuôi không tồn tại hoặc nằm ngoài phạm vi đang xem." actions={<Button variant="secondary" onClick={() => navigate('/areas')}><ArrowLeft size={16}/> Danh sách vùng</Button>}/><Empty/></>;
  if (farmId && !farm) return <><PageTitle title="Không tìm thấy trang trại" description="Hồ sơ trang trại không tồn tại trong vùng nuôi đã chọn." actions={<Button variant="secondary" onClick={() => navigate(`/areas/${areaId}`)}><ArrowLeft size={16}/> Trang trại trong vùng</Button>}/><Empty/></>;

  if(area&&params.get('tab')==='forecast')return <>
    <div className="hierarchy-breadcrumb"><button onClick={()=>navigate('/areas')}>Vùng nuôi</button><ChevronRight size={15}/>{farm?<><button onClick={()=>navigate(`/areas/${area.id}`)}>{area.name}</button><ChevronRight size={15}/><strong>{farm.name}</strong></>:<strong>{area.name}</strong>}</div>
    <PageTitle kicker={farm?'DỰ BÁO THEO HỘ NUÔI':'DỰ BÁO THEO VÙNG NUÔI'} title={(farm||area).name} description={`${(farm||area).code} · Dự báo sản lượng thu hoạch trong phạm vi hồ sơ`} actions={<Button variant="secondary" onClick={()=>navigate(`/gis?entity=${area.id}`)}><MapPinned size={15}/> Xem vùng trên GIS</Button>}/>
    <EntityForecastTabs overviewLabel={farm?'Bể nuôi của hộ':'Hộ nuôi trong vùng'}/>
    <ScopedForecast key={`${farm?'farmer':'area'}:${(farm||area).id}`} scope={{kind:farm?'farmer':'area',id:(farm||area).id}}/>
  </>;

  if (!areaId) return <>
    <PageTitle kicker="QUẢN LÝ NUÔI TRỒNG" title="Vùng nuôi" description="Chọn một vùng để xem các trang trại, sau đó mở từng bể để tra cứu hồ sơ sản xuất." actions={canAddAreas ? <Button onClick={() => goManage('areas', '?add=1')}><CirclePlus size={16}/> Thêm vùng nuôi</Button> : <Badge tone="blue">{areas.length} vùng trong phạm vi</Badge>}/>
    <div className="hierarchy-summary">
      <div><span>Tổng vùng nuôi</span><strong>{num(areas.length)}</strong></div>
      <div><span>Trang trại / hộ nuôi</span><strong>{num(farms.length)}</strong></div>
      <div><span>Bể nuôi</span><strong>{num(ponds.length)}</strong></div>
      <div><span>Diện tích vùng nuôi</span><strong>{num(overview.totals.zoneAreaHa, 2)} ha</strong></div>
      <div><span>Diện tích bể nuôi</span><strong>{num(overview.totals.pondAreaHa*10000, 1)} m²</strong></div>
    </div>
    <div className="infobar" style={{marginBottom:16}}><Store size={17}/> Hiện mỗi hộ nuôi được trình bày như một trang trại để theo dõi theo luồng vùng nuôi → trang trại → bể nuôi. Hệ thống hiện quản lý hồ sơ hộ nuôi, chưa có danh mục trang trại độc lập.</div>
    <div className="hierarchy-toolbar"><SearchBox value={query} onChange={setQuery} placeholder="Tìm vùng nuôi theo tên hoặc mã..."/><label className="hierarchy-filter">Xã/phường<select value={unitId} onChange={(event) => setUnitId(event.target.value)}><option value="">Tất cả địa bàn</option>{db.administrativeUnits.map((unit: RecordItem) => <option key={unit.id} value={unit.id}>{unit.name}</option>)}</select></label><label className="hierarchy-filter">Loài nuôi<select value={speciesId} onChange={(event) => setSpeciesId(event.target.value)}><option value="">Tất cả loài</option>{db.species.map((species: RecordItem) => <option key={species.id} value={species.id}>{species.name}</option>)}</select></label><label className="hierarchy-filter">Năm thu hoạch<select value={year} onChange={(event) => setYear(event.target.value === 'all' ? 'all' : Number(event.target.value))}><option value="all">Tất cả</option>{overview.years.map((value) => <option key={value} value={value}>{value}</option>)}</select></label><span>{filteredAreas.length} vùng</span></div>
    <div className="area-analytics-grid">
      <Card title="Sản lượng thu hoạch theo kỳ" subtitle="Tổng từ các phiếu thu hoạch có liên kết với vùng nuôi"><div className="chart-box short"><ResponsiveContainer width="100%" height="100%"><BarChart data={overview.production}><CartesianGrid stroke="#edf3f4" vertical={false}/><XAxis dataKey="label" label={{value:"Kỳ thống kê",position:"insideBottom",offset:-5}} height={38} tick={{fontSize:10}}/><YAxis width={60} label={{value:"Sản lượng (kg)",angle:-90,position:"insideLeft"}} tick={{fontSize:10}}/><Tooltip formatter={(value: number) => `${num(value)} kg`}/><Bar dataKey="harvestKg" name="Thu hoạch" fill="#1c9ba4" radius={[5,5,0,0]}/></BarChart></ResponsiveContainer></div></Card>
      <Card title="So sánh vùng nuôi" subtitle="Diện tích bể theo từng vùng (m²)"><div className="chart-box short"><ResponsiveContainer width="100%" height="100%"><BarChart data={overview.areas.map(row=>({...row,pondAreaM2:row.pondAreaHa*10000}))}><CartesianGrid stroke="#edf3f4" vertical={false}/><XAxis dataKey="code" label={{value:"Mã vùng nuôi",position:"insideBottom",offset:-5}} height={38} tick={{fontSize:10}}/><YAxis width={60} label={{value:"Diện tích bể (m²)",angle:-90,position:"insideLeft"}} tick={{fontSize:10}}/><Tooltip formatter={(value: number) => `${num(value, 1)} m²`}/><Bar dataKey="pondAreaM2" name="Diện tích bể" fill="#4e91c3" radius={[5,5,0,0]}/></BarChart></ResponsiveContainer></div></Card>
    </div>
    {filteredAreas.length ? <div className="hierarchy-grid">{filteredAreas.map(({ area: item, farmCount, pondCount, pondArea }) => <article className="hierarchy-card region-card" key={item.id}>
      <div className="hierarchy-card-art region-art"><img src={regionImageFor(item.id)} alt={`Ảnh minh họa cụm nuôi lươn · ${item.name}`}/><span className="region-art-code">{item.code}</span><small>ẢNH MINH HỌA · VÙNG NUÔI</small></div>
      <div className="hierarchy-card-body"><div className="hierarchy-card-title"><div><h2>{item.name}</h2><p>{item.code} · {db.administrativeUnits.find((unit: RecordItem) => unit.id === item.unitId)?.name || 'Chưa gán địa bàn'}</p></div><Status status={item.status || 'active'}/></div>
        <div className="hierarchy-card-stats"><span><b>{farmCount}</b> trang trại</span><span><b>{pondCount}</b> bể</span><span><b>{num(pondArea*10000, 1)}</b> m² bể</span></div>
        <div className="hierarchy-card-actions"><Button onClick={() => navigate(`/areas/${item.id}`)}>Xem trang trại <ChevronRight size={15}/></Button><Button variant="secondary" onClick={() => navigate(`/gis?entity=${item.id}`)}><MapPinned size={15}/> Bản đồ</Button>{canManageAreas && <><button className="hierarchy-icon-button" aria-label={`Sửa vùng ${item.name}`} onClick={() => goManage('areas', `?edit=${item.id}`)}><Pencil size={15}/></button><button className="hierarchy-icon-button danger" aria-label={`Xóa vùng ${item.name}`} onClick={() => setDeleteTarget(item)}><Trash2 size={15}/></button></>}</div>
      </div>
    </article>)}</div> : <Card><Empty title="Không có vùng nuôi phù hợp" text="Thử từ khóa khác hoặc thêm vùng nuôi mới."/></Card>}
    <Confirm open={Boolean(deleteTarget)} title="Xóa vùng nuôi?" description={`Xóa ${deleteTarget?.name || 'vùng nuôi'}? Chỉ xóa được khi vùng chưa có trang trại hoặc bể liên kết.`} onCancel={() => setDeleteTarget(null)} onConfirm={deleteRecord}/>
  </>;

  if (!area) return <><PageTitle title="Không tìm thấy vùng nuôi" description="Vùng nuôi không tồn tại hoặc nằm ngoài phạm vi đang xem." actions={<Button variant="secondary" onClick={() => navigate('/areas')}><ArrowLeft size={16}/> Danh sách vùng</Button>}/><Empty/></>;

  if (!farmId) return <>
    <div className="hierarchy-breadcrumb"><button onClick={() => navigate('/areas')}>Vùng nuôi</button><ChevronRight size={15}/><strong>{area.name}</strong></div>
    <PageTitle kicker="HỘ NUÔI TRONG VÙNG" title={area.name} description={`${area.code} · ${db.administrativeUnits.find((unit: RecordItem) => unit.id === area.unitId)?.name || 'Chưa gán địa bàn'} · ${num(regionPonds.length)} bể nuôi`} actions={<>{canManageAreas && <Button variant="secondary" onClick={() => goManage('areas', `?edit=${area.id}`)}><Pencil size={15}/> Sửa vùng</Button>}{canAddFarms && <Button onClick={() => goManage('farmers', `?area=${area.id}&add=1`)}><CirclePlus size={16}/> Thêm hộ nuôi</Button>}</>}/>
    <EntityForecastTabs overviewLabel="Hộ nuôi trong vùng"/>
    <div className="hierarchy-summary compact"><div><span>Diện tích vùng nuôi</span><strong>{num(selectedAreaStats?.totals.zoneAreaHa, 2)} ha</strong></div><div><span>Hộ/cơ sở nuôi</span><strong>{num(selectedAreaStats?.totals.farmerCount)}</strong></div><div><span>Bể nuôi</span><strong>{num(selectedAreaStats?.totals.pondCount)}</strong></div><div><span>Diện tích bể</span><strong>{num((selectedAreaStats?.totals.pondAreaHa||0)*10000, 1)} m²</strong></div><div><span>Vụ đang hoạt động</span><strong>{num(selectedAreaStats?.totals.activeCycleCount)}</strong></div><div><span>Sản lượng kỳ chọn</span><strong>{num(selectedAreaStats?.totals.harvestKg)} kg</strong></div></div>
    <div className="hierarchy-toolbar"><label className="hierarchy-filter">Loài nuôi<select value={speciesId} onChange={(event) => setSpeciesId(event.target.value)}><option value="">Tất cả loài</option>{db.species.map((species: RecordItem) => <option key={species.id} value={species.id}>{species.name}</option>)}</select></label><label className="hierarchy-filter">Năm thu hoạch<select value={year} onChange={(event) => setYear(event.target.value === 'all' ? 'all' : Number(event.target.value))}><option value="all">Tất cả</option>{(selectedAreaStats?.years || []).map((value) => <option key={value} value={value}>{value}</option>)}</select></label><Button variant="secondary" onClick={() => navigate(`/gis?entity=${area.id}`)}><MapPinned size={15}/> Xem trên bản đồ GIS</Button></div>
    {selectedAreaStats && <div className="area-analytics-grid"><Card title="Thu hoạch theo kỳ" subtitle="Từ các vụ nuôi được liên kết với vùng"><div className="chart-box short"><ResponsiveContainer width="100%" height="100%"><BarChart data={selectedAreaStats.production}><CartesianGrid stroke="#edf3f4" vertical={false}/><XAxis dataKey="label" label={{value:"Kỳ thống kê",position:"insideBottom",offset:-5}} height={38} tick={{fontSize:10}}/><YAxis width={60} label={{value:"Sản lượng (kg)",angle:-90,position:"insideLeft"}} tick={{fontSize:10}}/><Tooltip formatter={(value: number) => `${num(value)} kg`}/><Bar dataKey="harvestKg" name="Thu hoạch" fill="#1c9ba4" radius={[5,5,0,0]}/></BarChart></ResponsiveContainer></div></Card><Card title="Cơ cấu loài nuôi" subtitle="Theo số vụ có ghi nhận trong vùng"><div className="area-species-list">{selectedAreaStats.species.map((item) => <div key={item.id}><span>{item.name}</span><strong>{num(item.cycleCount)} vụ · {num(item.harvestKg)} kg</strong></div>)}{!selectedAreaStats.species.length && <span>Chưa có dữ liệu vụ nuôi trong phạm vi này.</span>}</div></Card></div>}
    <div className="hierarchy-toolbar"><SearchBox value={query} onChange={setQuery} placeholder="Tìm hộ nuôi theo tên hoặc mã..."/><span>{filteredFarms.length} hộ nuôi</span></div>
    {filteredFarms.length ? <div className="hierarchy-grid">{filteredFarms.map((item) => {
      const itemPonds = regionPonds.filter((pond) => pond.farmerId === item.id);
      const hectares = itemPonds.reduce((sum, pond) => sum + Number(pond.areaHa || 0), 0);
      return <article className="hierarchy-card farm-card" key={item.id}>
        <div className="hierarchy-card-art farm-art"><img src={farmImageFor(item.id)} alt={`Ảnh minh họa hoạt động nuôi lươn · ${item.name}`}/><span>Ảnh minh họa</span></div>
        <div className="hierarchy-card-body"><div className="hierarchy-card-title"><div><h2>{item.name}</h2><p>{item.code} · Hộ nuôi</p></div><Status status={item.status || 'active'}/></div>
          <div className="farm-meta"><span><Store size={14}/> Hộ nuôi</span><span><Waves size={14}/> {itemPonds.length} bể · {num(hectares*10000, 1)} m²</span></div>
          <div className="hierarchy-card-actions"><Button onClick={() => navigate(`/areas/${area.id}/farms/${item.id}`)}>Xem các bể nuôi <ChevronRight size={15}/></Button>{canManageFarms && <><button className="hierarchy-icon-button" aria-label={`Sửa ${item.name}`} onClick={() => goManage('farmers', `?edit=${item.id}`)}><Pencil size={15}/></button><button className="hierarchy-icon-button danger" aria-label={`Xóa ${item.name}`} onClick={() => setDeleteTarget(item)}><Trash2 size={15}/></button></>}</div>
        </div>
      </article>;
    })}</div> : <Card><Empty title="Vùng này chưa có trang trại" text="Thêm hồ sơ hộ nuôi để bắt đầu quản lý bể theo vùng."/></Card>}
    <Confirm open={Boolean(deleteTarget)} title="Xóa trang trại?" description={`Xóa ${deleteTarget?.name || 'trang trại'}? Chỉ xóa được khi chưa có bể liên kết.`} onCancel={() => setDeleteTarget(null)} onConfirm={deleteRecord}/>
  </>;

  if (!farm) return <><PageTitle title="Không tìm thấy trang trại" description="Hồ sơ trang trại không tồn tại trong vùng nuôi đã chọn." actions={<Button variant="secondary" onClick={() => navigate(`/areas/${area.id}`)}><ArrowLeft size={16}/> Trang trại trong vùng</Button>}/><Empty/></>;

  return <>
    <div className="hierarchy-breadcrumb"><button onClick={() => navigate('/areas')}>Vùng nuôi</button><ChevronRight size={15}/><button onClick={() => navigate(`/areas/${area.id}`)}>{area.name}</button><ChevronRight size={15}/><strong>{farm.name}</strong></div>
    <PageTitle kicker="HỘ NUÔI / TRANG TRẠI" title={farm.name} description={`${farm.code} · ${area.name}`} actions={<>{canManageFarms && <Button variant="secondary" onClick={() => goManage('farmers', `?edit=${farm.id}`)}><Pencil size={15}/> Sửa hộ nuôi</Button>}{canAddPonds && <Button onClick={() => goManage('ponds', `?farmer=${farm.id}&add=1`)}><CirclePlus size={16}/> Thêm bể nuôi</Button>}</>}/>
    <EntityForecastTabs overviewLabel="Bể nuôi của hộ"/>
    <div className="detail-hero"><div className="metric-icon blue"><Store size={28}/></div><div><h2>Trang trại / hồ sơ hộ nuôi</h2><p>Trong dữ liệu hiện tại, mỗi trang trại được biểu diễn bằng một hồ sơ hộ nuôi và liên kết trực tiếp tới các bể.</p></div><Badge tone="blue">{area.code}</Badge></div>
    <div className="hierarchy-summary compact"><div><span>Bể nuôi</span><strong>{num(farmPonds.length)}</strong></div><div><span>Tổng diện tích ao</span><strong>{num(farmPonds.reduce((sum, pond) => sum + Number(pond.areaHa || 0), 0)*10000, 1)} m²</strong></div><div><span>Vụ đang hoạt động</span><strong>{num(db.farmingCycles.filter((cycle: RecordItem) => farmPonds.some((pond) => pond.id === cycle.pondId) && ['active', 'harvesting'].includes(cycle.status)).length)}</strong></div><div><span>Hợp tác xã</span><strong className="hierarchy-summary-name">{db.cooperatives.find((coop: RecordItem) => coop.id === farm.coopId)?.name || '—'}</strong></div></div>
    <Card title="Bể nuôi thuộc trang trại" subtitle="Chọn một bể để mở hồ sơ chi tiết, vụ nuôi, nhật ký và thu hoạch" action={canManagePonds || canAddPonds ? <Button variant="secondary" onClick={() => goManage('ponds', `?farmer=${farm.id}`)}>Quản lý danh sách ao</Button> : null}>
      {farmPonds.length ? <Table headers={['Ảnh tham khảo','Mã bể','Tên bể','Diện tích','Vụ đang nuôi','Trạng thái','']}>{farmPonds.map((pond) => {
        const activeCount = db.farmingCycles.filter((cycle: RecordItem) => cycle.pondId === pond.id && ['active', 'harvesting'].includes(cycle.status)).length;
        return <tr key={pond.id}><td><img className="pond-table-thumb" src={pondImageFor(pond.id)} alt={`Ảnh tham khảo bể ${pond.code}`}/></td><td><b>{pond.code}</b></td><td><button className="table-link" onClick={() => navigate(`/ponds/${pond.id}`)}>{pond.name || pond.code}<ChevronRight size={14}/></button></td><td>{num(pond.areaM2??pond.areaHa*10000, 1)} m²</td><td>{activeCount}</td><td><Status status={pond.status || 'active'}/></td><td><Button variant="secondary" onClick={() => navigate(`/ponds/${pond.id}`)}><Fish size={14}/> Chi tiết</Button></td></tr>;
      })}</Table> : <Empty title="Trang trại chưa có bể nuôi" text="Thêm bể nuôi để xem các chỉ tiêu sản xuất ở bước tiếp theo."/>}
    </Card>
    <div className="hierarchy-back"><Button variant="ghost" onClick={() => navigate(`/areas/${area.id}`)}><ArrowLeft size={15}/> Quay lại danh sách trang trại</Button></div>
  </>;
}
