from fastapi import FastAPI, Depends, HTTPException, status
from sqlalchemy.orm import Session
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from jose import JWTError, jwt
from datetime import datetime, timedelta
from passlib.context import CryptContext
from models import User, UserRole
from database import SessionLocal, engine
from pydantic import BaseModel
from fastapi.middleware.cors import CORSMiddleware
from blockchain import blockchain
from typing import Optional
from config import config
import os

# Create FastAPI app with metadata
app = FastAPI(
    title="Green Bonds API",
    description="A FastAPI backend for Green Bonds blockchain demo",
    version="1.0.0"
)

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="token")

# Updated CORS configuration to be more flexible
origins = [
    "http://localhost:3000",
    "https://localhost:3000",
    "http://localhost:3001",
    "https://localhost:3001",
    # Wildcard for development on any local port (doesn't work with FastAPI's CORS middleware)
    # Add your frontend deployment URL (will update later)
    "https://67cd0452c8aa3179c31dd588--boisterous-fairy-2dcb88.netlify.app",
    # Add your custom domain
    "https://yourdomain.com",
    "https://*.yourdomain.com",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Dependency
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# Use JWT configuration from config
SECRET_KEY = config.SECRET_KEY
ALGORITHM = config.ALGORITHM
ACCESS_TOKEN_EXPIRE_MINUTES = config.ACCESS_TOKEN_EXPIRE_MINUTES


class UserCreate(BaseModel):
    username: str
    password: str
    role: Optional[UserRole] = UserRole.BUYER

def get_user_by_username(db: Session, username: str):
    return db.query(User).filter(User.username == username).first()

def create_user(db: Session, user: UserCreate):
    hashed_password = pwd_context.hash(user.password)
    db_user = User(username=user.username, hashed_password=hashed_password, role=user.role)
    db.add(db_user)
    db.commit()
    return "complete"

@app.post("/register")
def register_user(user: UserCreate, db: Session = Depends(get_db)):
    db_user = get_user_by_username(db, username=user.username)
    if db_user:
        raise HTTPException(status_code=400, detail="Username already registered")
    return create_user(db=db, user=user)

# Authenticate the user
def authenticate_user(username: str, password: str, db: Session):
    user = db.query(User).filter(User.username == username).first()
    if not user:
        return False
    if not pwd_context.verify(password, user.hashed_password):
        return False
    return user

# User response model
class UserResponse(BaseModel):
    id: int
    username: str
    role: UserRole

# Create access token
def create_access_token(data: dict, expires_delta: timedelta | None = None):
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=15)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

@app.post("/token")
def login_for_access_token(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    user = authenticate_user(form_data.username, form_data.password, db)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": user.username, "role": user.role.value}, expires_delta=access_token_expires
    )
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user_id": user.id,
        "username": user.username,
        "role": user.role.value
    }

@app.get("/users/me", response_model=UserResponse)
def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)):
    """Get the current user's information based on their authentication token."""
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        username: str = payload.get("sub")
        if username is None:
            raise HTTPException(status_code=401, detail="Invalid authentication credentials")
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid authentication credentials")
    
    user = get_user_by_username(db, username=username)
    if user is None:
        raise HTTPException(status_code=404, detail="User not found")
    
    return UserResponse(id=user.id, username=user.username, role=user.role)


def verify_token(token: str = Depends(oauth2_scheme)):
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        username: str = payload.get("sub")
        if username is None:
            raise HTTPException(status_code=403, detail="Token is invalid or expired")
        return payload
    except JWTError:
        raise HTTPException(status_code=403, detail="Token is invalid or expired")
@app.get("/verify-token/{token}")
async def verify_user_token(token: str):
    verify_token(token=token)
    return {"message": "Token is valid"}


# Blockchain related models and endpoints
from typing import Optional, List, Dict, Any
from blockchain import ComplianceStatus

class ContractCreate(BaseModel):
    issuer_id: int
    buyer_id: int
    comment: str
    bond_amount: Optional[float] = 0.0
    maturity_date: Optional[str] = None
    yield_rate: Optional[float] = None
    compliance_status: Optional[str] = ComplianceStatus.PENDING
    metadata: Optional[Dict[str, Any]] = None


class ComplianceUpdate(BaseModel):
    new_status: str
    reason: str
    updated_by: int


class ComplianceHistoryEntry(BaseModel):
    previous_status: Optional[str]
    new_status: str
    timestamp: str
    reason: str
    updated_by: int


