// LiveKit Application
// Using the global LivekitClient namespace from the CDN

const {
  Room,
  RoomEvent,
  Track,
  VideoPresets,
  LocalParticipant,
  RemoteParticipant,
  setLogLevel,
  LogLevel,
} = LivekitClient;

// Enable debug logging
setLogLevel(LogLevel.debug);

// Configuration
const CONNECTION_API = 'https://vishal-voice-agent.codeshare.co.in/api/connection-details';

// Application State
let room = null;
let isCameraEnabled = false;
let isMicEnabled = false;
let isScreenSharing = false;

// DOM Elements
const elements = {
  connectionForm: document.getElementById('connectionForm'),
  roomView: document.getElementById('roomView'),
  connectBtn: document.getElementById('connectBtn'),
  joinForm: document.getElementById('joinForm'),
  roomName: document.getElementById('roomName'),
  participantName: document.getElementById('participantName'),
  token: document.getElementById('token'),
  connectionError: document.getElementById('connectionError'),
  roomNameDisplay: document.getElementById('roomNameDisplay'),
  participantCount: document.getElementById('participantCount'),
  connectionStatus: document.getElementById('connectionStatus'),
  videoGrid: document.getElementById('videoGrid'),
  toggleCamera: document.getElementById('toggleCamera'),
  toggleMic: document.getElementById('toggleMic'),
  toggleScreenShare: document.getElementById('toggleScreenShare'),
  leaveRoom: document.getElementById('leaveRoom'),
  loadingOverlay: document.getElementById('loadingOverlay'),
  audioPrompt: document.getElementById('audioPrompt'),
  startAudioBtn: document.getElementById('startAudioBtn'),
};

// Initialize Application
function init() {
  elements.connectBtn.addEventListener('click', handleAutoConnect);
  elements.joinForm.addEventListener('submit', handleJoinRoom);
  elements.toggleCamera.addEventListener('click', handleToggleCamera);
  elements.toggleMic.addEventListener('click', handleToggleMic);
  elements.toggleScreenShare.addEventListener('click', handleToggleScreenShare);
  elements.leaveRoom.addEventListener('click', handleLeaveRoom);
  elements.startAudioBtn.addEventListener('click', handleStartAudio);
  
  console.log('LiveKit Application Initialized');
}

