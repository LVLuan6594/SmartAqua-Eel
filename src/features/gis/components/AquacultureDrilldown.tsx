import React, { useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Chip,
  Divider,
  IconButton,
  Link,
  List,
  ListItem,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Tabs,
  Typography,
} from '@mui/material';
import {
  X,
  ChevronRight,
  Fish,
  Home,
  Waves,
  Sprout,
  FlaskConical,
  Stethoscope,
  PackageCheck,
  LineChart as LineChartIcon,
  AlertTriangle,
  MapPinOff,
  ExternalLink,
  ShieldCheck,
  TrendingUp,
  Users,
} from 'lucide-react';
import { Legend, Line, LineChart, Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip as ReTooltip, XAxis, YAxis } from 'recharts';
import { useDemo } from '../../../store/demoStore';
import {
  cycleKpis,
  diariesOfCycle,
  farmerById,
  farmersOfZone,
  label,
  linksOf,
  pondById,
  pondsOfFarmer,
  pondsOfZone,
  cyclesOfPond,
  zoneAccess,
  zoneById,
  zoneKpis,
} from '../services/aquacultureRepository';
import type { LinkedZone } from '../services/aquacultureRepository';
import type { ZoneDataStatus, ZoneGeometryStatus } from '../types';

export interface DrillState {
  zoneId: string | null;
  farmerId: string | null;
  pondId: string | null;
  cycleId: string | null;
}

export const EMPTY_DRILL: DrillState = { zoneId: null, farmerId: null, pondId: null, cycleId: null };

export interface AquacultureDrilldownProps {
  state: DrillState;
  onNavigate: (patch: Partial<DrillState>) => void;
  onClear: () => void;
}

const DATA_STATUS: Record<ZoneDataStatus, { label: string; color: string; bg: string }> = {
  verified: { label: 'Dữ liệu thực', color: '#1E7A5A', bg: '#EFFBF5' },
  partial: { label: 'Dữ liệu một phần', color: '#8A6A2A', bg: '#FFF8EF' },
  mock: { label: 'Dữ liệu mô phỏng', color: '#526477', bg: '#F1F5F9' },
};

const GEOM_STATUS: Record<ZoneGeometryStatus, string> = {
  verified: 'Ranh giới xác minh',
  digitized: 'Ranh giới số hoá',
  derived: 'Ranh giới suy ra (từ OSM)',
  unavailable: 'Chưa có ranh giới xác minh',
  synthetic: 'Ranh giới mô phỏng',
};

const CYCLE_STATUS: Record<string, { label: string; color: string }> = {
  active: { label: 'Đang nuôi', color: '#1E7A5A' },
  harvesting: { label: 'Đang thu hoạch', color: '#B8862F' },
  completed: { label: 'Đã kết thúc', color: '#4A5B70' },
  planned: { label: 'Kế hoạch', color: '#5B6B7A' },
};

const HEALTH_STATUS: Record<string, string> = {
  open: 'Mới ghi nhận',
  expert_review: 'Chờ chuyên gia xem xét',
  resolved: 'Đã xử lý',
};

const fmtDate = (v?: string | null) => {
  if (!v) return '—';
  const d = new Date(String(v));
  return Number.isNaN(d.getTime()) ? String(v) : d.toLocaleDateString('vi-VN');
};
const fmtNum = (v: number | null | undefined, unit = '') =>
  v == null ? '—' : `${Number(v).toLocaleString('vi-VN', { maximumFractionDigits: 2 })}${unit ? ` ${unit}` : ''}`;

function Field({ label: l, value }: { label: string; value: React.ReactNode }) {
  return (
    <ListItem disableGutters sx={{ py: 0.4, display: 'flex', justifyContent: 'space-between', gap: 2 }}>
      <Typography sx={{ fontSize: 13, color: 'text.secondary' }}>{l}</Typography>
      <Typography sx={{ fontSize: 13, fontWeight: 600, color: '#163250', textAlign: 'right' }}>{value}</Typography>
    </ListItem>
  );
}

function Stat({ label: l, value }: { label: string; value: React.ReactNode }) {
  return (
    <Box sx={{ bgcolor: '#F6FAFD', border: '1px solid #EAF1F7', borderRadius: 2, px: 1.1, py: 0.9 }}>
      <Typography sx={{ fontSize: 12, color: 'text.secondary', lineHeight: 1.3 }}>{l}</Typography>
      <Typography sx={{ fontSize: 18, fontWeight: 700, color: '#163250', lineHeight: 1.35 }}>{value}</Typography>
    </Box>
  );
}

