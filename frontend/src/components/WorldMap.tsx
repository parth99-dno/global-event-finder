import React, { useEffect, useState, useMemo } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Tooltip, useMap } from 'react-leaflet';
import MarkerClusterGroup from 'react-leaflet-cluster';
import 'leaflet/dist/leaflet.css';
import 'react-leaflet-cluster/dist/assets/MarkerCluster.css';
import 'react-leaflet-cluster/dist/assets/MarkerCluster.Default.css';
import L from 'leaflet';
import 'leaflet.heat';
import type { Event } from '../types';
import { useNavigate } from 'react-router-dom';
import MapSearchBar from './MapSearchBar';
import MapTimelineSlider from './MapTimelineSlider';
import { Layers, X, ExternalLink, BookmarkPlus, BookmarkMinus } from 'lucide-react';
import api from '../lib/api';

// --- Geo Lookup Data ---
const GEO_LOOKUP: Record<string, [number, number]> = {
  'us': [37.0902, -95.7129], 'usa': [37.0902, -95.7129], 'united states': [37.0902, -95.7129], 'america': [37.0902, -95.7129],
  'uk': [55.3781, -3.4360], 'united kingdom': [55.3781, -3.4360], 'britain': [55.3781, -3.4360], 'england': [51.5074, -0.1278],
  'china': [35.8617, 104.1954], 'india': [20.5937, 78.9629], 'russia': [61.5240, 105.3188], 'iran': [32.4279, 53.6880],
  'france': [46.2276, 2.2137], 'germany': [51.1657, 10.4515], 'japan': [36.2048, 138.2529], 'brazil': [-14.2350, -51.9253],
  'australia': [-25.2744, 133.7751], 'canada': [56.1304, -106.3468], 'south korea': [35.9078, 127.7669], 'korea': [35.9078, 127.7669],
  'israel': [31.0461, 34.8516], 'ukraine': [48.3794, 31.1656], 'turkey': [38.9637, 35.2433], 'saudi arabia': [23.8859, 45.0792],
  'pakistan': [30.3753, 69.3451], 'nigeria': [9.0820, 8.6753], 'egypt': [26.8206, 30.8025], 'south africa': [-30.5595, 22.9375],
  'mexico': [23.6345, -102.5528], 'indonesia': [-0.7893, 113.9213], 'switzerland': [46.8182, 8.2275], 'singapore': [1.3521, 103.8198],
  'taiwan': [23.6978, 120.9605], 'sweden': [60.1282, 18.6435], 'norway': [60.4720, 8.4689], 'netherlands': [52.1326, 5.2913],
  'spain': [40.4637, -3.7492], 'italy': [41.8719, 12.5674], 'poland': [51.9194, 19.1451], 'argentina': [-38.4161, -63.6167],
  'colombia': [4.5709, -74.2973], 'ethiopia': [9.1450, 40.4897], 'kenya': [-0.0236, 37.9062], 'ghana': [7.9465, -1.0232],
  'oman': [21.4735, 55.9754], 'qatar': [25.3548, 51.1839], 'uae': [23.4241, 53.8478], 'dubai': [25.2048, 55.2708],
  'vietnam': [14.0583, 108.2772], 'thailand': [15.8700, 100.9925], 'malaysia': [4.2105, 101.9758], 'philippines': [12.8797, 121.7740],
  'bangladesh': [23.6850, 90.3563],
  'washington': [38.9072, -77.0369], 'new york': [40.7128, -74.0060], 'nyc': [40.7128, -74.0060], 'los angeles': [34.0522, -118.2437],
  'chicago': [41.8781, -87.6298], 'london': [51.5074, -0.1278], 'paris': [48.8566, 2.3522], 'berlin': [52.5200, 13.4050],
  'beijing': [39.9042, 116.4074], 'shanghai': [31.2304, 121.4737], 'tokyo': [35.6762, 139.6503], 'moscow': [55.7558, 37.6173],
  'mumbai': [19.0760, 72.8777], 'delhi': [28.6139, 77.2090], 'new delhi': [28.6139, 77.2090], 'sydney': [-33.8688, 151.2093],
  'toronto': [43.6532, -79.3832], 'seoul': [37.5665, 126.9780], 'brussels': [50.8503, 4.3517], 'geneva': [46.2044, 6.1432],
  'vienna': [48.2082, 16.3738], 'rome': [41.9028, 12.4964], 'madrid': [40.4168, -3.7038], 'amsterdam': [52.3676, 4.9041],
  'stockholm': [59.3293, 18.0686], 'oslo': [59.9139, 10.7522], 'tel aviv': [32.0853, 34.7818], 'jerusalem': [31.7683, 35.2137],
  'kyiv': [50.4501, 30.5234], 'ankara': [39.9334, 32.8597], 'tehran': [35.6892, 51.3890], 'riyadh': [24.7136, 46.6753],
  'cairo': [30.0444, 31.2357], 'nairobi': [-1.2921, 36.8219], 'lagos': [6.5244, 3.3792], 'johannesburg': [-26.2041, 28.0473],
  'bangkok': [13.7563, 100.5018], 'jakarta': [-6.2088, 106.8456], 'manila': [14.5995, 120.9842], 'kathmandu': [27.7172, 85.3240],
  'islamabad': [33.7294, 73.0931], 'dhaka': [23.8103, 90.4125], 'berkeley': [37.8716, -122.2727], 'cambridge': [42.3601, -71.0942],
  'san francisco': [37.7749, -122.4194], 'seattle': [47.6062, -122.3321], 'boston': [42.3601, -71.0589], 'miami': [25.7617, -80.1918],
  'houston': [29.7604, -95.3698], 'davos': [46.8033, 9.8373], 'munich': [48.1351, 11.5820], 'frankfurt': [50.1109, 8.6821],
  'zurich': [47.3769, 8.5417],
  'europe': [54.5260, 15.2551], 'asia': [34.0479, 100.6197], 'africa': [8.7832, 34.5085], 'south america': [-8.7832, -55.4915],
  'north america': [54.5260, -105.2551], 'middle east': [29.2985, 42.5510], 'southeast asia': [4.2105, 101.9758],
  'latin america': [-14.2350, -51.9253], 'eu': [54.5260, 15.2551], 'nato': [50.8503, 4.3517], 'un': [40.7128, -74.0060],
  'united nations': [40.7128, -74.0060], 'who': [46.2044, 6.1432], 'imf': [38.9072, -77.0369], 'world bank': [38.9072, -77.0369],
  'wto': [46.2044, 6.1432], 'opec': [48.2082, 16.3738], 'g7': [45.4654, 9.1859], 'g20': [52.5200, 13.4050], 'asean': [13.7563, 100.5018],
};

