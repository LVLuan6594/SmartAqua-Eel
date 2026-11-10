import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import L from 'leaflet';
import type { GeoJSON as LeafletGeoJSON, Map as LeafletMap } from 'leaflet';
import { CircleMarker, GeoJSON, MapContainer, Polygon, Polyline, TileLayer, Tooltip, useMap, useMapEvents } from 'react-leaflet';
import type {
  AquacultureZoneProperties,
  CommuneProperties,
  GeoFeature,
  FeatureCollection,
  LayerDataState,
  LayerId,
  PdfFacilityProperties,
  ToggleId,
  VerifiedAquacultureProperties,
  VerifiedFacilityProperties,
  VerifiedWaterProperties,
  ZoneDataStatus,
} from '../types';
import { boundsOf, centroidOf, haversineKm, polygonAreaKm2 } from '../services/spatial';
import type { LatLng } from '../services/spatial';
import { publishStatus } from '../services/statusBus';
import { normalizeDisplayText } from '../../../domain/normalizeDisplayData';
import MapOverlayControls from './MapOverlayControls';
import AreaPointLayer from './AreaPointLayer';
import CommuneAquacultureLayer from './CommuneAquacultureLayer';
import type {AreaPopupRequest} from './AreaPointLayer';
import type {AreaMapPoint,CommuneAquacultureProperties} from '../services/areaMapRepository';

const OSM_ATTR = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';
const ESRI_ATTR = 'Tiles &copy; Esri &mdash; Source: Esri, Maxar, Earthstar Geographics';

export interface FacilityPondPoint {
  id: string;
  lat: number;
  lng: number;
  name: string | null;
}

export interface MapCanvasProps {
  className?: string;
  enabled: Record<ToggleId, boolean>;
  layers: LayerDataState;
  basemap: 'osm' | 'satellite';
  selectedCommune: string | null;
  selectedVerifiedId: string | null;
  selectedZoneId: string | null;
  selectedDemoId: string | null;
  selectedFacilityId: string | null;
  facilityPonds: FacilityPondPoint[];
  areaPoints: AreaMapPoint[];
  areaPolygons: FeatureCollection<CommuneAquacultureProperties>;
  selectedAreaId: string | null;
  areaPopupRequest: AreaPopupRequest | null;
  onSelectArea: (point: AreaMapPoint) => void;
  onOpenCommuneDetails: (code:string) => void;
  onOpenAreaDetails: (point: AreaMapPoint) => void;
  onOpenAreaProfile: (point: AreaMapPoint) => void;
  focusBounds: { min: LatLng; max: LatLng } | null;
  focusNonce: number;
  measureActive: boolean;
  onToggleMeasure: () => void;
  onSelectCommune: (feature: GeoFeature<CommuneProperties>) => void;
  onSelectVerified: (feature: GeoFeature<VerifiedAquacultureProperties | VerifiedWaterProperties>, layerId: LayerId) => void;
  onSelectZone: (feature: GeoFeature<AquacultureZoneProperties>, dataStatus: ZoneDataStatus) => void;
  onSelectFacility: (feature: GeoFeature<PdfFacilityProperties>) => void;
  onSelectFacilityPond: (facilityId: string, pondId: string) => void;
  onSelectDemo: (feature: GeoFeature) => void;
}

function MapBridge({ onZoom, onMap }: { onZoom: (z: number) => void; onMap: (m: LeafletMap) => void }) {
  const map = useMap();
  useEffect(() => {
    onMap(map);
    onZoom(map.getZoom());
  }, [map, onMap, onZoom]);
  useMapEvents({
    zoomend: () => onZoom(map.getZoom()),
    moveend: () => {
      const c = map.getCenter();
      publishStatus({ center: [c.lat, c.lng] });
    },
    mousemove: (e) => publishStatus({ pointer: [e.latlng.lat, e.latlng.lng] }),
    mouseout: () => publishStatus({ pointer: null }),
  });
  return null;
}

