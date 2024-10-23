const socket = io();
    const openWhiteboardBtn = document.getElementById('openWhiteboard');
    const whiteboardApp = document.getElementById('app');
    const localVideo = document.getElementById('localVideo');
    const remoteVideo = document.getElementById('remoteVideo');
    const startCallBtn = document.getElementById('startCall');
    const shareScreenBtn = document.getElementById('shareScreen');
    const chatInput = document.getElementById('chatInput');
    const sendChatBtn = document.getElementById('sendChatBtn');
    const chatMessages = document.getElementById('chatMessages');
    const participantsList = document.getElementById('participantsList');
    const chatTab = document.getElementById('chatTab');
    const participantsTab = document.getElementById('participantsTab');
    const chatSection = document.getElementById('chatSection');
    const participantsSection = document.getElementById('participantsSection');
    const emojiBtn = document.getElementById('emojiBtn');
    const emojiPicker = document.getElementById('emojiPicker');
    const muteAudioBtn = document.getElementById('muteAudio');
    const muteVideoBtn = document.getElementById('muteVideo');
    let isAudioMuted = false;
    let isVideoMuted = false;

    const username = prompt('Enter your name'); // Prompt for username

socket.on('connect', () => {
    console.log('Connected to server');
    socket.emit('joinCall', username); // Emit join call with username
});


// Function to update participants list
socket.on('updateParticipants', (participants) => {
    participantsList.innerHTML = ''; // Clear the list

    participants.forEach(participant => {
        const li = document.createElement('li');
        li.classList.add('participant');

        const audioStatus = participant.audioMuted ? 'muted' : 'unmuted';
        const videoStatus = participant.videoMuted ? 'video-off' : 'video-on';

        li.innerHTML = `
            <span class="participant-name">${participant.username}</span>
            <div class="participant-icons">
                <i class="fa fa-microphone ${audioStatus}"></i>
                <i class="fa fa-video ${videoStatus}"></i>
            </div>
        `;

        participantsList.appendChild(li);
    });
});





// Update participant's mute/unmute status when toggled
function updateParticipantStatus(participantId, audioMuted, videoMuted) {
    socket.emit('updateParticipantStatus', { id: participantId, audioMuted, videoMuted });
}


// Emit message from client when send button is clicked
sendChatBtn.addEventListener('click', () => {
    const message = chatInput.value.trim();
    if (message) {
        socket.emit('sendMessage', message); // Emit message to server
        chatInput.value = ''; // Clear input field
    }
});

// Function to display chat messages
function displayMessage(message, type) {
    const chatItem = document.createElement('div');
    chatItem.classList.add('chat-message');
    const timestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    chatItem.innerHTML = `
        <span>${message}</span>
        <span class="timestamp">${timestamp}</span>
    `;

    chatMessages.appendChild(chatItem);
    chatMessages.scrollTop = chatMessages.scrollHeight; // Scroll to latest message
}

// Listen for new messages from the server
socket.on('newMessage', (data) => {
    displayMessage(`${data.username}: ${data.message}`, 'other');
});


// Toggle the emoji picker visibility when the emoji button is clicked
emojiBtn.onclick = () => {
  emojiPicker.style.display = emojiPicker.style.display === 'none' ? 'block' : 'none';
};

// Add selected emoji to the chat input field
emojiPicker.addEventListener('emoji-click', (event) => {
  const emoji = event.detail.unicode;
  chatInput.value += emoji; // Append the emoji to the chat input
  emojiPicker.style.display = 'none'; // Hide the emoji picker after selection
});

   // Function to toggle between Chat and Participants tabs
chatTab.onclick = () => {
  chatTab.classList.add('active');
  participantsTab.classList.remove('active');

  // Show chat section and hide participants section
  chatSection.classList.add('show');
  chatSection.classList.remove('hidden');
  
  participantsSection.classList.remove('show');
  participantsSection.classList.add('hidden');
};

participantsTab.onclick = () => {
  participantsTab.classList.add('active');
  chatTab.classList.remove('active');

  // Show participants section and hide chat section
  participantsSection.classList.add('show');
  participantsSection.classList.remove('hidden');
  
  chatSection.classList.remove('show');
  chatSection.classList.add('hidden');
};


    let localStream, remoteStream, peerConnection;

    const constraints = { video: true, audio: true };
    const servers = {
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' }
      ]
    };
