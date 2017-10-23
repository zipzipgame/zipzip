var WebSocketServer = require('websocket').server;
var http = require('http');
var express = require('express');

const PORT = process.env.PORT || 3000;

const server_ = express()
	.use(express.static(__dirname + '/public'))
	.listen(PORT, () => console.log('Listening on ' + PORT));

wsServer = new WebSocketServer({
	httpServer: server_
});

class Server {
	constructor() {
		this.publicGames = {};
		this.customGames = {};

		this.nextGameId = 58008;
		this.nextConnectionId = 1453;
	}
	newConnection(conn) {
		for (let game of Object.values(this.publicGames)) {
			if (!game.full()) {
				let connection = new Connection(this.nextConnectionId++, game.id, conn);
				game.addConnection(connection);
				return connection;
			}
		}
		let game = this.createPublicGame();
		let connection = new Connection(this.nextConnectionId++, game.id, conn);
		game.addConnection(connection);

		return connection;
	}
	createPublicGame() {
		let game = new Game(this.nextGameId++);
		this.publicGames[game.id] = game;
		return game;
	}
	findGame(gameId) {
		if (gameId in this.publicGames) {
			return this.publicGames[gameId];
		} else if (gameId in this.customGames) {
			return this.customGames[gameId];
		} else {
			console.log("Couldn't find game for player " + playerId + " with gameId " + gameId + ".");
			return null;
		}
	}
	sendNewPlayer(connection) {
		let game = this.findGame(connection.gameId);
		game.sendNewPlayer(connection.player);
	}
	closeConnection(connection) {
		let game = this.findGame(connection.gameId);
		game.closeConnection(connection.id);
	}
	tick(dt) {
		for (let game of Object.values(this.publicGames)) {
			game.tick(dt);
			game.sendUpdate();
		}
		for (let game of Object.values(this.customGames)) {
			game.tick(dt);
			game.sendUpdate();
		}
	}
}

class Player {
	constructor(id, name, color) {
		this.id = id;
		this.name = name;
		this.x = 0.2;
		this.y = 0.1;
		this.w = 0.008;
		this.h = 0.02;
		this.vx = 0.0;
		this.vy = 0.0;
		this.moveState = 'stop';
		this.color = color;
		this.score = 0;
	}
	getInitObj() {
		return {id: this.id, name:this.name, x: this.x, y: this.y, w: this.w,
			h: this.h, color: this.color, score: this.score};
	}
	getUpdateObj() {
		return {id: this.id, x: this.x, y: this.y, score: this.score};
	}
}

class Connection {
	constructor(id, gameId, connection) {
		this.connection = connection;
		this.player = null;
		this.id = id;
		this.gameId = gameId;
	}
	attachPlayer(name, color) {
		this.player = new Player(this.id, name, color);
	}
	hasPlayer() {
		return !!this.player;
	}
	send(msg) {
		this.connection.send(msg);
	}
}

