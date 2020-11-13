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
	theQueue.push({sock_id: 	theSocketID,
					time: 		theTimeStamp,
					user: 		theUser,
					msg: 		theMsg,
					clr: 		theColor});
}

function getTimeStamp() {
	let curr = new Date();
	// let timeZone = "GMT" + (curr.getTimezoneOffset() / -60);
	// return "[" +timeZone+" "+
		// curr.getHours()+":"+curr.getMinutes()+":"+curr.getSeconds()+"]";
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
	// arst("updating message color");
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
	// io.to(socketid).emit('load chat log history', messages.reveal());

	for(let i=0; i<messages.length; i++){
		io.to(socketid).emit('chat message', 
			messages[i].time + " " + messages[i].user + ": " + messages[i].msg, messages[i].clr);
	}

	io.to(socketid).emit('chat message', "Welcome. You are User"+socketid+"!", "000000");


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
			enqueue(messages, socketid, getTimeStamp(), users[socketid][0], msg, users[socketid][1]);
			io.emit('chat message', getTimeStamp() + " " + users[socketid][0] + ": "+ msg, users[socketid][1]);
		}
		else {
			let command = msg.split(' ');
			if(command[0] === "/name"){
				if(checkDuplicateName(users, command[1])){
					socket.emit('chat message', "That usename is already taken", "000000");
				}
				else {
					socket.emit('updateUserName', command[1]);
					// enqueue(messages, users[socketid][0]+" has changed to "+command[1]);
					// io.emit('chat message', users[socketid][0]+" has changed to "+command[1], "000000");
					users[socketid][0] = command[1];
					io.emit('updateUserList', users);
				}
			}

			// TODO error check this
			else if(command[0] === "/color") {
				users[socketid][1] = command[1];
				arst(users);
				updateMessagesColor(messages, socketid, command[1]);
				arst(messages);
				io.emit('updateMessageColor', messages);
			}
		}
	});
});

http.listen(3000, () => {
  console.log('listening on *:3000');
});