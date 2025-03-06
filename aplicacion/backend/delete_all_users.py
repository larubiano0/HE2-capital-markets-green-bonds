from sqlalchemy.orm import Session
from database import SessionLocal
from models import User

def delete_all_users():
    """
    Delete all users from the database.
    """
    # Create a new database session
    db = SessionLocal()
    try:
        # Get the count of users before deletion
        user_count = db.query(User).count()
        print(f"Found {user_count} users in the database.")
        
        # Delete all users
        db.query(User).delete()
        
        # Commit the transaction
        db.commit()
        
        print(f"Successfully deleted {user_count} users from the database.")
    except Exception as e:
        # Rollback in case of error
        db.rollback()
        print(f"Error deleting users: {str(e)}")
    finally:
        # Close the session
        db.close()

if __name__ == "__main__":
    delete_all_users()