function SectionTitle({ icon, children }: { icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.8, mt: 1.6, mb: 0.6 }}>
      {icon}
      <Typography sx={{ fontSize: 14, fontWeight: 700, color: '#163250' }}>{children}</Typography>
    </Box>
  );
}

function DataTable({ head, rows }: { head: string[]; rows: React.ReactNode[][] }) {
  if (rows.length === 0) return <Typography sx={{ fontSize: 13, color: 'text.secondary' }}>Chưa có bản ghi.</Typography>;
  return (
    <Table size="small" sx={{ '& td, & th': { fontSize: 12.5, px: 0.8, py: 0.5 } }}>
      <TableHead>
        <TableRow>
          {head.map((h) => (
            <TableCell key={h} sx={{ fontWeight: 700, color: '#41566E' }}>
              {h}
            </TableCell>
          ))}
        </TableRow>
      </TableHead>
      <TableBody>
        {rows.map((r, i) => (
          <TableRow key={i}>
            {r.map((c, j) => (
              <TableCell key={j}>{c}</TableCell>
            ))}
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

function StatusChip({ status }: { status: ZoneDataStatus }) {
  const meta = DATA_STATUS[status];
  return <Chip size="small" label={meta.label} sx={{ height: 22, fontSize: 12, bgcolor: meta.bg, color: meta.color, fontWeight: 700 }} />;
}

function UnavailableNotice({ zone }: { zone: LinkedZone }) {
  return (
    <Box sx={{ display: 'flex', gap: 1, bgcolor: '#FFF8EF', border: '1px solid #F5E5C9', borderRadius: 2, p: 1.2, mt: 1 }}>
      <MapPinOff size={18} color="#B8862F" style={{ flexShrink: 0, marginTop: 2 }} />
      <Box sx={{ minWidth: 0 }}>
        <Typography sx={{ fontSize: 13.5, fontWeight: 700, color: '#8A6A2A' }}>Khu vực có hoạt động nhưng chưa có ranh giới xác minh</Typography>
        <Typography sx={{ fontSize: 13, color: '#8A6A2A', lineHeight: 1.55, mt: 0.3 }}>{zone.evidence}</Typography>
        {zone.sourceUrl && (
          <Link href={zone.sourceUrl} target="_blank" rel="noreferrer" sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.4, fontSize: 12.5, mt: 0.6 }}>
            Mở nguồn tham chiếu <ExternalLink size={12} />
          </Link>
        )}
      </Box>
    </Box>
  );
}

export default function AquacultureDrilldown({ state, onNavigate, onClear }: AquacultureDrilldownProps) {
  const { db, role } = useDemo();
  const zone = useMemo(() => zoneById(db, state.zoneId), [db, state.zoneId]);
  const access = zone ? zoneAccess(db, role, zone) : { allowed: true };

  if (!zone) {
    return (
      <div className="gis-panel">
        <PanelHeader onClear={onClear} />
        <div className="gis-panel-scroll">
          <Box className="gis-panel-pad">
            <Typography sx={{ fontSize: 14, color: 'text.secondary', lineHeight: 1.6 }}>
              Chưa chọn vùng nuôi. Bật lớp <b>“Vùng nuôi (suy ra)”</b> hoặc <b>“Vùng nuôi (Vĩnh Châu)”</b> rồi bấm vào một vùng trên bản đồ,
              hoặc chọn một vùng trong danh sách ở tab “Đối tượng”.
            </Typography>
          </Box>
        </div>
      </div>
    );
  }

  const links = linksOf(db, zone.zoneId);
  const kpis = zoneKpis(db, zone, role);
  const farmers = access.allowed ? farmersOfZone(db, zone, role) : [];
  const ponds = access.allowed ? pondsOfZone(db, zone, role) : [];
  const farmer = access.allowed ? farmerById(db, state.farmerId) : null;
  const pond = access.allowed ? pondById(db, state.pondId) : null;
  const cycle = access.allowed && state.cycleId ? dbCycle(db, state.cycleId) : null;

  const crumbs: { label: string; patch: Partial<DrillState>; active: boolean }[] = [
    { label: role === 'farmer' || role === 'coop' ? zone.name : `${zone.code || zone.zoneId}`, patch: { farmerId: null, pondId: null, cycleId: null }, active: true },
  ];
  if (farmer) crumbs.push({ label: farmer.name, patch: { pondId: null, cycleId: null }, active: !pond });
  if (pond) crumbs.push({ label: pond.name, patch: { cycleId: null }, active: !cycle });
  if (cycle) crumbs.push({ label: cycle.code || cycle.id, patch: {}, active: true });

  return (
    <div className="gis-panel">
      <PanelHeader onClear={onClear} title="Chuỗi quản lý vùng nuôi" />
      <Box sx={{ px: 1.2, py: 0.8, display: 'flex', flexWrap: 'wrap', gap: 0.3, alignItems: 'center', borderBottom: '1px solid #EEF3F7' }}>
        {crumbs.map((c, i) => (
          <Box key={i} sx={{ display: 'flex', alignItems: 'center', gap: 0.3 }}>
            {i > 0 && <ChevronRight size={14} color="#9AA9B8" />}
            <Button
              size="small"
              onClick={() => onNavigate(c.patch)}
              sx={{
                textTransform: 'none',
                fontSize: 12.5,
                minWidth: 0,
                px: 0.7,
                py: 0.2,
                fontWeight: c.active && i === crumbs.length - 1 ? 700 : 500,
                color: '#1F5CA9',
                maxWidth: 160,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
                display: 'block',
              }}
            >
              {c.label}
            </Button>
          </Box>
        ))}
      </Box>

      <div className="gis-panel-scroll">
        <Box className="gis-panel-pad">
          {!access.allowed ? (
            <Alert severity="warning" icon={<AlertTriangle size={18} />} sx={{ fontSize: 13.5 }}>
              {access.reason}
            </Alert>
          ) : cycle && pond && farmer ? (
            <CycleView db={db} zone={zone} cycle={cycle} pond={pond} farmer={farmer} onNavigate={onNavigate} />
          ) : pond && farmer ? (
            <PondView db={db} pond={pond} farmer={farmer} onNavigate={onNavigate} />
          ) : farmer ? (
            <FarmerView db={db} farmer={farmer} zone={zone} onNavigate={onNavigate} />
          ) : (
            <ZoneView zone={zone} links={links} kpis={kpis} farmers={farmers} ponds={ponds} onNavigate={onNavigate} />
          )}
        </Box>
      </div>
    </div>
  );
}

function dbCycle(db: any, cycleId: string) {
  return (db.farmingCycles as any[]).find((c) => c.id === cycleId) || null;
}

function PanelHeader({ onClear, title = 'Thông tin vùng nuôi' }: { onClear: () => void; title?: string }) {
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, px: 1.4, py: 1.1 }}>
      <Fish size={18} color="#1F5CA9" />
      <Typography sx={{ fontSize: 16, fontWeight: 700, color: '#163250', minWidth: 0 }}>{title}</Typography>
      <IconButton size="small" onClick={onClear} aria-label="Đóng" sx={{ ml: 'auto', width: 34, height: 34 }}>
        <X size={16} />
      </IconButton>
    </Box>
  );
}

