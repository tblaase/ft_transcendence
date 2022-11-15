import { SubscribeMessage,
	WebSocketGateway,
	WebSocketServer,
	ConnectedSocket,
	OnGatewayInit,
	OnGatewayConnection,
	OnGatewayDisconnect,
	MessageBody,
} from '@nestjs/websockets';
import { GameService } from './game.service';
import { Socket, Server } from 'socket.io';
import { hostURL } from 'src/hostURL';
import { AuthService } from 'src/auth/auth.service';
import { Game } from './game.entities/game.entity';
import User from 'src/users/entitys/user.entity';
import { forwardRef, Injectable, Inject } from '@nestjs/common';

@WebSocketGateway({
	namespace: 'game',
	cors: {
		origin: [hostURL + ':8080', hostURL +':3000'],
		credentials: true
	},
})
@Injectable()
export class GameGateway implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect {

	constructor (
		@Inject(forwardRef(() => GameService))
		private readonly gameService: GameService,
		@Inject(forwardRef(() => AuthService))
		private authService: AuthService,
	) {};

  @WebSocketServer()
	server: Server;

  afterInit() { console.log("GameGateway: After init"); }

  async handleConnection(@ConnectedSocket() socket: Socket) {
	console.log("client %s connected", socket?.handshake.auth.id);
	this.authService.validateSocket(socket)
  }

  handleDisconnect(@ConnectedSocket() client: Socket) {
	console.log("client %s disconnected", client?.handshake.auth.id);
  }

  isSpectating(clientId: number): Game | undefined {
	return this.gameService.getSpectatedGame(clientId);
  }

  async joinGameRoom(client: Socket, game: Game) {
	console.log("joining existing gameRoom");
	client.join(game.id.toString());
	if (game.interval == null) {
		if (client.handshake.auth.id === game.loser?.id) {
			client.emit('resetRequester')
			await this.gameService.startGame(this.server, game);
		}
	} else {
		client.emit('GameInfo', {winner: game.winner, loser: game.loser})
		client.emit('updatePaddle', {paddleLeft: game.paddleLeft, paddleRight: game.paddleRight})
		client.emit('updateScore', {scoreLeft: game.score.scoreLeft, scoreRight: game.score.scoreRight})
	}
  }

  @SubscribeMessage('isInGame')
  async handleIsInGame(@ConnectedSocket() client: Socket,
  @MessageBody('isCustomized') isCustomized: boolean) {
	var game: Game | undefined
	const clientId: number = client.handshake.auth.id;

	console.log("isInGame start", client.rooms);

	game = this.gameService.getGame(clientId);
	if (game == undefined) {
		game = this.isSpectating(clientId);
		if (game == undefined) {
			console.log("no existing game for client available", clientId);
			game = await this.gameService.joinGameOrCreateGame(client.handshake.auth as User, isCustomized)
		} else {
			console.log("client is spectating");
		}
	} else {
		console.log("client is playing");
	}
	await this.joinGameRoom(client, game);
	console.log("isInGame end", client.rooms);
  }

  @SubscribeMessage('GameRequestBackend')
  async handleGameRequest(
	@ConnectedSocket() client: Socket,
	@MessageBody('isCustomized') isCustomized: boolean,
	@MessageBody('id') id?: number,
  ) {

	let ret = { winner: undefined, loser: undefined, push: false };
	const clientId: number = client.handshake.auth.id;

	if (clientId === id) return ret; // Selfinvite -> no push
	let game: Game | undefined = this.gameService.getGame(clientId)
	if (game != undefined) {
		console.log("gameRequest: client has a game. Reject request");
		return ret; // client in game -> no push
	} else {
		console.log("gameRequest: client has no game");
		game = this.gameService.getGame(id);
		if(game == undefined) {
			console.log("gameRequest: opponent has no game");
			const socket = await this.findSocketOfUser(id)
			if (socket == undefined) {
				console.log("gameRequest: opponent is offline");
				return ret; // offline opponent -> no push
			} else {
				socket.emit('GameRequestFrontend', client.handshake.auth as User)
				game = await this.gameService.joinGameOrCreateGame(client.handshake.auth as User, isCustomized, id)
				// opponent has no game -> push to /play
				ret = { winner: game.winner, loser: game.loser, push: true }
			}
		} else {
			// opponent has game, -> push to /play
			ret.push = true
			console.log("gameRequest: invited player has game. Specatating.");
			client.rooms.forEach(roomId => { if (client.id != roomId) client.leave(roomId) });
			this.gameService.addUserToSpectators(clientId, game);
		}
	}
	client.join(game.id.toString());
	console.log("gameRequest end");
	return ret
  }

