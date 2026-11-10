import React, { useEffect, useState } from 'react';
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Box,
  Button,
  Chip,
  Divider,
  IconButton,
  Link,
  List,
  ListItem,
  Tab,
  Tabs,
  Tooltip,
  Typography,
} from '@mui/material';
import { ChevronDown, ExternalLink, Fish, Info, MapPinOff, PanelRightClose, ShieldCheck, Waves, X } from 'lucide-react';
import { normalizeDisplayText } from '../../../domain/normalizeDisplayData';
import type {
  CommuneProperties,
  GeoFeature,
  GisManifest,
  ImportedFacility,
  LayerId,
  PdfFacilityProperties,
  VerifiedAquacultureProperties,
  VerifiedWaterProperties,
} from '../types';

const typeLabel: Record<string, string> = { ward: 'Phường', commune: 'Xã', special: 'Đặc khu', city: 'Thành phố' };

export interface InfoPanelProps {
  commune: GeoFeature<CommuneProperties> | null;
  aquaCount: number;
  waterCount: number;
  facilityCount: number;
  facilityList: ImportedFacility[];
  verified: { feature: GeoFeature<VerifiedAquacultureProperties | VerifiedWaterProperties>; layerId: LayerId } | null;
  demo: GeoFeature | null;
  verifiedList: GeoFeature<VerifiedAquacultureProperties>[];
  onSelectVerified: (feature: GeoFeature<VerifiedAquacultureProperties | VerifiedWaterProperties>, layerId: LayerId) => void;
  onSelectFacility: (feature: GeoFeature<PdfFacilityProperties>) => void;
  manifest: GisManifest | null;
  onClear: () => void;
  onHide?: () => void;
}

function Stat({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <Box sx={{ bgcolor: '#F6FAFD', border: '1px solid #EAF1F7', borderRadius: 2, px: 1.2, py: 1 }}>
      <Typography sx={{ fontSize: 12.5, color: 'text.secondary' }}>{label}</Typography>
      <Typography sx={{ fontSize: 20, fontWeight: 700, color: '#163250', lineHeight: 1.3 }}>{value}</Typography>
    </Box>
  );
}

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <ListItem disableGutters sx={{ py: 0.5, display: 'flex', justifyContent: 'space-between', gap: 2 }}>
      <Typography sx={{ fontSize: 13.5, color: 'text.secondary' }}>{label}</Typography>
      <Typography sx={{ fontSize: 13.5, fontWeight: 600, color: '#163250', textAlign: 'right' }}>{value}</Typography>
    </ListItem>
  );
}