function ZoneView({
  zone,
  links,
  kpis,
  farmers,
  ponds,
  onNavigate,
}: {
  zone: LinkedZone;
  links: ReturnType<typeof linksOf>;
  kpis: ReturnType<typeof zoneKpis>;
  farmers: any[];
  ponds: any[];
  onNavigate: (patch: Partial<DrillState>) => void;
}) {
  const pondCountByFarmer = useMemo(() => {
    const m: Record<string, number> = {};
    for (const p of ponds) m[p.farmerId] = (m[p.farmerId] || 0) + 1;
    return m;
  }, [ponds]);

  return (
    <>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.8, flexWrap: 'wrap' }}>
        <StatusChip status={zone.dataStatus} />
        <Chip size="small" variant="outlined" label={GEOM_STATUS[zone.geometryStatus]} sx={{ height: 22, fontSize: 12 }} />
        {links.length > 1 && <Chip size="small" color="info" variant="outlined" label={`${links.length} xã/phường`} sx={{ height: 22, fontSize: 12 }} />}
      </Box>
      <Typography sx={{ fontSize: 19, fontWeight: 700, color: '#123243', mt: 0.8, lineHeight: 1.3 }}>{zone.name}</Typography>
      <Typography sx={{ fontSize: 13, color: 'text.secondary', mb: 1.2 }}>
        Mã vùng: {zone.code || zone.zoneId} · {zone.aquacultureType}
      </Typography>

      <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1 }}>
        <Stat label="Hộ nuôi" value={kpis.farmerCount} />
        <Stat label="Bể nuôi" value={kpis.pondCount} />
        <Stat label="Vụ đang nuôi" value={kpis.activeCycles} />
        <Stat label="Diện tích bể" value={`${(kpis.areaHa*10000).toLocaleString('vi-VN', { maximumFractionDigits: 1 })} m²`} />
      </Box>
      {kpis.harvestKg > 0 && (
        <Box sx={{ mt: 1 }}>
          <Stat label="Sản lượng thu hoạch luỹ kế" value={`${kpis.harvestKg.toLocaleString('vi-VN', { maximumFractionDigits: 0 })} kg`} />
        </Box>
      )}

      {zone.geometryStatus === 'unavailable' && <UnavailableNotice zone={zone} />}

      <SectionTitle icon={<Waves size={16} color="#2F6FC0" />}>Phân bố theo xã/phường</SectionTitle>
      {links.length === 0 ? (
        <Typography sx={{ fontSize: 13, color: 'text.secondary' }}>Chưa tính được phần giao với xã/phường (thiếu ranh giới vùng).</Typography>
      ) : (
        <DataTable
          head={['Xã/phường', 'Diện tích giao (km²)', 'Tỷ lệ vùng']}
          rows={links.map((l) => [l.communeName, fmtNum(l.intersectionAreaKm2), `${Math.round(l.shareOfZone * 100)}%`])}
        />
      )}

      <SectionTitle icon={<Users size={16} color="#1F5CA9" />}>Hộ nuôi trong vùng ({farmers.length})</SectionTitle>
      {farmers.length === 0 ? (
        <Typography sx={{ fontSize: 13, color: 'text.secondary', lineHeight: 1.55 }}>
          {zone.dataStatus === 'verified'
            ? 'Vùng này có ranh giới xác minh từ nguồn mở nhưng chưa gắn hồ sơ hộ nuôi của dự án.'
            : 'Chưa có hộ nuôi được gán cho vùng này.'}
        </Typography>
      ) : (
        <List dense disablePadding>
          {farmers.map((f) => (
            <ListItem
              key={f.id}
              disableGutters
              sx={{ borderBottom: '1px solid #F1F5F9', cursor: 'pointer', py: 0.6, display: 'flex', gap: 1 }}
              onClick={() => onNavigate({ farmerId: f.id, pondId: null, cycleId: null })}
            >
              <Home size={15} color="#1F5CA9" style={{ flexShrink: 0 }} />
              <Box sx={{ minWidth: 0, flex: 1 }}>
                <Typography sx={{ fontSize: 13.5, fontWeight: 600, color: '#163250' }}>{f.name}</Typography>
                <Typography sx={{ fontSize: 12, color: 'text.secondary' }}>{f.code} · {pondCountByFarmer[f.id] || 0} bể</Typography>
              </Box>
              <ChevronRight size={15} color="#9AA9B8" />
            </ListItem>
          ))}
        </List>
      )}
    </>
  );
}

