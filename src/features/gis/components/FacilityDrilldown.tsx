import React, { useMemo, useState } from 'react';
import { Alert, Box, Button, Chip, Divider, IconButton, List, ListItem, Link, Tab, Tabs, Typography } from '@mui/material';
import {
  X,
  ChevronRight,
  Fish,
  Database,
  MapPin,
  MapPinOff,
  Ruler,
  ShieldCheck,
  AlertTriangle,
  Info,
} from 'lucide-react';
import { getFacilityById, getPondsByFacility, getDatasetMetadata } from '../services/facilityRepository';
import type { ImportedFacility, ImportedPond } from '../types';

export interface FacilityDrilldownProps {
  facilityId: string | null;
  pondId: string | null;
  onNavigate: (patch: { facilityId?: string | null; pondId?: string | null }) => void;
  onClear: () => void;
}

const CONFIDENCE_LABEL: Record<string, { label: string; color: string }> = {
  high: { label: 'Cao', color: '#1E7A5A' },
  medium: { label: 'Trung bình', color: '#B8862F' },
  low: { label: 'Thấp', color: '#B23B3B' },
  none: { label: 'Không có', color: '#8A98A5' },
};

const MAPPING_LABEL: Record<string, string> = {
  coordinate: 'Theo toạ độ (point-in-polygon)',
  address: 'Theo địa chỉ',
  unresolved: 'Chưa xác định',
};

function fmtNum(v: number | null | undefined, digits = 0) {
  return v == null ? '—' : Number(v).toLocaleString('vi-VN', { maximumFractionDigits: digits });
}

function fmtArea(m2: number | null | undefined) {
  if (m2 == null) return '—';
  return `${fmtNum(m2)} m² (≈ ${fmtNum(m2 / 10000, 2)} ha tạm tính)`;
}

