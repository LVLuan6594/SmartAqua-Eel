import React, { useState } from 'react';
import { Divider, IconButton, Paper, Tooltip } from '@mui/material';
import { ChevronDown, ChevronUp, House, Maximize2, Minimize2, Minus, Palette, Plus, Ruler, Trash2 } from 'lucide-react';
import type { Map as LeafletMap } from 'leaflet';

const LEGEND: { color: string; label: string }[] = [
  { color: '#1F5CA9', label: 'Ranh giới TP. Cần Thơ' },
  { color: '#00AFEF', label: 'Xã / phường' },
  { color: '#17858D', label: 'Điểm vùng nuôi / trang trại' },
  { color: '#27B4A5', label: 'Địa bàn có hồ sơ nuôi (zoom 11+)' },
  { color: '#8A98A5', label: 'Hình học bể mô phỏng (phóng gần)' },
  { color: '#F4AA39', label: 'Đang chọn' },
];

export interface MapOverlayControlsProps {
  map: LeafletMap | null;
  fullscreen: boolean;
  onToggleFullscreen: () => void;
  onFitCity: () => void;
  measureActive: boolean;
  pointCount: number;
  onToggleMeasure: () => void;
  onClearMeasure: () => void;
}

const btnSx = { width: 38, height: 38, borderRadius: 0 } as const;

export default function MapOverlayControls({
  map,
  fullscreen,
  onToggleFullscreen,
  onFitCity,
  measureActive,
  pointCount,
  onToggleMeasure,
  onClearMeasure,
}: MapOverlayControlsProps) {
  const [legendOpen, setLegendOpen] = useState(false);
  return (
    <>
      <div className="gis-floating tr">
        <Paper elevation={3} sx={{ display: 'flex', flexDirection: 'column', borderRadius: 2, overflow: 'hidden' }}>
          <Tooltip title="Phóng to" placement="left"><IconButton sx={btnSx} onClick={() => map?.zoomIn()} aria-label="Phóng to"><Plus size={18} /></IconButton></Tooltip>
          <Divider />
          <Tooltip title="Thu nhỏ" placement="left"><IconButton sx={btnSx} onClick={() => map?.zoomOut()} aria-label="Thu nhỏ"><Minus size={18} /></IconButton></Tooltip>
          <Divider />
          <Tooltip title="Toàn cảnh TP. Cần Thơ" placement="left"><IconButton sx={btnSx} onClick={onFitCity} aria-label="Toàn cảnh"><House size={18} /></IconButton></Tooltip>
          <Divider />
          <Tooltip title={fullscreen ? 'Thoát toàn màn hình' : 'Toàn màn hình'} placement="left"><IconButton sx={btnSx} onClick={onToggleFullscreen} aria-label="Toàn màn hình">{fullscreen ? <Minimize2 size={18} /> : <Maximize2 size={18} />}</IconButton></Tooltip>
          <Divider />
          <Tooltip title={measureActive ? 'Tắt công cụ đo' : 'Đo khoảng cách / diện tích'} placement="left"><IconButton sx={{ ...btnSx, color: measureActive ? '#D64545' : undefined }} onClick={onToggleMeasure} aria-label="Công cụ đo"><Ruler size={18} /></IconButton></Tooltip>
          {measureActive && pointCount > 0 && <><Divider /><Tooltip title="Xoá phép đo" placement="left"><IconButton sx={btnSx} onClick={onClearMeasure} aria-label="Xoá phép đo"><Trash2 size={18} /></IconButton></Tooltip></>}
        </Paper>
      </div>

      {measureActive && (
        <div className="gis-floating" style={{ top: 10, left: 10 }}>
          <Paper elevation={3} sx={{ px: 1.4, py: 0.9, borderRadius: 2, fontSize: 13, color: '#3d6472', maxWidth: 250 }}>
            Nhấp lên bản đồ để thêm điểm đo. Nhấn <b>Esc</b> để xoá.
          </Paper>
        </div>
      )}

      <div className="gis-floating bl">
        <div className={`gis-legend${legendOpen ? ' open' : ''}`}>
          <button type="button" className="head" onClick={() => setLegendOpen((v) => !v)} aria-expanded={legendOpen}>
            <Palette size={14} />
            <span>Chú giải</span>
            {legendOpen ? <ChevronDown size={15} /> : <ChevronUp size={15} />}
          </button>
          {legendOpen &&
            LEGEND.map((l) => (
              <div className="row" key={l.label}>
                <i style={{ background: l.color }} />
                <span>{l.label}</span>
              </div>
            ))}
        </div>
      </div>
    </>
  );
}
