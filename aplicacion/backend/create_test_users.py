import requests
import json

def create_user(username, password, role):
    """
    Create a new user with the specified role.
    """
    url = "http://localhost:8000/register"
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

if __name__ == "__main__":
    # Create an issuer user
    create_user("issuer1", "password", "issuer")
    
    # Create a buyer user
    create_user("buyer1", "password", "buyer")
    
    print("User creation completed.")