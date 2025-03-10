import { Component, OnInit } from '@angular/core';
import * as L from 'leaflet';
import { HttpClient } from '@angular/common/http';
import { finalize,tap } from 'rxjs/operators'
import { NzSpinModule } from 'ng-zorro-antd/spin';
import { differenceInDays } from 'date-fns';
import { get } from 'http';
import { NzDatePickerModule } from 'ng-zorro-antd/date-picker';
import { FormsModule } from '@angular/forms';
import { NzCalendarModule } from 'ng-zorro-antd/calendar';
import { NzModalModule } from 'ng-zorro-antd/modal';
import { CommonModule, DatePipe } from '@angular/common';
import { NzRadioModule } from 'ng-zorro-antd/radio';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { ClockCircleOutline } from '@ant-design/icons-angular/icons';


// Define the RoverPoint interface to type the rover path data
interface RoverPoint {
  latitude: number;
  longitude: number;
  terrainType: string;
  temperature: number;
  humidity: number;
  timestamp: string;
}

interface DynamoDBValue {
  N?: string;
  S?: string;
}

interface DynamoDBPoint {
  Temp: DynamoDBValue;
  Date: DynamoDBValue;
  Altitude: DynamoDBValue;
  Longitude: DynamoDBValue;
  Latitude: DynamoDBValue;
  K: DynamoDBValue;
  Moisture: DynamoDBValue;
  N: DynamoDBValue;
  P: DynamoDBValue;
  PointID: DynamoDBValue;
  pH: DynamoDBValue;
  Time: DynamoDBValue;
  EC: DynamoDBValue;
}

interface APIResponse {
  message: string;
  data: DynamoDBPoint[];
  total: number;
}

interface StatusResponse {
  status: 'active' | 'pending' | 'offline';
}

@Component({
  selector: 'app-monitor',
  standalone: true,
  imports: [NzSpinModule,
    NzDatePickerModule,
    NzCalendarModule,
    NzModalModule,
    DatePipe,
    NzRadioModule,
    FormsModule,
    NzIconModule,
    CommonModule,
  ], 
  templateUrl: './monitor.component.html',
  styleUrls: ['./monitor.component.css'],
})
export class MonitorComponent implements OnInit {
  isCalendarVisible: boolean = false;
  private API_URL = 'https://hi23k7tpql.execute-api.ap-southeast-1.amazonaws.com/default/Roverdata-date';
  dateRange: Date[] = [];
  totalDataPoints: number = 0;
  currentStatus: 'active' | 'pending' | 'offline' = 'pending';
  map!: L.Map;
  roverMarker: L.Marker | undefined;
  private markers: L.CircleMarker[] = [];  // Store markers
  private refreshInterval: any;
  private readonly REFRESH_RATE = 60000;  // 5 seconds
  private readonly REFRESH_RATE_DB = 10000;  // 1 minutes
  roverPoints: RoverPoint[] = [];
  selectedDate: Date = new Date();
  nzMode: 'month' | 'year' = 'month';
  private dataRefreshInterval: any;

  isLoading = false;
  statusText = {
    active: '🟢 Database Active',
    pending: '🟡 Connection Unstable',
    offline: '🔴 Database Not Reachable'
  };

  showCalendar(): void {
    this.isCalendarVisible = true;
  }

  handleCalendarClose(): void {
    this.isCalendarVisible = false;
  }
  
  constructor(private http: HttpClient) {}

  dataPoints: number = 0;

  ngOnInit(): void {
    this.initializeMap();
    this.getDatabaseStatus();

    const knownDate = new Date();
    this.selectedDate = knownDate;

    const formattedDate = this.formatDate(knownDate);
    console.log('Initial date set to:', formattedDate); // Debug log

    Promise.all([
      this.getDatabaseStatus(),
      this.fetchInitialData(formattedDate)
    ]).then(() => {
      console.log('Initial data and status loaded');
      
      // Set up database status refresh interval
      this.refreshInterval = setInterval(() => {
        this.getDatabaseStatus();
      }, this.REFRESH_RATE_DB);

      // Set up data refresh interval
      this.dataRefreshInterval = setInterval(() => {
        this.refreshData();
      }, this.REFRESH_RATE);
      
    }).catch(error => {
      console.error('Error during initialization:', error);
    });
  }

