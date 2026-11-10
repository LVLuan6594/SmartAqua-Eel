import React, { useEffect, useState } from 'react';
import { Box, Divider, Typography } from '@mui/material';
import { Compass, Layers3, Ruler } from 'lucide-react';
import type { MapStatus } from '../types';
import { getStatus, subscribeStatus } from '../services/statusBus';

export interface GisStatusBarProps {
  loading: boolean;
  counts: { communes: number; zones?: number; aquaculture: number; facilitiesPdf?: number; water: number };
  basemap: 'osm' | 'satellite';
}

const fmt = (n: number, dec = 2) => n.toLocaleString('vi-VN', { maximumFractionDigits: dec, minimumFractionDigits: dec });

export default function GisStatusBar({ loading, counts, basemap }: GisStatusBarProps) {
  const [status, setStatus] = useState<MapStatus>(getStatus());

  useEffect(() => subscribeStatus(setStatus), []);

  return (
    <Box className="gis-statusbar" role="status" aria-live="polite">
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.6 }}>
        <Compass size={15} color="#1F5CA9" />
        <Typography sx={{ fontSize: 13, color: '#3d6472' }}>
          {status?.pointer ? `${status.pointer[0].toFixed(5)}, ${status.pointer[1].toFixed(5)}` : 'Di chuyển chuột trên bản đồ để xem toạ độ'}
        </Typography>
      </Box>

      <Typography sx={{ fontSize: 13, color: '#3d6472' }}>
        Mức phóng: <b>{status?.zoom ?? '—'}</b>
      </Typography>

      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
        <Layers3 size={15} color="#1F5CA9" />
        <Typography sx={{ fontSize: 13, color: '#3d6472' }}>
          Xã/phường <b>{counts.communes || '—'}</b> · Vùng nuôi <b>{counts.zones || 0}</b> · Bể <b>{counts.aquaculture || 0}</b> · Cơ sở (phụ lục) <b>{counts.facilitiesPdf || 0}</b> · Vùng nước <b>{counts.water || 0}</b>
          {loading && ' · đang tải…'}
        </Typography>
      </Box>

      {status && status.pointCount >= 2 && (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, color: '#B23B3B' }}>
          <Ruler size={15} />
          <Typography sx={{ fontSize: 13, color: '#B23B3B' }}>
            Dài <b>{fmt(status.distanceKm ?? 0)}</b> km
            {status.areaKm2 != null ? <> · Diện tích <b>{fmt(status.areaKm2)}</b> km²</> : null}
            {' '}({status.pointCount} điểm)
          </Typography>
        </Box>
      )}

      <Box className="spacer" />

      <Typography sx={{ fontSize: 12.5, color: 'text.secondary' }}>
        Nền: {basemap === 'osm' ? 'OpenStreetMap' : 'Esri World Imagery'}
      </Typography>
      <Divider orientation="vertical" flexItem sx={{ display: { xs: 'none', sm: 'block' } }} />
      <Typography sx={{ fontSize: 12.5, color: 'text.secondary' }}>
        Ranh giới: ThangLeQuoc (MIT) · Nuôi trồng/nước: © OpenStreetMap (ODbL) · © 2026 SmartAqua · Dữ liệu hệ thống
      </Typography>
    </Box>
  );
}