function resolveCoords(event: Event): [number, number] | null {
  const directLoc = (event.country || event.continent || '').toLowerCase().trim();
  if (directLoc && GEO_LOOKUP[directLoc]) return GEO_LOOKUP[directLoc];

  const keywords = (event.keywords || []).map(k => k.toLowerCase().trim());
  for (const kw of keywords) {
    if (GEO_LOOKUP[kw]) return GEO_LOOKUP[kw];
    for (const place of Object.keys(GEO_LOOKUP)) {
      if (kw.includes(place) || place.includes(kw)) return GEO_LOOKUP[place];
    }
  }

  const title = (event.title || '').toLowerCase();
  for (const place of Object.keys(GEO_LOOKUP)) {
    if (title.includes(place)) return GEO_LOOKUP[place];
  }

  const desc = (event.description || '').toLowerCase();
  for (const place of Object.keys(GEO_LOOKUP)) {
    if (desc.includes(place)) return GEO_LOOKUP[place];
  }

  return null;
}

// --- Category Colors & Markers ---
const CATEGORY_COLORS: Record<string, { hex: string, rgb: string }> = {
  Environment: { hex: '#14b8a6', rgb: '20, 184, 166' }, // Teal
  Technology: { hex: '#3b82f6', rgb: '59, 130, 246' }, // Blue
  Economy: { hex: '#10b981', rgb: '16, 185, 129' }, // Emerald
  Science: { hex: '#8b5cf6', rgb: '139, 92, 246' }, // Violet
  Health: { hex: '#ec4899', rgb: '236, 72, 153' }, // Pink
  Sports: { hex: '#f97316', rgb: '249, 115, 22' }, // Orange
  Politics: { hex: '#ef4444', rgb: '239, 68, 68' }, // Red
  Diplomacy: { hex: '#eab308', rgb: '234, 179, 8' }, // Yellow
  Default: { hex: '#6366f1', rgb: '99, 102, 241' } // Indigo
};