export default function InfoPanel({
  commune,
  aquaCount,
  waterCount,
  facilityCount,
  facilityList,
  verified,
  demo,
  verifiedList,
  onSelectVerified,
  onSelectFacility,
  manifest,
  onClear,
  onHide,
}: InfoPanelProps) {
  const [tab, setTab] = useState(0);

  useEffect(() => {
    if (verified || demo) setTab(1);
  }, [verified, demo]);
  useEffect(() => {
    if (commune) setTab(0);
  }, [commune]);

  const hasSelection = Boolean(commune || verified || demo);

  return (
    <div className="gis-panel">
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, px: 1.4, py: 1.1 }}>
        <Fish size={18} color="#1F5CA9" />
        <Typography sx={{ flex: 1, minWidth: 0, fontSize: 16, fontWeight: 700, color: '#163250' }}>Thông tin GIS</Typography>
        {hasSelection && (
          <Tooltip title="Bỏ chọn">
            <IconButton size="small" onClick={onClear} aria-label="Bỏ chọn" sx={{ width: 32, height: 32 }}>
              <X size={16} />
            </IconButton>
          </Tooltip>
        )}
        {onHide && (
          <Tooltip title="Ẩn bảng thông tin">
            <IconButton size="small" onClick={onHide} aria-label="Ẩn bảng thông tin" sx={{ width: 32, height: 32 }}>
              <PanelRightClose size={17} />
            </IconButton>
          </Tooltip>
        )}
      </Box>
      <Tabs
        value={tab}
        onChange={(_e, v) => setTab(v)}
        variant="fullWidth"
        sx={{ minHeight: 42, borderTop: '1px solid #EEF3F7', borderBottom: '1px solid #EEF3F7', '& .MuiTab-root': { minHeight: 42, fontSize: 14, fontWeight: 650 } }}
      >
        <Tab label="Tổng quan" />
        <Tab label="Đối tượng" />
        <Tab label="Dữ liệu" />
      </Tabs>

      <div className="gis-panel-scroll">
        {tab === 0 && (
          <Box className="gis-panel-pad">
            {commune ? (
              <>
                <Typography sx={{ fontSize: 12.5, fontWeight: 650, color: '#1F5CA9' }}>
                  {typeLabel[commune.properties.type]?.toUpperCase() || 'ĐƠN VỊ HÀNH CHÍNH'}
                </Typography>
                <Typography sx={{ fontSize: 20, fontWeight: 700, color: '#123243', mb: 0.3 }}>{commune.properties.fullName}</Typography>
                <Typography sx={{ fontSize: 13.5, color: 'text.secondary', mb: 1.4 }}>Mã đơn vị: {commune.properties.code}</Typography>
                <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1 }}>
                  <Stat label="Diện tích (km²)" value={commune.properties.areaKm2 != null ? commune.properties.areaKm2.toLocaleString('vi-VN') : '—'} />
                  <Stat label="Loại đơn vị" value={typeLabel[commune.properties.type] || commune.properties.type} />
                  <Stat label="Cơ sở nuôi (xác minh)" value={aquaCount} />
                  <Stat label="Cơ sở (phụ lục PDF)" value={facilityCount} />
                  <Stat label="Vùng nước (xác minh)" value={waterCount} />
                </Box>
                {facilityCount > 0 && (
                  <Box sx={{ mt: 1.5 }}>
                    <Typography sx={{ fontSize: 13.5, fontWeight: 700, color: '#163250', mb: 0.4 }}>Cơ sở từ phụ lục ({facilityCount})</Typography>
                    <List dense disablePadding>
                      {facilityList.slice(0, 40).map((f) => (
                        <ListItem
                          key={f.id}
                          disableGutters
                          sx={{ borderBottom: '1px solid #F1F5F9', cursor: 'pointer', py: 0.6, display: 'flex', gap: 1 }}
                          onClick={() =>
                            onSelectFacility({
                              type: 'Feature',
                              id: f.id,
                              properties: {
                                facilityId: f.id,
                                sourceIndex: f.sourceIndex,
                                communeCode: f.communeCode,
                                communeName: f.communeName,
                                pondCount: f.pondCountActual,
                                species: f.species.join(', '),
                                areaM2Total: f.areaM2Total,
                                coordinateConfidence: f.coordinateConfidence,
                                mappingMethod: f.mappingMethod,
                                verificationStatus: f.verificationStatus,
                                origin: f.origin,
                                sourcePage: f.sourcePage,
                              },
                              geometry: { type: 'Point', coordinates: [f.lng ?? 0, f.lat ?? 0] },
                            })
                          }
                        >
                          <Box sx={{ width: 10, height: 10, borderRadius: '3px', bgcolor: '#C2410C', flexShrink: 0, mt: 0.4 }} />
                          <Box sx={{ minWidth: 0, flex: 1 }}>
                            <Typography sx={{ fontSize: 13, fontWeight: 600, color: '#163250' }}>{f.id}</Typography>
                            <Typography sx={{ fontSize: 12, color: 'text.secondary' }}>
                              {f.pondCountActual} bể · {f.pondsWithCoordinates} có toạ độ
                            </Typography>
                          </Box>
                        </ListItem>
                      ))}
                    </List>
                  </Box>
                )}
                <Box sx={{ mt: 1.5 }}>
                  {aquaCount > 0 ? (
                    <Box sx={{ display: 'flex', gap: 1, bgcolor: '#EFFBF5', border: '1px solid #CFEEE1', borderRadius: 2, p: 1.2 }}>
                      <ShieldCheck size={18} color="#1E9E76" style={{ flexShrink: 0, marginTop: 1 }} />
                      <Typography sx={{ fontSize: 13.5, color: '#1B6B53', lineHeight: 1.55 }}>
                        Có {aquaCount} đối tượng nuôi lươn xác minh từ OpenStreetMap trong đơn vị này.
                      </Typography>
                    </Box>
                  ) : (
                    <Box sx={{ display: 'flex', gap: 1, bgcolor: '#FFF8EF', border: '1px solid #F5E5C9', borderRadius: 2, p: 1.2 }}>
                      <MapPinOff size={18} color="#B8862F" style={{ flexShrink: 0, marginTop: 1 }} />
                      <Typography sx={{ fontSize: 13.5, color: '#8A6A2A', lineHeight: 1.55 }}>
                        Chưa có dữ liệu không gian xác minh về cơ sở nuôi trồng. Hệ thống không bịa hình học; lớp sẽ trống thay vì hiển thị dữ liệu giả.
                      </Typography>
                    </Box>
                  )}
                </Box>
              </>
            ) : (
              <>
                <Typography sx={{ fontSize: 17, fontWeight: 700, color: '#123243', mb: 0.3 }}>TP. Cần Thơ (mã 92)</Typography>
                <Typography sx={{ fontSize: 13.5, color: 'text.secondary', mb: 1.4 }}>{manifest?.administrativeDecision || 'Nghị quyết 1668/NQ-UBTVQH15'}</Typography>
                <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1 }}>
                  <Stat label="Xã / phường" value={manifest?.totals.communes ?? '—'} />
                  <Stat label="Phường" value={manifest?.totals.wards ?? '—'} />
                  <Stat label="Xã" value={manifest?.totals.communesOnly ?? '—'} />
                  <Stat label="Cơ sở nuôi (xác minh)" value={verifiedList.length} />
                  <Stat label="Cơ sở (phụ lục PDF)" value={facilityCount} />
                </Box>
                <Box sx={{ mt: 1.5, display: 'flex', gap: 1, bgcolor: '#F1F7FF', border: '1px solid #DAE8F8', borderRadius: 2, p: 1.2 }}>
                  <Waves size={18} color="#2F6FC0" style={{ flexShrink: 0, marginTop: 1 }} />
                  <Typography sx={{ fontSize: 13.5, color: '#2C5580', lineHeight: 1.55 }}>
                    Khu vực Thốt Nốt – Bình Thuỷ có dữ liệu nuôi trồng xác minh; các địa bàn ven biển như Vĩnh Châu, Sóc Trăng chưa có hình học bể nuôi trong nguồn mở.
                  </Typography>
                </Box>
              </>
            )}
          </Box>
        )}

        {tab === 1 && (
          <Box className="gis-panel-pad">
            {verified ? (
              (() => {
                const p: any = verified.feature.properties;
                const isAqua = verified.layerId === 'aquaculture';
                return (
                  <>
                    <Typography sx={{ fontSize: 12.5, fontWeight: 650, color: '#1F5CA9' }}>{isAqua ? 'CƠ SỞ NUÔI TRỒNG (OSM)' : 'VÙNG NƯỚC (OSM)'}</Typography>
                    <Typography sx={{ fontSize: 18, fontWeight: 700, color: '#123243', mb: 1 }}>{p.name || `OSM ${p.osmType} #${p.osmId}`}</Typography>
                    <List dense disablePadding>
                      {isAqua && <Field label="Loại nuôi" value={p.aquaculture || '—'} />}
                      {isAqua && <Field label="Sản phẩm" value={p.produce || '—'} />}
                      <Field label="Loại nước" value={p.water || '—'} />
                      <Field label="Đơn vị hành chính" value={p.communeName || 'Ngoài ranh giới xã/phường'} />
                      <Field label="Toạ độ tâm" value={`${p.centroid?.[0]?.toFixed(5)}, ${p.centroid?.[1]?.toFixed(5)}`} />
                      <Field label="Mã OSM" value={`${p.osmType}/${p.osmId}`} />
                      <Field label="Giấy phép" value={p.license} />
                    </List>
                    <Divider sx={{ my: 1.2 }} />
                    <Button variant="outlined" startIcon={<ExternalLink size={16} />} href={p.osmUrl} target="_blank" rel="noreferrer" fullWidth>
                      Mở trên OpenStreetMap
                    </Button>
                    <Typography sx={{ fontSize: 12.5, color: 'text.secondary', mt: 1.2, lineHeight: 1.5 }}>
                      Bản ghi thô do cộng đồng OSM vẽ, không diễn giải thành hồ sơ nuôi của dự án.
                    </Typography>
                  </>
                );
              })()
            ) : demo ? (
              <>
                <Typography sx={{ fontSize: 12.5, fontWeight: 650, color: '#1F5CA9' }}>Đối tượng hệ thống</Typography>
                <Typography sx={{ fontSize: 18, fontWeight: 700, color: '#123243', mb: 0.4 }}>{normalizeDisplayText(demo.properties.label)}</Typography>
                <Typography sx={{ fontSize: 13.5, color: 'text.secondary', mb: 1.2 }}>Mã nội bộ: {demo.properties.entityId}</Typography>
                <Box sx={{ display: 'flex', gap: 1, bgcolor: '#FFF8EF', border: '1px solid #F5E5C9', borderRadius: 2, p: 1.2 }}>
                  <Info size={18} color="#B8862F" style={{ flexShrink: 0, marginTop: 1 }} />
                  <Typography sx={{ fontSize: 13.5, color: '#8A6A2A', lineHeight: 1.55 }}>
                    Hình học minh hoạ phục vụ trình diễn, không phải vị trí thực của bể/vùng nuôi.
                  </Typography>
                </Box>
              </>
            ) : (
              <>
                <Typography sx={{ fontSize: 14, color: 'text.secondary', mb: 1.2, lineHeight: 1.55 }}>
                  Chọn một đối tượng trên bản đồ hoặc trong danh sách để xem chi tiết.
                </Typography>
                {verifiedList.length > 0 ? (
                  <List dense disablePadding>
                    {verifiedList.slice(0, 60).map((f) => (
                      <ListItem
                        key={String(f.id)}
                        disableGutters
                        sx={{ borderBottom: '1px solid #F1F5F9', cursor: 'pointer', py: 0.6 }}
                        onClick={() => onSelectVerified(f, 'aquaculture')}
                      >
                        <Box sx={{ width: 12, height: 12, borderRadius: '3px', bgcolor: '#E8873A', mr: 1.2, flexShrink: 0 }} />
                        <Typography sx={{ fontSize: 13.5, color: '#163250', minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {f.properties.name || `OSM #${f.properties.osmId}`} · {f.properties.communeName || '—'}
                        </Typography>
                      </ListItem>
                    ))}
                  </List>
                ) : (
                  <Box sx={{ display: 'flex', gap: 1, bgcolor: '#F6FAFD', border: '1px solid #EAF1F7', borderRadius: 2, p: 1.2 }}>
                    <Info size={18} color="#2F6FC0" style={{ flexShrink: 0, marginTop: 1 }} />
                    <Typography sx={{ fontSize: 13.5, color: '#2C5580', lineHeight: 1.55 }}>
                      Bật lớp “Cơ sở nuôi trồng” hoặc chọn một xã/phường có dữ liệu xác minh để xem danh sách.
                    </Typography>
                  </Box>
                )}
              </>
            )}
          </Box>
        )}

        {tab === 2 && (
          <Box className="gis-panel-pad">
            <Typography sx={{ fontSize: 14.5, fontWeight: 700, color: '#163250', mb: 0.4 }}>Nguồn dữ liệu & giấy phép</Typography>
            <Typography sx={{ fontSize: 12.5, color: 'text.secondary', mb: 1 }}>
              Sinh {manifest?.generatedAt.slice(0, 10) || '—'} · EPSG:4326 · {manifest?.coordinatePrecisionDecimals ?? 6} chữ số thập phân
            </Typography>
            {manifest &&
              Object.entries(manifest.layers).map(([path, meta]) => (
                <Accordion key={path} disableGutters elevation={0} sx={{ '&:before': { display: 'none' }, border: '1px solid #EEF3F7', borderRadius: 2, mb: 0.8 }}>
                  <AccordionSummary expandIcon={<ChevronDown size={17} />} sx={{ px: 1.2, minHeight: 44, '& .MuiAccordionSummary-content': { my: 0.5 } }}>
                    <Box sx={{ minWidth: 0 }}>
                      <Typography sx={{ fontSize: 13.5, fontWeight: 650, color: '#163250' }}>{path.split('/').pop()}</Typography>
                      <Typography sx={{ fontSize: 12, color: 'text.secondary' }}>{meta.description}</Typography>
                    </Box>
                  </AccordionSummary>
                  <AccordionDetails sx={{ px: 1.2, pt: 0 }}>
                    <Field label="Nhà cung cấp" value={meta.provider} />
                    <Field label="Giấy phép" value={meta.license} />
                    <Field label="Truy xuất" value={meta.retrievedAt} />
                    {meta.count != null && <Field label="Số đối tượng" value={meta.count} />}
                    {meta.upstream && (
                      <Typography sx={{ fontSize: 12, color: 'text.secondary', fontStyle: 'italic', mt: 0.6, lineHeight: 1.5 }}>
                        Tham chiếu: {meta.upstream}
                      </Typography>
                    )}
                    <Link href={meta.licenseUrl || meta.url} target="_blank" rel="noreferrer" sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.4, fontSize: 13, mt: 0.8 }}>
                      Mở nguồn <ExternalLink size={13} />
                    </Link>
                  </AccordionDetails>
                </Accordion>
              ))}
            <Box sx={{ display: 'flex', gap: 0.8, flexWrap: 'wrap', mt: 1 }}>
              <Chip size="small" color="success" variant="outlined" icon={<ShieldCheck size={13} />} label="Ranh giới: MIT" />
              <Chip size="small" color="primary" variant="outlined" label="Nuôi trồng/nước: ODbL" />
            </Box>
          </Box>
        )}
      </div>
    </div>
  );
}
