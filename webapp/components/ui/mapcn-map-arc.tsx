"use client";

import MapLibreGL, { type PopupOptions, type MarkerOptions } from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import {
  createContext,
  forwardRef,
  useCallback,
  useContext,
  useEffect,
  useId,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";
import { X, Minus, Plus, Locate, Maximize, Loader2 } from "lucide-react";

function cn(...inputs: Array<string | false | null | undefined>) {
  return inputs.filter(Boolean).join(" ");
}

const defaultStyles = {
  dark: "https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json",
  light: "https://basemaps.cartocdn.com/gl/positron-gl-style/style.json",
};

type Theme = "light" | "dark";

function getDocumentTheme(): Theme | null {
  if (typeof document === "undefined") return null;
  if (document.documentElement.classList.contains("dark")) return "dark";
  if (document.documentElement.classList.contains("light")) return "light";
  return null;
}

function getSystemTheme(): Theme {
  if (typeof window === "undefined") return "light";
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

function useResolvedTheme(themeProp?: "light" | "dark"): Theme {
  const [detectedTheme, setDetectedTheme] = useState<Theme>(
    () => getDocumentTheme() ?? getSystemTheme(),
  );

  useEffect(() => {
    if (themeProp) return;
    const observer = new MutationObserver(() => {
      const docTheme = getDocumentTheme();
      if (docTheme) setDetectedTheme(docTheme);
    });
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    const handleSystemChange = (e: MediaQueryListEvent) => {
      if (!getDocumentTheme()) setDetectedTheme(e.matches ? "dark" : "light");
    };
    mediaQuery.addEventListener("change", handleSystemChange);
    return () => {
      observer.disconnect();
      mediaQuery.removeEventListener("change", handleSystemChange);
    };
  }, [themeProp]);

  return themeProp ?? detectedTheme;
}

type MapContextValue = {
  map: MapLibreGL.Map | null;
  isLoaded: boolean;
};

const MapContext = createContext<MapContextValue | null>(null);

function useMap() {
  const context = useContext(MapContext);
  if (!context) throw new Error("useMap must be used within a Map component");
  return context;
}

type MapViewport = {
  center: [number, number];
  zoom: number;
  bearing: number;
  pitch: number;
};

type MapStyleOption = string | MapLibreGL.StyleSpecification;
type MapRef = MapLibreGL.Map;

type MapProps = {
  children?: ReactNode;
  className?: string;
  theme?: Theme;
  styles?: { light?: MapStyleOption; dark?: MapStyleOption };
  projection?: MapLibreGL.ProjectionSpecification;
  viewport?: Partial<MapViewport>;
  onViewportChange?: (viewport: MapViewport) => void;
  loading?: boolean;
} & Omit<MapLibreGL.MapOptions, "container" | "style">;

function DefaultLoader() {
  return (
    <div className="absolute inset-0 z-10 flex items-center justify-center" style={{ background: "rgba(4,8,16,0.5)", backdropFilter: "blur(4px)" }}>
      <div className="flex gap-1.5">
        {[0, 150, 300].map((delay) => (
          <span key={delay} className="h-2 w-2 rounded-full bg-sky-400/60 animate-pulse" style={{ animationDelay: `${delay}ms` }} />
        ))}
      </div>
    </div>
  );
}

function getViewport(map: MapLibreGL.Map): MapViewport {
  const center = map.getCenter();
  return { center: [center.lng, center.lat], zoom: map.getZoom(), bearing: map.getBearing(), pitch: map.getPitch() };
}

const Map = forwardRef<MapRef, MapProps>(function Map(
  { children, className, theme: themeProp, styles, projection, viewport, onViewportChange, loading = false, ...props },
  ref,
) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [mapInstance, setMapInstance] = useState<MapLibreGL.Map | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [isStyleLoaded, setIsStyleLoaded] = useState(false);
  const currentStyleRef = useRef<MapStyleOption | null>(null);
  const styleTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const internalUpdateRef = useRef(false);
  const resolvedTheme = useResolvedTheme(themeProp);
  const isControlled = viewport !== undefined && onViewportChange !== undefined;
  const onViewportChangeRef = useRef(onViewportChange);
  onViewportChangeRef.current = onViewportChange;

  const mapStyles = useMemo(() => ({
    dark: styles?.dark ?? defaultStyles.dark,
    light: styles?.light ?? defaultStyles.light,
  }), [styles]);

  useImperativeHandle(ref, () => mapInstance as MapLibreGL.Map, [mapInstance]);

  const clearStyleTimeout = useCallback(() => {
    if (styleTimeoutRef.current) { clearTimeout(styleTimeoutRef.current); styleTimeoutRef.current = null; }
  }, []);

  useEffect(() => {
    if (!containerRef.current) return;
    const initialStyle = resolvedTheme === "dark" ? mapStyles.dark : mapStyles.light;
    currentStyleRef.current = initialStyle;

    const map = new MapLibreGL.Map({
      container: containerRef.current,
      style: initialStyle,
      renderWorldCopies: false,
      attributionControl: false,
      ...props,
      ...viewport,
    });

    const styleDataHandler = () => {
      clearStyleTimeout();
      styleTimeoutRef.current = setTimeout(() => {
        setIsStyleLoaded(true);
        if (projection) map.setProjection(projection);
      }, 100);
    };
    const loadHandler = () => setIsLoaded(true);
    const handleMove = () => { if (!internalUpdateRef.current) onViewportChangeRef.current?.(getViewport(map)); };

    map.on("load", loadHandler);
    map.on("styledata", styleDataHandler);
    map.on("move", handleMove);
    setMapInstance(map);

    return () => {
      clearStyleTimeout();
      map.off("load", loadHandler);
      map.off("styledata", styleDataHandler);
      map.off("move", handleMove);
      map.remove();
      setIsLoaded(false);
      setIsStyleLoaded(false);
      setMapInstance(null);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!mapInstance || !isControlled || !viewport) return;
    if (mapInstance.isMoving()) return;
    const current = getViewport(mapInstance);
    const next = {
      center: viewport.center ?? current.center,
      zoom: viewport.zoom ?? current.zoom,
      bearing: viewport.bearing ?? current.bearing,
      pitch: viewport.pitch ?? current.pitch,
    };
    if (next.center[0] === current.center[0] && next.center[1] === current.center[1] && next.zoom === current.zoom && next.bearing === current.bearing && next.pitch === current.pitch) return;
    internalUpdateRef.current = true;
    mapInstance.jumpTo(next);
    internalUpdateRef.current = false;
  }, [mapInstance, isControlled, viewport]);

  useEffect(() => {
    if (!mapInstance || !resolvedTheme) return;
    const newStyle = resolvedTheme === "dark" ? mapStyles.dark : mapStyles.light;
    if (currentStyleRef.current === newStyle) return;
    clearStyleTimeout();
    currentStyleRef.current = newStyle;
    setIsStyleLoaded(false);
    mapInstance.setStyle(newStyle, { diff: true });
  }, [mapInstance, resolvedTheme, mapStyles, clearStyleTimeout]);

  const contextValue = useMemo(() => ({ map: mapInstance, isLoaded: isLoaded && isStyleLoaded }), [mapInstance, isLoaded, isStyleLoaded]);

  return (
    <MapContext.Provider value={contextValue}>
      <div ref={containerRef} className={cn("relative h-full w-full", className)}>
        {(!isLoaded || loading) && <DefaultLoader />}
        {mapInstance && children}
      </div>
    </MapContext.Provider>
  );
});

// ── MapMarker ──────────────────────────────────────────────────────────────────

type MarkerContextValue = { marker: MapLibreGL.Marker; map: MapLibreGL.Map | null };
const MarkerContext = createContext<MarkerContextValue | null>(null);
function useMarkerContext() {
  const context = useContext(MarkerContext);
  if (!context) throw new Error("Marker components must be used within MapMarker");
  return context;
}

type MapMarkerProps = {
  longitude: number;
  latitude: number;
  children: ReactNode;
  onClick?: (e: MouseEvent) => void;
  onMouseEnter?: (e: MouseEvent) => void;
  onMouseLeave?: (e: MouseEvent) => void;
  onDragStart?: (lngLat: { lng: number; lat: number }) => void;
  onDrag?: (lngLat: { lng: number; lat: number }) => void;
  onDragEnd?: (lngLat: { lng: number; lat: number }) => void;
} & Omit<MarkerOptions, "element">;

function MapMarker({
  longitude, latitude, children, onClick, onMouseEnter, onMouseLeave,
  onDragStart, onDrag, onDragEnd, draggable = false, ...markerOptions
}: MapMarkerProps) {
  const { map } = useMap();
  const callbacksRef = useRef({ onClick, onMouseEnter, onMouseLeave, onDragStart, onDrag, onDragEnd });
  callbacksRef.current = { onClick, onMouseEnter, onMouseLeave, onDragStart, onDrag, onDragEnd };

  const marker = useMemo(() => {
    const m = new MapLibreGL.Marker({ ...markerOptions, element: document.createElement("div"), draggable }).setLngLat([longitude, latitude]);
    m.getElement()?.addEventListener("click", (e) => callbacksRef.current.onClick?.(e));
    m.getElement()?.addEventListener("mouseenter", (e) => callbacksRef.current.onMouseEnter?.(e));
    m.getElement()?.addEventListener("mouseleave", (e) => callbacksRef.current.onMouseLeave?.(e));
    m.on("dragstart", () => { const l = m.getLngLat(); callbacksRef.current.onDragStart?.({ lng: l.lng, lat: l.lat }); });
    m.on("drag", () => { const l = m.getLngLat(); callbacksRef.current.onDrag?.({ lng: l.lng, lat: l.lat }); });
    m.on("dragend", () => { const l = m.getLngLat(); callbacksRef.current.onDragEnd?.({ lng: l.lng, lat: l.lat }); });
    return m;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!map) return;
    marker.addTo(map);
    return () => { marker.remove(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map]);

  if (marker.getLngLat().lng !== longitude || marker.getLngLat().lat !== latitude) marker.setLngLat([longitude, latitude]);
  if (marker.isDraggable() !== draggable) marker.setDraggable(draggable);

  const currentOffset = marker.getOffset();
  const newOffset = markerOptions.offset ?? [0, 0];
  const [newOffsetX, newOffsetY] = Array.isArray(newOffset) ? newOffset : [newOffset.x, newOffset.y];
  if (currentOffset.x !== newOffsetX || currentOffset.y !== newOffsetY) marker.setOffset(newOffset);
  if (marker.getRotation() !== markerOptions.rotation) marker.setRotation(markerOptions.rotation ?? 0);
  if (marker.getRotationAlignment() !== markerOptions.rotationAlignment) marker.setRotationAlignment(markerOptions.rotationAlignment ?? "auto");
  if (marker.getPitchAlignment() !== markerOptions.pitchAlignment) marker.setPitchAlignment(markerOptions.pitchAlignment ?? "auto");

  return <MarkerContext.Provider value={{ marker, map }}>{children}</MarkerContext.Provider>;
}

// ── MarkerContent ──────────────────────────────────────────────────────────────

type MarkerContentProps = { children?: ReactNode; className?: string };

function MarkerContent({ children, className }: MarkerContentProps) {
  const { marker } = useMarkerContext();
  return createPortal(
    <div className={cn("relative cursor-pointer", className)}>
      {children || <div className="relative h-4 w-4 rounded-full border-2 border-white bg-blue-500 shadow-lg" />}
    </div>,
    marker.getElement(),
  );
}

// ── PopupCloseButton ───────────────────────────────────────────────────────────

function PopupCloseButton({ onClick }: { onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} aria-label="Close popup"
      className="absolute top-0.5 right-0.5 z-10 inline-flex h-5 w-5 cursor-pointer items-center justify-center rounded-sm text-white/60 hover:text-white transition-colors">
      <X className="h-3.5 w-3.5" />
    </button>
  );
}

// ── MarkerPopup ────────────────────────────────────────────────────────────────

type MarkerPopupProps = {
  children: ReactNode;
  className?: string;
  closeButton?: boolean;
} & Omit<PopupOptions, "className" | "closeButton">;

function MarkerPopup({ children, className, closeButton = false, ...popupOptions }: MarkerPopupProps) {
  const { marker, map } = useMarkerContext();
  const container = useMemo(() => document.createElement("div"), []);
  const popup = useMemo(() => {
    return new MapLibreGL.Popup({ offset: 16, ...popupOptions, closeButton: false }).setMaxWidth("none").setDOMContent(container);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!map) return;
    popup.setDOMContent(container);
    marker.setPopup(popup);
    return () => { marker.setPopup(null); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map]);

  return createPortal(
    <div className={cn("relative max-w-[250px] rounded-xl border border-white/15 bg-[#0e2640] p-3 text-white shadow-xl", className)}>
      {closeButton && <PopupCloseButton onClick={() => popup.remove()} />}
      {children}
    </div>,
    container,
  );
}

// ── MarkerTooltip ──────────────────────────────────────────────────────────────

type MarkerTooltipProps = { children: ReactNode; className?: string } & Omit<PopupOptions, "className" | "closeButton" | "closeOnClick">;

function MarkerTooltip({ children, className, ...popupOptions }: MarkerTooltipProps) {
  const { marker, map } = useMarkerContext();
  const container = useMemo(() => document.createElement("div"), []);
  const tooltip = useMemo(() => {
    return new MapLibreGL.Popup({ offset: 16, ...popupOptions, closeOnClick: true, closeButton: false }).setMaxWidth("none");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!map) return;
    tooltip.setDOMContent(container);
    const handleMouseEnter = () => tooltip.setLngLat(marker.getLngLat()).addTo(map);
    const handleMouseLeave = () => tooltip.remove();
    marker.getElement()?.addEventListener("mouseenter", handleMouseEnter);
    marker.getElement()?.addEventListener("mouseleave", handleMouseLeave);
    return () => {
      marker.getElement()?.removeEventListener("mouseenter", handleMouseEnter);
      marker.getElement()?.removeEventListener("mouseleave", handleMouseLeave);
      tooltip.remove();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map]);

  return createPortal(
    <div className={cn("pointer-events-none rounded-lg bg-[#0e2640] px-2 py-1 text-xs text-white shadow-lg border border-white/15", className)}>
      {children}
    </div>,
    container,
  );
}

// ── MarkerLabel ────────────────────────────────────────────────────────────────

type MarkerLabelProps = { children: ReactNode; className?: string; position?: "top" | "bottom" };

function MarkerLabel({ children, className, position = "top" }: MarkerLabelProps) {
  const positionClasses = { top: "bottom-full mb-1", bottom: "top-full mt-1" };
  return (
    <div className={cn("absolute left-1/2 -translate-x-1/2 whitespace-nowrap text-[10px] font-medium", positionClasses[position], className)}>
      {children}
    </div>
  );
}

// ── MapPopup ───────────────────────────────────────────────────────────────────

type MapPopupProps = {
  longitude: number;
  latitude: number;
  onClose?: () => void;
  children: ReactNode;
  className?: string;
  closeButton?: boolean;
} & Omit<PopupOptions, "className" | "closeButton">;

function MapPopup({ longitude, latitude, onClose, children, className, closeButton = false, ...popupOptions }: MapPopupProps) {
  const { map } = useMap();
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;
  const container = useMemo(() => document.createElement("div"), []);

  const popup = useMemo(() => {
    return new MapLibreGL.Popup({ offset: 16, ...popupOptions, closeButton: false }).setMaxWidth("none").setLngLat([longitude, latitude]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!map) return;
    const onCloseProp = () => onCloseRef.current?.();
    popup.on("close", onCloseProp);
    popup.setDOMContent(container);
    popup.addTo(map);
    return () => { popup.off("close", onCloseProp); if (popup.isOpen()) popup.remove(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map]);

  if (popup.isOpen()) {
    if (popup.getLngLat().lng !== longitude || popup.getLngLat().lat !== latitude) popup.setLngLat([longitude, latitude]);
  }

  return createPortal(
    <div className={cn("relative max-w-[250px] rounded-xl border border-white/15 bg-[#0e2640] p-3 text-white shadow-xl", className)}>
      {closeButton && <PopupCloseButton onClick={() => popup.remove()} />}
      {children}
    </div>,
    container,
  );
}

// ── MapControls ────────────────────────────────────────────────────────────────

const positionClasses = {
  "top-left": "top-2 left-2",
  "top-right": "top-2 right-2",
  "bottom-left": "bottom-2 left-2",
  "bottom-right": "bottom-10 right-2",
};

type MapControlsProps = {
  position?: keyof typeof positionClasses;
  showZoom?: boolean;
  showCompass?: boolean;
  showLocate?: boolean;
  showFullscreen?: boolean;
  className?: string;
  onLocate?: (coords: { longitude: number; latitude: number }) => void;
};

function ControlGroup({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-col overflow-hidden rounded-lg border border-white/15 bg-[#0e2640]/90 shadow-lg backdrop-blur-sm [&>button:not(:last-child)]:border-b [&>button:not(:last-child)]:border-white/10">
      {children}
    </div>
  );
}

function ControlButton({ onClick, label, children, disabled = false }: { onClick: () => void; label: string; children: React.ReactNode; disabled?: boolean }) {
  return (
    <button onClick={onClick} aria-label={label} type="button" disabled={disabled}
      className="flex h-8 w-8 items-center justify-center text-white/60 hover:text-white hover:bg-white/10 transition-all disabled:opacity-40 disabled:pointer-events-none">
      {children}
    </button>
  );
}

function MapControls({ position = "bottom-right", showZoom = true, showCompass = false, showLocate = false, showFullscreen = false, className, onLocate }: MapControlsProps) {
  const { map } = useMap();
  const [waitingForLocation, setWaitingForLocation] = useState(false);

  const handleZoomIn  = useCallback(() => map?.zoomTo(map.getZoom() + 1, { duration: 300 }), [map]);
  const handleZoomOut = useCallback(() => map?.zoomTo(map.getZoom() - 1, { duration: 300 }), [map]);

  const handleLocate = useCallback(() => {
    setWaitingForLocation(true);
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const coords = { longitude: pos.coords.longitude, latitude: pos.coords.latitude };
          map?.flyTo({ center: [coords.longitude, coords.latitude], zoom: 14, duration: 1500 });
          onLocate?.(coords);
          setWaitingForLocation(false);
        },
        () => setWaitingForLocation(false),
      );
    }
  }, [map, onLocate]);

  const handleFullscreen = useCallback(() => {
    const container = map?.getContainer();
    if (!container) return;
    if (document.fullscreenElement) document.exitFullscreen();
    else container.requestFullscreen();
  }, [map]);

  return (
    <div className={cn("absolute z-10 flex flex-col gap-1.5", positionClasses[position], className)}>
      {showZoom && (
        <ControlGroup>
          <ControlButton onClick={handleZoomIn} label="Zoom in"><Plus className="h-4 w-4" /></ControlButton>
          <ControlButton onClick={handleZoomOut} label="Zoom out"><Minus className="h-4 w-4" /></ControlButton>
        </ControlGroup>
      )}
      {showLocate && (
        <ControlGroup>
          <ControlButton onClick={handleLocate} label="Find my location" disabled={waitingForLocation}>
            {waitingForLocation ? <Loader2 className="h-4 w-4 animate-spin" /> : <Locate className="h-4 w-4" />}
          </ControlButton>
        </ControlGroup>
      )}
      {showFullscreen && (
        <ControlGroup>
          <ControlButton onClick={handleFullscreen} label="Toggle fullscreen"><Maximize className="h-4 w-4" /></ControlButton>
        </ControlGroup>
      )}
    </div>
  );
}

// ── MapRoute ───────────────────────────────────────────────────────────────────

type MapRouteProps = {
  id?: string;
  coordinates: [number, number][];
  color?: string;
  width?: number;
  opacity?: number;
  dashArray?: [number, number];
  onClick?: () => void;
  onMouseEnter?: () => void;
  onMouseLeave?: () => void;
  interactive?: boolean;
};

function MapRoute({ id: propId, coordinates, color = "#4285F4", width = 3, opacity = 0.8, dashArray, onClick, onMouseEnter, onMouseLeave, interactive = true }: MapRouteProps) {
  const { map, isLoaded } = useMap();
  const autoId = useId();
  const id = propId ?? autoId;
  const sourceId = `route-source-${id}`;
  const layerId  = `route-layer-${id}`;

  useEffect(() => {
    if (!isLoaded || !map) return;
    map.addSource(sourceId, { type: "geojson", data: { type: "Feature", properties: {}, geometry: { type: "LineString", coordinates: [] } } });
    map.addLayer({ id: layerId, type: "line", source: sourceId, layout: { "line-join": "round", "line-cap": "round" }, paint: { "line-color": color, "line-width": width, "line-opacity": opacity, ...(dashArray && { "line-dasharray": dashArray }) } });
    return () => {
      try { if (map.getLayer(layerId)) map.removeLayer(layerId); if (map.getSource(sourceId)) map.removeSource(sourceId); } catch { /* ignore */ }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoaded, map]);

  useEffect(() => {
    if (!isLoaded || !map || coordinates.length < 2) return;
    const source = map.getSource(sourceId) as MapLibreGL.GeoJSONSource;
    if (source) source.setData({ type: "Feature", properties: {}, geometry: { type: "LineString", coordinates } });
  }, [isLoaded, map, coordinates, sourceId]);

  useEffect(() => {
    if (!isLoaded || !map || !interactive) return;
    const handleClick = () => onClick?.();
    const handleEnter = () => { map.getCanvas().style.cursor = "pointer"; onMouseEnter?.(); };
    const handleLeave = () => { map.getCanvas().style.cursor = ""; onMouseLeave?.(); };
    map.on("click", layerId, handleClick);
    map.on("mouseenter", layerId, handleEnter);
    map.on("mouseleave", layerId, handleLeave);
    return () => { map.off("click", layerId, handleClick); map.off("mouseenter", layerId, handleEnter); map.off("mouseleave", layerId, handleLeave); };
  }, [isLoaded, map, layerId, onClick, onMouseEnter, onMouseLeave, interactive]);

  return null;
}

// ── MapArc ─────────────────────────────────────────────────────────────────────

type MapArcDatum = {
  id: string | number;
  from: [number, number];
  to: [number, number];
};

type MapArcEvent<T extends MapArcDatum = MapArcDatum> = {
  arc: T;
  longitude: number;
  latitude: number;
  originalEvent: MapLibreGL.MapMouseEvent;
};

type MapArcLinePaint  = NonNullable<MapLibreGL.LineLayerSpecification["paint"]>;
type MapArcLineLayout = NonNullable<MapLibreGL.LineLayerSpecification["layout"]>;

type MapArcProps<T extends MapArcDatum = MapArcDatum> = {
  data: T[];
  id?: string;
  curvature?: number;
  samples?: number;
  paint?: MapArcLinePaint;
  layout?: MapArcLineLayout;
  hoverPaint?: MapArcLinePaint;
  onClick?: (e: MapArcEvent<T>) => void;
  onHover?: (e: MapArcEvent<T> | null) => void;
  interactive?: boolean;
  beforeId?: string;
};

const DEFAULT_ARC_PAINT: MapArcLinePaint = { "line-color": "#4285F4", "line-width": 2, "line-opacity": 0.85 };
const DEFAULT_ARC_LAYOUT: MapArcLineLayout = { "line-join": "round", "line-cap": "round" };
const ARC_HIT_MIN_WIDTH = 12;
const ARC_HIT_PADDING   = 6;

function mergeArcPaint(paint: MapArcLinePaint, hoverPaint: MapArcLinePaint | undefined): MapArcLinePaint {
  if (!hoverPaint) return paint;
  const merged: Record<string, unknown> = { ...paint };
  for (const [key, hoverValue] of Object.entries(hoverPaint)) {
    if (hoverValue === undefined) continue;
    const baseValue = merged[key];
    merged[key] = baseValue === undefined ? hoverValue : ["case", ["boolean", ["feature-state", "hover"], false], hoverValue, baseValue];
  }
  return merged as MapArcLinePaint;
}

function buildArcCoordinates(from: [number, number], to: [number, number], curvature: number, samples: number): [number, number][] {
  const [x0, y0] = from, [x2, y2] = to;
  const dx = x2 - x0, dy = y2 - y0;
  const distance = Math.hypot(dx, dy);
  if (distance === 0 || curvature === 0) return [from, to];
  const mx = (x0 + x2) / 2, my = (y0 + y2) / 2;
  const nx = -dy / distance, ny = dx / distance;
  const offset = distance * curvature;
  const cx = mx + nx * offset, cy = my + ny * offset;
  const points: [number, number][] = [];
  const segments = Math.max(2, Math.floor(samples));
  for (let i = 0; i <= segments; i++) {
    const t = i / segments, inv = 1 - t;
    points.push([inv * inv * x0 + 2 * inv * t * cx + t * t * x2, inv * inv * y0 + 2 * inv * t * cy + t * t * y2]);
  }
  return points;
}

function MapArc<T extends MapArcDatum = MapArcDatum>({
  data, id: propId, curvature = 0.2, samples = 64, paint, layout, hoverPaint,
  onClick, onHover, interactive = true, beforeId,
}: MapArcProps<T>) {
  const { map, isLoaded } = useMap();
  const autoId = useId();
  const id = propId ?? autoId;
  const sourceId   = `arc-source-${id}`;
  const layerId    = `arc-layer-${id}`;
  const hitLayerId = `arc-hit-layer-${id}`;

  const mergedPaint  = useMemo(() => mergeArcPaint({ ...DEFAULT_ARC_PAINT, ...paint }, hoverPaint), [paint, hoverPaint]);
  const mergedLayout = useMemo(() => ({ ...DEFAULT_ARC_LAYOUT, ...layout }), [layout]);

  const hitWidth = useMemo(() => {
    const w = paint?.["line-width"] ?? DEFAULT_ARC_PAINT["line-width"];
    const base = typeof w === "number" ? w : ARC_HIT_MIN_WIDTH;
    return Math.max(base + ARC_HIT_PADDING, ARC_HIT_MIN_WIDTH);
  }, [paint]);

  const geoJSON = useMemo<GeoJSON.FeatureCollection<GeoJSON.LineString>>(() => ({
    type: "FeatureCollection",
    features: data.map((arc) => {
      const { from, to, ...properties } = arc;
      return { type: "Feature", properties, geometry: { type: "LineString", coordinates: buildArcCoordinates(from, to, curvature, samples) } };
    }),
  }), [data, curvature, samples]);

  const latestRef = useRef({ data, onClick, onHover });
  latestRef.current = { data, onClick, onHover };

  useEffect(() => {
    if (!isLoaded || !map) return;
    if (!map.getSource(sourceId)) {
      map.addSource(sourceId, { type: "geojson", data: geoJSON, promoteId: "id" });
    }
    if (!map.getLayer(hitLayerId)) {
      map.addLayer({ id: hitLayerId, type: "line", source: sourceId, layout: DEFAULT_ARC_LAYOUT, paint: { "line-color": "rgba(0,0,0,0)", "line-width": hitWidth, "line-opacity": 1 } }, beforeId);
    }
    if (!map.getLayer(layerId)) {
      map.addLayer({ id: layerId, type: "line", source: sourceId, layout: mergedLayout, paint: mergedPaint }, beforeId);
    }
    return () => {
      try {
        if (map.getLayer(layerId)) map.removeLayer(layerId);
        if (map.getLayer(hitLayerId)) map.removeLayer(hitLayerId);
        if (map.getSource(sourceId)) map.removeSource(sourceId);
      } catch { /* ignore */ }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoaded, map]);

  useEffect(() => {
    if (!isLoaded || !map) return;
    const source = map.getSource(sourceId) as MapLibreGL.GeoJSONSource | undefined;
    source?.setData(geoJSON);
  }, [isLoaded, map, geoJSON, sourceId]);

  useEffect(() => {
    if (!isLoaded || !map || !interactive) return;
    let hoveredId: string | number | null = null;

    const setHover = (next: string | number | null) => {
      if (next === hoveredId) return;
      const srcExists = !!map.getSource(sourceId);
      if (hoveredId != null && srcExists) map.setFeatureState({ source: sourceId, id: hoveredId }, { hover: false });
      hoveredId = next;
      if (next != null && srcExists) map.setFeatureState({ source: sourceId, id: next }, { hover: true });
    };

    const findArc = (featureId: string | number | undefined) =>
      featureId == null ? undefined : latestRef.current.data.find((arc) => String(arc.id) === String(featureId));

    const handleMouseMove = (e: MapLibreGL.MapLayerMouseEvent) => {
      const featureId = e.features?.[0]?.id as string | number | undefined;
      if (featureId == null || featureId === hoveredId) return;
      setHover(featureId);
      map.getCanvas().style.cursor = "pointer";
      const arc = findArc(featureId);
      if (arc) latestRef.current.onHover?.({ arc: arc as T, longitude: e.lngLat.lng, latitude: e.lngLat.lat, originalEvent: e });
    };
    const handleMouseLeave = () => { setHover(null); map.getCanvas().style.cursor = ""; latestRef.current.onHover?.(null); };
    const handleClick = (e: MapLibreGL.MapLayerMouseEvent) => {
      const arc = findArc(e.features?.[0]?.id as string | number | undefined);
      if (!arc) return;
      latestRef.current.onClick?.({ arc: arc as T, longitude: e.lngLat.lng, latitude: e.lngLat.lat, originalEvent: e });
    };

    map.on("mousemove", hitLayerId, handleMouseMove);
    map.on("mouseleave", hitLayerId, handleMouseLeave);
    map.on("click", hitLayerId, handleClick);
    return () => {
      map.off("mousemove", hitLayerId, handleMouseMove);
      map.off("mouseleave", hitLayerId, handleMouseLeave);
      map.off("click", hitLayerId, handleClick);
      setHover(null);
      map.getCanvas().style.cursor = "";
    };
  }, [isLoaded, map, hitLayerId, sourceId, interactive]);

  return null;
}

export {
  Map,
  useMap,
  MapMarker,
  MarkerContent,
  MarkerPopup,
  MarkerTooltip,
  MarkerLabel,
  MapPopup,
  MapControls,
  MapRoute,
  MapArc,
};

export type { MapRef, MapViewport, MapArcDatum, MapArcEvent };
