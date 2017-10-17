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
	}, {
		x:   0.1,
		y:   0.8,
		vy: -0.01,
		vx:  0.03,
		r:   0.05,
	}],
	players: {},
};

var CONSTS = {
  VX: .2,
  JUMP_V: .25,
  G: -.3
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
		w: 0.02,
		h: 0.06,
		vx: 0.0,
		vy: 0.0,
		moveState: 'stop',
		color: colors[id % colors.length],
	};
	connections[playerId] = connection;

	game.players[playerId] = player;
	console.log("Player " + playerId + " has connected.");

	msgPlayers = []
	for (var p in game.players) {
		let pl = game.players[p];
		msgPlayers.push({id: pl.id, x: pl.x, y: pl.y, w: pl.w, h: pl.h, color: pl.color});
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
			if (game.players[playerId].y == 0) {
				game.players[playerId].vy = CONSTS.JUMP_V;
			}
			console.log('jump');
		} else if (action === 'left') {
			game.players[playerId].moveState = 'left';
			console.log('left');
		} else if (action === 'right') {
			game.players[playerId].moveState = 'right';
			console.log('right');
		} else if (action === 'stop') {
			game.players[playerId].moveState = 'stop';
			console.log('stop');
		}
	});

	connection.on('close', function(connection) {
		console.log('Player ' + playerId + ' has disconnected.');
		delete connections[playerId];
	});
});


function ballCollision(b1, b2) {
  if (b1.x + b1.r < b2.x - b2.r ||
    b1.x - b1.r > b2.x + b2.r ||
    b1.y + b1.r < b2.y - b2.r ||
    b1.y - b1.r > b2.y + b2.r) {
    return;
  }

  var dx = b2.x - b1.x;
  var dy = b2.y - b1.y;
  var d = Math.sqrt(dx * dx + dy * dy);
  if (d > b1.r + b2.r) {
    return;
  }

  var vecx = dx / d;
  var vecy = dy / d;

  // a = (vecx, vecy)
  // p = (-vecy, vecx)
  // Velocity along axis
  var v1a = b1.vx * vecx + b1.vy * vecy;
  var v2a = b2.vx * vecx + b2.vy * vecy;
  // Velocity perpendicular
  var v1p = -b1.vx * vecy + b1.vy * vecx;
  var v2p = -b2.vx * vecy + b2.vy * vecx;
  
  if (v1a < v2a) {
    return;
  }

  var m1 = b1.r;
  var m2 = b2.r;

  var v1a_n = ((m1 - m2) * v1a + 2 * m2 * v2a) / (m1 + m2);
  var v2a_n = v1a + v1a_n - v2a;

  b1.vx = v1a_n * vecx - v1p * vecy;
  b1.vy = v1a_n * vecy + v1p * vecx;
  b2.vx = v2a_n * vecx - v2p * vecy;
  b2.vy = v2a_n * vecy + v2p * vecx;
}

let tick = function(dt) {
	for (let ball of game.balls) {
		ball.vy += CONSTS.G * dt;
		ball.x += ball.vx * dt;
		ball.y += ball.vy * dt;
		if (ball.vy < 0 && ball.y - ball.r < 0) {
      ball.y -= ball.vy * dt;
			ball.vy = -ball.vy;
		}
	}
  for (var i = 0; i < game.balls.length; i++) {
    for (var j = i + 1; j < game.balls.length; j++) {
      ballCollision(game.balls[i], game.balls[j]);
    }
  }
	for (let playerId in game.players) {
		var player = game.players[playerId];
    if (player.y > 0) {
		  player.vy += CONSTS.G * dt;
    }
		player.y += player.vy * dt;
		if (player.vy < 0 && player.y < 0) {
      player.y = 0;
			player.vy = 0;
		}
		if (player.moveState == 'left') {
			player.x = Math.max(0, player.x - CONSTS.VX * dt);
		} else if (player.moveState == 'right') {
			player.x = Math.min(1, player.x + CONSTS.VX * dt);
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


