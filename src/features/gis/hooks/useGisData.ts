import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { GisManifest, LayerDataState, LayerId } from '../types';
import { LAYER_DEFINITIONS, loadGeoJSON, loadManifest } from '../services/gisDataService';

export type { LayerDataState };

export interface UseGisDataResult {
  manifest: GisManifest | null;
  manifestError: string | null;
  manifestLoading: boolean;
  layers: LayerDataState;
  loading: LayerId[];
  errors: Partial<Record<LayerId, string>>;
  reload: () => void;
}

const DEFAULT_ENABLED: Record<LayerId, boolean> = LAYER_DEFINITIONS.reduce(
  (acc, def) => ({ ...acc, [def.id]: def.defaultOn }),
  {} as Record<LayerId, boolean>,
);

export function defaultLayerState(): Record<LayerId, boolean> {
  return { ...DEFAULT_ENABLED };
}

export function useGisData(enabled: Record<LayerId, boolean>): UseGisDataResult {
  const [manifest, setManifest] = useState<GisManifest | null>(null);
  const [manifestError, setManifestError] = useState<string | null>(null);
  const [manifestLoading, setManifestLoading] = useState(true);
  const [layers, setLayers] = useState<LayerDataState>({});
  const [loading, setLoading] = useState<LayerId[]>([]);
  const [errors, setErrors] = useState<Partial<Record<LayerId, string>>>({});
  const requested = useRef<Set<LayerId>>(new Set());

  const fetchManifest = useCallback(() => {
    setManifestLoading(true);
    setManifestError(null);
    loadManifest()
      .then((m) => setManifest(m))
      .catch((e) => setManifestError(e instanceof Error ? e.message : 'Lỗi tải manifest'))
      .finally(() => setManifestLoading(false));
  }, []);

  useEffect(() => {
    fetchManifest();
  }, [fetchManifest]);

  useEffect(() => {
    for (const def of LAYER_DEFINITIONS) {
      if (!enabled[def.id] || requested.current.has(def.id)) continue;
      requested.current.add(def.id);
      setLoading((prev) => (prev.includes(def.id) ? prev : [...prev, def.id]));
      loadGeoJSON(def.path)
        .then((fc) => setLayers((prev) => ({ ...prev, [def.id]: fc } as LayerDataState)))
        .catch((e) =>
          setErrors((prev) => ({ ...prev, [def.id]: e instanceof Error ? e.message : 'Lỗi tải lớp dữ liệu' })),
        )
        .finally(() => setLoading((prev) => prev.filter((id) => id !== def.id)));
    }
  }, [enabled]);

  const reload = useCallback(() => {
    requested.current.clear();
    setLayers({});
    setErrors({});
    setLoading([]);
    fetchManifest();
  }, [fetchManifest]);

  return useMemo(
    () => ({ manifest, manifestError, manifestLoading, layers, loading, errors, reload }),
    [manifest, manifestError, manifestLoading, layers, loading, errors, reload],
  );
}