class Game {
	constructor(id, capacity) {
		this.id = id;
		this.balls = [{
			x:   0.5,
			y:   0.2,
			vy: -0.01,
			vx:  0.0,
			r:   0.03,
			player: -1,
		}, {
			x:   0.1,
			y:   0.3,
			vy: -0.01,
			vx:  0.03,
			r:   0.02,
			player: -1,
		}];

		this.connections = {};
		this.capacity = capacity || 4;
	}
	markBall(idx, playerId) {
		this.balls[idx].player = playerId;
	}
	unmarkBall(idx) {
		this.balls[idx].player = -1;
	}
	addConnection(connection) {
		this.connections[connection.id] = connection;
		let objs = this.getPlayers().map(p => p.getInitObj());
		let msg = {
			type: "init",
			playerId: connection.id,
			players: objs,
			balls: this.balls,
		};
		connection.send(JSON.stringify(msg));
		console.log("Player " + connection.id + " has connected.");
	}
	getPlayers() {
		let conns = Object.values(this.connections);
		return conns.filter(conn => conn.hasPlayer())
				.map(conn => conn.player);
	}
	findPlayer(connId) {
		return this.connections[connId].player;
	}
	full() {
		return Object.keys(this.connections).length >= this.capacity;
	}
	sendNewPlayer(player) {
		let msg = {
			type: 'newplayer',
			player: player.getInitObj(),
		};
		this.sendToAll(msg);
	}
	closeConnection(connId) {
		let msg = {
			type: 'removeplayer',
			playerId: connId,
		};
		for (let ball of this.balls) {
			if (ball.player == connId) {
				ball.player = -1;
			}
		}
		delete this.connections[connId];
		this.sendToAll(msg);
	}
	sendToAll(msg) {
		for (let c of Object.values(this.connections)) {
			c.send(JSON.stringify(msg));
		}
	}
	sendUpdate() {
		let msg = {
			type: "update",
			balls: this.balls,
			players: this.getPlayers().map(p => p.getUpdateObj()),
		};
		this.sendToAll(msg);
	}
	ballCollision(b1, b2) {
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

	pointInBall(p, b) {
		var dx = p.x - b.x;
		var dy = p.y - b.y;
		return dx * dx + dy * dy < b.r * b.r;
	}

	cornerBallCollision(p, b) {
		var dx = p.x - b.x;
		var dy = p.y - b.y;
		var d = Math.sqrt(dx * dx + dy * dy);
		if (d > b.r) {
			return;
		}

		var vecx = dx / d;
		var vecy = dy / d;
		// a = (vecx, vecy)
		// p = (-vecy, vecx)
		// Velocity along axis
		var bva = b.vx * vecx + b.vy * vecy;
		// Velocity perpendicular
		var bvp = -b.vx * vecy + b.vy * vecx;

		if (bva < 0) {
			return;
		}

		var bva_n = -bva;

		b.vx = bva_n * vecx - bvp * vecy;
		b.vy = bva_n * vecy + bvp * vecx;
	}

	playerBallCollision(p, b) {
		if (p.y + p.h < b.y - b.r ||
			p.x - p.w / 2 > b.x + b.r ||
			p.x + p.w / 2 < b.x - b.r) {
			return;
		}

		var c1 = {x: p.x - p.w / 2, y: p.y + p.h};
		var c2 = {x: p.x + p.w / 2, y: p.y + p.h};

		var in1 = this.pointInBall(c1, b);
		var in2 = this.pointInBall(c2, b);
		if (in1 && in2) {
			if (b.vy < p.vy) {
				b.vy = 2 * p.vy - b.vy;
			}
		} else if (in1) {
			this.cornerBallCollision(c1, b);
			if (p.vy > 0 && b.vy < p.vy / 2) {
				b.vy += p.vy / 5;
			}
		} else if (in2) {
			this.cornerBallCollision(c2, b);
			if (p.vy > 0 && b.vy < p.vy / 2) {
				b.vy += p.vy / 5;
			}
		b.vy += .03;
		}
		for (let ball of this.balls) {
			if (ball.player == p.id) {
				ball.player = -1;
			}
		}
		b.player = p.id;
		p.score++;
	}
	tick(dt) {
		let players = this.getPlayers();
		for (let ball of this.balls) {
			ball.vy += CONSTS.BALLG * dt;
			if (ball.vx > CONSTS.BALL_MAXV) ball.vx = CONSTS.BALL_MAXV;
			if (ball.vx < -CONSTS.BALL_MAXV) ball.vx = -CONSTS.BALL_MAXV;
			if (ball.vy > CONSTS.BALL_MAXV) ball.vy = CONSTS.BALL_MAXV;
			if (ball.vy < -CONSTS.BALL_MAXV) ball.vy = -CONSTS.BALL_MAXV;
			ball.x += ball.vx * dt;
			ball.y += ball.vy * dt;
			if (ball.vy < 0 && ball.y - ball.r < 0) {
				ball.y -= ball.vy * dt;
				ball.vy = -ball.vy;
				if (ball.player != -1) {
					let player = this.findPlayer(ball.player);
					player.score = Math.floor(player.score / 2);
				}
				ball.player = -1;
			}
			if (ball.x - ball.r < 0 && ball.vx < 0) {
				ball.x -= ball.vx * dt;
				ball.vx = Math.abs(ball.vx);
			}
			if (ball.x + ball.r > 1 && ball.vx > 0) {
				ball.x -= ball.vx * dt;
				ball.vx = -Math.abs(ball.vx);
			}
		}
		for (var i = 0; i < this.balls.length; i++) {
			for (var j = i + 1; j < this.balls.length; j++) {
				this.ballCollision(this.balls[i], this.balls[j]);
			}
		}
		for (let ball of this.balls) {
			for (let player of players) {
				this.playerBallCollision(player, ball);
			}
		}
		for (let player of players) {
			if (player.y > 0) {
				player.vy += CONSTS.PLAYERG * dt;
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
}

const server = new Server();

const CONSTS = {
	VX: .15,
 	JUMP_V: .4,
 	BALLG: -.15,
 	PLAYERG: -2.0,
 	BALL_MAXV: .2,
};

const colors = ['blue', 'red', 'purple', 'cyan', 'yellow', 'pink', 'black'];

wsServer.on('request', function(request) {
	let conn = request.accept(null, request.origin);
	let connection = server.newConnection(conn);

	conn.on('message', function(message) {
		var message = JSON.parse(message.utf8Data);
		if (message.type === 'init') {
			connection.attachPlayer(message.name, colors[connection.id % colors.length]);
			server.sendNewPlayer(connection);
		}
		if (message.type === 'action') {
			let action = message.action;
			let player = connection.player;
			if (action === 'jump' && player.y == 0) {
				player.vy = CONSTS.JUMP_V;
			} else if (action === 'left' || action === 'right' || action === 'stop') {
				player.moveState = action;
			}
		}
	});

	conn.on('error', function(c) {
		console.log('Player ' + connection.id + ' has disconnected with error.');
	});

	conn.on('close', function(c) {
		console.log('Player ' + connection.id + ' has disconnected.');
		server.closeConnection(connection);
	});
});

setInterval(function(){
	server.tick(0.025);
}, 25);

// vim: noexpandtab
