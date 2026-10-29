import React from 'react';
import { MapContainer, ImageOverlay, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix Leaflet marker icon issue in React
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

interface LeafletMapProps {
  mapBackground: string;
  images: any[];
  areas: any[];
}

export default function LeafletMap({ mapBackground, images, areas }: LeafletMapProps) {
  const bounds: L.LatLngBoundsExpression = [[0, 0], [100, 100]];

  return (
    <div className="w-full h-full relative z-0">
      <MapContainer 
        crs={L.CRS.Simple} 
        bounds={bounds} 
        style={{ height: '100%', width: '100%', background: '#f8fafc' }}
        zoomControl={true}
        attributionControl={false}
      >
        <ImageOverlay url={mapBackground} bounds={bounds} opacity={0.6} />
        
        {images.map(img => (
          <Marker key={img.id} position={[100 - img.y, img.x]}>
            <Popup>
              <div className="text-xs font-bold">{img.label || img.jobId}</div>
              <div className="text-[10px]">{img.jobType}</div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
}
