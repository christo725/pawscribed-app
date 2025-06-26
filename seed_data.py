import asyncio
from sqlalchemy.orm import Session
from database import SessionLocal, create_database
from models import User, Owner, Pet
from auth import get_password_hash

def seed_database():
    # Create database tables
    create_database()
    
    db = SessionLocal()
    
    try:
        # Create a test veterinarian
        test_vet = db.query(User).filter(User.email == "vet@example.com").first()
        if not test_vet:
            test_vet = User(
                email="vet@example.com",
                hashed_password=get_password_hash("password123"),
                full_name="Dr. Jane Smith",
                veterinary_license="VET123456"
            )
            db.add(test_vet)
            db.commit()
            db.refresh(test_vet)
            print("Created test veterinarian: vet@example.com / password123")
        
        # Create test owners
        owners_data = [
            {
                "first_name": "John",
                "last_name": "Doe",
                "email": "john.doe@email.com",
                "phone": "(555) 123-4567",
                "address_line1": "123 Main St",
                "city": "Anytown",
                "state": "CA",
                "zip_code": "90210"
            },
            {
                "first_name": "Sarah",
                "last_name": "Johnson",
                "email": "sarah.j@email.com",
                "phone": "(555) 987-6543",
                "address_line1": "456 Oak Ave",
                "city": "Somewhere",
                "state": "NY",
                "zip_code": "10001"
            },
            {
                "first_name": "Mike",
                "last_name": "Chen",
                "email": "mike.chen@email.com",
                "phone": "(555) 456-7890",
                "address_line1": "789 Pine St",
                "city": "Another Town",
                "state": "TX",
                "zip_code": "75001"
            }
        ]
        
        created_owners = []
        for owner_data in owners_data:
            existing_owner = db.query(Owner).filter(Owner.email == owner_data["email"]).first()
            if not existing_owner:
                owner = Owner(**owner_data)
                db.add(owner)
                db.commit()
                db.refresh(owner)
                created_owners.append(owner)
                print(f"Created owner: {owner.first_name} {owner.last_name}")
            else:
                created_owners.append(existing_owner)
        
        # Create test pets
        pets_data = [
            {
                "name": "Lucy",
                "species": "Dog",
                "breed": "Beagle",
                "age": 2,
                "weight": 12.5,
                "sex": "Female",
                "color": "Brown and White",
                "owner_id": created_owners[0].id
            },
            {
                "name": "Max",
                "species": "Dog",
                "breed": "Golden Retriever",
                "age": 5,
                "weight": 32.0,
                "sex": "Male",
                "color": "Golden",
                "owner_id": created_owners[0].id
            },
            {
                "name": "Whiskers",
                "species": "Cat",
                "breed": "Persian",
                "age": 3,
                "weight": 4.2,
                "sex": "Female",
                "color": "White",
                "owner_id": created_owners[1].id
            },
            {
                "name": "Rocky",
                "species": "Dog",
                "breed": "Bulldog",
                "age": 4,
                "weight": 25.0,
                "sex": "Male",
                "color": "Brindle",
                "owner_id": created_owners[1].id
            },
            {
                "name": "Bella",
                "species": "Cat",
                "breed": "Maine Coon",
                "age": 1,
                "weight": 3.8,
                "sex": "Female",
                "color": "Calico",
                "owner_id": created_owners[2].id
            }
        ]
        
        for pet_data in pets_data:
            existing_pet = db.query(Pet).filter(
                Pet.name == pet_data["name"],
                Pet.owner_id == pet_data["owner_id"]
            ).first()
            if not existing_pet:
                pet = Pet(**pet_data)
                db.add(pet)
                db.commit()
                db.refresh(pet)
                print(f"Created pet: {pet.name} ({pet.species})")
        
        print("\nDatabase seeding completed successfully!")
        print("\nYou can now:")
        print("1. Start the backend: cd vetapp-backend && python main.py")
        print("2. Start the frontend: cd vetapp-frontend && npm run dev")
        print("3. Login with: vet@example.com / password123")
        
    except Exception as e:
        print(f"Error seeding database: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    seed_database()