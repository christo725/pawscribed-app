#!/usr/bin/env python3
"""
Database migration script to update schema with new models
Run this script to add new tables without losing existing data
"""

import os
import sys
from sqlalchemy import create_engine, inspect, text
from sqlalchemy.orm import sessionmaker
from models import Base
from datetime import datetime

# Add the backend directory to the path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./pawscribed.db")

def migrate_database():
    """Safely migrate database to new schema"""
    print("Starting database migration...")
    
    # Create engine
    engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False} if DATABASE_URL.startswith("sqlite") else {})
    
    # Get existing tables
    inspector = inspect(engine)
    existing_tables = inspector.get_table_names()
    print(f"Existing tables: {existing_tables}")
    
    # Create new tables (won't affect existing ones)
    Base.metadata.create_all(bind=engine)
    
    # Get updated table list
    inspector = inspect(engine)
    new_tables = inspector.get_table_names()
    added_tables = set(new_tables) - set(existing_tables)
    
    if added_tables:
        print(f"Added new tables: {added_tables}")
    else:
        print("No new tables added")
    
    # Add new columns to existing tables if needed
    with engine.connect() as conn:
        # Try to add 'trial' to user_role enum if it doesn't exist
        try:
            print("Attempting to add 'trial' to user_role enum...")
            conn.execute(text("ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'trial'"))
            conn.commit()
            print("Successfully ensured 'trial' exists in enum")
        except Exception as e:
            print(f"Enum operation failed (might not be an enum or already exists): {e}")
            # Continue anyway - the column might not be an enum type
        
        # Check and add new columns to users table
        user_columns = [col['name'] for col in inspector.get_columns('users')]
        
        if 'hashed_password' not in user_columns:
            print("Adding 'hashed_password' column to users table...")
            conn.execute(text("ALTER TABLE users ADD COLUMN hashed_password VARCHAR"))
            conn.commit()
            
        if 'full_name' not in user_columns:
            print("Adding 'full_name' column to users table...")
            conn.execute(text("ALTER TABLE users ADD COLUMN full_name VARCHAR"))
            conn.commit()
            
        if 'veterinary_license' not in user_columns:
            print("Adding 'veterinary_license' column to users table...")
            conn.execute(text("ALTER TABLE users ADD COLUMN veterinary_license VARCHAR"))
            conn.commit()
            
        if 'team_id' not in user_columns:
            print("Adding 'team_id' column to users table...")
            conn.execute(text("ALTER TABLE users ADD COLUMN team_id VARCHAR"))
            conn.commit()
            
        if 'is_active' not in user_columns:
            print("Adding 'is_active' column to users table...")
            conn.execute(text("ALTER TABLE users ADD COLUMN is_active BOOLEAN DEFAULT true"))
            conn.commit()
            
        if 'last_login' not in user_columns:
            print("Adding 'last_login' column to users table...")
            conn.execute(text("ALTER TABLE users ADD COLUMN last_login TIMESTAMP"))
            conn.commit()
            
        if 'created_at' not in user_columns:
            print("Adding 'created_at' column to users table...")
            conn.execute(text("ALTER TABLE users ADD COLUMN created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP"))
            conn.commit()
        
        if 'role' not in user_columns:
            print("Adding 'role' column to users table...")
            conn.execute(text("ALTER TABLE users ADD COLUMN role VARCHAR DEFAULT 'trial'"))
            conn.commit()
        
        if 'trial_expires_at' not in user_columns:
            print("Adding 'trial_expires_at' column to users table...")
            conn.execute(text("ALTER TABLE users ADD COLUMN trial_expires_at TIMESTAMP"))
            conn.commit()
            
        if 'subscription_plan' not in user_columns:
            print("Adding 'subscription_plan' column to users table...")
            conn.execute(text("ALTER TABLE users ADD COLUMN subscription_plan VARCHAR DEFAULT 'trial'"))
            conn.commit()
            
        if 'updated_at' not in user_columns:
            print("Adding 'updated_at' column to users table...")
            conn.execute(text("ALTER TABLE users ADD COLUMN updated_at TIMESTAMP"))
            conn.commit()
        
        # Check and add is_active to owners and pets
        owner_columns = [col['name'] for col in inspector.get_columns('owners')]
        if 'is_active' not in owner_columns:
            print("Adding 'is_active' column to owners table...")
            conn.execute(text("ALTER TABLE owners ADD COLUMN is_active BOOLEAN DEFAULT true"))
            conn.commit()
            
        pet_columns = [col['name'] for col in inspector.get_columns('pets')]
        if 'is_active' not in pet_columns:
            print("Adding 'is_active' column to pets table...")
            conn.execute(text("ALTER TABLE pets ADD COLUMN is_active BOOLEAN DEFAULT true"))
            conn.commit()
    
    print("Database migration completed successfully!")
    
    # Show final table structure
    print("\nFinal database structure:")
    for table in sorted(new_tables):
        print(f"\nTable: {table}")
        columns = inspector.get_columns(table)
        for col in columns:
            print(f"  - {col['name']}: {col['type']}")

if __name__ == "__main__":
    migrate_database()