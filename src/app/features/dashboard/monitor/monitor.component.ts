import { Component, OnInit } from '@angular/core';
import * as L from 'leaflet';
import { HttpClient } from '@angular/common/http';

// Define the RoverPoint interface to type the rover path data
interface RoverPoint {
  latitude: number;
  longitude: number;
  terrainType: string;
  temperature: number;
  humidity: number;
  timestamp: string;
}

@Component({
  selector: 'app-monitor',
  standalone: true,
  imports: [],
  templateUrl: './monitor.component.html',
  styleUrls: ['./monitor.component.css']
})
export class MonitorComponent implements OnInit {
  
  map!: L.Map;
  roverMarker: L.Marker | undefined;

  constructor(private http: HttpClient) {}
  dataPoints: number = 0;

  ngOnInit(): void {
    this.initializeMap();
    this.fetchRoverPath();
  }

  // Initialize the Leaflet map
  initializeMap(): void {
    this.map = L.map('map').setView([13.9018, 100.5317], 15);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '© OpenStreetMap contributors'
    }).addTo(this.map);
  }

  // Fetch data from API
  fetchRoverPath(): void {
    const apiUrl = 'https://2bnjthh3q9.execute-api.ap-southeast-1.amazonaws.com/ManualDeploy/upload-data';  // Replace with your actual API URL

    this.http.get<any[]>(apiUrl).subscribe(data => {
      this.plotRoverPath(data);
    }, error => {
      console.error('Error fetching rover path data', error);
    });
  }

  plotRoverPath(roverPath: any): void {
    // Check if roverPath has a 'data' property that is an array
    if (roverPath && Array.isArray(roverPath.data)) {
      // Update the data points in the UI
      const dataPointsElement = document.getElementById('data-points-value');
      if (dataPointsElement) {
      const dataPoints = roverPath.data.length;
      dataPointsElement.textContent = dataPoints.toString();
      }  else {
      console.error('Element with id "data-points-value" not found.');
      }
  
      roverPath.data.forEach((point: any, index: number) => {
        // Access the actual value of latitude and longitude
        const latitude = point.Latitude ? parseFloat(point.Latitude.N) : undefined;
        const longitude = point.Longitude ? parseFloat(point.Longitude.N) : undefined;
        const terrainType = point.TerrainType ? point.TerrainType.S : 'Unknown';
        const temperature = point.Temperature ? parseFloat(point.Temperature.N) : NaN;
        const humidity = point.Humidity ? parseFloat(point.Humidity.N) : NaN;
        const timestamp = point.Timestamp ? point.Timestamp.S : '';

        const firstPoint = roverPath.data[0];
        const lastPoint = roverPath.data[roverPath.data.length - 1];
    
        // Extract latitudes and longitudes
        const lat1 = firstPoint.Latitude ? parseFloat(firstPoint.Latitude.N) : 0;
        const lon1 = firstPoint.Longitude ? parseFloat(firstPoint.Longitude.N) : 0;
        const lat2 = lastPoint.Latitude ? parseFloat(lastPoint.Latitude.N) : 0;
        const lon2 = lastPoint.Longitude ? parseFloat(lastPoint.Longitude.N) : 0;
    
        // Calculate distance between first and last points
        const distance = this.calculateDistance(lat1, lon1, lat2, lon2);
    
        // Update the 'Distance Covered' display in HTML
        document.querySelector('.metric-value')!.textContent = `${distance.toFixed(2)} km`;
    
        // Check if latitude and longitude are valid
        if (latitude !== undefined && longitude !== undefined) {
          const circle = L.circleMarker([latitude, longitude], {
            radius: 8,
            fillColor: this.getTerrainColor(terrainType),
            color: '#fff',
            weight: 2,
            opacity: 1,
            fillOpacity: 0.8
          }).addTo(this.map);

    
          circle.on('click', () => {
            // Popup functionality
            circle.bindPopup(`
              <strong>Point ${index + 1}</strong><br>
              Terrain: ${terrainType}<br>
              Temperature: ${temperature.toFixed(1)}°C<br>
              Humidity: ${humidity.toFixed(1)}%<br>
              Time: ${new Date(timestamp).toLocaleTimeString()}
            `).openPopup();
  
            // Update the #selected-point-info div
            const pointInfoHtml = `
              <strong>Point ${index + 1}</strong><br>
              Terrain: ${terrainType}<br>
              Temperature: ${temperature.toFixed(1)}°C<br>
              Humidity: ${humidity.toFixed(1)}%<br>
              Time: ${new Date(timestamp).toLocaleTimeString()}
            `;
            document.getElementById('selected-point-info')!.innerHTML = pointInfoHtml;
          });
    
          if (index === roverPath.data.length - 1) {
            this.roverMarker = L.marker([latitude, longitude], {
              icon: L.divIcon({
                className: 'rover-marker',
                html: `
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="#EF4444">
                    <circle cx="12" cy="12" r="8"/>
                  </svg>
                `,
                iconSize: [24, 24],
                iconAnchor: [12, 12]
              })
            }).addTo(this.map);
          }
        } else {
          console.error(`Invalid coordinates for point ${index + 1}:`, point);
        }
      });
    } else {
      console.error('roverPath is not an object with a data array', roverPath);
    }
  }
  
  // Haversine function to calculate distance between two lat/lon points
  calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371; // Radius of the Earth in km
    const dLat = this.degreesToRadians(lat2 - lat1);
    const dLon = this.degreesToRadians(lon2 - lon1);

    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.cos(this.degreesToRadians(lat1)) * Math.cos(this.degreesToRadians(lat2)) *
              Math.sin(dLon / 2) * Math.sin(dLon / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c; // Distance in km
  }

  // Convert degrees to radians
  degreesToRadians(degrees: number): number {
    return degrees * (Math.PI / 180);
  }
  

  // Get terrain color based on type
  getTerrainColor(terrainType: string): string {
    const terrainColors: { [key: string]: string } = {
      'Fertile Soil': '#4CAF50',
      'Mineral Rich': '#2196F3',
      'Dry Terrain': '#FF9800',
      'Standard Soil': '#9E9E9E'
    };
    return terrainColors[terrainType] || '#9E9E9E';
  }
}