// Handle Auto Connect
async function handleAutoConnect() {
  try {
    showLoading(true);
    hideError();
    
    // Fetch connection details from API
    console.log('Fetching connection details...');
    const response = await fetch(CONNECTION_API, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({}),
    });
    
    if (!response.ok) {
      throw new Error(`API request failed: ${response.status}`);
    }
    
    const connectionDetails = await response.json();
    console.log('Connection details received:', {
      serverUrl: connectionDetails.serverUrl,
      roomName: connectionDetails.roomName,
      participantName: connectionDetails.participantName,
    });
    
    // Try to fetch ICE servers configuration
    let iceServers = null;
    try {
      const iceConfigUrl = connectionDetails.serverUrl.replace('wss://', 'https://').replace('/rtc', '') + '/rtc/validate';
      console.log('Fetching ICE servers from:', iceConfigUrl);
      const iceResponse = await fetch(iceConfigUrl, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${connectionDetails.participantToken}`,
        },
      });
      if (iceResponse.ok) {
        const iceConfig = await iceResponse.json();
        console.log('ICE config received:', iceConfig);
        iceServers = iceConfig.iceServers;
      }
    } catch (error) {
      console.warn('Could not fetch ICE servers config:', error.message);
    }
    
    // Connect using API details
    await connectToRoom(
      connectionDetails.serverUrl,
      connectionDetails.participantToken,
      connectionDetails.roomName,
      connectionDetails.participantName,
      iceServers
    );
    
    // Switch to room view
    elements.connectionForm.classList.add('hidden');
    elements.roomView.classList.remove('hidden');
    
    showLoading(false);
  } catch (error) {
    console.error('Failed to auto-connect:', error);
    showError(`Failed to connect: ${error.message}`);
    showLoading(false);
  }
}

// Handle Manual Join Room
async function handleJoinRoom(e) {
  e.preventDefault();
  
  const roomName = elements.roomName.value.trim();
  const participantName = elements.participantName.value.trim();
  const token = elements.token.value.trim();
  
  if (!roomName || !participantName || !token) {
    showError('Please fill in all fields');
    return;
  }
  
  try {
    showLoading(true);
    hideError();
    
    // Use default server URL for manual connection
    const serverUrl = 'wss://vishal-voice-livekit.codeshare.co.in';
    await connectToRoom(serverUrl, token, roomName, participantName, null);
    
    // Switch to room view
    elements.connectionForm.classList.add('hidden');
    elements.roomView.classList.remove('hidden');
    
    showLoading(false);
  } catch (error) {
    console.error('Failed to join room:', error);
    showError(`Failed to join room: ${error.message}`);
    showLoading(false);
  }
}

// Connect to Room
async function connectToRoom(serverUrl, token, roomName, participantName, iceServers = null) {
  // Create room instance with minimal configuration
  const roomOptions = {
    // Enable features that might be expected by the server
    adaptiveStream: false,
    dynacast: false,
    autoSubscribe: true,
    // Explicitly set these to match expected behavior
    videoCaptureDefaults: {
      resolution: VideoPresets.h720.resolution,
    },
  };
  
  // Add ICE servers if provided
  if (iceServers && iceServers.length > 0) {
    console.log('Using provided ICE servers:', iceServers);
    roomOptions.rtcConfig = {
      iceServers: iceServers,
      iceTransportPolicy: 'all',
      bundlePolicy: 'max-bundle',
      rtcpMuxPolicy: 'require',
    };
  } else {
    // Use default with fallback STUN/TURN
    console.log('Using default ICE configuration with public STUN servers');
    roomOptions.rtcConfig = {
      iceServers: [
        {
          urls: [
            'stun:stun.l.google.com:19302',
            'stun:stun1.l.google.com:19302',
            'stun:stun2.l.google.com:19302',
          ],
        },
      ],
      iceTransportPolicy: 'all',
      bundlePolicy: 'max-bundle',
      rtcpMuxPolicy: 'require',
    };
  }
  
  room = new Room(roomOptions);
  
  // Set up event listeners
  setupRoomEventListeners();
  
  // Connect to room with options
  console.log('Connecting to:', serverUrl);
  console.log('Token (first 50 chars):', token.substring(0, 50) + '...');
  console.log('Room name:', roomName);
  
  try {
    // Connect with explicit options and longer timeout
    await room.connect(serverUrl, token, {
      autoSubscribe: true,
      publishOnlyMode: false,
      // Increase timeout for slower connections
      peerConnectionTimeout: 60000, // 60 seconds
    });
    
    console.log('✅ Connected successfully to room:', room.name);
    console.log('Room SID:', room.sid);
    console.log('Local Participant:', room.localParticipant.identity);
    console.log('Local Participant SID:', room.localParticipant.sid);
  } catch (error) {
    console.error('❌ Connection failed:', error);
    console.error('Error details:', {
      name: error.name,
      message: error.message,
      code: error.code,
      stack: error.stack,
    });
    throw error;
  }
  
  // Update UI
  elements.roomNameDisplay.textContent = roomName || room.name;
  updateParticipantCount();
  
  // For voice assistant, enable microphone immediately to establish proper connection
  console.log('🎤 Enabling microphone for voice assistant...');
  setTimeout(async () => {
    try {
      await room.localParticipant.setMicrophoneEnabled(true);
      isMicEnabled = true;
      updateControlButtons();
      console.log('✅ Microphone enabled');
      
      // Add local participant placeholder
      addParticipantPlaceholder(room.localParticipant);
    } catch (error) {
      console.warn('⚠️ Could not enable microphone:', error.message);
    }
  }, 100);
  
  // Don't auto-enable camera and microphone - let user do it manually
  console.log('✅ Connection complete. User can now enable camera/mic.');
}

// Setup Room Event Listeners
function setupRoomEventListeners() {
  room
    .on(RoomEvent.TrackSubscribed, handleTrackSubscribed)
    .on(RoomEvent.TrackUnsubscribed, handleTrackUnsubscribed)
    .on(RoomEvent.TrackMuted, handleTrackMuted)
    .on(RoomEvent.TrackUnmuted, handleTrackUnmuted)
    .on(RoomEvent.ParticipantConnected, handleParticipantConnected)
    .on(RoomEvent.ParticipantDisconnected, handleParticipantDisconnected)
    .on(RoomEvent.ActiveSpeakersChanged, handleActiveSpeakersChanged)
    .on(RoomEvent.Disconnected, handleDisconnected)
    .on(RoomEvent.LocalTrackPublished, handleLocalTrackPublished)
    .on(RoomEvent.LocalTrackUnpublished, handleLocalTrackUnpublished)
    .on(RoomEvent.AudioPlaybackStatusChanged, handleAudioPlaybackStatusChanged)
    .on(RoomEvent.MediaDevicesError, handleMediaDevicesError)
    .on(RoomEvent.ConnectionQualityChanged, handleConnectionQualityChanged)
    .on(RoomEvent.Reconnecting, handleReconnecting)
    .on(RoomEvent.Reconnected, handleReconnected)
    .on(RoomEvent.ConnectionStateChanged, handleConnectionStateChanged)
    .on(RoomEvent.SignalConnected, handleSignalConnected);
  
  // Log all events for debugging
  console.log('🔧 Room event listeners set up');
}

// Track Subscribed
function handleTrackSubscribed(track, publication, participant) {
  console.log('Track subscribed:', track.kind, participant.identity);
  
  if (track.kind === Track.Kind.Video || track.kind === Track.Kind.Audio) {
    const element = track.attach();
    addParticipantVideo(participant, element, track);
  }
}

// Track Unsubscribed
function handleTrackUnsubscribed(track, publication, participant) {
  console.log('Track unsubscribed:', track.kind, participant.identity);
  track.detach();
  removeParticipantVideo(participant, track.source);
}

// Track Muted
function handleTrackMuted(publication, participant) {
  console.log('Track muted:', publication.kind, participant.identity);
  updateParticipantInfo(participant);
}

// Track Unmuted
function handleTrackUnmuted(publication, participant) {
  console.log('Track unmuted:', publication.kind, participant.identity);
  updateParticipantInfo(participant);
}

// Participant Connected
function handleParticipantConnected(participant) {
  console.log('Participant connected:', participant.identity);
  updateParticipantCount();
  
  // Add placeholder for participant
  addParticipantPlaceholder(participant);
}

// Participant Disconnected
function handleParticipantDisconnected(participant) {
  console.log('Participant disconnected:', participant.identity);
  updateParticipantCount();
  
  // Remove participant video
  const container = document.getElementById(`participant-${participant.sid}`);
  if (container) {
    container.remove();
  }
}

// Active Speakers Changed
function handleActiveSpeakersChanged(speakers) {
  // Remove speaking class from all participants
  document.querySelectorAll('.participant-info').forEach(el => {
    el.classList.remove('speaking');
  });
  
  // Add speaking class to active speakers
  speakers.forEach(speaker => {
    const info = document.querySelector(`#participant-${speaker.sid} .participant-info`);
    if (info) {
      info.classList.add('speaking');
    }
  });
}

