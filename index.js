var app = require('express')();
var http = require('http').createServer(app);
var io = require('socket.io')(http);

// app.use(express.static('css'));

app.get('/', (req, res) => {
  res.sendFile(__dirname + '/index.html');
});

// Debugging
// let arst = function(){};
let arst = console.log.bind(console);


// make sure max size is 200
function enqueue(theQueue, theSocketID, theTimeStamp, theUser, theMsg, theColor) {
	if(theQueue.length > 200)
		theQueue.shift();
	let message = {sock_id: 	theSocketID,
					time: 		theTimeStamp,
					user: 		theUser,
					msg: 		theMsg,
					clr: 		theColor};
	theQueue.push(message);
	return message;
}

function getTimeStamp() {
	let curr = new Date();
	return "["+curr.getHours()+":"+curr.getMinutes()+"]";
}

function checkDuplicateName(u, name){
	for(let key in u) {
		if(u[key][0] === name)
			return true;
	}
	return false;
}

function updateMessagesColor(m, s_id, clr){
	for(let i = 0; i<m.length; i++){
		if(m[i].sock_id === s_id)
			m[i].clr = clr;
	}
}

function isRRGGBB(clr){
	if(clr.length === 6){
		for(let i=0; i<clr.length; i++){
			let a = clr.charCodeAt(i);
			if(!((48 <= a && a <= 57) || (65 <= a && a <= 70) || (97 <= a && a <= 102)))
				return false;
		}
		return true;
	}
	return false;
}

function replaceWithEmojis(msg){
	return msg.replace(":)", String.fromCodePoint(0x1F600)
		).replace(":(", String.fromCodePoint(0x1F641)
		).replace(":O", String.fromCodePoint(0x1F632));
}

/*
 * socketid: [username, color]
*/
var users = {};


/*
 * sock_id: theSocketID,
 * time: 	theTimeStamp,
 * user: 	theUser,
 * msg: 	theMsg
 * clr: 	theColor
*/
var messages = [];

io.on('connect', (socket) => {
	let socketid = socket.id;
	// sends socket id to client, creating their generated userName using it
	socket.emit('setUserID', socketid);
	for(let i=0; i<messages.length; i++){
		io.to(socketid).emit('chat message', messages[i]);
	}

	io.to(socketid).emit('toast message', "Welcome. You are User"+socketid+"!");

	users[socketid] = ["User"+socketid, "000000"];
	io.emit('updateUserList', users);
	arst(users);

	socket.on('disconnect', () => {
		delete users[socketid];
		io.emit('updateUserList', users);
	});


	// when a chat message is received, emit it to all sockets
	socket.on('chat message', (msg) => {
		if(msg.charAt(0) !== "/"){
			let emojiMsg = replaceWithEmojis(msg);
			io.emit('chat message', 
				enqueue(messages, socketid, getTimeStamp(), users[socketid][0], emojiMsg, users[socketid][1]));
		}
		else {
			let command = msg.split(' ');
			if(command[0] === "/name"){
				if(checkDuplicateName(users, command[1])){
					io.to(socketid).emit('toast message', "That username is already taken");
				}
				else if (command[1].length > 30){
					io.to(socketid).emit('toast message', "Please enter a username under 30 characters");
				}
				else {
					socket.emit('updateUserName', command[1]);
					users[socketid][0] = command[1];
					io.emit('updateUserList', users);
				}
			}
			else if(command[0] === "/color") {
				if(isRRGGBB(command[1])){
					users[socketid][1] = command[1];
					arst(users);
					updateMessagesColor(messages, socketid, command[1]);
					arst(messages);
					io.emit('updateMessageColor', messages);
				}
				else {
					io.to(socketid).emit('toast message', "Please input a RRGGBB format for your color");
				}
			}
		}
	});
});

http.listen(3000, () => {
  console.log('listening on *:3000');
});