class ContractResponse(BaseModel):
    index: int
    timestamp: str
    issuer_id: int
    buyer_id: int
    comment: str
    bond_amount: float = 0.0
    maturity_date: Optional[str] = None
    yield_rate: Optional[float] = None
    compliance_status: str = ComplianceStatus.PENDING
    compliance_history: Optional[List[ComplianceHistoryEntry]] = None
    metadata: Optional[Dict[str, Any]] = None
    hash: str
    previous_hash: str


class ContractSearch(BaseModel):
    issuer_id: Optional[int] = None
    buyer_id: Optional[int] = None
    compliance_status: Optional[str] = None
    maturity_date_start: Optional[str] = None
    maturity_date_end: Optional[str] = None


@app.post("/contracts/", response_model=ContractResponse)
def create_contract(
    contract: ContractCreate,
    db: Session = Depends(get_db),
    token: str = Depends(oauth2_scheme)
):
    """Add a new green bond contract to the blockchain."""
    # Verify authentication
    verify_token(token)
    
    try:
        # Add the contract to the blockchain with bond details
        new_block = blockchain.add_block(
            issuer_id=contract.issuer_id,
            buyer_id=contract.buyer_id,
            comment=contract.comment,
            db=db,
            bond_amount=contract.bond_amount,
            maturity_date=contract.maturity_date,
            yield_rate=contract.yield_rate,
            compliance_status=contract.compliance_status,
            metadata=contract.metadata
        )
        
        # Convert block to dictionary to access all fields
        block_dict = new_block.to_dict()
        
        # Return the new block data with all fields
        return ContractResponse(
            index=new_block.index,
            timestamp=block_dict["timestamp"],
            issuer_id=new_block.issuer_id,
            buyer_id=new_block.buyer_id,
            comment=new_block.comment,
            bond_amount=new_block.bond_amount,
            maturity_date=new_block.maturity_date,
            yield_rate=new_block.yield_rate,
            compliance_status=new_block.compliance_status,
            compliance_history=block_dict["compliance_history"],
            metadata=new_block.metadata,
            hash=new_block.hash,
            previous_hash=new_block.previous_hash
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@app.get("/contracts/", response_model=list[ContractResponse])
def get_all_contracts(token: str = Depends(oauth2_scheme)):
    """Get all contracts from the blockchain."""
    # Verify authentication
    verify_token(token)
    
    # Get all blocks (except genesis block if desired)
    blocks = blockchain.get_all_blocks()[1:]  # Skip genesis block
    
    return [
        ContractResponse(
            index=block["index"],
            timestamp=block["timestamp"],
            issuer_id=block["issuer_id"],
            buyer_id=block["buyer_id"],
            comment=block["comment"],
            bond_amount=block.get("bond_amount", 0.0),
            maturity_date=block.get("maturity_date"),
            yield_rate=block.get("yield_rate"),
            compliance_status=block.get("compliance_status", ComplianceStatus.PENDING),
            compliance_history=block.get("compliance_history", []),
            metadata=block.get("metadata", {}),
            hash=block["hash"],
            previous_hash=block["previous_hash"]
        ) for block in blocks
    ]


@app.get("/users/{user_id}", response_model=UserResponse)
def get_user_by_id(user_id: int, db: Session = Depends(get_db)):
    """Get user information by ID."""
    # If user_id is 0, it's a system/placeholder user for new bonds
    if user_id == 0:
        return UserResponse(id=0, username="Available", role=UserRole.BUYER)
    
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail=f"User with ID {user_id} not found")
    
    return UserResponse(id=user.id, username=user.username, role=user.role)

@app.get("/contracts/public", response_model=list[ContractResponse])
def get_public_contracts():
    """Get all contracts from the blockchain without authentication."""
    # Get all blocks (except genesis block)
    blocks = blockchain.get_all_blocks()[1:]  # Skip genesis block
    
    return [
        ContractResponse(
            index=block["index"],
            timestamp=block["timestamp"],
            issuer_id=block["issuer_id"],
            buyer_id=block["buyer_id"],
            comment=block["comment"],
            bond_amount=block.get("bond_amount", 0.0),
            maturity_date=block.get("maturity_date"),
            yield_rate=block.get("yield_rate"),
            compliance_status=block.get("compliance_status", ComplianceStatus.PENDING),
            compliance_history=block.get("compliance_history", []),
            metadata=block.get("metadata", {}),
            hash=block["hash"],
            previous_hash=block["previous_hash"]
        ) for block in blocks
    ]