function fmtCoord(lat: number | null, lng: number | null) {
  if (lat == null || lng == null) return '—';
  return `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
}

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <ListItem disableGutters sx={{ py: 0.4, display: 'flex', justifyContent: 'space-between', gap: 2 }}>
      <Typography sx={{ fontSize: 13, color: 'text.secondary' }}>{label}</Typography>
      <Typography sx={{ fontSize: 13, fontWeight: 600, color: '#163250', textAlign: 'right' }}>{value}</Typography>
    </ListItem>
  );
}

function Stat({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <Box sx={{ bgcolor: '#F6FAFD', border: '1px solid #EAF1F7', borderRadius: 2, px: 1.1, py: 0.9 }}>
      <Typography sx={{ fontSize: 12, color: 'text.secondary', lineHeight: 1.3 }}>{label}</Typography>
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

function OriginNotice() {
  return (
    <Box sx={{ display: 'flex', gap: 0.8, alignItems: 'flex-start', mt: 1.5, bgcolor: '#FFF7ED', border: '1px solid #F5E5C9', borderRadius: 2, p: 1.1 }}>
      <Database size={15} color="#B45309" style={{ marginTop: 2, flexShrink: 0 }} />
      <Typography sx={{ fontSize: 12, color: '#8A6A2A', lineHeight: 1.5 }}>
        Bản ghi nhập từ phụ lục PDF ({getDatasetMetadata().sourceFile}). Toạ độ là điểm đại diện, không phải ranh giới ao. Đã khử định danh: không lưu họ tên chủ cơ sở và số điện thoại.
      </Typography>
    </Box>
  );
}

function EmptyTab({ label }: { label: string }) {
  return (
    <Box sx={{ display: 'flex', gap: 1, bgcolor: '#F6FAFD', border: '1px solid #EAF1F7', borderRadius: 2, p: 1.2, mt: 1 }}>
      <Info size={18} color="#2F6FC0" style={{ flexShrink: 0, marginTop: 1 }} />
      <Typography sx={{ fontSize: 13.5, color: '#2C5580', lineHeight: 1.55 }}>
        Chưa có dữ liệu <b>{label}</b> cho bể này trong phụ lục. Hệ thống không tạo dữ liệu giả.
      </Typography>
    </Box>
  );
}

const POND_TABS = ['Tổng quan', 'Vụ nuôi', 'Giống', 'Nhật ký', 'Môi trường', 'Thuốc & sức khoẻ', 'Thu hoạch', 'AI'];

export default function FacilityDrilldown({ facilityId, pondId, onNavigate, onClear }: FacilityDrilldownProps) {
  const facility = useMemo(() => getFacilityById(facilityId), [facilityId]);
  const ponds = useMemo(() => getPondsByFacility(facilityId), [facilityId]);
  const [tab, setTab] = useState(0);

  if (!facility) {
    return (
      <div className="gis-panel">
        <Header onClear={onClear} title="Thông tin cơ sở" />
        <div className="gis-panel-scroll">
          <Box className="gis-panel-pad">
            <Typography sx={{ fontSize: 14, color: 'text.secondary', lineHeight: 1.6 }}>
              Chưa chọn cơ sở. Bật lớp <b>“Cơ sở nuôi (phụ lục PDF)”</b> và bấm vào một điểm cơ sở trên bản đồ để xem danh sách ao.
            </Typography>
          </Box>
        </div>
      </div>
    );
  }

  const selectedPond = pondId ? ponds.find((p) => p.id === pondId) || null : null;

  return (
    <div className="gis-panel">
      <Header onClear={onClear} title={selectedPond ? 'Hồ sơ bể nuôi' : 'Hồ sơ cơ sở nuôi'} />
      <Box sx={{ px: 1.2, py: 0.8, display: 'flex', flexWrap: 'wrap', gap: 0.3, alignItems: 'center', borderBottom: '1px solid #EEF3F7' }}>
        <Button
          size="small"
          onClick={() => onNavigate({ pondId: null })}
          sx={{ textTransform: 'none', fontSize: 12.5, minWidth: 0, px: 0.7, py: 0.2, fontWeight: selectedPond ? 500 : 700, color: '#1F5CA9' }}
        >
          {facility.id}
        </Button>
        {selectedPond && (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.3 }}>
            <ChevronRight size={14} color="#9AA9B8" />
            <Button size="small" sx={{ textTransform: 'none', fontSize: 12.5, minWidth: 0, px: 0.7, py: 0.2, fontWeight: 700, color: '#1F5CA9' }}>
              {selectedPond.name || selectedPond.code}
            </Button>
          </Box>
        )}
      </Box>

      <div className="gis-panel-scroll">
        <Box className="gis-panel-pad">
          {selectedPond ? (
            <PondProfile
              pond={selectedPond}
              facility={facility}
              tab={tab}
              onTab={setTab}
              onBack={() => onNavigate({ pondId: null })}
            />
          ) : (
            <FacilityProfile facility={facility} ponds={ponds} onSelectPond={(id) => onNavigate({ pondId: id })} />
          )}
        </Box>
      </div>
    </div>
  );
}

function Header({ onClear, title }: { onClear: () => void; title: string }) {
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, px: 1.4, py: 1.1 }}>
      <Fish size={18} color="#C2410C" />
      <Typography sx={{ fontSize: 16, fontWeight: 700, color: '#163250', minWidth: 0 }}>{title}</Typography>
      <IconButton size="small" onClick={onClear} aria-label="Đóng" sx={{ ml: 'auto', width: 34, height: 34 }}>
        <X size={16} />
      </IconButton>
    </Box>
  );
}

function FacilityProfile({
  facility,
  ponds,
  onSelectPond,
}: {
  facility: ImportedFacility;
  ponds: ImportedPond[];
  onSelectPond: (id: string) => void;
}) {
  const conf = CONFIDENCE_LABEL[facility.coordinateConfidence] || CONFIDENCE_LABEL.none;
  return (
    <>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.6, flexWrap: 'wrap' }}>
        <Chip size="small" label="Cơ sở từ phụ lục" sx={{ height: 22, fontSize: 12, bgcolor: '#FFF7ED', color: '#B45309', fontWeight: 700 }} />
        <Chip
          size="small"
          variant="outlined"
          icon={facility.lat != null ? <MapPin size={13} /> : <MapPinOff size={13} />}
          label={facility.lat != null ? 'Có toạ độ' : 'Thiếu toạ độ'}
          sx={{ height: 22, fontSize: 12 }}
        />
        {facility.communeName && <Chip size="small" variant="outlined" label={facility.communeName} sx={{ height: 22, fontSize: 12 }} />}
        {facility.verificationStatus === 'needs_review' && (
          <Chip size="small" color="warning" variant="outlined" label="Cần rà soát" sx={{ height: 22, fontSize: 12 }} />
        )}
      </Box>

      <Typography sx={{ fontSize: 18, fontWeight: 700, color: '#123243', mt: 0.8, lineHeight: 1.3 }}>Cơ sở {facility.id}</Typography>
      <Typography sx={{ fontSize: 13, color: 'text.secondary', mb: 1.2 }}>
        Mã cơ sở (nguyên bản) · STT phụ lục: {facility.sourceIndex ?? '—'} · Trang {facility.sourcePage}
      </Typography>

      <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1 }}>
        <Stat label="Số bể" value={facility.pondCountActual} />
        <Stat label="Bể có toạ độ" value={facility.pondsWithCoordinates} />
        <Stat label="Bể có diện tích" value={facility.pondsWithArea} />
        <Stat label="Độ tin cậy toạ độ" value={<span style={{ color: conf.color }}>{conf.label}</span>} />
      </Box>

      <List dense disablePadding sx={{ mt: 1 }}>
        <Field label="Địa chỉ cơ sở" value={facility.addressFacility || '—'} />
        <Field label="Địa chỉ nuôi" value={facility.addressFarming || '—'} />
        <Field label="Xã/phường (mới)" value={facility.communeName ? `${facility.communeName}` : 'Chưa xác định'} />
        <Field label="Cách gán đơn vị" value={MAPPING_LABEL[facility.mappingMethod] || facility.mappingMethod} />
        <Field label="Toạ độ đại diện" value={fmtCoord(facility.lat, facility.lng)} />
        <Field label="Đối tượng nuôi" value={facility.species.join(', ') || '—'} />
        <Field label="Tổng diện tích (phụ lục)" value={fmtArea(facility.areaM2Total)} />
      </List>

      <SectionTitle icon={<Ruler size={16} color="#2F6FC0" />}>Danh sách bể ({ponds.length})</SectionTitle>
      {ponds.length === 0 ? (
        <Typography sx={{ fontSize: 13, color: 'text.secondary' }}>Không có bể trong phụ lục.</Typography>
      ) : (
        <List dense disablePadding>
          {ponds.map((p) => {
            const pc = CONFIDENCE_LABEL[p.coordConfidence] || CONFIDENCE_LABEL.none;
            return (
              <ListItem
                key={p.id}
                disableGutters
                sx={{ borderBottom: '1px solid #F1F5F9', cursor: 'pointer', py: 0.6, display: 'flex', gap: 1 }}
                onClick={() => onSelectPond(p.id)}
              >
                <Box sx={{ width: 10, height: 10, borderRadius: '3px', bgcolor: '#C2410C', flexShrink: 0, mt: 0.4 }} />
                <Box sx={{ minWidth: 0, flex: 1 }}>
                  <Typography sx={{ fontSize: 13.5, fontWeight: 600, color: '#163250' }}>
                    {p.name || 'Ao'} <Typography component="span" sx={{ fontSize: 12, fontWeight: 500, color: 'text.secondary' }}>· {p.code}</Typography>
                  </Typography>
                  <Typography sx={{ fontSize: 12, color: 'text.secondary' }}>
                    {p.areaM2 != null ? `${fmtNum(p.areaM2)} m²` : 'Thiếu diện tích'} · {p.species || '—'} ·{' '}
                    {p.lat != null ? `toạ độ (${pc.label})` : 'thiếu toạ độ'}
                    {p.duplicateOf ? ' · trùng mã' : ''}
                  </Typography>
                </Box>
                <ChevronRight size={15} color="#9AA9B8" />
              </ListItem>
            );
          })}
        </List>
      )}
      <OriginNotice />
    </>
  );
}

function PondProfile({
  pond,
  facility,
  tab,
  onTab,
  onBack,
}: {
  pond: ImportedPond;
  facility: ImportedFacility;
  tab: number;
  onTab: (v: number) => void;
  onBack: () => void;
}) {
  const pc = CONFIDENCE_LABEL[pond.coordConfidence] || CONFIDENCE_LABEL.none;
  return (
    <>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.6, flexWrap: 'wrap' }}>
        <Chip size="small" label="Bể từ phụ lục" sx={{ height: 22, fontSize: 12, bgcolor: '#FFF7ED', color: '#B45309', fontWeight: 700 }} />
        {pond.duplicateOf && <Chip size="small" color="warning" variant="outlined" icon={<AlertTriangle size={13} />} label="Trùng mã" sx={{ height: 22, fontSize: 12 }} />}
      </Box>
      <Typography sx={{ fontSize: 18, fontWeight: 700, color: '#123243', mt: 0.8 }}>{pond.name || 'Ao'}</Typography>
      <Typography sx={{ fontSize: 13, color: 'text.secondary', mb: 0.4 }}>
        Mã bể: {pond.code} · Cơ sở: {facility.id}
      </Typography>

      <Tabs
        value={tab}
        onChange={(_e, v) => onTab(v)}
        variant="scrollable"
        scrollButtons="auto"
        sx={{ minHeight: 38, borderBottom: '1px solid #EEF3F7', '& .MuiTab-root': { minHeight: 38, fontSize: 12.5, fontWeight: 650, px: 1.1, minWidth: 0 } }}
      >
        {POND_TABS.map((t) => (
          <Tab key={t} label={t} />
        ))}
      </Tabs>

      <Box sx={{ pt: 1.2 }}>
        {tab === 0 ? (
          <List dense disablePadding>
            <Field label="Mã bể (nguyên bản)" value={pond.code} />
            <Field label="Cơ sở" value={facility.id} />
            <Field label="Xã/phường (mới)" value={facility.communeName || 'Chưa xác định'} />
            <Field label="Diện tích" value={fmtArea(pond.areaM2)} />
            <Field label="Đối tượng nuôi" value={pond.species || '—'} />
            <Field label="Toạ độ" value={fmtCoord(pond.lat, pond.lng)} />
            <Field label="Độ tin cậy toạ độ" value={<span style={{ color: pc.color }}>{pc.label}</span>} />
            <Field label="Số thứ tự ao" value={pond.ordinal ?? '—'} />
            <Field label="Trang nguồn" value={pond.sourcePage} />
          </List>
        ) : (
          <EmptyTab label={POND_TABS[tab].toLowerCase()} />
        )}
      </Box>

      <Divider sx={{ my: 1.4 }} />
      <Box sx={{ display: 'flex', gap: 0.8, alignItems: 'flex-start', color: 'text.secondary' }}>
        <ShieldCheck size={14} style={{ marginTop: 2, flexShrink: 0 }} />
        <Typography sx={{ fontSize: 12, lineHeight: 1.5 }}>
          Nguồn: phụ lục danh sách cơ sở nuôi trồng ({getDatasetMetadata().asOf}). Bể chỉ có dữ liệu nhận diện, diện tích và toạ độ (nếu có); chưa có nhật ký vụ nuôi.
        </Typography>
      </Box>
      <Box sx={{ mt: 1 }}>
        <Link component="button" onClick={onBack} sx={{ fontSize: 12.5 }}>
          ← Về danh sách bể của cơ sở
        </Link>
      </Box>
    </>
  );
}
