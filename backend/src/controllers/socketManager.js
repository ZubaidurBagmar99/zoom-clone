// import { connections } from "mongoose"
// import { Server } from "socket.io"

// let connections = {}
// let messages = {}
// let timeOnline = {}

// export const connectToSocket = (server) =>{
//     const io = new Server(server, {
//         cors: {
//             origin: "*",
//             methods: ["GET", "POST"],
//             allowedHeaders: ["*"],
//             credentials: true
//         }
//     })


//     io.on("connection", (socket) =>{


//         socket.on("join-call", (path) =>{

//             if(connections[path] === undefined){
//                 connections[path] = []
//             }
//             connections[path].push(socket.id)

//             timeOnline[socket.id] = new Date();

//             for(let a = 0; a < connections[path].length; a++){
//                 io.to(connections[path][a]).emit("user-joined", socket.id, connections[path])
//             }

//             if(messages[path] !== undefined){
//                 for(let a = 0; a < messages[path].length; ++a){
//                     io.to(socket.id).emit("chat-message", messages[path][a]['data'], messages[path][a]['sender'], messages[path][a]['socket-id-sender'])
//                 }
//             }


//         })

//         socket.on("signal", (toId, message) => {
//             io.to(toId).emit("signal", socket.id, message)
//         })

//         socket.on("chat-message", (data, sender) =>{

//             const[matchingRoom, found] = Object.entries(connections)
//             .reduce(([room, isFound], [roomKey, roomValue]) => {


//                 if(!isFound && roomValue.includes(socket.id)){
//                     return [roomKey, true]
//                 }
//                 return [room, isFound]
//             }, ['', false])

//             if(found === true){
//                 if(messages[matchingRoom] === undefined) {
//                     messages[matchingRoom] = []
//                 }

//                 messages[matchingRoom].push({'sender': sender, 'data': data, "socket-id-sender": socket.id})
//                 console.log("message", KeyboardEvent, ":", data, sender, socket.id)

//                 connections[matchingRoom].forEach((elem) => {
//                     io.to(elem).emit("chat-message",data, sender, socket.id)
//                 })
//             }
//         })

//         socket.on("disconnect", () =>{

//             var diffTime = Math.abs(timeOnline[socket.id] - new Data())

//             var key;

//             for(const [k, v] of JSON.parse(JSON.stringify(Object.entries(connections)))){
//                 for(let a = 0; a < v.length; ++a){
//                     if(v[a] === socket.id){
//                         key = k

//                         for(let a = 0; a < connections[key].length; ++a){
//                             io.to(connections[key][a]).emit('user-left', socket.id)
//                         }

//                         var index = connections[key].indexOf(socket.id)

//                         connections[key].splice(index, 1)


//                         if(connections[key].length ===0) {
//                             delete connections[key]
//                         }
//                     }
//                 }
//             }
//         })
//     })
//     return io;
// }

import { Server } from "socket.io";

let connections = {};
let messages = {};
let timeOnline = {};

export const connectToSocket = (server) => {
    const io = new Server(server, {
        cors: {
            origin: "*",
            methods: ["GET", "POST"],
            allowedHeaders: ["*"],
            credentials: true
        }
    });

    io.on("connection", (socket) => {

        // ------------------------------
        // JOIN CALL
        // ------------------------------
        socket.on("join-call", (path) => {

            if (!connections[path]) {
                connections[path] = [];
            }

            connections[path].push(socket.id);
            timeOnline[socket.id] = new Date();

            // Notify existing users
            connections[path].forEach((id) => {
                io.to(id).emit("user-joined", socket.id, connections[path]);
            });

            // Send chat history to new user
            if (messages[path]) {
                messages[path].forEach(msg => {
                    io.to(socket.id).emit(
                        "chat-message",
                        msg.data,
                        msg.sender,
                        msg["socket-id-sender"]
                    );
                });
            }
        });

        // ------------------------------
        // WEBRTC Signal
        // ------------------------------
        socket.on("signal", (toId, message) => {
            io.to(toId).emit("signal", socket.id, message);
        });

        // ------------------------------
        // CHAT MESSAGE
        // ------------------------------
        socket.on("chat-message", (data, sender) => {

            // Find the room of this socket
            let matchingRoom = null;

            for (const [room, members] of Object.entries(connections)) {
                if (members.includes(socket.id)) {
                    matchingRoom = room;
                    break;
                }
            }

            if (!matchingRoom) return; // socket is not in any room

            if (!messages[matchingRoom]) messages[matchingRoom] = [];

            messages[matchingRoom].push({
                sender,
                data,
                "socket-id-sender": socket.id
            });

            console.log("message:", data, sender, socket.id);

            // Send chat to all members
            connections[matchingRoom].forEach(id => {
                io.to(id).emit("chat-message", data, sender, socket.id);
            });
        });

        // ------------------------------
        // DISCONNECT
        // ------------------------------
        socket.on("disconnect", () => {

            let disconnectedRoom = null;

            for (const [room, members] of Object.entries(connections)) {
                if (members.includes(socket.id)) {
                    disconnectedRoom = room;
                    break;
                }
            }

            if (!disconnectedRoom) return;

            // Notify others
            connections[disconnectedRoom].forEach(id => {
                io.to(id).emit("user-left", socket.id);
            });

            // Remove from list
            connections[disconnectedRoom] = connections[disconnectedRoom].filter(id => id !== socket.id);

            // Delete empty room
            if (connections[disconnectedRoom].length === 0) {
                delete connections[disconnectedRoom];
                delete messages[disconnectedRoom];
            }
        });
    });

    return io;
};
