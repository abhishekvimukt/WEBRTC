
module.exports = (io, socket, offers, connectedSockets) => {

    socket.on('createRoom', (roomName, callback) => {
        console.log(`Room ${roomName} created`);
        socket.join(roomName);
        connectedSockets.push({ socketId: socket.id, roomName });
        callback({ success: true, roomName: roomName });
        io.to(roomName).emit('message', `${socket.id} joined room ${roomName}`);
    });

    socket.on('joinRoom', (roomName, callback) => {
        if (io.sockets.adapter.rooms.has(roomName)) {
            socket.join(roomName);
            connectedSockets.push({ socketId: socket.id, roomName });
            callback({ success: true, roomName: roomName });
            io.to(roomName).emit('message', `${socket.id} joined room ${roomName}`);
        } else {
            callback({ success: false, message: 'Room does not exist' });
        }
    });

    socket.on('newOffer', (offer, roomName) => {
        offers.push({
            offererSocketId: socket.id,
            roomName,
            offer,
            offerIceCandidates: [],
            answererSocketId: null,
            answer: null,
            answererIceCandidates: []
        });
        socket.to(roomName).emit('newOfferAwaiting', offers.slice(-1)[0]);
    });

    socket.on('newAnswer', (offerObj, ackFunction) => {
        const offerToUpdate = offers.find(o => o.offererSocketId === offerObj.offererSocketId && o.roomName === offerObj.roomName);
        if (!offerToUpdate) {
            console.log("No offer to update found");
            return;
        }

        offerToUpdate.answererSocketId = socket.id;
        offerToUpdate.answer = offerObj.answer;

        ackFunction(offerToUpdate.offerIceCandidates);

        socket.to(offerToUpdate.offererSocketId).emit('answerResponse', offerToUpdate);
    });

    socket.on('sendIceCandidateToSignalingServer', (iceCandidateObj) => {
        const { didIOffer, iceCandidate, roomName } = iceCandidateObj;
        if (didIOffer) {
            const offerInOffers = offers.find(o => o.offererSocketId === socket.id && o.roomName === roomName);
            if (offerInOffers) {
                offerInOffers.offerIceCandidates.push(iceCandidate);
                if (offerInOffers.answererSocketId) {
                    socket.to(offerInOffers.answererSocketId).emit('receivedIceCandidateFromServer', iceCandidate);
                }
            }
        } else {
            const offerInOffers = offers.find(o => o.answererSocketId === socket.id && o.roomName === roomName);
            if (offerInOffers) {
                offerInOffers.answererIceCandidates.push(iceCandidate);
                socket.to(offerInOffers.offererSocketId).emit('receivedIceCandidateFromServer', iceCandidate);
            }
        }
    });

    socket.on('disconnect', () => {
        console.log('User disconnected');
        const index = connectedSockets.findIndex(s => s.socketId === socket.id);
        if (index !== -1) {
            const disconnectedSocket = connectedSockets.splice(index, 1)[0];
            io.to(disconnectedSocket.roomName).emit('message', `${disconnectedSocket.socketId} left room ${disconnectedSocket.roomName}`);
        }
    });

    socket.on('checkRoomUsers', (roomName) => {
        const room = io.sockets.adapter.rooms.get(roomName);
        if (room) {
            socket.emit('checkRoomUsers', room.size);
        } else {
            socket.emit('checkRoomUsers', 0);
        }
    });

};