# 🌱 Smart Environmental Monitor

A comprehensive IoT environmental monitoring system built with **Raspberry Pi 5**, **Node.js**, **Vue 3**, and **Docker**. This project monitors air quality, temperature, humidity, noise levels, and more while providing real-time device control through a modern web interface.

## 📋 Project Overview

This IoT coursework demonstrates a complete environmental monitoring solution that addresses real-world environmental challenges in urban areas. The system provides:

- **Real-time Environmental Monitoring** - 6 sensors tracking key environmental parameters
- **Automated Device Control** - 5 actuators for environmental management
- **Web-based Dashboard** - Modern Vue 3 interface with real-time updates
- **Professional Architecture** - Docker containerization and microservices design

## 🎯 Academic Requirements Met

### Learning Outcomes Achieved:
1. ✅ **IoT Value Explanation** - Addresses urban environmental monitoring needs
2. ✅ **Component Recognition** - 6+ sensors and 5+ actuators with proper circuit design
3. ✅ **System Design** - Complete IoT architecture with wireless connectivity
4. ✅ **Software Development** - Professional Node.js backend with GPIO control

### Assessment Components:
- **Report** (25%) - Comprehensive 2000-word analysis
- **Circuit Diagrams** (5%) - Tinkercad and Fritzing designs
- **Network Diagram** (5%) - Cisco Packet Tracer implementation
- **Badges** (10%) - Cisco and Huawei certifications
- **Prototype** (65%) - Full working system with web interface

## 🔧 Hardware Components

### Sensors (6 total):
- **DHT22** - Temperature & Humidity monitoring
- **MQ-135** - Air quality (CO2, NOx, Alcohol detection)  
- **BH1750** - Light intensity measurement
- **MEMS Microphone** - Sound/noise level monitoring
- **Soil Moisture Sensor** - Plant watering automation
- **GPIO Expansion** - Additional sensor inputs

### Actuators (5 total):
- **12V Cooling Fan** - Air circulation control
- **RGB LED Strip** - Visual environmental status indicators
- **Piezo Buzzer** - Audio alerts for critical conditions
- **Water Pump** - Automated plant watering system
- **Ventilation Fan** - Variable speed air quality management

### Core Hardware:
- **Raspberry Pi 5** (8GB recommended)
- **MicroSD Card** (64GB+ high-speed)
- **GPIO Breakout Board**
- **Breadboard & Jumper Wires**
- **Relay Modules** (2-channel)
- **MCP3008 ADC** (for analog sensors)

## 🏗️ System Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Frontend      │    │    Backend      │    │   Database      │
│   Vue 3 + Vite │◄──►│   Node.js       │◄──►│   MongoDB       │
│   Tailwind CSS  │    │   Express.js    │    │   Redis Cache   │
│   (Port 3000)   │    │   (Port 8000)   │    │                 │
└─────────────────┘    └─────────────────┘    └─────────────────┘
        │                       │                       │
        └───────────────────────┼───────────────────────┘
                               │
                    ┌─────────────────┐
                    │  Docker Compose │
                    │   Orchestrator  │
                    └─────────────────┘
                               │
                    ┌─────────────────┐
                    │  Raspberry Pi 5 │
                    │   GPIO Control  │
                    │   Sensor Input  │
                    │ Actuator Output │
                    └─────────────────┘
