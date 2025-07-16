const userName = "Rob-"+Math.floor(Math.random() * 100000)

const socket = io.connect('https://localhost:8181/',{
})

const localVideoEl = document.querySelector('#local-video');
const remoteVideoEl = document.querySelector('#remote-video');
const roomIdInput = document.querySelector('#room-id-input');
const joinRoomButton = document.querySelector('#join-room-button');
const messagesDiv = document.querySelector('#messages');

let localStream;
let remoteStream;
let peerConnection;
let didIOffer = false;
let currentRoom = null;

let peerConfiguration = {
    iceServers:[
        {
            urls:[
              'stun:stun.l.google.com:19302',
              'stun:stun1.l.google.com:19302'
            ]
        }
    ]
}

const fetchUserMedia = ()=>{
    return new Promise(async(resolve, reject)=>{
        try{
            const stream = await navigator.mediaDevices.getUserMedia({
                video: true,
                audio: true,
            });
            localVideoEl.srcObject = stream;
            localStream = stream;    
            resolve();    
        }catch(err){
            console.log(err);
            reject()
        }
    })
}

const createPeerConnection = (offerObj)=>{
    return new Promise(async(resolve, reject)=>{
        peerConnection = await new RTCPeerConnection(peerConfiguration)
        remoteStream = new MediaStream()
        remoteVideoEl.srcObject = remoteStream;


        localStream.getTracks().forEach(track=>{
            peerConnection.addTrack(track,localStream);
        })

        peerConnection.addEventListener("signalingstatechange", (event) => {
            console.log(event);
            console.log(peerConnection.signalingState)
        });

        peerConnection.addEventListener('icecandidate',e=>{
            console.log('........Ice candidate found!......')
            console.log(e)
            if(e.candidate){
                socket.emit('sendIceCandidateToSignalingServer',{
                    iceCandidate: e.candidate,
                    didIOffer,
                    roomName: currentRoom
                })    
            }
        })
        
        peerConnection.addEventListener('track',e=>{
            console.log("Got a track from the other peer!! How excting")
            console.log(e)
            e.streams[0].getTracks().forEach(track=>{
                remoteStream.addTrack(track,remoteStream);
                console.log("Here's an exciting moment... fingers cross")
            })
        })

        if(offerObj){
            await peerConnection.setRemoteDescription(offerObj.offer)
        }
        resolve();
    })
}

const addNewIceCandidate = iceCandidate=>{
    peerConnection.addIceCandidate(iceCandidate)
    console.log("======Added Ice Candidate======")
}

joinRoomButton.addEventListener('click', async () => {
    const roomId = roomIdInput.value.trim();
    if (roomId) {
        await fetchUserMedia();
        socket.emit('joinRoom', roomId, (response) => {
            if (response.success) {
                currentRoom = roomId;
                messagesDiv.textContent = `Joined room: ${roomId}`;
                socket.emit('checkRoomUsers', roomId);
            } else {
                socket.emit('createRoom', roomId, (createResponse) => {
                    if (createResponse.success) {
                        currentRoom = roomId;
                        messagesDiv.textContent = `Created and joined room: ${roomId}`;
                    } else {
                        messagesDiv.textContent = `Error: ${createResponse.message}`;
                    }
                });
            }
        });
    } else {
        messagesDiv.textContent = 'Please enter a Room ID';
    }
});

socket.on('message', (message) => {
    messagesDiv.textContent = message;
});

socket.on('newOfferAwaiting', async (offerObj) => {
    console.log('New offer awaiting:', offerObj);
    await createPeerConnection(offerObj);
    const answer = await peerConnection.createAnswer({});
    await peerConnection.setLocalDescription(answer);
    offerObj.answer = answer;
    const offerIceCandidates = await socket.emitWithAck('newAnswer', offerObj);
    offerIceCandidates.forEach(c => {
        peerConnection.addIceCandidate(c);
        console.log("======Added Ice Candidate======")
    });
});

socket.on('answerResponse', async (offerObj) => {
    console.log('Answer response:', offerObj);
    await peerConnection.setRemoteDescription(offerObj.answer);
});

socket.on('receivedIceCandidateFromServer', (iceCandidate) => {
    console.log('Received ICE candidate from server:', iceCandidate);
    peerConnection.addIceCandidate(iceCandidate);
});

socket.on('checkRoomUsers', (numUsers) => {
    if (numUsers === 1) {
        messagesDiv.textContent += ". Waiting for another user...";
    } else if (numUsers === 2) {
        createOffer();
    }
});

const createOffer = async () => {
    await createPeerConnection();
    try {
        console.log("Creating offer...");
        const offer = await peerConnection.createOffer();
        console.log(offer);
        peerConnection.setLocalDescription(offer);
        didIOffer = true;
        socket.emit('newOffer', offer, currentRoom);
    } catch (err) {
        console.log(err);
    }
};