  @SubscribeMessage('isCustom')
  handleIsCustomRequest(@MessageBody('id') id: number) {
	console.log('handleIsCustomRequest');

	const game: Game = this.gameService.getGame(id)
	return game.isCustomized === true ? true : false
  }

  @SubscribeMessage('accept')
  async handleAcceptGameRequest(@ConnectedSocket() client: Socket) {
	var game: Game = this.gameService.getGame(client.handshake.auth.id)
	if(game != undefined && game.interval == null) {
		console.log('accept');
		let socket = await this.findSocketOfUser(game.winner.id)
		if (socket != undefined) {
			socket.emit('NowInGame', true)
			await this.gameService.startGame(this.server, game)
		}
	}
  }

  @SubscribeMessage('denied')
  async handleDenyGameRequest(@ConnectedSocket() client: Socket) {
	var game: Game = this.gameService.getGame(client.handshake.auth.id)
	if(game != undefined && game.interval == null) {
		game.spectators.forEach(async (element: number) =>  {
			const socket = await this.findSocketOfUser(element);
			if (socket)
				socket.emit('NowInGame', false)
		})
		const socket = await this.findSocketOfUser(game.winner.id)
		this.closeRoom(game.id.toString())
		if (this.gameService.removeGame(game)) {
			if (socket != undefined)
				socket.emit('NowInGame', false)
		}
	}
  }

  closeRoom(roomId: string) {
	console.log("closing room", roomId);
	this.server.in(roomId).socketsLeave(roomId);
  }

  // emittable bywinner  (while game is pending) and spectator
  @SubscribeMessage('leaveGame')
  async handleLeaveGame(@ConnectedSocket() client: Socket) {
	console.log("leaveGame");
	const clientId: number = client.handshake.auth.id;

	client.rooms.forEach(roomId => { if (client.id != roomId) client.leave(roomId) });
	let game = this.gameService.spectatorsMap.get(clientId);
	this.gameService.removeUserFromSpectators(clientId, game);
	game = this.gameService.getGame(clientId);
	if (game == undefined) return;
	const isMatchDeletable: boolean = clientId === game.winner.id && game.interval == null;
	if (isMatchDeletable) {
		if (game.loser != undefined) {
			const socket = await this.findSocketOfUser(game.loser.id)
			if (socket != undefined)
				socket.emit('resetRequester')
		}
		game.spectators.forEach(async (element: number) =>  {
			const socket = await this.findSocketOfUser(element)
			if (socket)
				socket.emit('NowInGame', false);
		})
		this.closeRoom(game.id.toString())
		this.gameService.removeGame(game);
	}
	console.log("leaveGame ende");
  }

  @SubscribeMessage('ViewGame')
  async viewRequest(
	@ConnectedSocket() client: Socket,
	@MessageBody('id') id?: number
  )
  {
	const game: Game = this.gameService.getGame(id)
	if(game != undefined) {
		client.join(game.id.toString())
	}
	return {winner: game.winner, loser: game.loser}
  }

  @SubscribeMessage('key')
  handleKey(
	@ConnectedSocket() client: Socket,
	@MessageBody() key?: string) {
	this.gameService.handleKeypress(client.handshake.auth.id, key)
  }

  @SubscribeMessage('statusRequest')
  async getStatusRequest(userId: number) {
	console.log("in statusRequest");
	const socket = await this.findSocketOfUser(userId)
	console.log(socket);
	return {content: socket}
  }

  async findSocketOfUser(userId: number) {
	const sockets = await this.server.fetchSockets();
	for (const socket of sockets) {
		if(socket.handshake.auth.id == userId) {
			return socket
		}
	}
	return undefined
  }
}