@app.get("/contracts/validate")
def validate_blockchain(token: str = Depends(oauth2_scheme)):
    """Validate the integrity of the blockchain."""
    # Verify authentication
    verify_token(token)
    
    is_valid = blockchain.is_chain_valid()
    return {"valid": is_valid}


@app.post("/contracts/{block_index}/compliance", response_model=ContractResponse)
def update_compliance_status(
    block_index: int,
    compliance_update: ComplianceUpdate,
    token: str = Depends(oauth2_scheme)
):
    """Update the compliance status of a green bond contract."""
    # Verify authentication
    verify_token(token)
    
    try:
        # Update compliance status in the blockchain
        updated_block = blockchain.update_compliance_status(
            block_index=block_index,
            new_status=compliance_update.new_status,
            reason=compliance_update.reason,
            updated_by=compliance_update.updated_by
        )
        
        # Convert block to dictionary to access all fields
        block_dict = updated_block.to_dict()
        
        # Return the updated block data
        return ContractResponse(
            index=updated_block.index,
            timestamp=block_dict["timestamp"],
            issuer_id=updated_block.issuer_id,
            buyer_id=updated_block.buyer_id,
            comment=updated_block.comment,
            bond_amount=updated_block.bond_amount,
            maturity_date=updated_block.maturity_date,
            yield_rate=updated_block.yield_rate,
            compliance_status=updated_block.compliance_status,
            compliance_history=block_dict["compliance_history"],
            metadata=updated_block.metadata,
            hash=updated_block.hash,
            previous_hash=updated_block.previous_hash
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@app.get("/contracts/{block_index}", response_model=ContractResponse)
def get_contract_by_index(
    block_index: int,
    token: str = Depends(oauth2_scheme)
):
    """Get a specific contract by its block index."""
    # Verify authentication
    verify_token(token)
    
    try:
        # Get the block
        block = blockchain.get_block_by_index(block_index)
        if not block:
            raise HTTPException(status_code=404, detail=f"Block with index {block_index} not found")
        
        # Convert block to dictionary
        block_dict = block.to_dict()
        
        # Return the block data
        return ContractResponse(
            index=block.index,
            timestamp=block_dict["timestamp"],
            issuer_id=block.issuer_id,
            buyer_id=block.buyer_id,
            comment=block.comment,
            bond_amount=block.bond_amount,
            maturity_date=block.maturity_date,
            yield_rate=block.yield_rate,
            compliance_status=block.compliance_status,
            compliance_history=block_dict["compliance_history"],
            metadata=block.metadata,
            hash=block.hash,
            previous_hash=block.previous_hash
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@app.post("/contracts/search", response_model=list[ContractResponse])
def search_contracts(
    search_params: ContractSearch,
    token: str = Depends(oauth2_scheme)
):
    """Search for contracts based on criteria."""
    # Verify authentication
    verify_token(token)
    
    # Search for blocks
    blocks = blockchain.search_blocks(
        issuer_id=search_params.issuer_id,
        buyer_id=search_params.buyer_id,
        compliance_status=search_params.compliance_status,
        maturity_date_start=search_params.maturity_date_start,
        maturity_date_end=search_params.maturity_date_end
    )
    
    # Convert to response model
    return [
        ContractResponse(
            index=block["index"],
            timestamp=block["timestamp"],
            issuer_id=block["issuer_id"],
            buyer_id=block["buyer_id"],
            comment=block["comment"],
            bond_amount=block.get("bond_amount", 0.0),
            maturity_date=block.get("maturity_date"),
            yield_rate=block.get("yield_rate"),
            compliance_status=block.get("compliance_status", ComplianceStatus.PENDING),
            compliance_history=block.get("compliance_history", []),
            metadata=block.get("metadata", {}),
            hash=block["hash"],
            previous_hash=block["previous_hash"]
        ) for block in blocks
    ]


@app.get("/contracts/{block_index}/compliance-history", response_model=list[ComplianceHistoryEntry])
def get_compliance_history(
    block_index: int,
    token: str = Depends(oauth2_scheme)
):
    """Get the compliance history of a specific contract."""
    # Verify authentication
    verify_token(token)
    
    try:
        # Get the compliance history
        history = blockchain.get_compliance_history(block_index)
        return history
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
