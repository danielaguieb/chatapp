var app = require('express')();
var http = require('http').createServer(app);
var io = require('socket.io')(http);

app.get('/', (req, res) => {
  res.sendFile(__dirname + '/index.html');
});

// Debugging
// let arst = function(){};
let arst = console.log.bind(console);

// Queue with max size of 200, self regulated
function Queue() {

	let _elements = [];

	function enqueue(theSocketID, theTimeStamp, theUser, theMsg) {
		if(_elements.length === 200)
			_elements.shift();
		_elements.push( {sock_id: 	theSocketID,
						time: 		theTimeStamp,
						user: 		theUser,
						msg: 		theMsg
		});
	}

	function reveal() {
		return _elements;
	}

	function length() {
		return _elements.length;
	}

	return {enqueue, reveal, length};
}


function getTimeStamp() {
	let curr = new Date();
	// let timeZone = "GMT" + (curr.getTimezoneOffset() / -60);
	return "[" +timeZone+" "+
		// curr.getHours()+":"+curr.getMinutes()+":"+curr.getSeconds()+"]";
		curr.getHours()+":"+curr.getMinutes()+"]";
}

function checkDuplicateName(u, name){
	for(let key in u) {
		if(u[key] === name)
			return true;
	}
	return false;
}

// key value pair of socketid, username, <color>
var users = {};


/*
 * sock_id: theSocketID,
 * time: 	theTimeStamp,
 * user: 	theUser,
 * msg: 	theMsg
*/
var messages = Queue();

io.on('connect', (socket) => {
	let socketid = socket.id;
	// sends socket id to client, creating their generated userName using it
	socket.emit('setUserID', socketid);
	// io.to(socketid).emit('load chat log history', messages.reveal());

	let els = messages.reveal();
	for(let i=0; i<messages.length(); i++){
		io.to(socketid).emit('chat message', 
			els[i].time + " " + els[i].user + ": " + els[i].msg);
	}

	io.to(socketid).emit('chat message', "Welcome. You are User"+socketid+"!");


	users[socketid] = "User"+socketid;
	io.emit('updateUserList', users);
	arst(users);

	socket.on('disconnect', () => {
		delete users[socketid];
		io.emit('updateUserList', users);
	});


	// when a chat message is received, emit it to all sockets
  	socket.on('chat message', (msg) => {
  		if(msg.charAt(0) !== "/"){
  			messages.enqueue(socketid, getTimeStamp(), users[socketid], msg);
    		io.emit('chat message', getTimeStamp() + " " + users[socketid] + ": "+ msg);
  		}
    	else {
    		let command = msg.split(' ');
    		if(command[0] === "/name"){
    			if(checkDuplicateName(users, command[1])){
    				socket.emit('chat message', "That usename is already taken");
    			}
    			else {
    				socket.emit('updateUserName', command[1]);
  					messages.enqueue(socketid, getTimeStamp(), 
  						"System", " "+users[socketid]+" has changed to "+command[1]);
    				io.emit('chat message', 
    					getTimeStamp()+" "+users[socketid]+" has changed to "+command[1]);
    				users[socketid] = command[1];
    				io.emit('updateUserList', users);
    			}
    		}
    	}
  	});
});

http.listen(3000, () => {
  console.log('listening on *:3000');
});