// Disconnected
function handleDisconnected() {
  console.log('Disconnected from room');
  cleanup();
  elements.roomView.classList.add('hidden');
  elements.connectionForm.classList.remove('hidden');
  showError('Disconnected from room');
}

// Local Track Published
function handleLocalTrackPublished(publication, participant) {
  console.log('Local track published:', publication.kind);
}

// Local Track Unpublished
function handleLocalTrackUnpublished(publication, participant) {
  console.log('Local track unpublished:', publication.kind);
  publication.track?.detach();
}

// Audio Playback Status Changed
function handleAudioPlaybackStatusChanged() {
  if (!room.canPlaybackAudio) {
    elements.audioPrompt.classList.remove('hidden');
  }
}

// Media Devices Error
function handleMediaDevicesError(error) {
  console.error('Media devices error:', error);
  showError(`Media device error: ${error.message}`);
}

// Reconnecting
function handleReconnecting() {
  console.log('Reconnecting to room...');
  elements.connectionStatus.querySelector('.status-indicator').style.background = '#f59e0b';
  elements.connectionStatus.querySelector('.status-text').textContent = 'Reconnecting...';
}

// Reconnected
function handleReconnected() {
  console.log('Reconnected to room');
  elements.connectionStatus.querySelector('.status-indicator').style.background = '#4ade80';
  elements.connectionStatus.querySelector('.status-text').textContent = 'Connected';
}

// Connection State Changed
function handleConnectionStateChanged(state) {
  console.log('🔌 Connection state changed:', state);
}