function FarmerView({
  db,
  farmer,
  zone,
  onNavigate,
}: {
  db: any;
  farmer: any;
  zone: LinkedZone;
  onNavigate: (patch: Partial<DrillState>) => void;
}) {
  const ponds = pondsOfFarmer(db, farmer.id);
  return (
    <>
      <StatusChip status={zone.dataStatus} />
      <Typography sx={{ fontSize: 12.5, fontWeight: 650, color: '#1F5CA9', mt: 1 }}>HỘ NUÔI</Typography>
      <Typography sx={{ fontSize: 18, fontWeight: 700, color: '#123243', mb: 1 }}>{farmer.name}</Typography>
      <List dense disablePadding>
        <Field label="Mã hộ" value={farmer.code || farmer.id} />
        <Field label="Hợp tác xã" value={label(db, 'cooperatives', farmer.coopId)} />
        <Field label="Vùng nuôi" value={zone.name} />
        <Field label="Trạng thái" value={farmer.status === 'active' ? 'Đang hoạt động' : farmer.status} />
      </List>

      <SectionTitle icon={<Waves size={16} color="#2F6FC0" />}>Bể nuôi ({ponds.length})</SectionTitle>
      <List dense disablePadding>
        {ponds.map((p) => {
          const cycles = cyclesOfPond(db, p.id);
          const active = cycles.filter((c) => c.status === 'active' || c.status === 'harvesting').length;
          return (
            <ListItem
              key={p.id}
              disableGutters
              sx={{ borderBottom: '1px solid #F1F5F9', cursor: 'pointer', py: 0.6, display: 'flex', gap: 1 }}
              onClick={() => onNavigate({ pondId: p.id, cycleId: null })}
            >
              <Box sx={{ width: 10, height: 10, borderRadius: '3px', bgcolor: '#2F80C9', flexShrink: 0 }} />
              <Box sx={{ minWidth: 0, flex: 1 }}>
                <Typography sx={{ fontSize: 13.5, fontWeight: 600, color: '#163250' }}>{p.name}</Typography>
                <Typography sx={{ fontSize: 12, color: 'text.secondary' }}>
                  {p.code} · {fmtNum(p.areaM2??p.areaHa*10000, 'm²')} · {cycles.length} vụ{active ? ` · ${active} đang nuôi` : ''}
                </Typography>
              </Box>
              <ChevronRight size={15} color="#9AA9B8" />
            </ListItem>
          );
        })}
      </List>
    </>
  );
}

