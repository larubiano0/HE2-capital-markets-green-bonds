#!/usr/bin/env python3
"""
DEVELOPMENT/TESTING USE ONLY

This script deletes all user records from the database and resets the blockchain.
This script should NEVER be used in a production environment.
"""
from sqlalchemy.orm import Session
from database import SessionLocal
from models import User
from blockchain import blockchain, Blockchain

def delete_all_data():
    """
    Delete all users from the database and reset the blockchain.
    
    WARNING: This is destructive and should only be used in development/testing.
    """
    print("⚠️  WARNING: DEVELOPMENT USE ONLY ⚠️")
    print("This script will delete ALL users and reset ALL transactions.")
    
    # Create a new database session
    db = SessionLocal()
    try:
        # 1. Delete all users
        user_count = db.query(User).count()
        print(f"Found {user_count} users in the database.")
        
        # Delete all users
        db.query(User).delete()
        
        # Commit the transaction
        db.commit()
        
        print(f"Successfully deleted {user_count} users from the database.")
        
        # 2. Reset the blockchain (which contains the transactions)
        global blockchain
        block_count = len(blockchain.chain) - 1  # Subtract 1 for genesis block
        
        # Create a new blockchain instance (which automatically creates a genesis block)
        blockchain.__init__()
        
        print(f"Successfully reset the blockchain, removing {block_count} transaction blocks.")
        
        print("\nDatabase and blockchain have been reset to initial state.")
        
    except Exception as e:
        # Rollback in case of error
        db.rollback()
        print(f"Error deleting data: {str(e)}")
    finally:
        # Close the session
        db.close()

if __name__ == "__main__":
    confirmation = input("Are you sure you want to delete ALL data? This cannot be undone. (y/N): ")
    if confirmation.lower() == 'y':
        delete_all_data()
    else:
        print("Operation cancelled.")