function ResizeWatcher() {
  const map = useMap();
  useEffect(() => {
    const el = map.getContainer();
    const ro = new ResizeObserver(() => map.invalidateSize({ animate: false }));
    ro.observe(el);
    const t = window.setTimeout(() => map.invalidateSize({ animate: false }), 120);
    return () => {
      window.clearTimeout(t);
      ro.disconnect();
    };
  }, [map]);
  return null;
}

function FitBounds({ bounds, nonce }: { bounds: { min: LatLng; max: LatLng } | null; nonce: number }) {
  const map = useMap();
  const initialFit = useRef(true);
  useEffect(() => {
    if (bounds) {
      const options={padding:[34,34] as [number,number],maxZoom:14};
      if(initialFit.current)map.fitBounds([bounds.min,bounds.max] as any,options);
      else map.flyToBounds([bounds.min,bounds.max] as any,{...options,duration:.6});
      initialFit.current=false;
    }
  }, [bounds, nonce, map]);
  return null;
}

function MeasureHandler({ active, onAdd }: { active: boolean; onAdd: (p: LatLng) => void }) {
  useMapEvents({
    click(e) {
      if (!active) return;
      onAdd([e.latlng.lat, e.latlng.lng]);
    },
  });
  return null;
}

function GeoLayer<P>({
  data,
  style,
  onEach,
  pointToLayer,
  restyleKey,
  remountKey,
}: {
  data: { type: 'FeatureCollection'; features: GeoFeature<P>[] };
  style: (feature: GeoFeature<P>) => Record<string, unknown>;
  onEach?: (feature: GeoFeature<P>, layer: any) => void;
  pointToLayer?: (feature: GeoFeature<P>, latlng: any) => any;
  restyleKey?: unknown;
  remountKey?: string;
}) {
  const ref = useRef<LeafletGeoJSON | null>(null);
  useEffect(() => {
    const layer = ref.current;
    if (layer) layer.setStyle((feature: any) => style(feature as GeoFeature<P>) as any);
  }, [restyleKey, style]);
  return (
    <GeoJSON
      key={remountKey}
      ref={ref as any}
      data={data as any}
      style={(feature: any) => style(feature as GeoFeature<P>) as any}
      pointToLayer={pointToLayer ? (feature: any, latlng: any) => pointToLayer(feature as GeoFeature<P>, latlng) : undefined}
      onEachFeature={onEach ? (feature: any, layer: any) => onEach(feature as GeoFeature<P>, layer) : undefined}
    />
  );
}

const FACILITY_COLOR = '#C2410C';

function clusterCenter(points: { lat: number; lng: number }[]): LatLng {
  let lat = 0;
  let lng = 0;
  for (const p of points) {
    lat += p.lat;
    lng += p.lng;
  }
  return [lat / points.length, lng / points.length];
}

/**
 * Lớp điểm cơ sở (phụ lục PDF) với phân cụm lưới tự viết — không phụ thuộc thư viện ngoài.
 * Ở mức phóng thấp, các điểm gần nhau gộp thành cụm; nhấp cụm để phóng to.
 */
