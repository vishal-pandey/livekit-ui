# LiveKit Video Conference Application

A simple, plain HTML/CSS/JavaScript video conferencing application built with LiveKit SDK.

## Features

- 🎥 Video conferencing with multiple participants
- 🎤 Audio/Video controls (mute/unmute)
- 🖥️ Screen sharing capability
- 📱 Responsive design for mobile and desktop
- 🎨 Modern, clean UI with gradient backgrounds
- 👥 Active speaker detection
- 🔊 Audio playback management
- 📊 Connection quality indicators

## Setup

### Prerequisites

1. LiveKit server access
2. Valid access tokens for joining rooms

### Configuration

The application is pre-configured to use your LiveKit server:

```javascript
const LIVEKIT_URL = 'https://vishal-voice-livekit.codeshare.co.in/';
```

### Running the Application

1. Open `index.html` in a web browser
2. Or serve it using a local web server:

```bash
# Using Python
python3 -m http.server 8000

# Using Node.js (with http-server)
npx http-server -p 8000
```

3. Navigate to `http://localhost:8000`

## Usage

### Joining a Room

1. Enter your **Room Name**
2. Enter your **Participant Name**
3. Enter your **Access Token** (obtain from your server/backend)
4. Click **Join Room**

### In-Room Controls

- **Camera Button**: Toggle your camera on/off
- **Microphone Button**: Toggle your microphone on/off
- **Share Screen Button**: Start/stop screen sharing
- **Leave Button**: Disconnect from the room

### Generating Access Tokens

You need to generate access tokens from your backend using the LiveKit Server SDK. Example using Node.js:

```javascript
const { AccessToken } = require('livekit-server-sdk');

const token = new AccessToken('your-api-key', 'your-api-secret', {
  identity: 'participant-name',
  ttl: '1h',
});

token.addGrant({
  room: 'room-name',
  roomJoin: true,
  canPublish: true,
  canSubscribe: true,
});

const jwt = token.toJwt();
```

## File Structure

```
livekit/
├── index.html      # Main HTML file
├── styles.css      # CSS styles
├── app.js          # JavaScript application logic
└── README.md       # This file
```

## Key Components

### HTML Structure

- **Connection Form**: Initial form to join a room
- **Room View**: Main video conferencing interface
- **Video Grid**: Dynamic grid layout for participant videos
- **Controls**: Bottom bar with media controls
- **Audio Prompt**: Overlay for audio playback permission

### JavaScript Features

- **Room Management**: Connect, disconnect, handle events
- **Track Handling**: Subscribe/unsubscribe to audio/video tracks
- **Participant Management**: Track participants joining/leaving
- **Device Controls**: Camera, microphone, and screen share
- **UI Updates**: Real-time UI updates based on room events

## Browser Support

- Chrome/Edge (recommended)
- Firefox
- Safari (iOS/macOS)

## Troubleshooting

### Camera/Microphone Not Working

- Ensure browser permissions are granted
- Check if another application is using the devices
- Try refreshing the page

### Connection Issues

- Verify the LiveKit server URL is correct
- Ensure your access token is valid and not expired
- Check your network connection

### Audio Not Playing

- Click the "Enable Audio" button when prompted
- Check browser audio settings
- Ensure system volume is not muted

## Security Notes

- Never hardcode access tokens in production
- Always generate tokens server-side
- Use HTTPS in production environments
- Implement proper authentication before token generation

## Additional Resources

- [LiveKit Documentation](https://docs.livekit.io)
- [LiveKit Client SDK Reference](https://docs.livekit.io/client-sdk-js)
- [LiveKit Server SDK](https://docs.livekit.io/server/getting-started/)

## License

This is a sample application for demonstration purposes.
