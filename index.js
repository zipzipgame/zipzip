var WebSocketServer = require('websocket').server;
var http = require('http');
var express = require('express');

const PORT = process.env.PORT || 3000;

const server = express()
  .use(express.static(__dirname + '/public'))
  .listen(PORT, () => console.log('Listening on ' + PORT));

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
	players: {},
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
		h: 0.0002,
		vx: 0.0,
		vy: 0.0,
		moveState: 'stop',
		color: colors[id%colors.length],
	};
	connections[playerId] = connection;

	game.players[playerId] = player;
	console.log("Player " + playerId + " has connected.");

	msgPlayers = []
	for (var p in game.players) {
		let pl = game.players[p];
		msgPlayers += {id: pl.id, x: pl.x, y: pl.y, w: pl.w, h: pl.h, color: pl.color};
	}

	let message = {
		type: "init",
		playerId: playerId,
		players: msgPlayers,
	}

	connection.send(JSON.stringify(message));

	connection.on('message', function(message) {
		let action = JSON.parse(message.utf8Data)['action'];
		if (action === 'jump') {
			if (game.players[playerId].y <= 0.001) {
				game.players[playerId].vy += 0.001;
			}
			console.log('jump');
		} else if (action === 'left') {
			game.players[playerId].moveState = 'left';
			console.log('left');
		} else if (action === 'right') {
			game.players[playerId].moveState = 'right';
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
      ball.y -= ball.vy * dt;
			ball.vy = -ball.vy;
		}
	}
	for (let playerId in game.players) {
		var player = game.players[playerId];
		player.vy += g * dt;
		player.y += player.vy * dt;
		if (player.vy < 0 && player.y < 0) {
      player.y -= player.vy * dt;
			player.vy = 0;
		}
		if (player.moveState == 'right') {
			player.x = Math.max(0, player.x - 0.2*dt);
		} else if (player.moveState == 'left') {
			player.x = Math.min(1, player.x + 0.2*dt);
		}
	}
}


setInterval(function(){
	tick(0.025);
	let abemal = {};
	for (let playerId in game.players) {
		var p = game.players[playerId];
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


