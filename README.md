<div align="center">

<img src="./public/HamBaar-Logo.png" alt="HamBaar Logo" width="120">

# Hambaar - Package Delivery Platform

**A modern, scalable package delivery platform that matches package senders with transporters, built with Node.js, NestJS, PostgreSQL, and Redis.**

[![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white)](https://typescriptlang.org/)
[![Node.js](https://img.shields.io/badge/Node.js-43853D?style=for-the-badge&logo=node.js&logoColor=white)](https://nodejs.org/)
[![NestJS](https://img.shields.io/badge/Nest.js-%23E0234E.svg?style=for-the-badge&logo=nestjs&logoColor=white)](https://nestjs.com/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-316192?style=for-the-badge&logo=postgresql&logoColor=white)](https://postgresql.org/)
[![Prisma](https://img.shields.io/badge/Prisma-3982CE?style=for-the-badge&logo=Prisma&logoColor=white)](https://prisma.io/)
[![Redis](https://img.shields.io/badge/Redis-DC382D?style=for-the-badge&logo=redis&logoColor=white)](https://redis.io/)
[![AWS S3](https://img.shields.io/badge/AWS%20S3-FF9900?style=for-the-badge&logo=amazon-s3&logoColor=white)](https://aws.amazon.com/s3/)
[![Docker](https://img.shields.io/badge/Docker-2496ED?style=for-the-badge&logo=docker&logoColor=white)](https://docker.com/)
[![Jest](https://img.shields.io/badge/Jest-C21325?style=for-the-badge&logo=jest&logoColor=fff)](https://jestjs.io/)
[![Turf.js](https://img.shields.io/badge/Turf.js-32a852?style=for-the-badge&logoColor=fff)](https://jestjs.io/)

[![](https://img.shields.io/badge/Full%20Documentation-red?style=for-the-badge)](https://drive.google.com/file/d/1nSIkxipE-sYVW1Y3W7HRrLI6RB_UFHfb/view?usp=sharing)
[![](https://img.shields.io/badge/Database%20Schema-8A2BE2?style=for-the-badge)](https://dbdiagram.io/d/hambaar-db-686b7b0cf413ba350893efca)
[![](https://img.shields.io/badge/Frontend%20Repository-blue?style=for-the-badge)](https://github.com/hambaar-app/frontend)

</div>

## 🏗️ Architecture Overview

<div align="center">
  <img src="./public/Architecture.png" alt="HamBaar Architecture" width="800">
</div>
</br>

The system uses a modern containerized architecture with frontend/backend separation, leveraging relational and non-relational databases, cloud storage, and third-party API integrations.

### Architecture Components

- **Frontend Container**: Vue.js with Nginx for serving static files and handling HTTP requests with JWT cookies
- **Backend Container**: NestJS/Node.js handling core business logic, REST APIs, JWT authentication, and third-party API processing
- **PostgreSQL Database**: Self-hosted in Docker container, storing relational data (packages, users, delivery records) via Prisma ORM
- **Redis**: Self-hosted in Docker container with multiple databases:
  - Database 1: OTP data (one-time passwords)
  - Database 2: Session data
- **AWS S3**: Cloud storage for package images and transporter documents using pre-signed URLs
- **External APIs**:
  - **Neshan Maps API**: Map data and routing analysis
  - **SMS API**: OTP and notification delivery
  - **Validation API**: Transporter verification (personal info, vehicles)

## 🚀 Technology Stack

- **Runtime**: Node.js 22.14
- **Framework**: NestJS
- **Database**: PostgreSQL with Prisma ORM
- **Cache/Session**: Redis
- **File Storage**: AWS S3 (Liara Space)
- **Maps**: Neshan Maps API
- **Containerization**: Docker & Docker Compose
- **Deployment**: Liara Cloud Platform
- **CI/CD**: GitHub Workflows

## 👥 User Roles

### Sender
- Create and manage packages
- Find matched trips with the package
- Send delivery requests to transporters
- Track package status
- Rate and review transporters
- Manage payments

### Transporter
- Create and manage trips
- View and manage (Accept/reject) delivery requests
- Update trip status
  - Start/End trip
  - Toggle send request access
- Update package tracking info
- Delivery packages
- Manage vehicles
- Edit profile

### Support
- Transporter verification
- Monitor system activities

### Admin
- Full system administration

## 🗄️ Database Schema

The system uses PostgreSQL with the following main entities:

### Core Entities
- **User**: Basic user information and authentication
- **Transporter**: Extended profile for courier users
- **Package**: Package details and delivery information
- **Trip**: Transporter journey information
- **Address**: Location and address management
- **Vehicle**: Transporter vehicle information

### Matching System
- **TripRequest**: Package delivery requests to specific trips
- **MatchedRequest**: Confirmed package-trip matches
- **TrackingUpdate**: Real-time package tracking information

### Financial System
- **Wallet**: User wallet management
- **Transaction**: Financial transaction records

### Geographic Data
- **Province**: Province information
- **City**: City data with coordinates
- **TripWaypoint**: Intermediate points in trips

## 🔐 Authentication & Authorization

The system implements a multi-stage authentication process using JWT tokens:

### Authentication Flow
1. **OTP Verification**: SMS-based phone number verification
2. **Role-based Registration**: Different flows for senders and transporters
3. **Token Management**: Three types of JWT tokens with different purposes

### Token Types
- **Temporary Token**: 20-minute validity for initial registration (Generated after check otp successfully)
- **Progress Token**: 2-day validity for transporter multi-step registration
- **Access Token**: 20-day validity for full system access

### Authorization Guards
- Role-based access control
- Resource ownership validation
- Token-based route protection

## 📦 Core Features

### 1. Package Management
- **Package Creation**: Detailed package information with pricing
- **Status Tracking**: Real-time package status updates
- **Photo Upload**: Package images via S3 pre-signed URLs
- **Special Handling**: Fragile and perishable package options

### 2. Trip Management
- **Trip Creation**: Define routes with origin, destination, and waypoints
- **Capacity Management**: Weight and space limitations
- **Schedule Management**: Departure times and availability
- **Route Optimization**: Intermediate city discovery

### 3. Matching System
- **Intelligent Matching**: Geographic and capacity-based matching
- **Request Management**: Package delivery requests to trips
- **Deviation Analysis**: Route and time deviation calculations
- **Scoring Algorithm**: Relevance scoring for optimal matches

### 4. Pricing System
Comprehensive pricing model with multiple factors:

#### Base Pricing Components (With default values)
- **Base Price**: 50,000 IRR starting price
- **Distance Pricing**: Tiered rates (1,200-600 IRR/km based on distance)
- **Weight Pricing**: 8,000 IRR per 100g (above 500g)
- **Fuel Rate**: 200 IRR per kilometer

#### Special Handling Multipliers
- **Fragile Items**: 1.25x multiplier
- **Perishable Items**: 1.35x multiplier
- **Both Fragile & Perishable**: 1.5x multiplier

#### Geographic Factors
- **Major City Origin**: 0.9x factor
- **Major City Destination**: 1.2x factor
- **Both Major Cities**: 1.0x factor
- **Small Cities**: 1.15x factor

#### Route Deviation Costs
- **Distance Deviation**: 2,000 IRR per extra kilometer
- **Time Deviation**: 1,500 IRR per 10 minutes

### 5. Trip Lifecycle Management
Complete workflow from trip start to completion:

1. **Trip Start**: Transporter declares trip beginning
2. **Package Pickup**: Confirmation of package collection
3. **Status Updates**: Real-time location and status updates
4. **Package Delivery**: Delivery confirmation with codes
5. **Trip Completion**: Final trip closure and settlements

### 6. File Upload System
Secure file management using AWS S3:

#### Upload Categories
- **Transporter Documents**:
  - Profile pictures
  - National ID cards
  - Driver licenses
  - Vehicle photos
  - Vehicle registration documents

- **Package Photos**: Sender package documentation

### 7. Geographic Integration
Advanced geographic features using Neshan Maps API:

#### Core Functions
- **Distance/Time Calculation**: Route analysis for pricing
- **Intermediate Cities**: Waypoint discovery for better matching
- **Coordinate Management**: GPS-based location handling
- **Reverse Geocoding**: Address extraction from coordinates
- **Static Maps**: Route visualization
- **Navigation**: Real-time routing for transporters

#### Geographic Matching
- **Corridor System**: Route deviation tolerance (configurable width)
- **GeoJSON Integration**: Standard geographic data format
- **Turf.js Library**: Advanced geospatial calculations

## 🔄 Matching Algorithm

The intelligent matching system connects packages with suitable trips:

### Filtering Process
1. **Basic Filters**: Active trips, *scheduled* status, weight capacity
2. **Geographic Analysis**: Route compatibility using GeoJSON
3. **Corridor Matching**: Distance tolerance for pickup/delivery points
4. **Direction Validation**: Ensuring logical route progression

### Scoring System
- Lower scores indicate better matches
- Factors: distance to route, proximity to start/end points
- Penalty system for out-of-corridor packages
- Performance optimization with Redis caching

### Request Management
1. **Sender Requests**: Package delivery requests with notes
2. **Transporter Review**: Accept/reject with reasoning
3. **Match Confirmation**: Final agreement and payment processing

## 💰 Financial System

### Wallet Management
- **Balance Tracking**: Real-time balance updates
- **Escrow System**: Payment security during delivery
- **Transaction History**: Detailed financial records

### Revenue Sharing
- **Platform Commission**: 30% of package price
- **Transporter Share**: 70% of package price
- **Deviation Fees**: 100% to transporter (no commission)

### Payment Flow
1. **Package Creation**: Price calculation and display
2. **Payment Processing**: Escrow during delivery
3. **Delivery Confirmation**: Automatic fund release
4. **Settlement**: Instant wallet updates

## 📱 Tracking System

### Real-time Updates
- **Automatic Events**: Trip start, pickup, delivery completion
- **Manual Updates**: Transporter location and status updates
- **GPS Integration**: Location-based city and route detection

### Tracking Features
- **Tracking Codes**: 20-digit unique identifiers
- **Delivery Codes**: 5-digit confirmation codes
  - For recipient authentication
  - For release escrowed shipping price
- **Status History**: Complete package journey log
- **Public Tracking**: No-login tracking for recipients

## 📂 Folder structure

<div align="center">
  <img src="./public/Folder-Structure.png" alt="HamBaar Architecture" width="400">
</div>


## 🛠️ Development Setup

### Prerequisites
- Node.js 22.14+
- Docker & Docker Compose
- PostgreSQL 15+
- Redis 7+

### Environment Configuration

```env
# Database
DATABASE_URL=postgresql://postgres:postgres@hambaar.postgres:5432/hambaar-db

# Redis
REDIS_PASSWORD=redis
REDIS_URL=redis://:${REDIS_PASSWORD}@hambaar.redis:6379
OTP_REDIS_URL=redis://:${REDIS_PASSWORD}@hambaar.redis:6379/1
SESSION_REDIS_URL=redis://:${REDIS_PASSWORD}@hambaar.redis:6379/2

# JWT Secrets
SESSION_SECRET=session-secret
COOKIE_SECRET=cookie-secret
JWT_ACCESS_SECRET_KEY=jwt-access-secret
JWT_TEMP_SECRET_KEY=jwt-temp-secret
JWT_PROGRESS_SECRET_KEY=jwt-progress-secret

# AWS S3
AWS_ENDPOINT=aws-endpoint
AWS_ACCESS_KEY=aws-access-key
AWS_SECRET_KEY=aws-secret-key
AWS_BUCKET_NAME=aws-bucket-name

# External APIs
MAP_API_KEY=map-api-key
MAP_API_URL=map-api-url
SMS_API_KEY=sms-api-key

# Optional Configuration
PORT=3000
COOKIE_MAX_AGE=15 * 24 * 3600 * 1000 # in ms
OTP_EXPIRATION_TIME=2 * 60 * 1000 # in ms
MAX_SEND_ATTEMPTS=5
MAX_CHECK_ATTEMPTS=10
SEND_WINDOW=30 * 60 * 1000 # in ms
BASE_BLOCK_TIME=20 * 60 * 1000 # in ms
CORRIDOR_WIDTH=10
```

### Database Setup

```bash
# Database migration
npm run prisma:push

# Seed default data (admin user, vehicle models, provinces/cities)
npm run seed
```

### Running the Application

#### Using Docker
To set up and run the application using Docker Compose:

1. Ensure Docker and Docker Compose are installed.
2. Set up the environment variables in the `.docker/.env` file as shown above.
3. At the root of the project, run one of the following commands:

   Using Make:
   ```bash
   make prod
   ```

   Or using Docker Compose directly:
   ```bash
   docker compose -f ./docker-compose.yml -p hambaar-app --profile frontend --profile backend up -d --build
   ```

### API Documentation
Complete API documentation is available at `/docs` in Swagger format when the application is running.

## 🧪 Testing & CI/CD

### Testing Framework
- Automated test suites for core functionality
- Integration tests for external API interactions
- Unit tests for business logic components

### GitHub Workflow
The project includes a complete CI/CD pipeline:

1. **Code Push**: Triggers automated workflow
2. **Test Execution**: Runs comprehensive test suite
3. **Build Process**: Creates Docker images on test success
4. **Registry Push**: Pushes images to Docker Hub
5. **Deployment**: Automatic deployment to Liara Cloud

### Quality Assurance
- Automated testing on every commit
- Code quality checks and linting
- Performance monitoring and optimization

## 🚀 Deployment

### Production Environment
- **Platform**: Liara Cloud Platform (PaaS)
- **Containerization**: Docker containers for all services
- **Database**: Managed PostgreSQL instance
- **Cache**: Redis cluster for session management
- **Storage**: AWS S3 compatible storage (Liara Space)
- **Monitoring**: Built-in logging and monitoring

### Scaling Considerations
- Horizontal scaling support through containerization
- Database connection pooling
- Redis clustering for high availability
- CDN integration for static assets

---

Built with ❤️.
