import os
from dotenv import load_dotenv
import json
import urllib.parse
import urllib.request
import webbrowser
from http.server import HTTPServer, BaseHTTPRequestHandler
import threading
import time

load_dotenv()

# Load from environment
CLIENT_ID = os.getenv("GMAIL_CLIENT_ID")
CLIENT_SECRET = os.getenv("GMAIL_CLIENT_SECRET")



class OAuthHandler(BaseHTTPRequestHandler):
    def do_GET(self):
        # Parse the authorization code from the callback
        query = urllib.parse.urlparse(self.path).query
        params = urllib.parse.parse_qs(query)
        
        if 'code' in params:
            self.server.auth_code = params['code'][0]
            self.send_response(200)
            self.send_header('Content-type', 'text/html')
            self.end_headers()
            self.wfile.write(b'<html><body><h1>Authorization successful!</h1><p>You can close this window.</p></body></html>')
        else:
            self.send_response(400)
            self.send_header('Content-type', 'text/html')
            self.end_headers()
            self.wfile.write(b'<html><body><h1>Authorization failed!</h1></body></html>')
    
    def log_message(self, format, *args):
        # Suppress server logs
        pass

def get_gmail_tokens(client_id, client_secret, redirect_uri='http://localhost:8080'):
    """
    Get OAuth 2.0 access and refresh tokens for Gmail API
    
    Args:
        client_id: Your OAuth 2.0 client ID
        client_secret: Your OAuth 2.0 client secret
        redirect_uri: Redirect URI (must match what's configured in Google Console)
    
    Returns:
        dict: Contains access_token, refresh_token, and other OAuth info
    """
    
    # Gmail API scopes
    scopes = [
        'https://www.googleapis.com/auth/gmail.readonly',
        'https://www.googleapis.com/auth/gmail.send',
        'https://www.googleapis.com/auth/gmail.modify'
    ]
    
    # Step 1: Build authorization URL
    auth_params = {
        'client_id': client_id,
        'redirect_uri': redirect_uri,
        'scope': ' '.join(scopes),
        'response_type': 'code',
        'access_type': 'offline',  # Important: gets refresh token
        'prompt': 'consent'        # Forces consent screen to get refresh token
    }
    
    auth_url = 'https://accounts.google.com/o/oauth2/auth?' + urllib.parse.urlencode(auth_params)
    
    print("Opening authorization URL in browser...")
    print(f"If it doesn't open automatically, visit: {auth_url}")
    
    # Step 2: Start local server to capture callback
    server = HTTPServer(('localhost', 8080), OAuthHandler)
    server.auth_code = None
    
    # Start server in background thread
    server_thread = threading.Thread(target=server.serve_forever)
    server_thread.daemon = True
    server_thread.start()
    
    # Open browser
    webbrowser.open(auth_url)
    
    # Wait for authorization code
    print("Waiting for authorization...")
    while server.auth_code is None:
        time.sleep(0.1)
    
    auth_code = server.auth_code
    server.shutdown()
    
    print("Authorization code received!")
    
    # Step 3: Exchange authorization code for tokens
    token_data = {
        'client_id': client_id,
        'client_secret': client_secret,
        'code': auth_code,
        'grant_type': 'authorization_code',
        'redirect_uri': redirect_uri
    }
    
    token_request = urllib.request.Request(
        'https://oauth2.googleapis.com/token',
        data=urllib.parse.urlencode(token_data).encode(),
        headers={'Content-Type': 'application/x-www-form-urlencoded'}
    )
    
    try:
        with urllib.request.urlopen(token_request) as response:
            token_response = json.loads(response.read().decode())
            
        print("Tokens obtained successfully!")
        return token_response
        
    except urllib.error.HTTPError as e:
        error_response = json.loads(e.read().decode())
        print(f"Error getting tokens: {error_response}")
        return None

def refresh_access_token(client_id, client_secret, refresh_token):
    """
    Use refresh token to get a new access token
    
    Args:
        client_id: Your OAuth 2.0 client ID
        client_secret: Your OAuth 2.0 client secret
        refresh_token: The refresh token
    
    Returns:
        dict: Contains new access_token and expires_in
    """
    token_data = {
        'client_id': client_id,
        'client_secret': client_secret,
        'refresh_token': refresh_token,
        'grant_type': 'refresh_token'
    }
    
    token_request = urllib.request.Request(
        'https://oauth2.googleapis.com/token',
        data=urllib.parse.urlencode(token_data).encode(),
        headers={'Content-Type': 'application/x-www-form-urlencoded'}
    )
    
    try:
        with urllib.request.urlopen(token_request) as response:
            return json.loads(response.read().decode())
    except urllib.error.HTTPError as e:
        error_response = json.loads(e.read().decode())
        print(f"Error refreshing token: {error_response}")
        return None

if __name__ == "__main__":
    # Replace with your actual client ID and secret
    
    # Get initial tokens
    tokens = get_gmail_tokens(CLIENT_ID, CLIENT_SECRET)
    
    if tokens:
        print("\n=== TOKEN INFORMATION ===")
        print(f"Access Token: {tokens.get('access_token', 'N/A')}")
        print(f"Refresh Token: {tokens.get('refresh_token', 'N/A')}")
        print(f"Token Type: {tokens.get('token_type', 'N/A')}")
        print(f"Expires In: {tokens.get('expires_in', 'N/A')} seconds")
        print(f"Scope: {tokens.get('scope', 'N/A')}")
        
        # Save tokens to file
        with open('gmail_tokens.json', 'w') as f:
            json.dump(tokens, f, indent=2)
        print("\nTokens saved to 'gmail_tokens.json'")
        
        # Example of refreshing the access token
        if 'refresh_token' in tokens:
            print("\n=== TESTING TOKEN REFRESH ===")
            new_tokens = refresh_access_token(CLIENT_ID, CLIENT_SECRET, tokens['refresh_token'])
            if new_tokens:
                print(f"New Access Token: {new_tokens.get('access_token', 'N/A')}")
    else:
        print("Failed to obtain tokens.")