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

</div>

<br>

<div align="center">

[![](https://img.shields.io/badge/Full%20Documentation-red?style=for-the-badge)](https://drive.google.com/file/d/1nSIkxipE-sYVW1Y3W7HRrLI6RB_UFHfb/view?usp=sharing)
[![](https://img.shields.io/badge/Database%20Schema-8A2BE2?style=for-the-badge)](https://dbdiagram.io/d/hambaar-db-686b7b0cf413ba350893efca)
[![](https://img.shields.io/badge/Frontend%20Repository-blue?style=for-the-badge)](https://github.com/hambaar-app/frontend)

</div>

---

## 🏗️ Architecture Overview

<div align="center">
  <img src="./public/Architecture.png" alt="HamBaar Architecture" width="800">
</div>
</br>

The system uses a modern containerized architecture with frontend/backend separation, leveraging relational and non-relational databases, cloud storage, and third-party API integrations.

### 🔧 Architecture Components

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

---

## 🛠️ Technology Stack

<div align="center">

### Core Technologies

| **Category** | **Technology** | **Version** | **Purpose** |
|:---:|:---:|:---:|:---:|
| **Runtime** | Node.js | 22.14+ | Server-side JavaScript execution |
| **Framework** | NestJS | Latest | Enterprise-grade Node.js framework |
| **Database** | PostgreSQL | 15+ | Primary relational database |
| **ORM** | Prisma | Latest | Type-safe database access |
| **Cache** | Redis | 7+ | Session management & caching |
| **Storage** | AWS S3 | - | Cloud file storage |
| **Maps** | Neshan API & Turf.js | - | Geospatial operations |
| **Container** | Docker | Latest | Containerization & deployment |

</div>

---

## 👥 User Management System

<div align="center">

### 🎭 User Roles & Capabilities

<table>
<tr>
<th width="25%">📦 <strong>Sender</strong></th>
<th width="25%">🚚 <strong>Transporter</strong></th>
<th width="25%">🛠️ <strong>Support</strong></th>
<th width="25%">👑 <strong>Admin</strong></th>
</tr>
<tr>
<td valign="top">

• Create & manage packages<br/>
• Find matched trips<br/>
• Send delivery requests<br/>
• Track package status<br/>
• Rate & review transporters<br/>
• Manage payments<br/>

</td>
<td valign="top">

• Create & manage trips<br/>
• Handle delivery requests<br/>
• Update trip status<br/>
• Manage tracking info<br/>
• Deliver packages<br/>
• Vehicle management<br/>

</td>
<td valign="top">

• Transporter verification<br/>
• Monitor activities<br/>
• Customer support<br/>

</td>
<td valign="top">

• Full system access<br/>
• System configuration<br/>

</td>
</tr>
</table>

</div>

---

## 🗄️ Database Design

### 📊 Entity Relationship Overview

Our PostgreSQL database is designed for scalability and data integrity:

[![](https://img.shields.io/badge/Database%20Schema-8A2BE2?style=for-the-badge)](https://dbdiagram.io/d/hambaar-db-686b7b0cf413ba350893efca)

<div align="center">

### Core Entities
| **Entity** | **Purpose** | **Key Features** |
|:---:|:---|:---|
| **👤 User** | Authentication & basic profile | JWT tokens, role-based access |
| **🚚 Transporter** | Extended courier profiles | Verification status, ratings |
| **📦 Package** | Delivery items | Pricing, special handling, tracking |
| **🛣️ Trip** | Transport journeys | Routes, capacity, scheduling |
| **📍 Address** | Location management | Geocoding, province/city hierarchy |
| **🚗 Vehicle** | Transport assets | Capacity, documentation |

### Business Logic Entities
| **Entity** | **Purpose** | **Key Features** |
|:---:|:---|:---|
| **🤝 TripRequest** | Delivery requests | Status tracking, negotiation |
| **✅ MatchedRequest** | Confirmed matches | Finalized agreements |
| **📍 TrackingUpdate** | Status updates | Real-time location, timestamps |
| **💰 Wallet** | Financial management | Balance, transaction history |
| **🏦 Transaction** | Payment records | Escrow, settlements, commissions |

</div>

---

## 🔐 Authentication & Authorization

### 🎫 Multi-Stage Authentication

Our security system implements a comprehensive authentication flow:

```mermaid
sequenceDiagram
    participant U as User
    participant S as System
    participant SMS as SMS Service
    
    U->>S: Phone Number
    S->>SMS: Send OTP
    SMS-->>U: OTP Code
    U->>S: Verify OTP
    S->>U: Temporary Token (20min)
    
    alt Sender Registration
        U->>S: Complete User Registration
        S->>U: Access Token (20 days)
    else Transporter Registration
        U->>S: User Registration (Stage One)
        S->>U: Progress Token (2 days)
        U->>S: Complete Authentication (Stage Two and Three)
        S->>U: Access Token (20 days)
    end
```

### 🛡️ Token Management

| **Token Type** | **Validity** | **Purpose** | **Scope** |
|:---:|:---:|:---|:---|
| **🔑 Temporary** | 20 minutes | Initial registration | Basic profile creation |
| **⏳ Progress** | 1 day | Multi-step registration | Transporter verification |
| **✅ Access** | 20 days | Full system access | All authenticated operations |

### 🔒 Authorization Guards

- **Role-based Access Control (RBAC)**
- **Resource ownership validation**
- **Route-level protection**
- **API rate limiting**
- **Input sanitization**

---

## 🚀 Core Platform Features

### 1. 📦 Package Management

<details>
<summary><strong>Click to expand Package Features</strong></summary>

**Package Creation & Pricing**
- Detailed package specifications (weight, dimensions, type)
- Automated pricing calculation with multiple factors
- Photo upload with S3 pre-signed URLs
- Special handling options (fragile, perishable)

**Real-time Status Tracking**
- 20-digit unique tracking codes
- Status history with timestamps
- Public tracking (no authentication required)
- Delivery confirmation with 5-digit codes

</details>

### 2. 🛣️ Trip Management

<details>
<summary><strong>Click to expand Trip Features</strong></summary>

**Trip Planning**
- Multi-point route definition (origin, waypoints, destination)
- Capacity management (weight and space limitations)
- Route optimization using geospatial algorithms

**Trip Lifecycle**
- Pre-trip preparation and validation
  - Intermediate city discovery
- Real-time status updates during trip
- Package pickup and delivery confirmations
- Post-trip settlement and ratings
- Get directions to pickup/delivery each 

- **Get Trip Directions**:
  - Retrieve directions from the transporter’s current location to the next pickup or delivery point for all packages, then to the trip’s final destination.

</details>

### 3. 🎯 Matching Process Flow

<div align="center">

```mermaid
flowchart TD
    A[New Package Created] --> B{Basic Filters}
    B -->|Active Trips| C{Geographic Analysis}
    B -->|No Match| Z[No Matches Found]
    C -->|Route Compatible| D{Capacity Check}
    C -->|Out of Route| Z
    D -->|Sufficient Capacity| E[Calculate Score]
    D -->|Over Capacity| Z
    E --> F[Rank Matches]
    F --> G[Present to Sender]
    G --> H{Sender Selects}
    H -->|Request Sent| I[Transporter Review]
    H -->|No Selection| Z
    I -->|Accepted| J[Match Confirmed]
    I -->|Rejected| K[Try Next Match]
    K --> G
    J --> L[Payment Opened]
```

</div>

### 4. 💰 Pricing Engine

Our dynamic pricing system considers multiple factors for fair and competitive rates:

#### Pricing Components

| **Component** | **Default Rate** | **Description** |
|:---|:---:|:---|
| 🏁 **Base Price** | 50,000 IRR | Starting price for all deliveries |
| 📏 **Distance Pricing** | 1,000-600 IRR/km | Tiered rates based on total distance (5 tiers) |
| ⚖️ **Weight Pricing** | 10,000 IRR/100g | Applied to packages over 500g |
| ⛽ **Fuel Rate** | 200 IRR/km | Fuel compensation for transporters |

#### Special Handling Multipliers

| **Package Type** | **Multiplier** | **Example** |
|:---|:---:|:---|
| 🟢 **Standard** | 1.0x | Electronics, clothing, books |
| 🔸 **Fragile** | 1.25x | Glassware, ceramics, art |
| 🧊 **Perishable** | 1.35x | Food, medicine, flowers |
| ⚠️ **Both** | 1.5x | Fresh desserts, medical samples |

#### Geographic Factors

Major city advantages and rural area adjustments ensure fair pricing across all regions:

| **City Type** | **Multiplier** | **Description** |
|:---|:---:|:---|
| **Major City Origin** | 0.9x | 10% discount |
| **Major City Destination** | 1.3x | 30% premium |
| **Small Cities** | 1.2x | 20% premium |

#### Route Deviation Costs
- **Distance Deviation**: 15,000 IRR per extra kilometer
- **Time Deviation**: 5,000 IRR per 10 minutes

### 5. 🗺️ Trip Lifecycle Management
Complete workflow from trip start to completion:

1. **Trip Start**: Transporter declares trip beginning
2. **Package Pickup**: Confirmation of package collection
3. **Status Updates**: Real-time location and status updates
4. **Package Delivery**: Delivery confirmation with codes
5. **Trip Completion**: Final trip closure and settlements

### 6. 📍 Tracking System

- **Automatic Events**: Trip start, pickup, delivery completion
- **Manual Updates**: Transporter location and status updates
- **GPS Integration**: Location-based city and route detection

### 7. ⬆️ File Upload System
Secure file management using AWS S3 pre-signed URLs. Send the optional `size` (bytes) query param — files declaring over `MAX_UPLOAD_SIZE_MB` (default 10) are rejected with 400:

#### Upload Categories
- **Transporter Documents**:
  - Profile pictures
  - National ID cards
  - Driver licenses
  - Vehicle photos
  - Vehicle registration documents

- **Package Photos**: Sender package documentation

### 8. 💳 Financial Management System

#### Wallet Management
- **Balance Tracking**: Real-time balance updates
- **Escrow System**: Payment security during delivery
- **Transaction History**: Detailed financial records

#### Payment Flow
1. **Package Creation**: Price calculation and display
2. **Payment Processing**: Escrow during delivery
3. **Delivery Confirmation**: Automatic fund release
4. **Settlement**: Instant wallet updates

#### Revenue Model
```
Package Price = Base Calculation + Special Handling + Geographic Factors + Deviation Costs

Revenue Distribution:
├── Platform Commission (30%)
├── Transporter Share (70%)
└── Deviation Fees (100% to Transporter)
```

### 9. 🧭 Geographic Integration
Advanced geographic features using Neshan Maps API:

#### Core Functions
- Distance/Time Calculation: Route analysis for pricing
- Intermediate Cities: Waypoint discovery for better matching
- Coordinate Management: GPS-based location handling
- Reverse Geocoding: Address extraction from coordinates
- Static Maps: Route visualization
- Navigation: Real-time routing for transporters

#### Geographic Matching
- Corridor System: Route deviation tolerance (configurable width)
- GeoJSON Integration: Standard geographic data format
- Turf.js Library: Advanced geospatial calculations

### 10. 📊 Dashboard

Our dashboard provides real-time insights and statistics tailored for each user role:

#### 📈 Dashboard Statistics

##### 🚚 Transporter Metrics

| **Metric** | **Description** |
|:---|:---|
| **🚛 Completed Trips** | Successfully finished journeys |
| **⏳ Pending Requests** | Trip requests awaiting response |
| **📦 Not Delivered Packages** | Packages awaiting delivery |
| **💰 Total Escrowed Amount** | Funds held in escrow for active deliveries |

##### 📦 Sender Metrics

| **Metric** | **Description** |
|:---|:---|
| **📥 Not Picked Up Packages** | Packages awaiting collection |
| **🚚 In Transit Packages** | Packages currently being delivered |
| **✅ Delivered Packages** | Successfully completed deliveries |
| **💵 Total Unpaid Amount** | Outstanding payment amounts |

#### 👤 Dashboard Profile

- **Personal Details**: Full name and profile picture
- **Transporter Info**: Experience, rate and bio
- **Financial Status**: Wallet balance

### 11. 🔔 Notification System

Our notification system keeps users informed about critical events and updates:

#### System Event Notifications

- **Welcome**
- **Package Created**
- **Trip Created**
- **Trip Request Created, Canceled, Accepted and Rejected**
- **New Transporter Note**
- **Trip Started and Delayed**
- **Package Picked Up and Delivered**

---

## 📂 Folder structure

<div align="center">
  <img src="./public/Folder-Structure.png" alt="HamBaar Architecture" width="400">
</div>

---

## 🚀 Quick Start Guide

### 📋 Prerequisites

Ensure you have the following installed:

| **Requirement** | **Version** | **Installation** |
|:---|:---:|:---|
| Node.js | 22.14+ | [Download](https://nodejs.org/) |
| Docker | Latest | [Download](https://docker.com/) |
| PostgreSQL | 15+ | [Download](https://postgresql.org/) |
| Redis | 7+ | [Download](https://redis.io/) |

### ⚙️ Environment Configuration

Create a `.env.development` or `.env.production` file with the following configuration:

[Set envs at `./.docker/.env` if you use Docker to run project.]

<details>
<summary><strong>Click to expand Environment Variables</strong></summary>

```bash
# 🗄️ Database Configuration
DATABASE_URL=postgresql://postgres:postgres@hambaar.postgres:5432/hambaar-db

# 🔴 Redis Configuration
REDIS_PASSWORD=redis
REDIS_URL=redis://:${REDIS_PASSWORD}@hambaar.redis:6379
OTP_REDIS_URL=redis://:${REDIS_PASSWORD}@hambaar.redis:6379/1
SESSION_REDIS_URL=redis://:${REDIS_PASSWORD}@hambaar.redis:6379/2

# 🔐 Security Secrets
SESSION_SECRET=your-session-secret-here
COOKIE_SECRET=your-cookie-secret-here
JWT_ACCESS_SECRET_KEY=your-jwt-access-secret
JWT_TEMP_SECRET_KEY=your-jwt-temp-secret
JWT_PROGRESS_SECRET_KEY=your-jwt-progress-secret

# ☁️ AWS S3 Configuration
AWS_ENDPOINT=your-s3-endpoint
AWS_ACCESS_KEY=your-access-key
AWS_SECRET_KEY=your-secret-key
AWS_BUCKET_NAME=your-bucket-name

# 🌐 External API Keys
MAP_API_KEY=your-neshan-api-key
MAP_API_URL=https://api.neshan.org/v1
SMS_API_KEY=your-sms-api-key

# 📤 Uploads
MAX_UPLOAD_SIZE_MB=10          # per-file upload cap

# 🌍 API Surface & Security
API_PREFIX=api
CORS_ORIGINS=http://localhost:8080
THROTTLE_TTL=60
THROTTLE_LIMIT=100
JWT_ACCESS_EXPIRES_IN=20d
JWT_TEMP_EXPIRES_IN=20m
JWT_PROGRESS_EXPIRES_IN=1d
TIMEOUT_MS=30000
LOG_LEVEL=log

# ⚙️ Optional Configuration (With default values)
PORT=3000
COOKIE_MAX_AGE=1296000000      # 15 days
CORRIDOR_WIDTH=10              # kilometers

# Otp Envs
OTP_EXPIRATION_TIME=120000     # 2 minutes
MAX_SEND_ATTEMPTS=5
MAX_CHECK_ATTEMPTS=10
SEND_WINDOW=30 * 60 * 1000     # in milliseconds
BASE_BLOCK_TIME=20 * 60 * 1000 # in milliseconds

## Pricing envs
PRICING_BASE_PRICE=50000
PRICING_FUEL_RATE=200
PRICING_WEIGHT_BASE_RATE=10000
PRICING_PLATFORM_COMMISSION=0.3
PRICING_DRIVER_SHARE=0.7

### Special Handling Multipliers
PRICING_FRAGILE_MULTIPLIER=1.25
PRICING_PERISHABLE_MULTIPLIER=1.35
PRICING_BOTH_FRAGILE_PERISHABLE=1.5

### City Premium Factors
PRICING_MAJOR_CITY_ORIGIN=0.9
PRICING_MAJOR_CITY_DESTINATION=1.3
PRICING_BOTH_MAJOR_CITIES=1.0
PRICING_SMALL_CITY_FACTOR=1.2

### Route Deviation Costs
PRICING_DEVIATION_RATE=15000
PRICING_TIME_DEVIATION_RATE=5000

### Distance Tier Rates (IRR per km)
PRICING_TIER_1_RATE=1000
PRICING_TIER_2_RATE=950
PRICING_TIER_3_RATE=850
PRICING_TIER_4_RATE=750
PRICING_TIER_5_RATE=600

### Major Cities (comma-separated)
PRICING_MAJOR_CITIES=تهران,اصفهان,مشهد
```

</details>

### Running the Application

#### 🐳 Run Project using Docker

##### Option 1: Using Make (Recommended)
```bash
make prod
```

##### Option 2: Using Docker Compose Directly
```bash
docker compose -f ./docker-compose.yml -p hambaar-app \
  --profile frontend --profile backend up -d --build
```

### 💾 Database Setup

```bash
# Run database migrations
npm run prisma:push

# Seed initial data (admin user, cities, vehicle models)
npm run seed
```

### 🌐 Access the Application

- **Frontend**: http://localhost:8080
- **Backend API**: http://localhost:3000/api (all routes live under the `API_PREFIX`, default `api`)
- **API Documentation**: http://localhost:3000/docs

---

## 📚 API Documentation

Our comprehensive API documentation is available through Swagger UI at `/docs` when the application is running.

---

## 🧪 Testing & CI/CD

### Testing Framework
- **Unit** (`npm test`, co-located `*.spec.ts`, fully mocked — no DB/Redis/network): 74 suites / 611 tests, ~91.9% statements/lines with a pragmatic global coverage gate (90/70/85/90) enforced via `coverageThreshold`
- **Integration** (`npm run test:integration`, `test/integration/`, real Postgres 17 + Redis 8 via `docker-compose.test.yml`, S3/SMS/Neshan faked at the port boundary): health, validation envelope, pricing golden parity
- **e2e smoke** (`npm run test:e2e`, `test/e2e/`, full `AppModule` boot): health, 400/404 envelopes
- Coverage reports upload as CI artifacts (`coverage/`)

### GitHub Workflow
The project includes a complete CI/CD pipeline:

1. **Code Push**: Triggers automated workflow
2. **Test Execution**: Runs unit tests (coverage gate), integration tests (Postgres/Redis services), and e2e smoke tests
3. **Build Process**: Creates Docker images on test success
4. **Registry Push**: Pushes images to Docker Hub
5. **Deployment**: Automatic deployment to Liara Cloud

```mermaid
graph LR
    A[Code Push] --> B[Automated Tests]
    B --> C{Tests Pass?}
    C -->|✅ Yes| D[Build Docker Images]
    C -->|❌ No| E[Some Tests Are Failed]
    D --> F[Push to Registry]
    F --> G[Deploy to Staging]
    G --> H[Production Deployment]
    
    style A fill:#3498db
    style B fill:#f39c12
    style D fill:#27ae60
    style G fill:#e74c3c
    style H fill:#8e44ad
```

---

## 🤝 Contributing

We welcome contributions to HamBaar! Please follow our guidelines:

### 📝 Development Workflow

1. **Fork** the repository
2. **Create** a feature branch (`git checkout -b feature/amazing-feature`)
3. **Commit** your changes (`git commit -m 'Add amazing feature'`)
4. **Push** to the branch (`git push origin feature/amazing-feature`)
5. **Open** a Pull Request

---

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

<div align="center">

### 🌟 Star this repository if you found it helpful!

**Built with ❤️ by the HamBaar Team**

*Revolutionizing package delivery, one match at a time.*

</div>
