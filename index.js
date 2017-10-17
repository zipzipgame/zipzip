var WebSocketServer = require('websocket').server;
var http = require('http');

var server = http.createServer(function(request, response) {

});

http.createServer(function (req, res) {
    res.writeHead(200, {'Content-Type': 'text/plain'});
    res.end('Hello World!');
}).listen(8080);

server.listen(1453, function () { });

wsServer = new WebSocketServer({
	httpServer: server
});

var game = {
	balls: [{
		x:   0.5,
		y:   0.2,
		vy: -0.01,
		vx:  0.0,
		r:   0.07,
	}],
	players: [],
};

id = 2;

colors = ['blue', 'red', 'purple', 'cyan', 'yellow', 'pink', 'black'];

connections = {};

wsServer.on('request', function(request) {
	var connection = request.accept(null, request.origin);
	var playerId = id++;
	var player = {
		id: playerId,
		x: 0.2,
		y: 0.1,
		w: 0.0001,
		color: colors[id%colors.length],
	};
	connections[playerId] = connection;

	game.players.push(player);
	console.log("Player " + playerId + " has connected.");

	let message = {
		type: "init",
		playerId: playerId,
		players: game.players,
	}

	connection.send(JSON.stringify(message));

	connection.on('message', function(message) {
		let action = JSON.parse(message.utf8Data)['action'];
		if (action === 'jump') {
			console.log('jump');
		} else if (action === 'left') {
			console.log('left');
		} else if (action === 'right') {
			console.log('right');
		} else if (action === 'stop') {
			console.log('stop');
		}
	});

	connection.on('close', function(connection) {
		console.log('Player ' + playerId + ' has disconnected.');
		delete connections[playerId];
	});
});


let g = -.3; 

let tick = function(dt) {
	for (let ball of game.balls) {
		ball.vy += g * dt;
		ball.x += ball.vx * dt;
		ball.y += ball.vy * dt;
		if (ball.vy < 0 && ball.y - ball.r < 0) {
			ball.vy = -ball.vy;
		}
	}
}


setInterval(function(){
	tick(0.025);
	let abemal = {};
	for (let p of game.players) {
		abemal[p.id] = {x: p.x, y: p.y};
	}
	let message = {
		type: "update",
		balls: game.balls,
		players: abemal,
	};
	for (let i in connections) {
		connections[i].send(JSON.stringify(message));
	}
}, 25);