```

## 🚀 Quick Start

### Prerequisites
- Raspberry Pi 5 with Raspberry Pi OS (64-bit)
- Docker and Docker Compose installed
- Node.js 18+ (for development)
- Git

### Installation

1. **Clone the Repository**
   ```bash
   git clone https://github.com/your-username/smart-env-monitor.git
   cd smart-env-monitor
   ```

2. **Configure Environment**
   ```bash
   cp .env.example .env
   # Edit .env with your specific settings
   ```

3. **Start with Docker**
   ```bash
   # Build and start all services
   docker-compose up -d
   
   # View logs
   docker-compose logs -f
   ```

4. **Access the Application**
   - **Web Interface**: http://localhost:3000
   - **API Endpoints**: http://localhost:8000/api
   - **Health Check**: http://localhost:8000/health

### Development Mode

1. **Backend Development**
   ```bash
   cd backend
   npm install
   npm run dev
   ```

2. **Frontend Development**
   ```bash
   cd frontend
   npm install
   npm run dev
   ```

## 📊 Features

### Real-time Monitoring
- **Environmental Dashboard** - Live sensor readings with trend analysis
- **WebSocket Updates** - Real-time data streaming to all connected clients
- **Historical Data** - Time-series data storage and visualization
- **Alert System** - Configurable thresholds with email/SMS notifications

### Device Control
- **Remote Actuator Control** - Web-based device management
- **Environmental Presets** - One-click environmental optimization
- **Emergency Systems** - Automatic response to critical conditions
- **Scheduling** - Time-based automation rules

### Professional Features
- **Responsive Design** - Mobile-first progressive web app
- **Dark/Light Themes** - Automatic theme detection
- **Data Export** - CSV/JSON export for analysis
- **System Diagnostics** - Comprehensive health monitoring
- **Multi-language Support** - English/Uzbek/Russian interface

## 🔌 GPIO Pin Configuration

```
Raspberry Pi 5 GPIO Layout:
┌─────────────────────────────────┐
│ 3V3  5V   GPIO2  5V   GPIO3  GND │
│ GPIO4 GPIO14 GND GPIO15 GPIO18 │
│ GND  GPIO23 GPIO24 GND GPIO25  │
│ GPIO8 GPIO7  GPIO1  GND GPIO12 │
│ GND  GPIO16 GPIO20 GPIO21 3V3  │
└─────────────────────────────────┘

Pin Assignments:
• GPIO 18 - DHT22 Data
• GPIO 25 - MQ135 Analog (via MCP3008)
• GPIO 23 - BH1750 I2C SCL
• GPIO 22 - Microphone Analog (via MCP3008)
• GPIO 27 - Soil Moisture Analog (via MCP3008)
• GPIO 17 - Fan Relay Control
• GPIO 26 - LED Strip PWM (Red)
• GPIO 20 - LED Strip PWM (Green)
• GPIO 21 - LED Strip PWM (Blue)
• GPIO 19 - Buzzer Control
• GPIO 16 - Water Pump Relay
• GPIO 12 - Ventilator PWM Control
```

## 🌐 API Documentation

### Core Endpoints

#### System Status
```http
GET /api/status
GET /api/health
GET /api/config
```

#### Sensor Data
```http
GET /api/sensors/status
GET /api/sensors/readings
GET /api/sensors/{sensor}/history?period=24h
POST /api/sensors/{sensor}/test
POST /api/sensors/{sensor}/calibrate
```

#### Device Control
```http
GET /api/devices/states
POST /api/devices/{device}/control
POST /api/devices/{device}/test
```

#### Data Management
```http
GET /api/data/export?format=csv&period=7d
GET /api/data/statistics
```

### WebSocket Events

#### Client → Server
```javascript
socket.emit('subscribe-sensors')
socket.emit('control-device', { device: 'fan', action: 'setSpeed', params: { speed: 75 } })
socket.emit('get-status')
```

#### Server → Client
```javascript
socket.on('sensor-data', (data) => { /* Real-time sensor readings */ })
socket.on('device-state-changed', (data) => { /* Device state updates */ })
socket.on('system-alert', (alert) => { /* System notifications */ })
socket.on('emergency-alert', (alert) => { /* Critical alerts */ })
```

## 🧪 Testing & Development

### Mock Development Mode
The system includes comprehensive mocking for development without physical hardware:

```bash
# Set development mode
export IS_RASPBERRY_PI=false

# Start backend with mocks
cd backend && npm run dev
```

**Mock Features:**
- Realistic sensor data simulation with trends
- Actuator state tracking and logging
- WebSocket real-time updates
- Complete API compatibility

### Testing Endpoints
```bash
# Test all sensors (development only)
curl http://localhost:8000/api/test/sensors

