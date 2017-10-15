var WebSocketServer = require('websocket').server;
var http = require('http');

var server = http.createServer(function(request, response) {

});

server.listen(1453, function () { });

wsServer = new WebSocketServer({
	httpServer: server
});



class Game {
	constructor(ball) {
		this.ball = ball;
		this.players = [];
	}
}

game = new Game({
	x:0.5,
	y:0.2,
	r:0.0002,
});

id = 5;

wsServer.on('request', function(request) {
	var connection = request.accept(null, request.origin);
	var playerID = id++;
	var player = {id:playerID};
	game.players.push(player);
	console.log(player);

	let message = {
		type: "init",
		playerId: playerId,
	}

	connection.send(JSON.stringify(message));

	connection.on('message', function(message) {
		if (message.type === 'init') {
			
		}
		connection.send(message.utf8Data));
	});

	connection.on('close', function(connection) {
			
	});

	setInterval(function(){
		let message = {
			type: "update",
			game: game
		};
		connection.send(JSON.stringify(message));
	}, 3000);
});


