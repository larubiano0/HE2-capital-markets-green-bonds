# Green Bonds Trading Platform

A blockchain-powered platform for issuing, trading, and monitoring compliance of green bonds. This application demonstrates how blockchain technology can bring transparency, traceability, and trust to green bond markets.

## Project Overview

This platform enables:
- Transparent issuance and trading of green bonds
- Immutable tracking of compliance status
- Role-based access control (Issuers and Buyers)
- Comprehensive history of all transactions

## Technology Stack

### Backend
- **FastAPI**: Modern, high-performance Python web framework
- **SQLAlchemy**: SQL toolkit and ORM
- **JWT Authentication**: Secure user authentication and authorization
- **Custom Blockchain**: Immutable ledger for bond contracts
- **SQLite**: Database (for development/demo purposes)

### Frontend
- **React**: Frontend user interface
- **React Router**: Navigation and routing
- **Data Visualization**: Timeline and graph components for transaction data

## Features

### Role-Based Access
- **Issuers**: Financial institutions or organizations that create and issue green bonds
- **Buyers**: Investors who purchase green bonds

### Bond Management
- Create new green bonds with detailed parameters
- Track bond ownership and transfers
- Record bond details (amount, maturity date, yield rate)

### Compliance Tracking
- Monitor bond compliance status (pending, compliant, non-compliant, under review)
- Complete audit trail of all compliance status changes
- Verification and transparency of green project implementation

### Blockchain Security
- Immutable record of all transactions
- Cryptographic verification of chain integrity
- Transparent history accessible to all parties

## Getting Started

### Prerequisites
- Python 3.8+ 
- Node.js 14+
- NPM 6+

### Backend Setup

1. Navigate to the backend directory:
   ```
   cd aplicacion/backend
   ```

2. Install dependencies:
   ```
   pip install -r requirements.txt
   ```

3. Create test users and data (optional):
   ```
   python create_test_users.py
   python create_test_data.py
   ```

4. Start the backend server:
   ```
   uvicorn main:app --reload
   ```

The API will be available at http://localhost:8000

### Frontend Setup

1. Navigate to the frontend directory:
   ```
   cd aplicacion/frontend/auth-app
   ```

2. Install dependencies:
   ```
   npm install
   ```

3. Start the development server:
   ```
   npm start
   ```

The application will be available at http://localhost:3000

## API Documentation

Once the backend is running, interactive API documentation is available at:
- Swagger UI: http://localhost:8000/docs
- ReDoc: http://localhost:8000/redoc

## User Roles and Workflows

### Issuer
1. Create new green bonds with specific parameters
2. Monitor compliance status
3. View transaction history

### Buyer
1. View available green bonds
2. Purchase bonds
3. Track owned bonds and their compliance status

### Regulator (Future Implementation)
1. Update compliance status
2. Add compliance notes and documentation
3. Validate green projects

## Deployment

See the [DEPLOYMENT_GUIDE.md](aplicacion/DEPLOYMENT_GUIDE.md) for detailed instructions on deploying this application to:
- Backend: Render.com
- Frontend: Netlify
- Custom Domain: Setup and configuration

## Development Notes

### Database
- SQLite is used for development and demonstration
- For production use, consider migrating to PostgreSQL

### Security Considerations
- JWT tokens expire after a configured time (default: 30 minutes)
- Passwords are hashed using bcrypt
- CORS is configured for allowed origins only

### Blockchain Implementation
- Custom blockchain implementation for educational/demonstration purposes
- Each block contains bond contract details and compliance history
- Chain validation ensures integrity of the transaction history

## License

This project is intended for educational and demonstration purposes.

## Acknowledgments

This project serves as a demonstration of how blockchain technology can enhance transparency and trust in green bond markets, potentially addressing verification challenges in ESG (Environmental, Social, and Governance) investments.