// Mute/Unmute Audio
muteAudioBtn.onclick = () => {
      if (!isAudioMuted) {
        localVideo.srcObject.getAudioTracks()[0].enabled = false;
        muteAudioBtn.innerHTML = '<i class="fas fa-microphone"></i> Unmute Audio';
      } else {
        localVideo.srcObject.getAudioTracks()[0].enabled = true;
        muteAudioBtn.innerHTML = '<i class="fas fa-microphone-slash"></i> Mute Audio';
      }
      isAudioMuted = !isAudioMuted;
    };

    // Mute/Unmute Video
    muteVideoBtn.onclick = () => {
      if (!isVideoMuted) {
        localVideo.srcObject.getVideoTracks()[0].enabled = false;
        muteVideoBtn.innerHTML = '<i class="fas fa-video"></i> Unmute Video';
      } else {
        localVideo.srcObject.getVideoTracks()[0].enabled = true;
        muteVideoBtn.innerHTML = '<i class="fas fa-video-slash"></i> Mute Video';
      }
      isVideoMuted = !isVideoMuted;
    };

    startCallBtn.onclick = async () => {
      localStream = await navigator.mediaDevices.getUserMedia(constraints);
      localVideo.srcObject = localStream;

      peerConnection = new RTCPeerConnection(servers);
      localStream.getTracks().forEach(track => peerConnection.addTrack(track, localStream));

      peerConnection.ontrack = (event) => {
        remoteStream = event.streams[0];
        remoteVideo.srcObject = remoteStream;
      };

      peerConnection.onicecandidate = (event) => {
        if (event.candidate) {
          socket.emit('signal', { candidate: event.candidate });
        }
      };

      const offer = await peerConnection.createOffer();
      await peerConnection.setLocalDescription(offer);
      socket.emit('signal', { offer: offer });
    };

    socket.on('signal', async (data) => {
      if (data.offer) {
        await peerConnection.setRemoteDescription(new RTCSessionDescription(data.offer));
        const answer = await peerConnection.createAnswer();
        await peerConnection.setLocalDescription(answer);
        socket.emit('signal', { answer: answer });
      } else if (data.answer) {
        await peerConnection.setRemoteDescription(new RTCSessionDescription(data.answer));
      } else if (data.candidate) {
        await peerConnection.addIceCandidate(new RTCIceCandidate(data.candidate));
      }
    });

    

   // Event listener for opening the whiteboard
openWhiteboardBtn.onclick = () => {
  // Check if the whiteboard is currently hidden
  if (whiteboardApp.style.display === 'none') {
    // Hide video call section and show whiteboard
    videoCallSection.style.display = 'none';
    whiteboardApp.style.display = 'block';

    // Initialize Excalidraw when the whiteboard is shown
    const App = () => {
      return React.createElement(
        React.Fragment,
        null,
        React.createElement(
          "div",
          {
            style: { height: "500px", borderRadius: "20px" },
          },
          React.createElement(ExcalidrawLib.Excalidraw),
        ),
      );
    };

    const excalidrawWrapper = document.getElementById("app");
    const root = ReactDOM.createRoot(excalidrawWrapper);
    root.render(React.createElement(App));
  } else {
    // Show video call section and hide whiteboard
    whiteboardApp.style.display = 'none';
    videoCallSection.style.display = 'block';
  }
};
    shareScreenBtn.onclick = async () => {
      const screenStream = await navigator.mediaDevices.getDisplayMedia({ video: true });
      const screenTrack = screenStream.getTracks()[0];

      const sender = peerConnection.getSenders().find(s => s.track.kind === 'video');
      sender.replaceTrack(screenTrack);
      
      screenTrack.onended = () => {
        sender.replaceTrack(localStream.getVideoTracks()[0]);
      };
    };

   // Helper function to generate initials
function getInitials(name) {
  const nameParts = name.split(" ");
  const initials = nameParts.map(part => part[0]).join("").toUpperCase();
  return initials;
}

// Handle local video mute/unmute
document.getElementById("muteVideo").addEventListener("click", function() {
  const localVideo = document.getElementById("localVideo");
  const localUserInfo = document.getElementById("localUserInfo");
  const localProfileImage = document.getElementById("localProfileImage");
  const localUserName = document.getElementById("localUserName");
  
  const userName = "Akhil Kumar"; // Replace with dynamic username
  const initials = getInitials(userName);
  
  localUserName.textContent = userName;
  localProfileImage.textContent = initials;
  
  if (!localVideo.paused) {
    // Mute video, show profile image and name
    localVideo.pause();
    localUserInfo.style.display = "block";
    localVideo.style.display = "none"; // Hide video
  } else {
    // Unmute video, hide profile image and name
    localVideo.play();
    localUserInfo.style.display = "none";
    localVideo.style.display = "block"; // Show video
  }
});

// Handle remote video mute/unmute (similar logic for remote video)
document.getElementById("muteRemoteVideo").addEventListener("click", function() {
  const remoteVideo = document.getElementById("remoteVideo");
  const remoteUserInfo = document.getElementById("remoteUserInfo");
  const remoteProfileImage = document.getElementById("remoteProfileImage");
  const remoteUserName = document.getElementById("remoteUserName");
  
  const remoteUserNameText = "Akhil Kumar"; // Replace with dynamic username
  const remoteInitials = getInitials(remoteUserNameText);
  
  remoteUserName.textContent = remoteUserNameText;
  remoteProfileImage.textContent = remoteInitials;
  
  if (!remoteVideo.paused) {
    // Mute video, show profile image and name
    remoteVideo.pause();
    remoteUserInfo.style.display = "block";
    remoteVideo.style.display = "none"; // Hide video
  } else {
    // Unmute video, hide profile image and name
    remoteVideo.play();
    remoteUserInfo.style.display = "none";
    remoteVideo.style.display = "block"; // Show video
  }
});