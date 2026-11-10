import React from 'react';
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Box,
  Chip,
  List,
  ListItem,
  Switch,
  Typography,
} from '@mui/material';
import { ChevronDown, Layers3 } from 'lucide-react';
import type { LayerDataState, LayerGroupId, ToggleId } from '../types';
import { LAYER_DEFINITIONS, LAYER_GROUPS } from '../services/gisDataService';

export interface LayerPanelProps {
  enabled: Record<ToggleId, boolean>;
  onToggle: (id: ToggleId) => void;
  layers: LayerDataState;
  loading: ToggleId[];
  errors: Partial<Record<ToggleId, string>>;
  communeCount: number;
  variant?: 'panel' | 'popover';
}

const DEFAULT_EXPANDED: LayerGroupId[] = ['boundary', 'zones', 'aquaculture'];

function CountBadge({
  id,
  loading,
  errors,
  count,
}: {
  id: ToggleId;
  loading: ToggleId[];
  errors: Partial<Record<ToggleId, string>>;
  count: number | null;
}) {
  if (errors[id]) return <Chip size="small" color="error" variant="outlined" label="Lỗi" sx={{ height: 20, fontSize: 11.5 }} />;
  if (loading.includes(id)) return <Typography sx={{ fontSize: 12, color: 'text.secondary' }}>…</Typography>;
  if (count == null) return null;
  return (
    <Typography sx={{ fontSize: 12, color: 'text.secondary', fontVariantNumeric: 'tabular-nums' }}>
      {count.toLocaleString('vi-VN')}
    </Typography>
  );
}

function LayerRow({
  accent,
  label,
  checked,
  onToggle,
  count,
  loading,
  errors,
  id,
  muted,
}: {
  accent: string;
  label: string;
  checked: boolean;
  onToggle: () => void;
  count: number | null;
  loading: ToggleId[];
  errors: Partial<Record<ToggleId, string>>;
  id: ToggleId;
  muted?: boolean;
}) {
  return (
    <ListItem disablePadding>
      <Box
        onClick={onToggle}
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 1.1,
          width: '100%',
          px: 0.6,
          py: 0.35,
          borderRadius: 1.5,
          cursor: 'pointer',
          '&:hover': { bgcolor: '#F5FAFF' },
        }}
      >
        <Box sx={{ width: 13, height: 13, borderRadius: '4px', bgcolor: accent, flexShrink: 0, opacity: checked ? 1 : 0.45 }} />
        <Typography sx={{ flex: 1, minWidth: 0, fontSize: 13.5, fontWeight: checked ? 650 : 500, color: checked ? '#163250' : '#5A6B7E', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {label}
        </Typography>
        <CountBadge id={id} loading={loading} errors={errors} count={count} />
        <Switch size="small" checked={checked} onChange={onToggle} onClick={(e) => e.stopPropagation()} inputProps={{ 'aria-label': label }} sx={{ ml: 0.3 }} />
      </Box>
    </ListItem>
  );
}

export default function LayerPanel({ enabled, onToggle, layers, loading, errors, communeCount, variant = 'panel' }: LayerPanelProps) {
  return (
    <div className={variant === 'panel' ? 'gis-panel' : 'gis-layer-popover'}>
      {variant === 'panel' && (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, px: 1.4, py: 1.1, borderBottom: '1px solid #EEF3F7' }}>
          <Layers3 size={18} color="#1F5CA9" />
          <Typography sx={{ fontSize: 16, fontWeight: 700, color: '#163250' }}>Lớp dữ liệu</Typography>
        </Box>
      )}
      <div className="gis-panel-scroll">
        {LAYER_GROUPS.map((group) => {
          const defs = LAYER_DEFINITIONS.filter((d) => d.group === group.id);
          const activeCount = defs.filter((d) => enabled[d.id]).length;
          return (
            <Accordion
              key={group.id}
              defaultExpanded={DEFAULT_EXPANDED.includes(group.id)}
              disableGutters
              elevation={0}
              square
              sx={{ '&:before': { display: 'none' }, borderBottom: '1px solid #F1F5F9', bgcolor: 'transparent' }}
            >
              <AccordionSummary
                expandIcon={<ChevronDown size={17} />}
                sx={{ px: 1.2, minHeight: 42, '& .MuiAccordionSummary-content': { my: 0.4, alignItems: 'center' } }}
              >
                <Typography sx={{ flex: 1, minWidth: 0, fontSize: 13.5, fontWeight: 700, color: '#163250' }}>{group.label}</Typography>
                <Typography sx={{ fontSize: 12, color: activeCount ? '#1F5CA9' : 'text.secondary', fontWeight: 650, mr: 0.5 }}>
                  {activeCount}/{defs.length}
                </Typography>
              </AccordionSummary>
              <AccordionDetails sx={{ px: 0.8, pt: 0, pb: 0.8 }}>
                <List disablePadding dense>
                  {defs.map((def) => {
                    const fc = layers[def.id as keyof LayerDataState];
                    const count = fc ? fc.features.length : null;
                    return (
                      <LayerRow
                        key={`${group.id}-${def.id}`}
                        id={def.id}
                        accent={def.accent}
                        label={def.label}
                        checked={enabled[def.id]}
                        onToggle={() => onToggle(def.id)}
                        count={count}
                        loading={loading}
                        errors={errors}
                      />
                    );
                  })}
                  {group.id === 'boundary' && (
                    <LayerRow
                      id="communeLabels"
                      accent="#7A8FA6"
                      label="Tên xã/phường"
                      checked={enabled.communeLabels}
                      onToggle={() => onToggle('communeLabels')}
                      count={communeCount}
                      loading={loading}
                      errors={errors}
                    />
                  )}
                </List>
              </AccordionDetails>
            </Accordion>
          );
        })}
      </div>
    </div>
  );
}