function PondView({
  db,
  pond,
  farmer,
  onNavigate,
}: {
  db: any;
  pond: any;
  farmer: any;
  onNavigate: (patch: Partial<DrillState>) => void;
}) {
  const cycles = cyclesOfPond(db, pond.id);
  return (
    <>
      <Typography sx={{ fontSize: 12.5, fontWeight: 650, color: '#1F5CA9' }}>BỂ NUÔI</Typography>
      <Typography sx={{ fontSize: 18, fontWeight: 700, color: '#123243', mb: 1 }}>{pond.name}</Typography>
      <List dense disablePadding>
        <Field label="Mã bể" value={pond.code || pond.id} />
        <Field label="Hộ nuôi" value={farmer.name} />
        <Field label="Diện tích" value={fmtNum(pond.areaM2??pond.areaHa*10000, 'm²')} />
        <Field label="Toạ độ" value={pond.lat != null ? `${Number(pond.lat).toFixed(5)}, ${Number(pond.lng).toFixed(5)}` : '—'} />
        <Field label="Trạng thái" value={pond.status === 'active' ? 'Đang hoạt động' : pond.status} />
      </List>

      <SectionTitle icon={<Sprout size={16} color="#1E9E76" />}>Vụ nuôi ({cycles.length})</SectionTitle>
      <List dense disablePadding>
        {cycles.map((c) => {
          const st = CYCLE_STATUS[c.status] || CYCLE_STATUS.planned;
          return (
            <ListItem
              key={c.id}
              disableGutters
              sx={{ borderBottom: '1px solid #F1F5F9', cursor: 'pointer', py: 0.6, display: 'flex', gap: 1 }}
              onClick={() => onNavigate({ cycleId: c.id })}
            >
              <Box sx={{ minWidth: 0, flex: 1 }}>
                <Typography sx={{ fontSize: 13.5, fontWeight: 600, color: '#163250' }}>{c.code || c.id}</Typography>
                <Typography sx={{ fontSize: 12, color: 'text.secondary' }}>
                  {label(db, 'species', c.speciesId)} · thả {fmtDate(c.stockingDate)}
                </Typography>
              </Box>
              <Chip size="small" label={st.label} sx={{ height: 20, fontSize: 11.5, color: st.color, fontWeight: 700 }} variant="outlined" />
              <ChevronRight size={15} color="#9AA9B8" />
            </ListItem>
          );
        })}
      </List>
    </>
  );
}

