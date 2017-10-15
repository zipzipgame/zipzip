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
	
	connection.send(JSON.stringify(game));

	connection.on('message', function(message) {
		if (message.type === 'utf8') {
		}
	});

	connection.on('close', function(connection) {
			
	});
});

