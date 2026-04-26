import os
import firebase_admin
from firebase_admin import auth, credentials
from dotenv import load_dotenv

load_dotenv()

def seed_auth():
    print("Initializing Firebase Admin...")
    cred_path = os.getenv('FIREBASE_CREDENTIALS_PATH', '../secrets/seva-solution-challenge-2026-a7bc09bc93a7.json')
    project_id = os.getenv('FIREBASE_PROJECT_ID', 'seva-solution-challenge-2026')

    try:
        cred = credentials.Certificate(cred_path)
        if not firebase_admin._apps:
            firebase_admin.initialize_app(cred)
        
        users_to_create = [
            {'email': 'asha@seva.org', 'display_name': 'Asha Verma'},
            {'email': 'rohan@seva.org', 'display_name': 'Rohan Das'},
            {'email': 'priya@seva.org', 'display_name': 'Priya Singh'},
            {'email': 'coordinator@seva.org', 'display_name': 'Ops Coordinator'}
        ]
        
        password = 'demo-access'
        
        for user_data in users_to_create:
            email = user_data['email']
            name = user_data['display_name']
            try:
                # Check if exists
                auth.get_user_by_email(email)
                print(f"User {email} already exists in Auth. Skipping creation.")
            except firebase_admin.auth.UserNotFoundError:
                # Create user
                user = auth.create_user(
                    email=email,
                    email_verified=True, # Mark as verified for demo convenience
                    password=password,
                    display_name=name
                )
                print(f"Successfully created: {email} (UID: {user.uid})")
            except Exception as e:
                print(f"Failed to create {email}: {e}")

        print("\nAll demo accounts are ready!")

    except Exception as e:
        print(f"General Error: {e}")

if __name__ == "__main__":
    seed_auth()