// Signal Connected
function handleSignalConnected() {
  console.log('✅ Signal connection established (WebSocket connected)');
}

// Connection Quality Changed
function handleConnectionQualityChanged(quality, participant) {
  console.log('Connection quality changed:', quality, participant.identity);
}

// Add Participant Video
function addParticipantVideo(participant, element, track) {
  let container = document.getElementById(`participant-${participant.sid}`);
  
  if (!container) {
    container = createParticipantContainer(participant);
  }
  
  // Remove placeholder if exists
  const placeholder = container.querySelector('.video-placeholder');
  if (placeholder) {
    placeholder.remove();
  }
  
  // Add video/audio element
  const mediaContainer = container.querySelector('.media-container') || container;
  
  // Check if element already exists
  const existingElement = Array.from(mediaContainer.children).find(
    child => child === element || (child.tagName === element.tagName && child.srcObject === element.srcObject)
  );
  
  if (!existingElement) {
    // Add class based on source
    if (track.source === Track.Source.ScreenShare) {
      container.classList.add('screen-share');
    }
    
    mediaContainer.appendChild(element);
  }
}

// Remove Participant Video
function removeParticipantVideo(participant, source) {
  const container = document.getElementById(`participant-${participant.sid}`);
  if (!container) return;
  
  if (source === Track.Source.ScreenShare) {
    container.classList.remove('screen-share');
  }
  
  // Check if participant has any other tracks
  const hasVideo = participant.getTrackPublication(Track.Source.Camera)?.isSubscribed;
  const hasAudio = participant.getTrackPublication(Track.Source.Microphone)?.isSubscribed;
  
  if (!hasVideo && !hasAudio) {
    // Show placeholder
    const placeholder = createParticipantPlaceholder(participant);
    container.querySelector('.media-container')?.remove();
    container.appendChild(placeholder.querySelector('.video-placeholder'));
  }
}

// Create Participant Container
function createParticipantContainer(participant) {
  const container = document.createElement('div');
  container.id = `participant-${participant.sid}`;
  container.className = 'video-container';
  
  const mediaContainer = document.createElement('div');
  mediaContainer.className = 'media-container';
  container.appendChild(mediaContainer);
  
  // Add participant info
  const info = document.createElement('div');
  info.className = 'participant-info';
  info.innerHTML = `
    <span class="name">${participant.identity}</span>
    <span class="muted-indicator" style="display: none;">🔇</span>
  `;
  container.appendChild(info);
  
  elements.videoGrid.appendChild(container);
  
  return container;
}

// Add Participant Placeholder
function addParticipantPlaceholder(participant) {
  const container = document.getElementById(`participant-${participant.sid}`);
  if (container) return;
  
  const newContainer = document.createElement('div');
  newContainer.id = `participant-${participant.sid}`;
  newContainer.className = 'video-container';
  
  const placeholder = document.createElement('div');
  placeholder.className = 'video-placeholder';
  placeholder.innerHTML = `
    <div class="avatar">${getInitials(participant.identity)}</div>
  `;
  
  newContainer.appendChild(placeholder);
  
  // Add participant info
  const info = document.createElement('div');
  info.className = 'participant-info';
  info.innerHTML = `
    <span class="name">${participant.identity}</span>
    <span class="muted-indicator" style="display: none;">🔇</span>
  `;
  newContainer.appendChild(info);
  
  elements.videoGrid.appendChild(newContainer);
}

// Update Participant Info
function updateParticipantInfo(participant) {
  const container = document.getElementById(`participant-${participant.sid}`);
  if (!container) return;
  
  const mutedIndicator = container.querySelector('.muted-indicator');
  const isMicMuted = participant.getTrackPublication(Track.Source.Microphone)?.isMuted;
  
  if (mutedIndicator) {
    mutedIndicator.style.display = isMicMuted ? 'inline' : 'none';
  }
}

