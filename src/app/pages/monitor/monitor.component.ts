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
  
  map!: L.Map;
  roverPath: Array<[number, number, any]> = [];
  currentIndex = 0;
  roverMarker: L.Marker | undefined;

  // Colors for terrain types
  terrainColors: { [key: string]: string } = {
    'Fertile Soil': '#4CAF50',
    'Mineral Rich': '#2196F3',
    'Dry Terrain': '#FF9800',
    'Standard Soil': '#9E9E9E'
  };

  ngOnInit(): void {
    this.initializeMap();
    this.roverPath = this.generatePath();
    this.drawPathAndPoints();
    this.addLegend();
    this.simulateRoverMovement();
  }

  // Initialize the Leaflet map
  initializeMap(): void {
    this.map = L.map('map').setView([13.9018, 100.5317], 15);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '© OpenStreetMap contributors'
    }).addTo(this.map);
  }

  generatePath(): Array<[number, number, any]> {
    const path: Array<[number, number, any]> = [];
    const visited = new Set<string>();
    const basePos = [13.902175, 100.532455];
    const sideLength = 0.0015; // Length of each side of the square
    const steps = 20; // Number of steps in the random walk
  
    // Define boundaries (lat/lng limits)
  const minLat = basePos[0] - sideLength / 2;
  const maxLat = basePos[0] + sideLength / 2;
  const minLng = basePos[1] - sideLength / 2;
  const maxLng = basePos[1] + sideLength / 2;

  let currentPos = [...basePos];
  visited.add(currentPos.toString());

  for (let i = 0; i < steps; i++) {
    let newDirectionFound = false;

    while (!newDirectionFound) {
      const direction = Math.floor(Math.random() * 4);
      const newPos = [...currentPos];

      switch (direction) {
        case 0: // Move up
          newPos[0] += sideLength / steps;
          break;
        case 1: // Move down
          newPos[0] -= sideLength / steps;
          break;
        case 2: // Move right
          newPos[1] += sideLength / steps;
          break;
        case 3: // Move left
          newPos[1] -= sideLength / steps;
          break;
      }

      // Check if new position is within bounds
      if (
        newPos[0] >= minLat &&
        newPos[0] <= maxLat &&
        newPos[1] >= minLng &&
        newPos[1] <= maxLng
      ) {
        const posKey = newPos.toString();
        
        // Check if the new position is unvisited
        if (!visited.has(posKey)) {
          currentPos = newPos;
          visited.add(posKey);
          newDirectionFound = true;
        }
      }
    }

    path.push([
      currentPos[0],
      currentPos[1],
      {
        terrainType: ['Fertile Soil', 'Mineral Rich', 'Dry Terrain', 'Standard Soil'][Math.floor(Math.random() * 4)],
        temperature: 20 + Math.random() * 10,
        humidity: 40 + Math.random() * 30,
        timestamp: new Date(Date.now() - (steps - i) * 60000)
      }
    ]);
  }

  return path;
}
  
  // Draw rover path and data points on the map
  drawPathAndPoints(): void {
    const pathLine = L.polyline(this.roverPath.map(p => [p[0], p[1]]), {
      color: '#3B82F6',
      weight: 3,
      opacity: 0.8
    }).addTo(this.map);

    this.roverPath.forEach((point, index) => {
      const circle = L.circleMarker([point[0], point[1]], {
        radius: 8,
        fillColor: this.terrainColors[point[2].terrainType],
        color: '#fff',
        weight: 2,
        opacity: 1,
        fillOpacity: 0.8
      }).addTo(this.map);

      circle.bindPopup(`
        <strong>Point ${index + 1}</strong><br>
        Terrain: ${point[2].terrainType}<br>
        Temperature: ${point[2].temperature.toFixed(1)}°C<br>
        Humidity: ${point[2].humidity.toFixed(1)}%<br>
        Time: ${point[2].timestamp.toLocaleTimeString()}
      `);

      circle.on('click', () => {
        this.updateSelectedPointInfo(index, point);
      });
    });

    // Set initial rover position
    const lastPosition = this.roverPath[this.roverPath.length - 1];
    this.roverMarker = L.marker([lastPosition[0], lastPosition[1]], {
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

  // Update the selected point information
  updateSelectedPointInfo(index: number, point: any): void {
    const selectedPointInfo = document.getElementById('selected-point-info');
    if (selectedPointInfo) {
      selectedPointInfo.innerHTML = `
        <div class="data-point">
          <h3>Point ${index + 1}</h3>
          <p><strong>Terrain:</strong> ${point[2].terrainType}</p>
          <p><strong>Temperature:</strong> ${point[2].temperature.toFixed(1)}°C</p>
          <p><strong>Humidity:</strong> ${point[2].humidity.toFixed(1)}%</p>
          <p><strong>Time:</strong> ${point[2].timestamp.toLocaleTimeString()}</p>
        </div>
      `;
    }
  }

  // Add a legend to the map
  addLegend(): void {
    const LegendControl = L.Control.extend({
      options: { position: 'bottomright' },
      onAdd: () => {
        const div = L.DomUtil.create('div', 'legend');
        div.innerHTML = `
          <h4>Terrain Types</h4>
          ${Object.entries(this.terrainColors).map(([terrain, color]) => `
            <div class="legend-item">
              <div class="legend-color" style="background: ${color}"></div>
              <span>${terrain}</span>
            </div>
          `).join('')}
        `;
        return div;
      }
    });
    const legend = new LegendControl();
    legend.addTo(this.map);
  }

  // Simulate rover movement
  simulateRoverMovement(): void {
    setInterval(() => {
      if (this.currentIndex < this.roverPath.length - 1) {
        this.currentIndex++;
        if (this.roverMarker) {
          this.roverMarker.setLatLng([this.roverPath[this.currentIndex][0], this.roverPath[this.currentIndex][1]]);
        }
      }
    }, 1000);
  }
}
