import hashlib
import json
import time
from typing import List, Dict, Any, Optional, Union
from datetime import datetime
from sqlalchemy.orm import Session
from models import User

# Compliance status options
class ComplianceStatus:
    PENDING = "pending"
    COMPLIANT = "compliant"
    NON_COMPLIANT = "non_compliant"
    UNDER_REVIEW = "under_review"


class Block:
    def __init__(
        self,
        index: int,
        timestamp: float,
        issuer_id: int,
        buyer_id: int,
        comment: str,
        previous_hash: str,
        bond_amount: float = 0.0,
        maturity_date: Optional[str] = None,
        yield_rate: Optional[float] = None,
        compliance_status: str = ComplianceStatus.PENDING,
        compliance_history: Optional[List[Dict[str, Any]]] = None,
        metadata: Optional[Dict[str, Any]] = None,
        hash: Optional[str] = None
    ):
        self.index = index
        self.timestamp = timestamp
        self.issuer_id = issuer_id
        self.buyer_id = buyer_id
        self.comment = comment
        self.previous_hash = previous_hash
        
        # Bond-specific details
        self.bond_amount = bond_amount
        self.maturity_date = maturity_date
        self.yield_rate = yield_rate
        
        # Compliance tracking
        self.compliance_status = compliance_status
        self.compliance_history = compliance_history or []
        
        # Additional metadata
        self.metadata = metadata or {}
        
        # Calculate hash based on all block contents
        self.hash = hash or self.calculate_hash()
    
    def calculate_hash(self) -> str:
        """Calculate the hash of the block based on its contents."""
        block_string = json.dumps({
            "index": self.index,
            "timestamp": self.timestamp,
            "issuer_id": self.issuer_id,
            "buyer_id": self.buyer_id,
            "comment": self.comment,
            "bond_amount": self.bond_amount,
            "maturity_date": self.maturity_date,
            "yield_rate": self.yield_rate,
            "compliance_status": self.compliance_status,
            "compliance_history": self.compliance_history,
            "metadata": self.metadata,
            "previous_hash": self.previous_hash
        }, sort_keys=True).encode()
        
        return hashlib.sha256(block_string).hexdigest()
    
    def update_compliance_status(self, new_status: str, reason: str, updated_by: int) -> None:
        """
        Update the compliance status of the bond and record the change in history.
        
        Args:
            new_status: New compliance status (from ComplianceStatus class)
            reason: Reason for the status change
            updated_by: ID of the user who updated the status
        """
        if new_status not in [ComplianceStatus.PENDING, ComplianceStatus.COMPLIANT,
                             ComplianceStatus.NON_COMPLIANT, ComplianceStatus.UNDER_REVIEW]:
            raise ValueError(f"Invalid compliance status: {new_status}")
        
        # Add current status to history
        self.compliance_history.append({
            "previous_status": self.compliance_status,
            "new_status": new_status,
            "timestamp": time.time(),
            "reason": reason,
            "updated_by": updated_by
        })
        
        # Update current status
        self.compliance_status = new_status
        
        # Recalculate hash
        self.hash = self.calculate_hash()
    
    def add_metadata(self, key: str, value: Any) -> None:
        """Add or update metadata for the block."""
        self.metadata[key] = value
        self.hash = self.calculate_hash()
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert block to dictionary for JSON serialization."""
        return {
            "index": self.index,
            "timestamp": timestamp_to_string(self.timestamp),
            "issuer_id": self.issuer_id,
            "buyer_id": self.buyer_id,
            "comment": self.comment,
            "bond_amount": self.bond_amount,
            "maturity_date": self.maturity_date,
            "yield_rate": self.yield_rate,
            "compliance_status": self.compliance_status,
            "compliance_history": [
                {**history, "timestamp": timestamp_to_string(history["timestamp"])}
                for history in self.compliance_history
            ],
            "metadata": self.metadata,
            "previous_hash": self.previous_hash,
            "hash": self.hash
        }


def timestamp_to_string(ts: float) -> str:
    """Convert a timestamp to a formatted datetime string."""
    return datetime.fromtimestamp(ts).strftime('%Y-%m-%d %H:%M:%S')


class Blockchain:
    def __init__(self):
        """Initialize a new blockchain with a genesis block."""
        self.chain: List[Block] = []
        self.create_genesis_block()
    
    def create_genesis_block(self) -> None:
        """Create the first block in the chain (genesis block)."""
        genesis_block = Block(
            index=0,
            timestamp=time.time(),
            issuer_id=0,  # System
            buyer_id=0,   # System
            comment="Genesis Block",
            previous_hash="0",
            metadata={"is_genesis": True}
        )
        self.chain.append(genesis_block)
    
    def get_latest_block(self) -> Block:
        """Return the latest block in the chain."""
        return self.chain[-1]
    
    def add_block(
        self,
        issuer_id: int,
        buyer_id: int,
        comment: str,
        db: Session,
        bond_amount: float = 0.0,
        maturity_date: Optional[str] = None,
        yield_rate: Optional[float] = None,
        compliance_status: str = ComplianceStatus.PENDING,
        metadata: Optional[Dict[str, Any]] = None
    ) -> Block:
        """
        Add a new block to the chain after validating users.
        
        Args:
            issuer_id: ID of the user issuing the contract
            buyer_id: ID of the user buying the contract
            comment: Additional contract details
            db: Database session for user validation
            bond_amount: Amount of the bond in currency units
            maturity_date: Date when the bond matures (YYYY-MM-DD)
            yield_rate: Annual yield rate as a percentage
            compliance_status: Initial compliance status
            metadata: Additional metadata for the block
            
        Returns:
            The newly created block
        
        Raises:
            ValueError: If user validation fails
        """
        # Validate users exist in database
        issuer = db.query(User).filter(User.id == issuer_id).first()
        
        if not issuer:
            raise ValueError(f"Issuer with ID {issuer_id} does not exist")
            
        # For buyer, if ID is 0, it's a special case for a newly issued bond without a buyer yet
        if str(buyer_id) == "0" or buyer_id == 0:
            # This is valid - it's a bond that's available for purchase
            pass
        else:
            buyer = db.query(User).filter(User.id == buyer_id).first()
            if not buyer:
                raise ValueError(f"Buyer with ID {buyer_id} does not exist")
        
        # Validate compliance status
        if compliance_status not in [ComplianceStatus.PENDING, ComplianceStatus.COMPLIANT,
                                   ComplianceStatus.NON_COMPLIANT, ComplianceStatus.UNDER_REVIEW]:
            raise ValueError(f"Invalid compliance status: {compliance_status}")
        
        latest_block = self.get_latest_block()
        new_block = Block(
            index=latest_block.index + 1,
            timestamp=time.time(),
            issuer_id=issuer_id,
            buyer_id=buyer_id,
            comment=comment,
            bond_amount=bond_amount,
            maturity_date=maturity_date,
            yield_rate=yield_rate,
            compliance_status=compliance_status,
            compliance_history=[{
                "previous_status": None,
                "new_status": compliance_status,
                "timestamp": time.time(),
                "reason": "Initial status",
                "updated_by": issuer_id
            }],
            metadata=metadata or {},
            previous_hash=latest_block.hash
        )
        
        self.chain.append(new_block)
        return new_block
    
    def is_chain_valid(self) -> bool:
        """Validate the integrity of the blockchain."""
        for i in range(1, len(self.chain)):
            current_block = self.chain[i]
            previous_block = self.chain[i-1]
            
            # Verify current block's hash
            if current_block.hash != current_block.calculate_hash():
                return False
            
            # Verify previous hash reference
            if current_block.previous_hash != previous_block.hash:
                return False
        
        return True
    
    def update_compliance_status(
        self,
        block_index: int,
        new_status: str,
        reason: str,
        updated_by: int
    ) -> Block:
        """
        Update the compliance status of a specific block in the chain.
        
        Args:
            block_index: Index of the block to update
            new_status: New compliance status
            reason: Reason for the status change
            updated_by: ID of the user who updated the status
            
        Returns:
            The updated block
            
        Raises:
            ValueError: If the block index is invalid or the status is invalid
        """
        if block_index <= 0 or block_index >= len(self.chain):
            raise ValueError(f"Invalid block index: {block_index}")
        
        block = self.chain[block_index]
        block.update_compliance_status(new_status, reason, updated_by)
        
        # Verify chain integrity
        if not self.is_chain_valid():
            raise ValueError("Updating compliance status compromised chain integrity")
        
        return block
    
    def get_block_by_index(self, index: int) -> Optional[Block]:
        """Get a block by its index."""
        if 0 <= index < len(self.chain):
            return self.chain[index]
        return None
    
    def search_blocks(
        self,
        issuer_id: Optional[int] = None,
        buyer_id: Optional[int] = None,
        compliance_status: Optional[str] = None,
        maturity_date_start: Optional[str] = None,
        maturity_date_end: Optional[str] = None
    ) -> List[Dict[str, Any]]:
        """
        Search for blocks matching the specified criteria.
        
        Args:
            issuer_id: Filter by issuer ID
            buyer_id: Filter by buyer ID
            compliance_status: Filter by compliance status
            maturity_date_start: Filter by maturity date range (start)
            maturity_date_end: Filter by maturity date range (end)
            
        Returns:
            List of matching blocks as dictionaries
        """
        results = []
        
        for block in self.chain[1:]:  # Skip genesis block
            if issuer_id is not None and block.issuer_id != issuer_id:
                continue
                
            if buyer_id is not None and block.buyer_id != buyer_id:
                continue
                
            if compliance_status is not None and block.compliance_status != compliance_status:
                continue
                
            if maturity_date_start is not None and block.maturity_date < maturity_date_start:
                continue
                
            if maturity_date_end is not None and block.maturity_date > maturity_date_end:
                continue
                
            results.append(block.to_dict())
            
        return results
    
    def get_compliance_history(self, block_index: int) -> List[Dict[str, Any]]:
        """
        Get the compliance history of a specific block.
        
        Args:
            block_index: Index of the block
            
        Returns:
            List of compliance history entries
            
        Raises:
            ValueError: If the block index is invalid
        """
        if block_index <= 0 or block_index >= len(self.chain):
            raise ValueError(f"Invalid block index: {block_index}")
            
        block = self.chain[block_index]
        history = block.compliance_history
        
        return [{
            **entry,
            "timestamp": timestamp_to_string(entry["timestamp"])
        } for entry in history]
    
    def get_all_blocks(self) -> List[Dict[str, Any]]:
        """Return all blocks in the chain as dictionaries."""
        return [block.to_dict() for block in self.chain]


# Create a singleton instance of the blockchain
blockchain = Blockchain()