function FacilityClusterLayer({
  features,
  zoom,
  measureActive,
  selectedFacilityId,
  ponds,
  onSelect,
  onSelectPond,
}: {
  features: GeoFeature<PdfFacilityProperties>[];
  zoom: number;
  measureActive: boolean;
  selectedFacilityId: string | null;
  ponds: FacilityPondPoint[];
  onSelect: (feature: GeoFeature<PdfFacilityProperties>) => void;
  onSelectPond: (pondId: string) => void;
}) {
  const map = useMap();
  const clustering = zoom < 14;

  const groups = useMemo(() => {
    if (!clustering) return features.map((f) => ({ key: String(f.id), members: [f] }));
    const cell = 0.6 / Math.pow(2, zoom - 8);
    const grid = new Map<string, GeoFeature<PdfFacilityProperties>[]>();
    for (const f of features) {
      const coords = f.geometry.coordinates as [number, number];
      const key = `${Math.floor(coords[0] / cell)}:${Math.floor(coords[1] / cell)}`;
      const arr = grid.get(key);
      if (arr) arr.push(f);
      else grid.set(key, [f]);
    }
    return [...grid.entries()].map(([key, members]) => ({ key, members }));
  }, [features, zoom, clustering]);

  return (
    <>
      {groups.map(({ key, members }) => {
        if (members.length > 1) {
          const pts = members.map((m) => {
            const c = m.geometry.coordinates as [number, number];
            return { lat: c[1], lng: c[0] };
          });
          const center = clusterCenter(pts);
          return (
            <CircleMarker
              key={key}
              center={center}
              radius={9 + Math.min(14, Math.log2(members.length) * 3.2)}
              pathOptions={{ color: '#fff', weight: 2, fillColor: FACILITY_COLOR, fillOpacity: 0.86 }}
              eventHandlers={{ click: () => map.setView(center, Math.min(map.getZoom() + 2, 16)) }}
            >
              <Tooltip permanent direction="center" className="gis-cluster-count">
                {members.length}
              </Tooltip>
            </CircleMarker>
          );
        }
        const f = members[0];
        const c = f.geometry.coordinates as [number, number];
        const selected = String(f.id) === selectedFacilityId;
        return (
          <CircleMarker
            key={key}
            center={[c[1], c[0]]}
            radius={selected ? 8 : 6}
            pathOptions={{
              color: selected ? '#B45309' : '#7C2D12',
              weight: selected ? 3 : 1.5,
              fillColor: selected ? '#F4AA39' : FACILITY_COLOR,
              fillOpacity: 0.92,
            }}
            eventHandlers={{
              click: (e: any) => {
                if (measureActive) return;
                e.originalEvent?.stopPropagation?.();
                onSelect(f);
              },
            }}
          >
            <Tooltip sticky>
              {f.properties.facilityId}
              {f.properties.communeName ? ` · ${f.properties.communeName}` : ''} · {f.properties.pondCount} ao
            </Tooltip>
          </CircleMarker>
        );
      })}
      {ponds.map((p) => (
        <CircleMarker
          key={`facility-pond-${p.id}`}
          center={[p.lat, p.lng]}
          radius={4}
          pathOptions={{ color: '#0F766E', weight: 1.5, fillColor: '#14B8A6', fillOpacity: 0.92 }}
          eventHandlers={{
            click: (e: any) => {
              if (measureActive) return;
              e.originalEvent?.stopPropagation?.();
              onSelectPond(p.id);
            },
          }}
        >
          <Tooltip sticky>
            {p.name || p.id}
            {p.name ? ` · ${p.id}` : ''} · nhấp để xem chi tiết
          </Tooltip>
        </CircleMarker>
      ))}
    </>
  );
}