# Test all actuators (development only)  
curl http://localhost:8000/api/test/actuators

# Trigger emergency alert test
curl -X POST http://localhost:8000/api/test/emergency
```

## 📱 Progressive Web App

The frontend is built as a PWA with:
- **Offline Capability** - Service worker caching
- **Install Prompt** - Add to home screen functionality
- **Push Notifications** - Real-time alerts
- **Responsive Design** - Mobile-optimized interface

## 🔒 Security Features

- **CORS Configuration** - Secure cross-origin requests
- **Rate Limiting** - API abuse prevention
- **Helmet.js** - Security headers
- **Input Validation** - Joi schema validation
- **Error Handling** - Secure error responses
- **Environment Variables** - Sensitive data protection

## 📈 Performance Optimizations

- **Docker Multi-stage Builds** - Minimal production images
- **Vue 3 Composition API** - Optimal reactivity
- **Code Splitting** - Lazy-loaded routes
- **Compression** - Gzip response compression
- **Caching** - Redis session storage
- **WebSocket Efficiency** - Event-driven updates

## 🎓 Educational Value

### Technical Skills Demonstrated:
- **Full-stack Development** - Complete web application
- **IoT System Design** - Hardware/software integration
- **Real-time Systems** - WebSocket communication
- **Database Design** - Time-series data management
- **DevOps Practices** - Docker containerization
- **API Design** - RESTful architecture
- **Modern Frontend** - Vue 3 + TypeScript
- **GPIO Programming** - Hardware abstraction
- **Circuit Design** - Sensor/actuator integration

### Problem-Solving Approach:
- **Environmental Analysis** - Urban air quality challenges
- **Solution Architecture** - Scalable IoT system design
- **User Experience** - Intuitive interface design
- **Data Visualization** - Meaningful insights presentation
- **Alert Systems** - Proactive environmental management

## 📝 Coursework Deliverables

### 1. Report Structure (2000 words)
- **Introduction** - Problem statement and solution overview
- **Hardware Components** - Detailed sensor/actuator specifications
- **Technology Justification** - Architecture and technology choices
- **Implementation Details** - Circuit design and software architecture
- **Results & Analysis** - Performance evaluation and testing
- **Future Improvements** - Scalability and enhancement opportunities

### 2. Technical Documentation
- **Circuit Diagrams** - Tinkercad/Fritzing schematics
- **Network Topology** - Cisco Packet Tracer implementation
- **API Documentation** - Complete endpoint reference
- **Installation Guide** - Deployment instructions
- **User Manual** - Interface usage guide

### 3. Code Deliverables
- **Backend Source** - Node.js API with GPIO control
- **Frontend Source** - Vue 3 progressive web application
- **Docker Configuration** - Production deployment setup
- **Database Schemas** - MongoDB data models
- **Testing Suites** - Unit and integration tests

## 🛠️ Troubleshooting

### Common Issues

**GPIO Permission Errors:**
```bash
sudo usermod -a -G gpio $USER
sudo chmod 666 /dev/gpiomem
```

**Docker Container Issues:**
```bash
# Check container logs
docker-compose logs backend

# Restart services
docker-compose restart

# Rebuild containers
docker-compose up --build
```

**Sensor Reading Failures:**
```bash
# Check GPIO status
gpio readall

# Test individual sensors
curl http://localhost:8000/api/sensors/dht22/test
```

**Network Connectivity:**
```bash
# Check API connectivity
curl http://localhost:8000/health

# Verify WebSocket connection
wscat -c ws://localhost:8000
```

## 🤝 Contributing

This is an academic project, but contributions for educational purposes are welcome:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/improvement`)
3. Commit changes (`git commit -am 'Add educational enhancement'`)
4. Push to branch (`git push origin feature/improvement`)
5. Create Pull Request

## 📄 License

This project is developed for educational purposes as part of IoT coursework. See [LICENSE](LICENSE) for details.