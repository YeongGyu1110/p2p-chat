
document.addEventListener('DOMContentLoaded', () => {
    const signalingContainer = document.getElementById('signaling-container');
    const chatContainer = document.getElementById('chat-container');
    const statusDiv = document.getElementById('status');
    const messagesDiv = document.getElementById('messages');
    const messageForm = document.getElementById('message-form');
    const messageInput = document.getElementById('message-input');
    const sendBtn = document.getElementById('send-btn');

    const createOfferBtn = document.getElementById('create-offer-btn');
    const createAnswerBtn = document.getElementById('create-answer-btn');
    const connectBtn = document.getElementById('connect-btn');

    const offerSdpText = document.getElementById('offer-sdp');
    const answerSdpText = document.getElementById('answer-sdp');
    const receivedSdpAnswerText = document.getElementById('received-sdp-answer');
    const receivedSdpFinalText = document.getElementById('received-sdp-final');

    let peerConnection;
    let dataChannel;

    const iceServers = {
        iceServers: [
            { urls: 'stun:stun.l.google.com:19302' },
            { urls: 'stun:stun1.l.google.com:19302' }
        ]
    };

    const logSystemMessage = (text) => {
        const msgDiv = document.createElement('div');
        msgDiv.className = 'message system';
        msgDiv.textContent = text;
        messagesDiv.appendChild(msgDiv);
        messagesDiv.scrollTop = messagesDiv.scrollHeight;
    };

    const setupPeerConnection = () => {
        peerConnection = new RTCPeerConnection(iceServers);

        peerConnection.onicecandidate = event => {
            if (event.candidate) {
                // ICE candidate gathering
            } else {
                const sdp = JSON.stringify(peerConnection.localDescription);
                if (peerConnection.localDescription.type === 'offer') {
                    offerSdpText.value = sdp;
                } else if (peerConnection.localDescription.type === 'answer') {
                    answerSdpText.value = sdp;
                }
            }
        };

        peerConnection.onconnectionstatechange = () => {
            const state = peerConnection.connectionState;
            statusDiv.textContent = `상태: ${state}`;
            if (state === 'connected') {
                signalingContainer.classList.add('hidden');
                chatContainer.classList.remove('hidden');
                // Flex display 복구
                chatContainer.style.display = 'flex';
                messageInput.disabled = false;
                sendBtn.disabled = false;
                logSystemMessage('✅ P2P 연결 성공! 대화를 시작하세요.');
            } else if (state === 'failed' || state === 'disconnected') {
                statusDiv.style.color = '#ff7675';
                logSystemMessage('❌ 연결이 끊어졌습니다.');
                messageInput.disabled = true;
                sendBtn.disabled = true;
            }
        };

        peerConnection.ondatachannel = event => {
            dataChannel = event.channel;
            setupDataChannelEvents();
        };
    };

    const setupDataChannelEvents = () => {
        dataChannel.onopen = () => {
        };
        dataChannel.onclose = () => {
            logSystemMessage('데이터 채널 종료됨');
        };
        dataChannel.onmessage = event => {
            const msgDiv = document.createElement('div');
            msgDiv.className = 'message remote';
            const textDiv = document.createElement('div');
            textDiv.className = 'text';
            textDiv.textContent = event.data;
            msgDiv.appendChild(textDiv);
            messagesDiv.appendChild(msgDiv);
            messagesDiv.scrollTop = messagesDiv.scrollHeight;
        };
    };

    createOfferBtn.onclick = async () => {
        setupPeerConnection();
        dataChannel = peerConnection.createDataChannel('chat');
        setupDataChannelEvents();

        try {
            const offer = await peerConnection.createOffer();
            await peerConnection.setLocalDescription(offer);
            offerSdpText.placeholder = "생성 중... (1~2분 정도 소요됩니다)";
        } catch (e) {
            alert(`오류: ${e}`);
        }
    };

    createAnswerBtn.onclick = async () => {
        if (!receivedSdpAnswerText.value) {
            alert('친구에게 받은 코드를 입력해주세요.');
            receivedSdpAnswerText.focus();
            return;
        }
        setupPeerConnection();

        try {
            const offer = JSON.parse(receivedSdpAnswerText.value);
            await peerConnection.setRemoteDescription(new RTCSessionDescription(offer));
            const answer = await peerConnection.createAnswer();
            await peerConnection.setLocalDescription(answer);
            answerSdpText.placeholder = "생성 중...";
        } catch (e) {
            alert(`코드 형식이 잘못되었습니다. 다시 확인해주세요.\n\n${e}`);
        }
    };

    connectBtn.onclick = async () => {
        if (!receivedSdpFinalText.value) {
            alert('친구에게 받은 응답 코드를 입력해주세요.');
            receivedSdpFinalText.focus();
            return;
        }
        try {
            const answer = JSON.parse(receivedSdpFinalText.value);
            await peerConnection.setRemoteDescription(new RTCSessionDescription(answer));
        } catch (e) {
            alert(`코드 형식이 잘못되었습니다.\n\n${e}`);
        }
    };

    messageForm.onsubmit = e => {
        e.preventDefault();
        const message = messageInput.value.trim();
        if (message && dataChannel.readyState === 'open') {
            dataChannel.send(message);

            const msgDiv = document.createElement('div');
            msgDiv.className = 'message local';
            const textDiv = document.createElement('div');
            textDiv.className = 'text';
            textDiv.textContent = message;
            msgDiv.appendChild(textDiv);
            messagesDiv.appendChild(msgDiv);
            messagesDiv.scrollTop = messagesDiv.scrollHeight;

            messageInput.value = '';
        }
    };
});
