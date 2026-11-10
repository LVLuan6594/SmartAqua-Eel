import React, { useState } from 'react';
import { Autocomplete, Box, Button, Chip, Divider, IconButton, Paper, Popover, TextField, ToggleButton, ToggleButtonGroup, Tooltip, Typography } from '@mui/material';
import { Crosshair, Layers, Map as MapIcon, PanelRight, Satellite, Target } from 'lucide-react';
import type { CommuneProperties, GeoFeature, ImportedFacility } from '../types';
import type { LinkedZone } from '../services/aquacultureRepository';
import { normalizeText } from '../utils/text';

export interface GisToolbarProps {
  query: string;
  onQuery: (v: string) => void;
  communes: GeoFeature<CommuneProperties>[];
  onPickCommune: (f: GeoFeature<CommuneProperties>) => void;
  zones: LinkedZone[];
  onPickZone: (zone: LinkedZone) => void;
  facilities: ImportedFacility[];
  onPickFacility: (id: string) => void;
  priority: { code: string; label: string }[];
  onPickPriority: (code: string) => void;
  basemap: 'osm' | 'satellite';
  onBasemap: (b: 'osm' | 'satellite') => void;
  layersOpen: boolean;
  onOpenLayers: () => void;
  onCloseLayers: () => void;
  layerPanel: React.ReactNode;
  activeLayerCount: number;
  showLayersPopover: boolean;
  rightOpen: boolean;
  onToggleRight: () => void;
  onFitCity: () => void;
}

const fieldSx = { flex: '1 1 200px', minWidth: 168 } as const;