  refreshData(): void {
    if (this.isLoading) return;
    
    const formattedDate = this.formatDate(this.selectedDate);
    console.log('Refreshing data for date:', formattedDate);
  
    Promise.all([
      this.fetchInitialData(formattedDate)
    ]).then(() => {
      console.log('Data refreshed successfully');
    }).catch(error => {
      console.error('Error refreshing data:', error);
    });
  }

  ngOnDestroy(): void {
    if (this.refreshInterval) {
      clearInterval(this.refreshInterval);
    }
    if (this.dataRefreshInterval) {
      clearInterval(this.dataRefreshInterval);
    }
  }

  private clearMarkers(): void {
    this.markers.forEach(marker => marker.remove());
    this.markers = [];
    if (this.roverMarker) {
      this.roverMarker.remove();
    }
  }

  private formatDate(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }


  private fetchInitialData(date: string): Promise<void> {
    this.isLoading = true;
    console.log('Fetching initial data for date:', date); // Debug log
    
    return new Promise((resolve, reject) => {
      this.http.get<APIResponse>(this.API_URL, { params: { date } })
        .pipe(
          tap(response => console.log('Raw API response:', response)), // Debug log
          finalize(() => {
            this.isLoading = false;
          })
        )
        .subscribe({
          next: (response) => {
            if (response.data.length === 0) {
              console.warn('No data available for date:', date);
            }
            this.totalDataPoints = response.total;
            this.plotRoverPath(response);
            resolve();
          },
          error: (error) => {
            console.error(`Error fetching data for date: ${date}`, error);
            reject(error);
          }
        });
    });
  }
  