// Get Initials
function getInitials(name) {
  return name
    .split(' ')
    .map(word => word[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

// Enable Camera and Microphone
async function enableCameraAndMicrophone() {
  try {
    await room.localParticipant.enableCameraAndMicrophone();
    isCameraEnabled = true;
    isMicEnabled = true;
    updateControlButtons();
    
    // Add local participant video
    addLocalParticipantVideo();
  } catch (error) {
    console.error('Failed to enable camera and microphone:', error);
    showError('Failed to enable camera and microphone');
  }
}

// Add Local Participant Video
function addLocalParticipantVideo() {
  const localParticipant = room.localParticipant;
  
  // Create container for local participant
  let container = document.getElementById(`participant-${localParticipant.sid}`);
  if (!container) {
    container = createParticipantContainer(localParticipant);
  }
  
  // Attach camera track
  const cameraTrack = localParticipant.getTrackPublication(Track.Source.Camera);
  if (cameraTrack?.track) {
    const element = cameraTrack.track.attach();
    // Mirror local video
    element.style.transform = 'scaleX(-1)';
    container.querySelector('.media-container')?.appendChild(element);
    
    // Remove placeholder
    const placeholder = container.querySelector('.video-placeholder');
    if (placeholder) placeholder.remove();
  }
}

// Handle Toggle Camera
async function handleToggleCamera() {
  if (!room) return;
  
  try {
    isCameraEnabled = !isCameraEnabled;
    await room.localParticipant.setCameraEnabled(isCameraEnabled);
    updateControlButtons();
  } catch (error) {
    console.error('Failed to toggle camera:', error);
    showError('Failed to toggle camera');
    isCameraEnabled = !isCameraEnabled;
    updateControlButtons();
  }
}

// Handle Toggle Microphone
async function handleToggleMic() {
  if (!room) return;
  
  try {
    isMicEnabled = !isMicEnabled;
    await room.localParticipant.setMicrophoneEnabled(isMicEnabled);
    updateControlButtons();
  } catch (error) {
    console.error('Failed to toggle microphone:', error);
    showError('Failed to toggle microphone');
    isMicEnabled = !isMicEnabled;
    updateControlButtons();
  }
}

// Handle Toggle Screen Share
async function handleToggleScreenShare() {
  if (!room) return;
  
  try {
    isScreenSharing = !isScreenSharing;
    await room.localParticipant.setScreenShareEnabled(isScreenSharing);
    updateControlButtons();
  } catch (error) {
    console.error('Failed to toggle screen share:', error);
    showError('Failed to toggle screen share');
    isScreenSharing = !isScreenSharing;
    updateControlButtons();
  }
}

// Handle Leave Room
async function handleLeaveRoom() {
  if (!room) return;
  
  await room.disconnect();
  cleanup();
  elements.roomView.classList.add('hidden');
  elements.connectionForm.classList.remove('hidden');
}

// Handle Start Audio
async function handleStartAudio() {
  if (!room) return;
  
  try {
    await room.startAudio();
    elements.audioPrompt.classList.add('hidden');
  } catch (error) {
    console.error('Failed to start audio:', error);
  }
}

// Update Control Buttons
function updateControlButtons() {
  if (isCameraEnabled) {
    elements.toggleCamera.classList.add('active');
    elements.toggleCamera.classList.remove('disabled');
  } else {
    elements.toggleCamera.classList.remove('active');
    elements.toggleCamera.classList.add('disabled');
  }
  
  if (isMicEnabled) {
    elements.toggleMic.classList.add('active');
    elements.toggleMic.classList.remove('disabled');
  } else {
    elements.toggleMic.classList.remove('active');
    elements.toggleMic.classList.add('disabled');
  }
  
  if (isScreenSharing) {
    elements.toggleScreenShare.classList.add('active');
  } else {
    elements.toggleScreenShare.classList.remove('active');
  }
}

// Update Participant Count
function updateParticipantCount() {
  if (!room) return;
  
  const count = room.remoteParticipants.size + 1; // +1 for local participant
  elements.participantCount.textContent = `${count} participant${count !== 1 ? 's' : ''}`;
}

// Show Error
function showError(message) {
  elements.connectionError.textContent = message;
  elements.connectionError.classList.add('show');
}

// Hide Error
function hideError() {
  elements.connectionError.classList.remove('show');
}

// Show Loading
function showLoading(show) {
  if (show) {
    elements.loadingOverlay.classList.remove('hidden');
  } else {
    elements.loadingOverlay.classList.add('hidden');
  }
}

// Cleanup
function cleanup() {
  if (room) {
    room.disconnect();
    room = null;
  }
  
  // Clear video grid
  elements.videoGrid.innerHTML = '';
  
  // Reset state
  isCameraEnabled = false;
  isMicEnabled = false;
  isScreenSharing = false;
  updateControlButtons();
}

// Initialize when DOM is loaded
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