export default function GisToolbar({
  query,
  onQuery,
  communes,
  onPickCommune,
  zones,
  onPickZone,
  facilities,
  onPickFacility,
  priority,
  onPickPriority,
  basemap,
  onBasemap,
  layersOpen,
  onOpenLayers,
  onCloseLayers,
  layerPanel,
  activeLayerCount,
  showLayersPopover,
  rightOpen,
  onToggleRight,
  onFitCity,
}: GisToolbarProps) {
  const [prioInput, setPrioInput] = useState('');
  const [zoneInput, setZoneInput] = useState('');
  const [facilityInput, setFacilityInput] = useState('');
  const [layerAnchor, setLayerAnchor] = useState<HTMLElement | null>(null);

  return (
    <Paper
      elevation={0}
      sx={{
        display: 'flex',
        alignItems: 'center',
        gap: 0.75,
        flexWrap: 'wrap',
        p: 0.6,
        border: '1px solid #E4EAF3',
        borderRadius: 2.5,
      }}
    >
      <Autocomplete
        size="small"
        sx={{ ...fieldSx, flex: '1 1 240px', maxWidth: 380 }}
        options={communes}
        inputValue={query}
        onInputChange={(_e, v, reason) => {
          if (reason === 'input' || reason === 'clear') onQuery(v);
        }}
        onChange={(_e, v) => v && onPickCommune(v)}
        filterOptions={(options, state) => {
          const q = normalizeText(state.inputValue);
          if (q.length < 1) return options.slice(0, 40);
          return options.filter((o) => normalizeText(`${o.properties.fullName} ${o.properties.name} ${o.properties.code}`).includes(q)).slice(0, 40);
        }}
        getOptionLabel={(o) => o.properties.fullName}
        isOptionEqualToValue={(a, b) => a.properties.code === b.properties.code}
        noOptionsText="Không tìm thấy xã/phường"
        renderOption={(props, o) => (
          <Box component="li" {...props} key={o.properties.code} sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
            <span>{o.properties.fullName}</span>
            <Chip size="small" label={o.properties.code} sx={{ height: 20, fontSize: 12 }} />
          </Box>
        )}
        renderInput={(params) => <TextField {...params} placeholder="Tìm xã/phường hoặc mã đơn vị…" />}
      />

      <Autocomplete
        size="small"
        sx={{ ...fieldSx, maxWidth: 300 }}
        options={zones}
        value={null}
        inputValue={zoneInput}
        onInputChange={(_e, v, reason) => {
          if (reason === 'input' || reason === 'clear') setZoneInput(v);
        }}
        blurOnSelect
        onChange={(_e, v) => {
          if (v) {
            onPickZone(v);
            setZoneInput('');
          }
        }}
        filterOptions={(options, state) => {
          const q = normalizeText(state.inputValue);
          if (q.length < 1) return options.slice(0, 30);
          return options.filter((o) => normalizeText(`${o.name} ${o.code} ${o.aquacultureType}`).includes(q)).slice(0, 30);
        }}
        getOptionLabel={(o) => o.name}
        isOptionEqualToValue={(a, b) => a.zoneId === b.zoneId}
        noOptionsText="Không tìm thấy vùng nuôi"
        renderOption={(props, o) => (
          <Box component="li" {...props} key={o.zoneId} sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
            <span style={{ flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis' }}>{o.name}</span>
            <Chip
              size="small"
              label={o.dataStatus === 'verified' ? 'Thực' : o.dataStatus === 'partial' ? 'Một phần' : 'Mô phỏng'}
              sx={{ height: 20, fontSize: 11, bgcolor: o.dataStatus === 'verified' ? '#EFFBF5' : o.dataStatus === 'partial' ? '#FFF8EF' : '#FDEEEE' }}
            />
          </Box>
        )}
        renderInput={(params) => <TextField {...params} placeholder="Tìm vùng nuôi…" />}
      />

      <Autocomplete
        size="small"
        sx={{ ...fieldSx, maxWidth: 280 }}
        options={facilities}
        value={null}
        inputValue={facilityInput}
        onInputChange={(_e, v, reason) => {
          if (reason === 'input' || reason === 'clear') setFacilityInput(v);
        }}
        blurOnSelect
        onChange={(_e, v) => {
          if (v) {
            onPickFacility(v.id);
            setFacilityInput('');
          }
        }}
        filterOptions={(options, state) => {
          const q = normalizeText(state.inputValue);
          if (q.length < 1) return options.slice(0, 30);
          return options.filter((o) => normalizeText(`${o.id} ${o.communeName || ''}`).includes(q)).slice(0, 30);
        }}
        getOptionLabel={(o) => o.id}
        isOptionEqualToValue={(a, b) => a.id === b.id}
        noOptionsText="Không tìm thấy cơ sở"
        renderOption={(props, o) => (
          <Box component="li" {...props} key={o.id} sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
            <span style={{ flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis' }}>{o.id}</span>
            <Chip size="small" label={`${o.pondCountActual} ao`} sx={{ height: 20, fontSize: 11 }} />
            {o.communeName && <Chip size="small" variant="outlined" label={o.communeName} sx={{ height: 20, fontSize: 11 }} />}
          </Box>
        )}
        renderInput={(params) => <TextField {...params} placeholder="Tìm cơ sở / xã…" />}
      />

      <Autocomplete
        size="small"
        sx={{ width: 168 }}
        options={priority}
        getOptionLabel={(o) => o.label}
        value={null}
        inputValue={prioInput}
        onInputChange={(_e, v, reason) => {
          if (reason === 'input' || reason === 'clear') setPrioInput(v);
        }}
        blurOnSelect
        onChange={(_e, v) => {
          if (v) {
            onPickPriority(v.code);
            setPrioInput('');
          }
        }}
        renderInput={(params) => <TextField {...params} placeholder="Trọng tâm…" />}
      />

      <ToggleButtonGroup
        size="small"
        exclusive
        value={basemap}
        onChange={(_e, v: 'osm' | 'satellite' | null) => v && onBasemap(v)}
        aria-label="Chọn nền bản đồ"
        sx={{ '& .MuiToggleButton-root': { px: 1, py: 0.45, gap: 0.5, fontSize: 13.5 } }}
      >
        <ToggleButton value="osm" aria-label="Nền bản đồ đường phố"><MapIcon size={15} /> OSM</ToggleButton>
        <ToggleButton value="satellite" aria-label="Nền ảnh vệ tinh"><Satellite size={15} /> Vệ tinh</ToggleButton>
      </ToggleButtonGroup>

      <Divider orientation="vertical" flexItem sx={{ mx: 0.2, display: { xs: 'none', sm: 'block' } }} />

      <Button
        size="small"
        variant={layersOpen ? 'contained' : 'text'}
        disableElevation
        onClick={(e) => {
          setLayerAnchor(e.currentTarget);
          if (layersOpen) onCloseLayers();
          else onOpenLayers();
        }}
        startIcon={<Layers size={17} />}
        aria-haspopup={showLayersPopover ? 'dialog' : undefined}
        aria-expanded={showLayersPopover ? layersOpen : undefined}
        sx={{ textTransform: 'none', fontSize: 13.5, fontWeight: 650, px: 1.1, whiteSpace: 'nowrap' }}
      >
        Lớp bản đồ
        {activeLayerCount > 0 && (
          <Chip size="small" label={activeLayerCount} sx={{ height: 18, fontSize: 11, ml: 0.8, bgcolor: layersOpen ? 'rgba(255,255,255,.25)' : '#E8F1FB', color: layersOpen ? '#fff' : '#1F5CA9' }} />
        )}
      </Button>

      <Tooltip title="Bật/tắt bảng thông tin">
        <IconButton onClick={onToggleRight} color={rightOpen ? 'primary' : 'default'} aria-label="Bảng thông tin" aria-pressed={rightOpen}>
          <PanelRight size={20} />
        </IconButton>
      </Tooltip>
      <Tooltip title="Về toàn cảnh TP. Cần Thơ">
        <IconButton onClick={onFitCity} aria-label="Về toàn cảnh">
          <Crosshair size={20} />
        </IconButton>
      </Tooltip>

      <Box sx={{ display: { xs: 'none', lg: 'flex' }, alignItems: 'center', gap: 0.6, color: 'text.secondary', ml: 'auto', pr: 0.5 }}>
        <Target size={15} />
        <Typography sx={{ fontSize: 13 }}>Chọn xã/phường để xem hồ sơ và dữ liệu xác minh</Typography>
      </Box>

      {showLayersPopover && (
        <Popover
          open={layersOpen}
          anchorEl={layerAnchor}
          onClose={onCloseLayers}
          keepMounted
          anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
          transformOrigin={{ vertical: 'top', horizontal: 'right' }}
          slotProps={{ paper: { sx: { mt: 0.8, width: 296, borderRadius: 2.5, border: '1px solid #E4EAF3', boxShadow: '0 12px 32px rgba(15,50,80,.16)', overflow: 'hidden' } } }}
        >
          {layerPanel}
        </Popover>
      )}
    </Paper>
  );
}
