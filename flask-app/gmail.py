from flask import Blueprint, request, jsonify, current_app
from flask_cors import cross_origin, CORS
import os, base64, requests
from email.mime.text import MIMEText
from dotenv import load_dotenv
# Google API imports
from google.oauth2.credentials import Credentials
from googleapiclient.discovery import build
from google.auth.transport.requests import Request

load_dotenv()

# Load from environment
CLIENT_ID = os.getenv("GMAIL_CLIENT_ID")
CLIENT_SECRET = os.getenv("GMAIL_CLIENT_SECRET")
REFRESH_TOKEN = os.getenv("GMAIL_REFRESH_TOKEN")
USER_EMAIL = os.getenv("GMAIL_USER")

auth_bp = Blueprint('auth', __name__)

# Configure CORS for the blueprint
CORS(auth_bp, origins=["http://localhost:3000"])

@auth_bp.route('/email', methods=['POST', 'OPTIONS'])
@cross_origin(origins=["http://localhost:3000"])
def email():
    # Handle preflight OPTIONS request
    if request.method == 'OPTIONS':
        response = jsonify({'status': 'ok'})
        response.headers.add('Access-Control-Allow-Origin', '*')
        response.headers.add('Access-Control-Allow-Headers', 'Content-Type,Authorization')
        response.headers.add('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE,OPTIONS')
        return response, 300
    
    try:
        # Ensure we have JSON data
        if not request.is_json:
            return jsonify({"error": "Content-Type must be application/json"}), 400
        
        data = request.get_json()
        if not data:
            return jsonify({"error": "No JSON data provided"}), 400
            
        name = data.get("nameIn")
        wechat = data.get("wechatIn")
        phone = data.get("phoneIn")
        subject = data.get("subjectIn")
        
        # Validate required fields
        if not all([name, wechat, phone, subject]):
            return jsonify({"error": "All fields are required"}), 400
        
        message = f"New Customer: {name}\n\nWeChat: {wechat}\nPhone Number: {phone}\nInterested In: {subject}"
        
        # Send email
        send_email("outstandingls@yahoo.ca", "NEW INTERESTED CUSTOMER", message)
        
        return jsonify({"message": "Signup Successful"}), 201
        
    except Exception as e:
        print(f"Error in email route: {str(e)}")
        return jsonify({"error": "Internal server error"}), 500

# ------------ GMAIL API ----------------
creds = Credentials(
    token=None,
    refresh_token=REFRESH_TOKEN,
    token_uri='https://oauth2.googleapis.com/token',
    client_id=CLIENT_ID,
    client_secret=CLIENT_SECRET
)

# Force initial token fetch
creds.refresh(Request())

# Build Gmail API service
service = build('gmail', 'v1', credentials=creds)

def create_message(sender, to, subject, message_text):
    message = MIMEText(message_text)
    message['to'] = to
    message['from'] = sender
    message['subject'] = subject
    raw = base64.urlsafe_b64encode(message.as_bytes()).decode()
    return {'raw': raw}

def send_email(to, subject, body):
    try:
        # Refresh token if expired before each send
        if not creds.valid or creds.expired:
            creds.refresh(Request())
        
        message = create_message(USER_EMAIL, to, subject, body)
        sent_message = service.users().messages().send(userId="me", body=message).execute()
        print(f"Message sent! ID: {sent_message['id']}")
        return True
    except Exception as e:
        print(f"Error sending email: {str(e)}")
        raise e

def get_access_token():
    response = requests.post(
        'https://oauth2.googleapis.com/token',
        data={
            'client_id': CLIENT_ID,
            'client_secret': CLIENT_SECRET,
            'refresh_token': REFRESH_TOKEN,
            'grant_type': 'refresh_token',
        }
    )
    if response.ok:
        return response.json()['access_token']
    else:
        raise Exception(f"Failed to refresh token: {response.text}")
    