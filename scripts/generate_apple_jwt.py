#!/usr/bin/env python3
"""
Generate Apple Sign-In JWT Secret for Supabase
Run this locally to keep your private key secure
"""

import jwt
import time
from datetime import datetime, timedelta

def generate_apple_jwt(key_id, team_id, bundle_id, private_key_path):
    """Generate JWT for Apple Sign-In"""
    
    # Read the private key
    with open(private_key_path, 'r') as key_file:
        private_key = key_file.read()
    
    # JWT headers
    headers = {
        'alg': 'ES256',
        'kid': key_id
    }
    
    # JWT payload
    now = datetime.utcnow()
    payload = {
        'iss': team_id,
        'iat': int(now.timestamp()),
        'exp': int((now + timedelta(days=180)).timestamp()),  # 6 months expiry
        'aud': 'https://appleid.apple.com',
        'sub': bundle_id
    }
    
    # Generate JWT
    token = jwt.encode(payload, private_key, algorithm='ES256', headers=headers)
    
    return token

if __name__ == "__main__":
    # Fill in your values here
    KEY_ID = "YOUR_KEY_ID_HERE"          # 10-character key ID
    TEAM_ID = "YOUR_TEAM_ID_HERE"        # Your Apple Developer Team ID  
    BUNDLE_ID = "com.jimmyshultz.resonare"  # Your app's bundle ID
    PRIVATE_KEY_PATH = "path/to/your/AuthKey_KEYID.p8"  # Path to your .p8 file
    
    try:
        jwt_secret = generate_apple_jwt(KEY_ID, TEAM_ID, BUNDLE_ID, PRIVATE_KEY_PATH)
        
        print("=" * 60)
        print("🔑 Apple Sign-In JWT Secret Generated Successfully!")
        print("=" * 60)
        print()
        print("Your JWT Secret (copy this to Supabase):")
        print("-" * 40)
        print(jwt_secret)
        print("-" * 40)
        print()
        print("⚠️  This token expires in 6 months")
        print("💡 Keep your .p8 file secure and never share it")
        print("=" * 60)
        
    except Exception as e:
        print(f"❌ Error generating JWT: {e}")
        print("Make sure you have the PyJWT library installed:")
        print("pip install PyJWT[crypto]")