from flask import Flask
from flask_cors import CORS
from gmail import auth_bp  # Import your blueprint

app = Flask(__name__)

# Configure CORS for the entire app
CORS(app, resources={
    r"/*": {
        "origins": ["http://localhost:3000"],
        "methods": ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
        "allow_headers": ["Content-Type", "Authorization"]
    }
})

# Register your blueprint
app.register_blueprint(auth_bp)

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5000)