function CycleView({
  db,
  zone,
  cycle,
  pond,
  farmer,
  onNavigate,
}: {
  db: any;
  zone: LinkedZone;
  cycle: any;
  pond: any;
  farmer: any;
  onNavigate: (patch: Partial<DrillState>) => void;
}) {
  const [tab, setTab] = useState(0);
  const diaries = useMemo(() => diariesOfCycle(db, cycle.id), [db, cycle.id]);
  const kpi = useMemo(() => cycleKpis(db, cycle, diaries), [db, cycle, diaries]);
  const st = CYCLE_STATUS[cycle.status] || CYCLE_STATUS.planned;

  const feedSeries = diaries.feed.map((f) => ({ date: fmtDate(f.date), 'Thức ăn (kg)': Number(f.amountKg) || 0 }));
  const envSeries = diaries.environment.map((e) => ({
    date: fmtDate(e.date),
    'pH': Number(e.ph) || 0,
    'Nhiệt độ (°C)': Number(e.temperature) || 0,
    'Oxy (mg/L)': Number(e.oxygen) || 0,
    ...(e.salinity != null ? { 'Độ mặn (‰)': Number(e.salinity) } : {}),
  }));
  const growthSeries = diaries.growth.map((g) => ({ date: fmtDate(g.date), 'Khối lượng TB (g)': Number(g.averageGrams) || 0 }));
  const totalHarvest = diaries.harvest.reduce((s, h) => s + (Number(h.quantityKg) || 0), 0);

  const timeline = useMemo(() => {
    const ev: { date: string; icon: React.ReactNode; title: string; detail: string }[] = [];
    if (diaries.stocking) ev.push({ date: diaries.stocking.date, icon: <Sprout size={14} color="#1E9E76" />, title: 'Thả giống', detail: `${fmtNum(diaries.stocking.quantity)} con` });
    for (const g of diaries.growth) ev.push({ date: g.date, icon: <TrendingUp size={14} color="#2F80C9" />, title: 'Kiểm tra tăng trưởng', detail: `${fmtNum(g.averageGrams, 'g')}` });
    for (const m of diaries.medication) ev.push({ date: m.date, icon: <FlaskConical size={14} color="#7C4DD1" />, title: 'Ghi nhận vật tư/thuốc', detail: `${label(db, 'medicationProducts', m.productId)} · ${fmtNum(m.amount)}` });
    for (const h of diaries.health) ev.push({ date: h.date, icon: <Stethoscope size={14} color="#B8862F" />, title: 'Sự kiện sức khoẻ', detail: h.summary });
    for (const h of diaries.harvest) ev.push({ date: h.date, icon: <PackageCheck size={14} color="#1F5CA9" />, title: 'Thu hoạch', detail: `${fmtNum(h.quantityKg, 'kg')}` });
    return ev.sort((a, b) => String(a.date).localeCompare(String(b.date)));
  }, [db, diaries]);

  const chartHeight = 190;

  return (
    <>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.8, flexWrap: 'wrap' }}>
        <Chip size="small" label={st.label} sx={{ height: 22, fontSize: 12, color: st.color, fontWeight: 700 }} variant="outlined" />
        <Chip size="small" variant="outlined" label={label(db, 'species', cycle.speciesId)} sx={{ height: 22, fontSize: 12 }} />
        <StatusChip status={zone.dataStatus} />
      </Box>
      <Typography sx={{ fontSize: 18, fontWeight: 700, color: '#123243', mt: 0.8 }}>Vụ {cycle.code || cycle.id}</Typography>
      <Typography sx={{ fontSize: 13, color: 'text.secondary', mb: 1.1 }}>
        {pond.name} · {farmer.name} · thả {fmtDate(cycle.stockingDate)} → dự kiến thu {fmtDate(cycle.expectedHarvestDate)}
      </Typography>

      <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1 }}>
        <Stat label="Ngày nuôi" value={kpi.days} />
        <Stat label="Giống đã thả" value={fmtNum(kpi.stockingQuantity)} />
        <Stat label="Tổng thức ăn" value={fmtNum(kpi.feedKg, 'kg')} />
        <Stat label="Sản lượng thu" value={fmtNum(kpi.harvestKg, 'kg')} />
        <Stat label="FCR (TĂ/thu)" value={kpi.fcr ?? '—'} />
        <Stat label="KL trung bình" value={kpi.averageGrams != null ? fmtNum(kpi.averageGrams, 'g') : '—'} />
      </Box>

      <List dense disablePadding sx={{ mt: 0.6 }}>
        <Field label="Lô giống" value={kpi.seedBatchCode || '—'} />
        <Field label="Cơ sở giống" value={kpi.supplierName || '—'} />
      </List>

      <SectionTitle icon={<PackageCheck size={16} color="#1F5CA9" />}>Sơ đồ vòng đời vụ nuôi</SectionTitle>
      {timeline.length === 0 ? (
        <Typography sx={{ fontSize: 13, color: 'text.secondary' }}>Chưa có mốc sự kiện.</Typography>
      ) : (
        <Box sx={{ borderLeft: '2px solid #E3ECF4', pl: 1.4, ml: 0.4 }}>
          {timeline.map((e, i) => (
            <Box key={i} sx={{ position: 'relative', pb: 1.1 }}>
              <Box sx={{ position: 'absolute', left: -22, top: 1, width: 16, height: 16, borderRadius: '50%', bgcolor: '#fff', border: '2px solid #DCE7F1', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {e.icon}
              </Box>
              <Typography sx={{ fontSize: 13, fontWeight: 650, color: '#163250' }}>
                {e.title} <Typography component="span" sx={{ fontSize: 12, fontWeight: 500, color: 'text.secondary' }}>· {fmtDate(e.date)}</Typography>
              </Typography>
              <Typography sx={{ fontSize: 12.5, color: 'text.secondary' }}>{e.detail}</Typography>
            </Box>
          ))}
        </Box>
      )}

      <SectionTitle icon={<LineChartIcon size={16} color="#2F80C9" />}>Nhật ký vụ nuôi</SectionTitle>
      <Tabs
        value={tab}
        onChange={(_e, v) => setTab(v)}
        variant="scrollable"
        scrollButtons="auto"
        sx={{ minHeight: 38, borderBottom: '1px solid #EEF3F7', '& .MuiTab-root': { minHeight: 38, fontSize: 12.5, fontWeight: 650, px: 1.1, minWidth: 0 } }}
      >
        <Tab label={`Vật tư (${diaries.feed.length})`} />
        <Tab label={`Môi trường (${diaries.environment.length})`} />
        <Tab label={`Tăng trưởng (${diaries.growth.length})`} />
        <Tab label={`Sức khoẻ & thuốc (${diaries.health.length + diaries.medication.length})`} />
        <Tab label={`Thu hoạch (${diaries.harvest.length})`} />
        <Tab label="Vòng đời" />
      </Tabs>
      <Box sx={{ pt: 1.2 }}>
        {tab === 0 && (
          <>
            {feedSeries.length > 0 && (
              <Box sx={{ height: chartHeight, mb: 1 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={feedSeries}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#EEF3F7" />
                    <XAxis dataKey="date" label={{ value: "Ngày ghi nhận", position: "insideBottom", offset: -5 }} height={38} tick={{ fontSize: 10 }} interval="preserveStartEnd" />
                    <YAxis width={58} label={{ value: "Thức ăn (kg)", angle: -90, position: "insideLeft" }} tick={{ fontSize: 10 }} />
                    <ReTooltip contentStyle={{ fontSize: 12 }} />
                    <Bar dataKey="Thức ăn (kg)" fill="#E8873A" radius={[3, 3, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </Box>
            )}
            <DataTable
              head={['Ngày', 'Sản phẩm', 'Khối lượng (kg)']}
              rows={diaries.feed.map((f) => [fmtDate(f.date), label(db, 'feedProducts', f.productId), fmtNum(f.amountKg)])}
            />
          </>
        )}
        {tab === 1 && (
          <>
            {envSeries.length > 0 && (
              <Box sx={{ height: chartHeight, mb: 1 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={envSeries}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#EEF3F7" />
                    <XAxis dataKey="date" label={{ value: "Ngày ghi nhận", position: "insideBottom", offset: -5 }} height={38} tick={{ fontSize: 10 }} interval="preserveStartEnd" />
                    <YAxis width={72} label={{ value: "Đơn vị theo từng chỉ tiêu", angle: -90, position: "insideLeft" }} tick={{ fontSize: 10 }} />
                    <ReTooltip contentStyle={{ fontSize: 12 }} />
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                    <Line type="monotone" dataKey="pH" stroke="#2F80C9" dot={false} strokeWidth={2} />
                    <Line type="monotone" dataKey="Nhiệt độ (°C)" stroke="#E8873A" dot={false} strokeWidth={2} />
                    <Line type="monotone" dataKey="Oxy (mg/L)" stroke="#1E9E76" dot={false} strokeWidth={2} />
                    {envSeries.some((e) => e['Độ mặn (‰)'] != null) && <Line type="monotone" dataKey="Độ mặn (‰)" stroke="#7C4DD1" dot={false} strokeWidth={2} />}
                  </LineChart>
                </ResponsiveContainer>
              </Box>
            )}
            <DataTable
              head={['Ngày', 'pH', 'Nhiệt độ', 'Oxy', 'Độ mặn']}
              rows={diaries.environment.map((e) => [fmtDate(e.date), fmtNum(e.ph), fmtNum(e.temperature), fmtNum(e.oxygen), e.salinity != null ? fmtNum(e.salinity) : '—'])}
            />
          </>
        )}
        {tab === 2 && (
          <>
            {growthSeries.length > 0 && (
              <Box sx={{ height: chartHeight, mb: 1 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={growthSeries}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#EEF3F7" />
                    <XAxis dataKey="date" label={{ value: "Ngày quan sát", position: "insideBottom", offset: -5 }} height={38} tick={{ fontSize: 10 }} interval="preserveStartEnd" />
                    <YAxis width={60} label={{ value: "Khối lượng TB (g)", angle: -90, position: "insideLeft" }} tick={{ fontSize: 10 }} />
                    <ReTooltip contentStyle={{ fontSize: 12 }} />
                    <Line type="monotone" dataKey="Khối lượng TB (g)" stroke="#1F5CA9" dot={{ r: 2 }} strokeWidth={2} />
                  </LineChart>
                </ResponsiveContainer>
              </Box>
            )}
            <DataTable head={['Ngày', 'Khối lượng TB (g)']} rows={diaries.growth.map((g) => [fmtDate(g.date), fmtNum(g.averageGrams)])} />
          </>
        )}
        {tab === 3 && (
          <>
            <Typography sx={{ fontSize: 13, fontWeight: 700, color: '#163250', mb: 0.4 }}>Sự kiện sức khoẻ</Typography>
            <DataTable
              head={['Ngày', 'Diễn biến', 'Trạng thái']}
              rows={diaries.health.map((h) => [fmtDate(h.date), h.summary, HEALTH_STATUS[h.status] || h.status])}
            />
            <Typography sx={{ fontSize: 13, fontWeight: 700, color: '#163250', mt: 1.2, mb: 0.4 }}>Ghi nhận vật tư / thuốc</Typography>
            <DataTable
              head={['Ngày', 'Sản phẩm', 'Khối lượng', 'Mục đích']}
              rows={diaries.medication.map((m) => [fmtDate(m.date), label(db, 'medicationProducts', m.productId), fmtNum(m.amount), m.purpose || m.notes || '—'])}
            />
            <Alert severity="info" sx={{ fontSize: 12.5, mt: 1 }}>
              Bản ghi minh hoạ phục vụ trình diễn quy trình; không phải chỉ định dùng thuốc.
            </Alert>
          </>
        )}
        {tab === 4 && (
          <>
            <DataTable
              head={['Ngày', 'Sản lượng (kg)', 'Ghi chú']}
              rows={diaries.harvest.map((h) => [fmtDate(h.date), fmtNum(h.quantityKg), h.notes || '—'])}
            />
            <Box sx={{ mt: 1 }}>
              <Stat label="Tổng sản lượng" value={`${totalHarvest.toLocaleString('vi-VN', { maximumFractionDigits: 1 })} kg`} />
            </Box>
          </>
        )}
        {tab === 5 && (
          <Box sx={{ display: 'grid', gap: 0.8 }}>
            {timeline.map((e, i) => (
              <Box key={i} sx={{ display: 'flex', gap: 1, alignItems: 'center', border: '1px solid #EEF3F7', borderRadius: 2, px: 1, py: 0.6 }}>
                {e.icon}
                <Typography sx={{ fontSize: 13, fontWeight: 600, color: '#163250', flex: 1 }}>{e.title}</Typography>
                <Typography sx={{ fontSize: 12.5, color: 'text.secondary' }}>{fmtDate(e.date)}</Typography>
                <Typography sx={{ fontSize: 12.5, color: '#41566E', minWidth: 64, textAlign: 'right' }}>{e.detail}</Typography>
              </Box>
            ))}
          </Box>
        )}
      </Box>

      <Divider sx={{ my: 1.4 }} />
      <Box sx={{ display: 'flex', gap: 0.8, alignItems: 'flex-start', color: 'text.secondary' }}>
        <ShieldCheck size={14} style={{ marginTop: 2, flexShrink: 0 }} />
        <Typography sx={{ fontSize: 12, lineHeight: 1.5 }}>
          Dữ liệu nhật ký thuộc hồ sơ vùng <b>{zone.dataStatus === 'verified' ? 'xác minh từ nguồn mở' : zone.dataStatus === 'partial' ? 'dữ liệu một phần' : 'hồ sơ vùng'}</b>. Kiểm tra nhãn nguồn trước khi dùng cho quyết định.
        </Typography>
      </Box>
    </>
  );
}
