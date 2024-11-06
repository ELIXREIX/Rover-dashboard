import { Component,OnInit } from '@angular/core';
import * as L from 'leaflet';

@Component({
  selector: 'app-monitor',
  standalone: true,
  imports: [],
  templateUrl: './monitor.component.html',
  styleUrl: './monitor.component.css'
})
export class MonitorComponent implements OnInit {
  
  private map!: L.Map;

  ngOnInit(): void {
    this.initMap();
    this.drawPathAndMarkers();
  }

  private initMap(): void {
    this.map = L.map('map').setView([34.2, -118.5], 15);
    
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '© OpenStreetMap contributors'
    }).addTo(this.map);
  }

  private drawPathAndMarkers(): void {
    // Your path and markers code here, adapted for Angular
    const path = this.generatePath();
    const pathLine = L.polyline(path.map(p => [p[0], p[1]]), {
      color: '#3B82F6',
      weight: 3,
      opacity: 0.8
    }).addTo(this.map);

    // Example of setting markers
    path.forEach((point, index) => {
      const circle = L.circleMarker([point[0], point[1]], {
        radius: 8,
        fillColor: '#4CAF50',
        color: '#fff',
        weight: 2,
        opacity: 1,
        fillOpacity: 0.8
      }).addTo(this.map);

      circle.bindPopup(`Point ${index + 1}`);
    });
  }

  private generatePath(): Array<[number, number]> {
    // Generate mock path data here
    return [
      [34.2, -118.5],
      [34.201, -118.501],
      // Add more points as needed
    ];
  }
}
