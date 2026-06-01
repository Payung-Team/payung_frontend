import React, { useEffect, useRef, useState } from 'react';

interface MapPickerProps {
  latA: number;
  lngA: number;
  onChangeA: (lat: number, lng: number) => void;
  latB?: number;
  lngB?: number;
  onChangeB?: (lat: number, lng: number) => void;
  showPinB?: boolean;
}

const MapPicker: React.FC<MapPickerProps> = ({
  latA,
  lngA,
  onChangeA,
  latB = 13.736717,
  lngB = 100.560543,
  onChangeB,
  showPinB = false
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const markerAInstanceRef = useRef<any>(null);
  const markerBInstanceRef = useRef<any>(null);
  const polylineInstanceRef = useRef<any>(null);
  const [leafletLoaded, setLeafletLoaded] = useState(false);
  const [activePin, setActivePin] = useState<'A' | 'B'>('A');

  // Poll for window.L loading
  useEffect(() => {
    const checkLeaflet = () => {
      if ((window as any).L) {
        setLeafletLoaded(true);
      } else {
        setTimeout(checkLeaflet, 200);
      }
    };
    checkLeaflet();
  }, []);

  // Update Map & Markers
  useEffect(() => {
    if (!leafletLoaded) return;
    const L = (window as any).L;
    if (!L || !mapContainerRef.current) return;

    // Custom Icons
    const greenIcon = new L.Icon({
      iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png',
      shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
      iconSize: [25, 41],
      iconAnchor: [12, 41],
      popupAnchor: [1, -34],
      shadowSize: [41, 41]
    });

    const orangeIcon = new L.Icon({
      iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-orange.png',
      shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
      iconSize: [25, 41],
      iconAnchor: [12, 41],
      popupAnchor: [1, -34],
      shadowSize: [41, 41]
    });

    // Initialize Map
    if (!mapInstanceRef.current) {
      mapInstanceRef.current = L.map(mapContainerRef.current).setView([latA, lngA], 14);

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors'
      }).addTo(mapInstanceRef.current);

      // Marker A
      markerAInstanceRef.current = L.marker([latA, lngA], {
        draggable: true,
        icon: greenIcon
      }).addTo(mapInstanceRef.current);

      markerAInstanceRef.current.on('dragend', () => {
        const pos = markerAInstanceRef.current.getLatLng();
        onChangeA(pos.lat, pos.lng);
      });

      // Map Click Handler to update active pin
      mapInstanceRef.current.on('click', (e: any) => {
        const { lat: clickLat, lng: clickLng } = e.latlng;
        if (activePin === 'A') {
          markerAInstanceRef.current.setLatLng([clickLat, clickLng]);
          onChangeA(clickLat, clickLng);
        } else if (activePin === 'B' && showPinB && onChangeB) {
          if (!markerBInstanceRef.current) {
            markerBInstanceRef.current = L.marker([clickLat, clickLng], {
              draggable: true,
              icon: orangeIcon
            }).addTo(mapInstanceRef.current);

            markerBInstanceRef.current.on('dragend', () => {
              const pos = markerBInstanceRef.current.getLatLng();
              onChangeB(pos.lat, pos.lng);
            });
          } else {
            markerBInstanceRef.current.setLatLng([clickLat, clickLng]);
          }
          onChangeB(clickLat, clickLng);
        }
      });

      setTimeout(() => {
        if (mapInstanceRef.current) {
          mapInstanceRef.current.invalidateSize();
        }
      }, 500);
    } else {
      // Update Marker A externally
      const posA = markerAInstanceRef.current.getLatLng();
      if (posA.lat !== latA || posA.lng !== lngA) {
        markerAInstanceRef.current.setLatLng([latA, lngA]);
      }
    }

    // Handle Marker B visibility
    if (showPinB && onChangeB) {
      if (!markerBInstanceRef.current) {
        markerBInstanceRef.current = L.marker([latB, lngB], {
          draggable: true,
          icon: orangeIcon
        }).addTo(mapInstanceRef.current);

        markerBInstanceRef.current.on('dragend', () => {
          const pos = markerBInstanceRef.current.getLatLng();
          onChangeB(pos.lat, pos.lng);
        });
      } else {
        const posB = markerBInstanceRef.current.getLatLng();
        if (posB.lat !== latB || posB.lng !== lngB) {
          markerBInstanceRef.current.setLatLng([latB, lngB]);
        }
      }
    } else {
      if (markerBInstanceRef.current) {
        mapInstanceRef.current.removeLayer(markerBInstanceRef.current);
        markerBInstanceRef.current = null;
      }
    }

    // Polyline
    if (showPinB && markerBInstanceRef.current) {
      const latlngs = [
        [latA, lngA],
        [latB, lngB]
      ];
      if (!polylineInstanceRef.current) {
        polylineInstanceRef.current = L.polyline(latlngs, { color: '#52B69A', weight: 4, dashArray: '6, 6' }).addTo(mapInstanceRef.current);
      } else {
        polylineInstanceRef.current.setLatLngs(latlngs);
      }

      // Auto fit bounds
      const bounds = L.latLngBounds([latA, lngA], [latB, lngB]);
      mapInstanceRef.current.fitBounds(bounds, { padding: [50, 50] });
    } else {
      if (polylineInstanceRef.current) {
        mapInstanceRef.current.removeLayer(polylineInstanceRef.current);
        polylineInstanceRef.current = null;
      }
    }

  }, [leafletLoaded, latA, lngA, latB, lngB, showPinB, activePin, onChangeA, onChangeB]);

  // Clean up
  useEffect(() => {
    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  // Distance Calculation
  let distance = 0;
  if (leafletLoaded && showPinB) {
    const L = (window as any).L;
    if (L) {
      distance = L.latLng(latA, lngA).distanceTo(L.latLng(latB, lngB)) / 1000;
    }
  }

  return (
    <div className="space-y-3">
      {/* Control Buttons */}
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => setActivePin('A')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-semibold transition cursor-pointer ${
            activePin === 'A'
              ? 'bg-[#52B69A] border-[#52B69A] text-white'
              : 'border-[#E0E2E5] text-[#575859] hover:bg-gray-50'
          }`}
        >
          <span className="w-2.5 h-2.5 rounded-full bg-green-400 border border-white" />
          ปักหมุดบ้านฉัน (A)
        </button>
        {showPinB && (
          <button
            type="button"
            onClick={() => setActivePin('B')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-semibold transition cursor-pointer ${
              activePin === 'B'
                ? 'bg-[#E17055] border-[#E17055] text-white'
                : 'border-[#E0E2E5] text-[#575859] hover:bg-gray-50'
            }`}
          >
            <span className="w-2.5 h-2.5 rounded-full bg-orange-400 border border-white" />
            ปักหมุดจุดปลายทาง (B)
          </button>
        )}
      </div>

      {/* Map Container */}
      <div className="relative w-full h-[250px] border border-[#E0E2E5] rounded-xl overflow-hidden z-10 shadow-inner">
        <div ref={mapContainerRef} className="w-full h-full" style={{ minHeight: '250px' }} />
        
        {/* Distance Badge */}
        {showPinB && distance > 0 && (
          <div className="absolute top-3 left-3 bg-white p-2 rounded-lg border border-[#E0E2E5] shadow-md z-[1000] text-xs font-bold text-[#1A1A1A] flex items-center gap-1">
            <span className="material-icons text-[#52B69A] text-sm">navigation</span>
            ระยะทางการทำงาน {distance.toFixed(2)} กิโลเมตร
          </div>
        )}

        {!leafletLoaded && (
          <div className="absolute inset-0 bg-gray-50 flex flex-col items-center justify-center gap-2 z-[1000]">
            <span className="material-icons animate-spin text-[#52B69A]">refresh</span>
            <span className="text-xs text-[#8A8C8E] font-semibold">กำลังโหลดแผนที่สักครู่...</span>
          </div>
        )}
      </div>
    </div>
  );
};

export default MapPicker;
