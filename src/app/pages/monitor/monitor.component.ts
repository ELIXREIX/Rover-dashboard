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
      roverPath.data.forEach((point: any, index: number) => {
        // Access the actual value of latitude and longitude
        const latitude = point.Latitude ? parseFloat(point.Latitude.N) : undefined;
        const longitude = point.Longitude ? parseFloat(point.Longitude.N) : undefined;
        const terrainType = point.TerrainType ? point.TerrainType.S : 'Unknown';
        const temperature = point.Temperature ? parseFloat(point.Temperature.N) : NaN;
        const humidity = point.Humidity ? parseFloat(point.Humidity.N) : NaN;
        const timestamp = point.Timestamp ? point.Timestamp.S : '';
  
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
  
          circle.bindPopup(`
            <strong>Point ${index + 1}</strong><br>
            Terrain: ${terrainType}<br>
            Temperature: ${temperature.toFixed(1)}°C<br>
            Humidity: ${humidity.toFixed(1)}%<br>
            Time: ${new Date(timestamp).toLocaleTimeString()}
          `);
  
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