  // Initialize the Leaflet map
  initializeMap(): void {
    // Add your Mapbox access token here
    const accessToken = 'pk.eyJ1IjoibHVjaWxhcnkiLCJhIjoiY20zbzZmNTY1MDA3cjJwcHl5enJ3azFhMSJ9.q24N9tj7qe4DW9qmQ7QXWQ';
    
    // Initialize the map
    this.map = L.map('map').setView([13.9018, 100.5317], 15);
  
    // Add Mapbox satellite tiles
    L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
      attribution: '© <a href="https://www.mapbox.com/about/maps/">Mapbox</a>',
      maxZoom: 19,
      id: 'satellite-v9', // You can change this to other styles
      accessToken: accessToken
    }).addTo(this.map);
  
    // Optional: Add layer controls
    const baseMaps = {
      "Satellite": L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
        attribution: '© Mapbox',
        maxZoom: 19,
        accessToken: accessToken
      }),
      "Streets": L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© Mapbox',
        maxZoom: 19,
        accessToken: accessToken
      })
    };
  
    L.control.layers(baseMaps).addTo(this.map);
  }

  // Fetch data from API
  // fetchRoverPath(): void {
  //   const apiUrl = 'https://2bnjthh3q9.execute-api.ap-southeast-1.amazonaws.com/ManualDeploy/upload-data';  // Replace with your actual API URL

  //   this.http.get<any[]>(apiUrl).subscribe(data => {
  //     this.plotRoverPath(data);
  //   }, error => {
  //     console.error('Error fetching rover path data', error);
  //   });
  // }
  onDateSelect(event: any): void {
    let selectedDate: Date;
    
    if (event instanceof Date) {
      selectedDate = event;
    } else if (event.target?.value) {
      selectedDate = new Date(event.target.value);
    } else {
      console.error('Invalid date event:', event);
      return;
    }
    
    this.selectedDate = selectedDate;
    const formattedDate = this.formatDate(selectedDate);
    console.log('Selected date formatted:', formattedDate); // Debug log
    
    this.fetchRoverPath(formattedDate);
  }

  fetchRoverPath(date: string): void {
    this.isLoading = true;
    const params = { date };
  
    this.http.get<APIResponse>(this.API_URL, { params })
      .pipe(
        finalize(() => {
          this.isLoading = false;
        })
      )
      .subscribe({
        next: (response) => {
          console.log('Data fetched:', response);
          this.totalDataPoints = response.total;
          this.plotRoverPath(response);
        },
        error: (error) => {
          console.error('Error fetching data:', error);
        }
      });
  }
  plotRoverPath(roverPath: any): void {
    this.clearMarkers();
    console.log('Received roverPath:', roverPath);
  
    if (roverPath && Array.isArray(roverPath.data)) {
      // Update the data points counter
      const dataPointsElement = document.getElementById('data-points-value');
      if (dataPointsElement) {
        const dataPoints = roverPath.data.length;
        dataPointsElement.textContent = dataPoints.toString();
      }

      const proximityThreshold = 0.00005; // Threshold for grouping in degrees
      const pointGroups: any[][] = [];
  
      // Process each point
      roverPath.data.forEach((point: any, index: number) => {
        const latitude = point.Latitude ? parseFloat(point.Latitude.N) : undefined;
        const longitude = point.Longitude ? parseFloat(point.Longitude.N) : undefined;
        const temperature = point.Temp ? parseFloat(point.Temp.N) : NaN;
        const moisture = point.Moisture ? parseFloat(point.Moisture.N) : NaN;
        const time = point.Time ? point.Time.S : '';
        const date = point.Date ? point.Date.S : '';
        const kValue = point.K ? parseFloat(point.K.N) : NaN;
        const nValue = point.N ? parseFloat(point.N.N) : NaN;
        const pValue = point.P ? parseFloat(point.P.N) : NaN;
        const pH = point.pH ? parseFloat(point.pH.N) : NaN;
        const ec = point.EC ? parseFloat(point.EC.N) : NaN;
        const altitude = point.Altitude ? parseFloat(point.Altitude.N) : NaN;
  
        if (latitude === undefined || longitude === undefined) return;
      
        // Check if point is close to any existing group
        let foundGroup = false;
        for (const group of pointGroups) {
          const groupPoint = group[0]; // Use first point as reference
          const groupLat = parseFloat(groupPoint.Latitude.N);
          const groupLon = parseFloat(groupPoint.Longitude.N);
          
          if (Math.abs(latitude - groupLat) < proximityThreshold && 
              Math.abs(longitude - groupLon) < proximityThreshold) {
            group.push({...point, originalIndex: index}); // Add to existing group with index
            foundGroup = true;
            break;
          }
        }
        
        // If not close to any group, create new group
        if (!foundGroup) {
          pointGroups.push([{...point, originalIndex: index}]);
        }
      });
      
      console.log(`Grouped ${roverPath.data.length} points into ${pointGroups.length} clusters`);
      
      // Create markers for each group
      pointGroups.forEach((group: any[]) => {
        // Use the first point's coordinates for the marker
        const firstPoint = group[0];
        const latitude = parseFloat(firstPoint.Latitude.N);
        const longitude = parseFloat(firstPoint.Longitude.N);
        
        // Calculate average values for display
        const temperature = group.reduce((sum, p) => sum + parseFloat(p.Temp.N), 0) / group.length;
        const moisture = group.reduce((sum, p) => sum + parseFloat(p.Moisture.N), 0) / group.length;
        
        // Create a marker for the group
        const circle = L.circleMarker([latitude, longitude], {
          radius: 6 + Math.min(4, group.length - 1), // Slightly larger radius for groups with more points
          fillColor: this.getRandomColor(),
          color: '#fff',
          weight: 2,
          opacity: 1,
          fillOpacity: 0.8
        }).addTo(this.map);
        
        // Expanded coverage area indicator with larger radius for visibility
        const coverageRadius = this.degreesToMeters(proximityThreshold * 2.0); // 50% larger than the grouping threshold
        const coverageArea = L.circle([latitude, longitude], {
          radius: coverageRadius,
          color: '#3388ff',
          weight: 1,
          opacity: 0.5,
          fillOpacity: 0.2,
          interactive: false // Make it non-interactive so it doesn't interfere with clicks
        }).addTo(this.map);
        
        this.markers.push(circle);  // Store marker reference
        this.markers.push(coverageArea);  // Store coverage area reference
        
        // Add click handler to show all points in this group
        circle.on('click', () => {
          // Map grouped points to include global index
          const groupedPoints = group.map((p: any) => ({
            ...p,
            globalIndex: p.originalIndex + 1
          }));
          
          let currentPointIndex = 0;
          
          // Create popup content updater
          const updatePopupContent = (pointIndex: number) => {
            const point = groupedPoints[pointIndex];
            return `
              <div class="popup-container">
                <div class="popup-navigation">
                  ${pointIndex > 0 ? '<button class="nav-btn prev">←</button>' : ''}
                  <span>Point ${point.globalIndex} (${pointIndex + 1}/${groupedPoints.length})</span>
                  ${pointIndex < groupedPoints.length - 1 ? '<button class="nav-btn next">→</button>' : ''}
                </div>
                <div class="popup-content">
                  Temperature: ${parseFloat(point.Temp.N).toFixed(1)}°C<br>
                  Moisture: ${parseFloat(point.Moisture.N).toFixed(1)}%<br>
                  pH: ${parseFloat(point.pH.N).toFixed(2)}<br>
                  NPK: ${parseFloat(point.N.N).toFixed(1)}/${parseFloat(point.P.N).toFixed(1)}/${parseFloat(point.K.N).toFixed(1)}<br>
                  EC: ${parseFloat(point.EC.N).toFixed(2)} mS/cm<br>
                  Time: ${point.Time.S}<br>
                  Date: ${point.Date.S}
                </div>
              </div>
            `;
          };
          
          // Create and open popup
          const popup = L.popup({
            maxWidth: 300,
            className: 'point-popup'
          })
          .setLatLng([latitude, longitude])
          .setContent(updatePopupContent(currentPointIndex));
          
          circle.bindPopup(popup).openPopup();
          
          // Add event listeners for navigation buttons
          document.addEventListener('click', function(e) {
            const target = e.target as HTMLElement;
            if (target.classList.contains('prev')) {
              currentPointIndex = Math.max(0, currentPointIndex - 1);
              popup.setContent(updatePopupContent(currentPointIndex));
              // Update selected point info with current point
              const point = groupedPoints[currentPointIndex];
              document.getElementById('selected-point-info')!.innerHTML = `
                <div class="data-point">
                  <strong>Point ${point.globalIndex}</strong><br>
                  Temperature: ${parseFloat(point.Temp.N).toFixed(1)}°C<br>
                  Moisture: ${parseFloat(point.Moisture.N).toFixed(1)}%<br>
                  pH: ${parseFloat(point.pH.N).toFixed(2)}<br>
                  NPK: ${parseFloat(point.N.N).toFixed(1)}/${parseFloat(point.P.N).toFixed(1)}/${parseFloat(point.K.N).toFixed(1)}<br>
                  EC: ${parseFloat(point.EC.N).toFixed(2)} mS/cm<br>
                  Altitude: ${parseFloat(point.Altitude.N)}m<br>
                  Time: ${point.Time.S}<br>
                  Date: ${point.Date.S}
                </div>
              `;
            } else if (target.classList.contains('next')) {
              currentPointIndex = Math.min(groupedPoints.length - 1, currentPointIndex + 1);
              popup.setContent(updatePopupContent(currentPointIndex));
              // Update selected point info with current point
              const point = groupedPoints[currentPointIndex];
              document.getElementById('selected-point-info')!.innerHTML = `
                <div class="data-point">
                  <strong>Point ${point.globalIndex}</strong><br>
                  Temperature: ${parseFloat(point.Temp.N).toFixed(1)}°C<br>
                  Moisture: ${parseFloat(point.Moisture.N).toFixed(1)}%<br>
                  pH: ${parseFloat(point.pH.N).toFixed(2)}<br>
                  NPK: ${parseFloat(point.N.N).toFixed(1)}/${parseFloat(point.P.N).toFixed(1)}/${parseFloat(point.K.N).toFixed(1)}<br>
                  EC: ${parseFloat(point.EC.N).toFixed(2)} mS/cm<br>
                  Altitude: ${parseFloat(point.Altitude.N)}m<br>
                  Time: ${point.Time.S}<br>
                  Date: ${point.Date.S}
                </div>
              `;
            }
          });
          
          // Update selected point info with first point in group
          const point = groupedPoints[0];
          document.getElementById('selected-point-info')!.innerHTML = `
            <div class="data-point">
              <strong>Point ${point.globalIndex}</strong><br>
              Temperature: ${parseFloat(point.Temp.N).toFixed(1)}°C<br>
              Moisture: ${parseFloat(point.Moisture.N).toFixed(1)}%<br>
              pH: ${parseFloat(point.pH.N).toFixed(2)}<br>
              NPK: ${parseFloat(point.N.N).toFixed(1)}/${parseFloat(point.P.N).toFixed(1)}/${parseFloat(point.K.N).toFixed(1)}<br>
              EC: ${parseFloat(point.EC.N).toFixed(2)} mS/cm<br>
              Altitude: ${parseFloat(point.Altitude.N)}m<br>
              Time: ${point.Time.S}<br>
              Date: ${point.Date.S}
            </div>
          `;
        });
      });
  
      // Calculate and update path metrics
      if (roverPath.data.length >= 2) {
        const sortedData = [...roverPath.data].sort((a, b) => {
          const aTime = new Date(`${a.Date.S} ${a.Time.S}`).getTime();
          const bTime = new Date(`${b.Date.S} ${b.Time.S}`).getTime();
          return aTime - bTime;
        });

        const firstTimestamp = new Date(`${sortedData[0].Date.S} ${sortedData[0].Time.S}`).getTime();
        const lastTimestamp = new Date(`${sortedData[sortedData.length - 1].Date.S} ${sortedData[sortedData.length - 1].Time.S}`).getTime();

        const [actualFirst, actualLast] = firstTimestamp < lastTimestamp 
        ? [sortedData[0], sortedData[sortedData.length - 1]] 
        : [sortedData[sortedData.length - 1], sortedData[0]];

        const firstPoint = sortedData[0];
        const lastPoint = sortedData[sortedData.length - 1];
        const lat1 = parseFloat(actualFirst.Latitude.N);
        const lon1 = parseFloat(actualFirst.Longitude.N);
        const lat2 = parseFloat(actualLast.Latitude.N);
        const lon2 = parseFloat(actualLast.Longitude.N);
        const distance = this.calculateDistance(lat1, lon1, lat2, lon2);
        
        // Update distance display
        const distanceElement = document.querySelector('.metric:first-child .metric-value');
        if (distanceElement) {
          distanceElement.textContent = `${distance.toFixed(2)} km`;
        }

        // Calculate and update active time
        const activeTime = this.calculateActiveTime(firstPoint, lastPoint);
        const activeTimeElement = document.querySelector('.metric:nth-child(4) .metric-value');
        if (activeTimeElement) {
          activeTimeElement.textContent = activeTime;
        }
      }
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
// Generate a random color
getRandomColor(): string {
  const letters = '0123456789ABCDEF';
  let color = '#';
  for (let i = 0; i < 6; i++) {
    color += letters[Math.floor(Math.random() * 16)];
  }
  return color;
}



private getDatabaseStatus(): Promise<void> {
  return new Promise((resolve, reject) => {
    this.isLoading = true;
    
    this.http.get<StatusResponse>('https://8h8rxm8ld9.execute-api.ap-southeast-1.amazonaws.com/default/Table-Status')
      .pipe(
        tap((response: StatusResponse) => {
          console.log('API Response:', response);
        }),
        finalize(() => {
          this.isLoading = false;
          console.log('Request completed');
        })
      )
      .subscribe({
        next: (response: StatusResponse) => {
          this.currentStatus = response.status;
          console.log('Status updated:', this.currentStatus);
          resolve();
        },
        error: (error) => {
          console.error('API Error:', error);
          this.currentStatus = 'offline';
          reject(error);
        }
      });
    });
}

getCurrentStatusText(): string {
  return this.statusText[this.currentStatus] || 'Unknown Status';
}

private calculateActiveTime(firstPoint: any, lastPoint: any): string {

  // Sort the points by timestamp
  const firstTimestamp = new Date(`${firstPoint.Date.S} ${firstPoint.Time.S}`).getTime();
  const lastTimestamp = new Date(`${lastPoint.Date.S} ${lastPoint.Time.S}`).getTime();

  // Determine which point is actually first and last
  const [actualFirst, actualLast] = firstTimestamp < lastTimestamp 
    ? [firstPoint, lastPoint] 
    : [lastPoint, firstPoint];

  // Convert time strings to Date objects
  const firstTime = new Date(`${actualFirst.Date.S} ${actualFirst.Time.S}`);
  const lastTime = new Date(`${actualLast.Date.S} ${actualLast.Time.S}`);

  // Calculate difference in milliseconds
  const diffMs = Math.abs(lastTime.getTime() - firstTime.getTime());
  
  // Convert to minutes
  const minutes = Math.floor(diffMs / 60000);
  
  // Format the output
  if (minutes < 60) {
    return `${minutes} minutes`;
  } else {
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    return `${hours}hours ${remainingMinutes}minutes`;
  }
  
}

degreesToMeters(degrees: number): number {
  // Rough approximation: 1 degree of latitude is about 111,000 meters
  // This is a simplified calculation and varies by latitude
  return degrees * 111000;
}

}
