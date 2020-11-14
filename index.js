var app = require('express')();
var http = require('http').createServer(app);
var io = require('socket.io')(http);

app.get('/', (req, res) => {
  res.sendFile(__dirname + '/index.html');
});

// For maintaining the Queue of messages
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

// For formatting timestamp
function getTimeStamp() {
	let curr = new Date();
	return "["+curr.getHours()+":"+curr.getMinutes()+"]";
}

// For checking if a username is taken
function checkDuplicateName(u, name){
	for(let key in u) {
		if(u[key][0] === name)
			return true;
	}
	return false;
}

// For updating the messages with the color
function updateMessagesColor(m, s_id, clr){
	for(let i = 0; i<m.length; i++){
		if(m[i].sock_id === s_id)
			m[i].clr = clr;
	}
}

// For validating RRGGBB value where each character is 0-9a-fA-F
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

// For replacing text with emojis
function replaceWithEmojis(msg){
	return msg.replace(":)", String.fromCodePoint(0x1F600)
		).replace(":(", String.fromCodePoint(0x1F641)
		).replace(":O", String.fromCodePoint(0x1F632));
}


// Globabl variables for list of users and list of messages

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

	// Send socketID to client
	socket.emit('setUserID', socketid);

	// Load in chat log history to new client
	for(let i=0; i<messages.length; i++){
		io.to(socketid).emit('chat message', messages[i]);
	}


	// Welcome toast message
	io.to(socketid).emit('toast message', "Welcome. You are User"+socketid+"!");


	// Send socket ID and username
	users[socketid] = ["User"+socketid, "000000"];
	io.emit('updateUserList', users);


	// On a client disconnecting, remove user from the users list
	socket.on('disconnect', () => {
		delete users[socketid];
		io.emit('updateUserList', users);
	});


	// On recieving chat message, send to all clients
	socket.on('chat message', (msg) => {
		if(msg.charAt(0) !== "/"){

			// Emoji text replacement
			let emojiMsg = replaceWithEmojis(msg);

			// Emit to all
			io.emit('chat message', 
				enqueue(messages, socketid, getTimeStamp(), users[socketid][0], emojiMsg, users[socketid][1]));
		}

		// Command handling
		else {
			let command = msg.split(' ');

			// Handle /name command
			if(command[0] === "/name"){

				// Error handle duplicate name and toast message
				if(checkDuplicateName(users, command[1])){
					io.to(socketid).emit('toast message', "That username is already taken");
				}

				// Error handle name being too long and toast message
				else if (command[1].length > 30){
					io.to(socketid).emit('toast message', "Please enter a username under 30 characters");
				}

				// If fine, update name
				else {
					socket.emit('updateUserName', command[1]);
					users[socketid][0] = command[1];
					io.emit('updateUserList', users);
				}
			}

			// Handle /color command
			else if(command[0] === "/color") {

				// Verify valid RRGGBB value
				if(isRRGGBB(command[1])){
					users[socketid][1] = command[1];
					updateMessagesColor(messages, socketid, command[1]);
					io.emit('updateMessageColor', messages);
				}

				// Error handle invalid RRGGBB value
				else {
					io.to(socketid).emit('toast message', "Please input a RRGGBB format for your color");
				}
			}

			// Error handle incorrect command
			else {
				io.to(socketid).emit('toast message', "Sorry that command does not exist");
			}
		}
	});
});

http.listen(3000, () => {
  console.log('listening on *:3000');
});