function MapCanvasImpl({
  className,
  enabled,
  layers,
  basemap,
  selectedCommune,
  selectedVerifiedId,
  selectedZoneId,
  selectedDemoId,
  selectedFacilityId,
  facilityPonds,
  areaPoints,
  areaPolygons,
  selectedAreaId,
  areaPopupRequest,
  onSelectArea,
  onOpenCommuneDetails,
  onOpenAreaDetails,
  onOpenAreaProfile,
  focusBounds,
  focusNonce,
  measureActive,
  onToggleMeasure,
  onSelectCommune,
  onSelectVerified,
  onSelectZone,
  onSelectFacility,
  onSelectFacilityPond,
  onSelectDemo,
}: MapCanvasProps) {
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<LeafletMap | null>(null);
  const measureRef = useRef(measureActive);
  measureRef.current = measureActive;

  const [map, setMap] = useState<LeafletMap | null>(null);
  const [zoom, setZoom] = useState(9);
  const [points, setPoints] = useState<LatLng[]>([]);
  const [fullscreen, setFullscreen] = useState(false);
  // Leaflet's GeoJSON data is immutable after mount; rebuild when demo geometry or labels change.
  const demoDataKey = useMemo(() => JSON.stringify(layers.demo), [layers.demo]);
  const showLabels = zoom >= 10 && enabled.communeLabels;

  const cityBounds = useMemo(() => {
    const first = layers.city?.features[0];
    if (!first) return null;
    const b = boundsOf(first.geometry);
    return { min: b[0], max: b[1] };
  }, [layers.city]);

  const measure = useMemo(() => {
    if (points.length < 2) return { distanceKm: null as number | null, areaKm2: null as number | null };
    let d = 0;
    for (let i = 1; i < points.length; i++) d += haversineKm(points[i - 1], points[i]);
    if (points.length >= 3) {
      const ring = [...points, points[0]].map((p) => [p[1], p[0]]);
      const area = polygonAreaKm2({ type: 'Polygon', coordinates: [ring] });
      return { distanceKm: d, areaKm2: area };
    }
    return { distanceKm: d, areaKm2: null };
  }, [points]);

  useEffect(() => {
    if (!measureActive) setPoints([]);
  }, [measureActive]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && measureRef.current) setPoints([]);
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, []);

  useEffect(() => {
    const onFs = () => {
      const active = document.fullscreenElement === wrapRef.current;
      setFullscreen(active);
      setTimeout(() => mapRef.current?.invalidateSize({ animate: false }), 120);
    };
    document.addEventListener('fullscreenchange', onFs);
    return () => document.removeEventListener('fullscreenchange', onFs);
  }, []);

  useEffect(() => {
    publishStatus({ zoom });
  }, [zoom]);

  useEffect(() => {
    publishStatus({ distanceKm: measure.distanceKm, areaKm2: measure.areaKm2, pointCount: points.length });
  }, [measure, points.length]);

  const toggleFullscreen = useCallback(() => {
    const el = wrapRef.current;
    if (!el) return;
    if (document.fullscreenElement === el) document.exitFullscreen();
    else el.requestFullscreen?.().catch(() => undefined);
  }, []);

  const fitCity = useCallback(() => {
    if (cityBounds) mapRef.current?.flyToBounds([cityBounds.min, cityBounds.max] as any, { padding: [34, 34] });
  }, [cityBounds]);

  const commuteStyle = (f: GeoFeature<CommuneProperties>) => {
    const selected = f.properties.code === selectedCommune;
    return {
      color: selected ? '#F4AA39' : '#00AFEF',
      weight: selected ? 3.5 : 1,
      fillColor: selected ? '#F4AA39' : '#00AFEF',
      fillOpacity: selected ? 0.28 : 0.05,
      dashArray: selected ? undefined : '4 3',
    };
  };

  const aquaStyle = (f: GeoFeature<VerifiedAquacultureProperties>) => {
    const selected = String(f.id) === selectedVerifiedId;
    return { color: selected ? '#B45309' : '#C2662A', weight: selected ? 3 : 1, fillColor: '#E8873A', fillOpacity: 0.6 };
  };

  const waterStyle = () => ({ color: '#2F80C9', weight: 0.6, fillColor: '#2F80C9', fillOpacity: 0.4 });

  const zoneStyle = (f: GeoFeature<AquacultureZoneProperties>) => {
    const selected = f.properties.zoneId === selectedZoneId;
    const base = '#0E8F7E';
    return {
      color: selected ? '#B45309' : base,
      weight: selected ? 4 : 2,
      fillColor: base,
      fillOpacity: selected ? 0.24 : 0.06,
      dashArray: '5 4',
    };
  };

  const facilityStyle = () => ({ color: '#7C4DD1', weight: 1.6, fillColor: '#9C6ADE', fillOpacity: 0.85 });

  const demoStyle = (f: GeoFeature) => {
    const t = f.properties.entityType;
    const selected = String(f.properties.entityId) === selectedDemoId;
    if (t === 'pond') return { color: selected ? '#B45309' : '#6B7A88', weight: selected ? 3 : 1, fillColor: selected ? '#F4AA39' : '#8A98A5', fillOpacity: selected ? 0.65 : 0.5, dashArray: '2 2' };
    if (t === 'area') return { color: selected ? '#B45309' : '#5B6B7A', weight: selected ? 4 : 2, fillColor: selected ? '#F4AA39' : '#8A98A5', fillOpacity: selected ? 0.34 : 0.15, dashArray: '5 4' };
    return { color: '#5B6B7A', weight: 1, fillColor: '#8A98A5', fillOpacity: 0.9 };
  };

  return (
    <div ref={wrapRef} className={className ?? 'gis-map'}>
      <MapContainer
        center={[9.9, 105.76]}
        zoom={9}
        minZoom={8}
        maxZoom={18}
        zoomControl={false}
        scrollWheelZoom
        preferCanvas
        style={{ width: '100%', height: '100%' }}
      >
        {basemap === 'osm' ? (
          <TileLayer attribution={OSM_ATTR} url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
        ) : (
          <TileLayer attribution={ESRI_ATTR} url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}" maxZoom={18} />
        )}
        <MapBridge onZoom={setZoom} onMap={(m) => { mapRef.current = m; setMap(m); }} />
        <ResizeWatcher />
        <FitBounds bounds={focusBounds ?? (selectedAreaId ? null : cityBounds)} nonce={focusNonce} />
        <MeasureHandler active={measureActive} onAdd={(p) => setPoints((prev) => [...prev, p])} />

        {enabled.city && layers.city && (
          <GeoLayer<Record<string, any>>
            data={layers.city}
            restyleKey="city"
            remountKey="city"
            style={() => ({ color: '#1F5CA9', weight: 3, fill: false, opacity: 0.9 })}
            onEach={(f, layer) => layer.bindTooltip(`TP. Cần Thơ · ${f.properties.fullName || ''}`, { sticky: true })}
          />
        )}

        {enabled.communes && layers.communes && (
          <GeoLayer<CommuneProperties>
            data={layers.communes}
            restyleKey={selectedCommune}
            remountKey={`communes-${showLabels}`}
            style={commuteStyle}
            onEach={(f, layer) => {
              layer.bindTooltip(f.properties.fullName, { permanent: showLabels, direction: 'center', className: 'commune-label' });
              layer.on('click', (e: any) => {
                if (measureRef.current) return;
                e.originalEvent?.stopPropagation?.();
                onSelectCommune(f);
              });
            }}
          />
        )}

        {enabled.zones && layers.zones && (
          <GeoLayer<AquacultureZoneProperties>
            data={layers.zones}
            restyleKey={selectedZoneId}
            remountKey="zones"
            style={zoneStyle}
            onEach={(f, layer) => {
              layer.bindTooltip(`${f.properties.name} · ~${f.properties.totalAreaHa ?? '—'} ha`, { sticky: true });
              layer.on('click', (e: any) => {
                if (measureRef.current) return;
                e.originalEvent?.stopPropagation?.();
                onSelectZone(f, 'verified');
              });
            }}
          />
        )}

        {enabled.mockZones && layers.mockZones && (
          <GeoLayer<AquacultureZoneProperties>
            data={layers.mockZones}
            restyleKey={selectedZoneId}
            remountKey="mock-zones"
            style={zoneStyle}
            onEach={(f, layer) => {
              layer.bindTooltip(`${f.properties.name} · Dữ liệu mô phỏng`, { sticky: true });
              layer.on('click', (e: any) => {
                if (measureRef.current) return;
                e.originalEvent?.stopPropagation?.();
                onSelectZone(f, 'mock');
              });
            }}
          />
        )}

        {enabled.water && layers.water && (
          <GeoLayer<VerifiedWaterProperties>
            data={layers.water}
            restyleKey="water"
            remountKey="water"
            style={waterStyle}
            onEach={(f, layer) => {
              layer.bindTooltip(f.properties.name || 'Vùng nước (OSM)', { sticky: true });
              layer.on('click', () => {
                if (!measureRef.current) onSelectVerified(f, 'water');
              });
            }}
          />
        )}

        {enabled.aquaculture && layers.aquaculture && (
          <GeoLayer<VerifiedAquacultureProperties>
            data={layers.aquaculture}
            restyleKey={selectedVerifiedId}
            remountKey="aquaculture"
            style={aquaStyle}
            onEach={(f, layer) => {
              layer.bindTooltip(f.properties.name || `Cơ sở nuôi · OSM #${f.properties.osmId}`, { sticky: true });
              layer.on('click', () => {
                if (!measureRef.current) onSelectVerified(f, 'aquaculture');
              });
            }}
          />
        )}

        {enabled.facilities && layers.facilities && layers.facilities.features.length > 0 && (
          <GeoLayer<VerifiedFacilityProperties>
            data={layers.facilities}
            restyleKey="facilities"
            remountKey="facilities"
            style={facilityStyle}
            pointToLayer={(_f, latlng) => L.circleMarker(latlng, { radius: 6, color: '#7C4DD1', fillColor: '#9C6ADE', fillOpacity: 0.9 })}
            onEach={(f, layer) => layer.bindTooltip(`${f.properties.name} (${f.properties.facilityType})`, { sticky: true })}
          />
        )}

        {enabled.facilitiesPdf && layers.facilitiesPdf && (
          <FacilityClusterLayer
            features={layers.facilitiesPdf.features}
            zoom={zoom}
            measureActive={measureActive}
            selectedFacilityId={selectedFacilityId}
            ponds={facilityPonds}
            onSelect={onSelectFacility}
            onSelectPond={(pondId) => {
              if (selectedFacilityId) onSelectFacilityPond(selectedFacilityId, pondId);
            }}
          />
        )}

        {enabled.demo && layers.demo && zoom >= 14 && (
          <GeoLayer<Record<string, any>>
            data={layers.demo}
            restyleKey={selectedDemoId}
            remountKey={demoDataKey}
            style={demoStyle}
            pointToLayer={(_f, latlng) => L.circleMarker(latlng, { radius: 6, color: '#465d98', fillColor: '#6284c6', fillOpacity: 0.9 })}
            onEach={(f, layer) => {
              layer.bindTooltip(`${normalizeDisplayText(f.properties.label)} · Dữ liệu mô phỏng`, { sticky: true });
              layer.on('click', () => {
                if (!measureRef.current) onSelectDemo(f);
              });
            }}
          />
        )}

        {zoom>=11&&<CommuneAquacultureLayer data={areaPolygons} selectedCode={selectedCommune} measureActive={measureActive} onDetails={onOpenCommuneDetails}/>}
        <AreaPointLayer points={areaPoints} selectedId={selectedAreaId} request={areaPopupRequest} measureActive={measureActive} onSelect={onSelectArea} onDetails={onOpenAreaDetails} onProfile={onOpenAreaProfile}/>

        {measureActive && points.length > 1 && (
          <Polyline positions={points} pathOptions={{ color: '#D64545', weight: 2, dashArray: '6 4' }} />
        )}
        {measureActive && points.length >= 3 && (
          <Polygon positions={points} pathOptions={{ color: '#D64545', weight: 1, fillColor: '#D64545', fillOpacity: 0.14 }} />
        )}
        {measureActive &&
          points.map((p, i) => (
            <CircleMarker key={i} center={p} radius={4} pathOptions={{ color: '#D64545', weight: 2, fillColor: '#FFFFFF', fillOpacity: 1 }} />
          ))}
      </MapContainer>

      <MapOverlayControls
        map={map}
        fullscreen={fullscreen}
        onToggleFullscreen={toggleFullscreen}
        onFitCity={fitCity}
        measureActive={measureActive}
        pointCount={points.length}
        onToggleMeasure={onToggleMeasure}
        onClearMeasure={() => setPoints([])}
      />
    </div>
  );
}

export function communeCentroid(feature: GeoFeature<CommuneProperties>) {
  return centroidOf(feature.geometry);
}

const MapCanvas = React.memo(MapCanvasImpl);
export default MapCanvas;