const getMarkerIcon = (category: string) => {
  const color = CATEGORY_COLORS[category] || CATEGORY_COLORS.Default;
  return L.divIcon({
    className: 'map-marker-icon',
    html: `<div class="map-marker" style="background-color: ${color.hex}; --marker-color-rgb: ${color.rgb};"></div>`,
    iconSize: [16, 16],
    iconAnchor: [8, 8]
  });
};

// --- Heatmap Component ---
function HeatmapLayer({ points, show }: { points: [number, number][], show: boolean }) {
  const map = useMap();
  
  useEffect(() => {
    if (!show || points.length === 0) return;
    
    // @ts-ignore - leaflet.heat doesn't export strict types for the factory function cleanly in all versions
    const heatLayer = L.heatLayer(points, {
      radius: 25,
      blur: 15,
      maxZoom: 10,
      gradient: { 0.4: 'blue', 0.6: 'cyan', 0.7: 'lime', 0.8: 'yellow', 1.0: 'red' }
    }).addTo(map);

    return () => {
      map.removeLayer(heatLayer);
    };
  }, [map, points, show]);

  return null;
}

// --- Main Map Component ---
interface Props {
  events: Event[];
}

export default function WorldMap({ events }: Props) {
  const navigate = useNavigate();
  const [viewMode, setViewMode] = useState<'markers' | 'heat'>('markers');
  const [searchQuery, setSearchQuery] = useState('');
  const [dateRange, setDateRange] = useState<[Date, Date] | null>(null);
  
  // Side panel state
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [similarEvents, setSimilarEvents] = useState<Event[]>([]);
  const [isSaved, setIsSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  
  // Base map ref for flyTo
  const [mapRef, setMapRef] = useState<L.Map | null>(null);

  // Dynamic Date Bounds
  const { minDate, maxDate } = useMemo(() => {
    if (!events || events.length === 0) {
      return { minDate: new Date(), maxDate: new Date() };
    }
    const timestamps = events.map(e => new Date(e.date).getTime()).filter(t => !isNaN(t));
    if (timestamps.length === 0) {
      return { minDate: new Date(), maxDate: new Date() };
    }
    return {
      minDate: new Date(Math.min(...timestamps)),
      maxDate: new Date(Math.max(...timestamps))
    };
  }, [events]);

  // 1. Resolve Coords for all
  const mappedEvents = useMemo(() => {
    return events.map(e => ({ ...e, coords: resolveCoords(e) })).filter(e => e.coords !== null);
  }, [events]);

  // 2. Filter by search & date
  const filteredEvents = useMemo(() => {
    return mappedEvents.filter(e => {
      // Date filter
      if (dateRange && e.date) {
        const evDate = new Date(e.date).getTime();
        if (evDate < dateRange[0].getTime() || evDate > dateRange[1].getTime()) return false;
      }
      // Text filter (if not flying to location)
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        // If it's a direct geo-match, we handled it via flyTo, but still show all markers in that area?
        // Let's strictly filter text
        if (!GEO_LOOKUP[q]) {
          const text = `${e.title} ${e.description} ${e.keywords?.join(' ')}`.toLowerCase();
          if (!text.includes(q)) return false;
        }
      }
      return true;
    });
  }, [mappedEvents, dateRange, searchQuery]);

  const heatPoints = useMemo(() => filteredEvents.map(e => e.coords as [number, number]), [filteredEvents]);

  // Handle Search
  const handleSearch = (query: string) => {
    setSearchQuery(query);
    const q = query.toLowerCase();
    if (GEO_LOOKUP[q] && mapRef) {
      mapRef.flyTo(GEO_LOOKUP[q], 5, { duration: 1.5 });
    }
  };

  // Side Panel logic
  const handleMarkerClick = async (event: Event) => {
    setSelectedEvent(event);
    setSimilarEvents([]);
    setIsSaved(false); // Should really fetch if user has saved it, but defaulting to false for now
    try {
      const res = await api.get(`/similar/${event._id}?top_n=3`);
      setSimilarEvents(res.data.results || []);
    } catch (err) {
      console.error(err);
    }
  };

  const toggleSave = async () => {
    if (!selectedEvent) return;
    try {
      setSaving(true);
      if (isSaved) {
        await api.delete(`/save/${selectedEvent._id}`);
        setIsSaved(false);
      } else {
        await api.post('/save', { eventId: selectedEvent._id });
        setIsSaved(true);
      }
    } catch (err) {
      console.error('Failed to toggle save state', err);
    } finally {
      setSaving(false);
    }
  };

  // Stats
  const categoriesCount = useMemo(() => {
    const counts: Record<string, number> = {};
    filteredEvents.forEach(e => {
      counts[e.category || 'Uncategorized'] = (counts[e.category || 'Uncategorized'] || 0) + 1;
    });
    return counts;
  }, [filteredEvents]);

  return (
    <div className="w-full h-full min-h-[600px] bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden relative z-0 flex shadow-2xl">
      
      {/* Map Area */}
      <div className="flex-1 relative">
        <MapSearchBar onSearch={handleSearch} />
        
        {/* Toggle Mode */}
        <div className="absolute top-4 right-4 z-[1000] bg-slate-900/90 border border-slate-700/50 rounded-lg p-1 flex shadow-lg backdrop-blur-md">
          <button 
            onClick={() => setViewMode('markers')}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${viewMode === 'markers' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-slate-200'}`}
          >
            Markers
          </button>
          <button 
            onClick={() => setViewMode('heat')}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors flex items-center gap-1 ${viewMode === 'heat' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-slate-200'}`}
          >
            <Layers size={14} /> Heatmap
          </button>
        </div>

        <MapContainer
          center={[20, 0]}
          zoom={2.5}
          scrollWheelZoom={true}
          className="h-full w-full bg-slate-950"
          ref={setMapRef}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>'
            url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
          />
          
          <HeatmapLayer points={heatPoints} show={viewMode === 'heat'} />

          {viewMode === 'markers' && (
            <MarkerClusterGroup 
              chunkedLoading 
              maxClusterRadius={40}
            >
              {filteredEvents.map((evt, idx) => (
                <Marker 
                  key={evt._id || idx} 
                  position={evt.coords as [number, number]}
                  icon={getMarkerIcon(evt.category)}
                  eventHandlers={{ click: () => handleMarkerClick(evt) }}
                >
                  <Tooltip className="bg-slate-900 border border-slate-700 text-slate-200 rounded-xl p-3 shadow-xl max-w-xs custom-popup" direction="top" offset={[0, -10]}>
                    <div className="text-xs font-semibold mb-1" style={{ color: CATEGORY_COLORS[evt.category]?.hex || CATEGORY_COLORS.Default.hex }}>
                      {evt.category}
                    </div>
                    <div className="font-bold text-sm mb-1 text-slate-100">{evt.title}</div>
                    <div className="text-xs text-slate-400 mb-2">{evt.country || 'Global'} • {new Date(evt.date).toLocaleDateString()}</div>
                    <div className="text-xs text-slate-300 line-clamp-2">{evt.description}</div>
                  </Tooltip>
                </Marker>
              ))}
            </MarkerClusterGroup>
          )}
        </MapContainer>

        <MapTimelineSlider 
          minDate={minDate} 
          maxDate={maxDate} 
          onRangeChange={(s, e) => setDateRange([s, e])} 
        />

        {/* Legend */}
        <div className="absolute bottom-6 left-4 z-[1000] bg-slate-900/90 border border-slate-700/50 backdrop-blur-md rounded-xl p-3 shadow-xl hidden sm:block">
          <div className="text-xs font-semibold text-slate-400 mb-2 uppercase tracking-wider">Legend</div>
          <div className="grid grid-cols-2 gap-x-4 gap-y-2">
            {Object.entries(CATEGORY_COLORS).filter(([k]) => k !== 'Default').map(([cat, color]) => (
              <div key={cat} className="flex items-center gap-2 text-xs text-slate-300">
                <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: color.hex, boxShadow: `0 0 8px ${color.hex}` }} />
                {cat}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Side Panel */}
      {selectedEvent && (
        <div className="absolute top-0 right-0 h-full w-full sm:w-96 bg-slate-900/95 backdrop-blur-xl border-l border-slate-800 z-[2000] flex flex-col shadow-2xl transition-transform">
          <div className="p-4 border-b border-slate-800 flex items-center justify-between">
            <h3 className="font-bold text-lg text-slate-100 line-clamp-1">Event Details</h3>
            <button onClick={() => setSelectedEvent(null)} className="p-1 hover:bg-slate-800 rounded-full transition-colors">
              <X size={20} className="text-slate-400" />
            </button>
          </div>
          
          <div className="p-5 overflow-y-auto flex-1 custom-scrollbar">
            <div className="inline-block px-2 py-1 rounded text-xs font-semibold bg-slate-800 mb-3" style={{ color: CATEGORY_COLORS[selectedEvent.category]?.hex || CATEGORY_COLORS.Default.hex }}>
              {selectedEvent.category}
            </div>
            
            <h2 className="text-xl font-bold text-white mb-2 leading-tight">{selectedEvent.title}</h2>
            
            <div className="text-xs text-slate-400 mb-4 flex items-center gap-2">
              <span>{new Date(selectedEvent.date).toLocaleDateString()}</span>
              <span>•</span>
              <span className="truncate">{selectedEvent.source || 'Unknown Source'}</span>
            </div>
            
            <p className="text-sm text-slate-300 leading-relaxed mb-6">
              {selectedEvent.description}
            </p>

            {(selectedEvent.keywords || []).length > 0 && (
              <div className="mb-6">
                <div className="text-xs font-semibold text-slate-500 mb-2 uppercase tracking-wider">Keywords</div>
                <div className="flex flex-wrap gap-1.5">
                  {selectedEvent.keywords.map(kw => (
                    <span key={kw} className="px-2 py-1 bg-slate-800 border border-slate-700 rounded text-xs text-slate-300">{kw}</span>
                  ))}
                </div>
              </div>
            )}

            {similarEvents.length > 0 && (
              <div className="mt-8">
                <div className="text-xs font-semibold text-slate-500 mb-3 uppercase tracking-wider">Similar Events</div>
                <div className="space-y-3">
                  {similarEvents.map(sim => (
                    <div 
                      key={sim._id} 
                      className="p-3 bg-slate-800/50 border border-slate-700/50 rounded-lg hover:bg-slate-800 cursor-pointer transition-colors"
                      onClick={() => handleMarkerClick(sim)}
                    >
                      <div className="text-xs text-indigo-400 mb-1">{sim.category}</div>
                      <div className="text-sm font-medium text-slate-200 line-clamp-2">{sim.title}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="p-4 border-t border-slate-800 bg-slate-900 flex gap-3">
            <button
              onClick={toggleSave}
              disabled={saving}
              className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                isSaved 
                  ? 'bg-slate-800 text-indigo-400 hover:bg-slate-700' 
                  : 'bg-indigo-600 text-white hover:bg-indigo-500'
              }`}
            >
              {isSaved ? <BookmarkMinus size={18} /> : <BookmarkPlus size={18} />}
              {isSaved ? 'Saved' : 'Save Event'}
            </button>
            <a 
              href={selectedEvent.url} 
              target="_blank" 
              rel="noreferrer"
              className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium bg-slate-800 text-slate-200 hover:bg-slate-700 transition-colors"
            >
              <ExternalLink size={18} />
            </a>
          </div>
        </div>
      )}
    </div>
  );
}
