import os
from google.cloud import firestore
from app.store import DemoStore

def seed():
    print("Initializing Firestore client...")
    # Assuming FIREBASE_PROJECT_ID and FIREBASE_CREDENTIALS_PATH are in .env
    # We'll just rely on the default credentials or those explicitly set
    try:
        db = firestore.Client.from_service_account_json(
            os.getenv("FIREBASE_CREDENTIALS_PATH", "../secrets/seva-solution-challenge-2026-a7bc09bc93a7.json"),
            project=os.getenv("FIREBASE_PROJECT_ID", "seva-solution-challenge-2026")
        )
    except Exception as e:
        print("Failed to initialize Firestore:", e)
        return

    print("Loading demo data...")
    demo = DemoStore()

    print("Seeding volunteers...")
    for vol in demo.volunteers:
        db.collection("volunteers").document(vol.id).set(vol.model_dump(mode='json'))
    
    print("Seeding needs...")
    for need in demo.needs:
        db.collection("needs").document(need.id).set(need.model_dump(mode='json'))

    print("Seeding assignments...")
    for assignment in demo.assignments:
        db.collection("assignments").document(assignment.id).set(assignment.model_dump(mode='json'))

    print("Seeding completions...")
    for comp in demo.completions:
        db.collection("completions").document(comp.id).set(comp.model_dump(mode='json'))

    print("Done! Firestore is now seeded with the initial demo data.")

if __name__ == "__main__":
    try:
        from dotenv import load_dotenv
        load_dotenv()
    except ImportError:
        print("Note: python-dotenv not installed, relying on system environment variables.")
    seed()
