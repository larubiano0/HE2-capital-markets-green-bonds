import requests
import time
from datetime import datetime, timedelta

BASE_URL = "https://he2-capital-markets-green-bonds.onrender.com"

def create_user(username, password, role):
    """
    Create a new user with the specified role.
    """
    url = f"{BASE_URL}/register"
    payload = {
        "username": username,
        "password": password,
        "role": role
    }
    
    print(f"Creating {role} user: {username}")
    try:
        response = requests.post(url, json=payload)
        if response.status_code == 200:
            print(f"Successfully created user {username} with role {role}")
            return True
        else:
            print(f"Failed to create user: {response.text}")
            return False
    except Exception as e:
        print(f"Error: {str(e)}")
        return False

def login(username, password):
    """
    Login and get access token
    """
    url = f"{BASE_URL}/token"
    data = {
        "username": username,
        "password": password
    }
    
    try:
        response = requests.post(url, data=data)
        if response.status_code == 200:
            return response.json()
        else:
            print(f"Login failed: {response.text}")
            return None
    except Exception as e:
        print(f"Error logging in: {str(e)}")
        return None

def create_bond(token, issuer_id, buyer_id, bond_amount, comment, maturity_date=None, yield_rate=None, compliance_status="pending"):
    """
    Create a new bond on the blockchain
    """
    url = f"{BASE_URL}/contracts/"
    
    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json"
    }
    
    payload = {
        "issuer_id": issuer_id,
        "buyer_id": buyer_id,
        "comment": comment,
        "bond_amount": bond_amount,
        "compliance_status": compliance_status
    }
    
    if maturity_date:
        payload["maturity_date"] = maturity_date
    
    if yield_rate:
        payload["yield_rate"] = yield_rate
        
    try:
        response = requests.post(url, headers=headers, json=payload)
        if response.status_code == 200:
            print(f"Successfully created bond of ${bond_amount} with status {compliance_status}")
            return response.json()
        else:
            print(f"Failed to create bond: {response.text}")
            return None
    except Exception as e:
        print(f"Error creating bond: {str(e)}")
        return None

def update_compliance_status(token, block_index, new_status, reason, updated_by):
    """
    Update the compliance status of a bond
    """
    url = f"{BASE_URL}/contracts/{block_index}/compliance"
    
    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json"
    }
    
    payload = {
        "new_status": new_status,
        "reason": reason,
        "updated_by": updated_by
    }
    
    try:
        response = requests.post(url, headers=headers, json=payload)
        if response.status_code == 200:
            print(f"Successfully updated compliance status of bond #{block_index} to {new_status}")
            return response.json()
        else:
            print(f"Failed to update compliance status: {response.text}")
            return None
    except Exception as e:
        print(f"Error updating compliance status: {str(e)}")
        return None

if __name__ == "__main__":
    # Create test users
    print("Creating test users...")
    create_user("greenissuer", "password", "issuer")
    create_user("ecoinvestor", "password", "buyer")
    create_user("sustainfund", "password", "issuer")
    create_user("ecotrader", "password", "buyer")
    create_user("climatebank", "password", "issuer")
    
    # Login as issuer
    print("\nLogging in as greenissuer...")
    issuer_auth = login("greenissuer", "password")
    if not issuer_auth:
        print("Failed to log in as issuer")
        exit(1)
    
    issuer_id = issuer_auth["user_id"]
    issuer_token = issuer_auth["access_token"]
    
    # Login as buyer
    print("\nLogging in as ecoinvestor...")
    buyer_auth = login("ecoinvestor", "password")
    if not buyer_auth:
        print("Failed to log in as buyer")
        exit(1)
    
    buyer_id = buyer_auth["user_id"]
    buyer_token = buyer_auth["access_token"]
    
    # Login as second issuer
    print("\nLogging in as sustainfund...")
    issuer2_auth = login("sustainfund", "password")
    if not issuer2_auth:
        print("Failed to log in as second issuer")
        exit(1)
    
    issuer2_id = issuer2_auth["user_id"]
    issuer2_token = issuer2_auth["access_token"]
    
    # Login as second buyer
    print("\nLogging in as ecotrader...")
    buyer2_auth = login("ecotrader", "password")
    if not buyer2_auth:
        print("Failed to log in as second buyer")
        exit(1)
    
    buyer2_id = buyer2_auth["user_id"]
    
    # Login as third issuer
    print("\nLogging in as climatebank...")
    issuer3_auth = login("climatebank", "password")
    if not issuer3_auth:
        print("Failed to log in as third issuer")
        exit(1)
    
    issuer3_id = issuer3_auth["user_id"]
    issuer3_token = issuer3_auth["access_token"]
    
    # Create bonds with different statuses, amounts, and dates
    print("\nCreating test bonds...")
    
    # Current date for maturity date calculation
    today = datetime.now()
    
    # Bond 1: Available for purchase (no buyer)
    bond1 = create_bond(
        issuer_token,
        issuer_id,
        0,  # 0 means available for purchase
        50000.00,
        "Green energy project bond - available for purchase",
        (today + timedelta(days=365)).strftime("%Y-%m-%d"),
        4.5,
        "pending"
    )
    
    # Bond 2: Purchased bond with compliant status
    bond2 = create_bond(
        issuer_token,
        issuer_id,
        buyer_id,
        75000.00,
        "Solar panel array financing",
        (today + timedelta(days=730)).strftime("%Y-%m-%d"),
        5.2,
        "pending"
    )
    
    # Update bond2 status to compliant
    if bond2:
        time.sleep(1)  # Wait a bit to create time difference in blockchain
        update_compliance_status(
            issuer_token,
            bond2["index"],
            "compliant",
            "Project meets sustainability criteria",
            issuer_id
        )
    
    # Bond 3: Another issuer's bond under review
    bond3 = create_bond(
        issuer2_token,
        issuer2_id,
        buyer2_id,
        100000.00,
        "Wind farm expansion project",
        (today + timedelta(days=1095)).strftime("%Y-%m-%d"),
        6.0,
        "pending"
    )
    
    # Update bond3 status to under_review
    if bond3:
        time.sleep(1)
        update_compliance_status(
            issuer2_token,
            bond3["index"],
            "under_review",
            "Awaiting environmental impact assessment",
            issuer2_id
        )
    
    # Bond 4: Non-compliant bond
    bond4 = create_bond(
        issuer3_token,
        issuer3_id,
        buyer_id,
        125000.00,
        "Sustainable forestry initiative",
        (today + timedelta(days=913)).strftime("%Y-%m-%d"),
        5.75,
        "pending"
    )
    
    # Update bond4 status to non_compliant
    if bond4:
        time.sleep(1)
        update_compliance_status(
            issuer3_token,
            bond4["index"],
            "non_compliant",
            "Failed to meet carbon offset requirements",
            issuer3_id
        )
    
    # Bond 5: Another available bond from second issuer
    create_bond(
        issuer2_token,
        issuer2_id,
        0,
        80000.00,
        "Ocean cleanup initiative bond",
        (today + timedelta(days=548)).strftime("%Y-%m-%d"),
        4.8,
        "pending"
    )
    
    print("\nTest data creation completed.")