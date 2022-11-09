import { forwardRef, Inject, Injectable } from '@nestjs/common';
import { Game, Side } from './game.entities/game.entity';
import { Paddle } from './game.entities/paddle.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Socket, Server } from 'socket.io';
import { GameSetup } from './game.entities/setup.entity';
import { QueueElem } from './game.interfaces/queueobj.interface'
import { UsersService } from 'src/users/users.service';
import User from 'src/users/entitys/user.entity';
import { GameData } from './game.entities/gameData';
import { UserStatus } from "../users/entitys/status.enum";
import { GameGateway } from './game.gateway';

@Injectable()
export class GameService {
	constructor(
		private userService: UsersService,
		@Inject(forwardRef(() => GameGateway))
		private gameGateway: GameGateway,
		){}

	setup = new GameSetup;
	gamesArr: Array<Game> = []
	spectatorsMap = new Map<number, Game>;

	@InjectRepository(Game)
	private gameRepository: Repository<Game>

	getGame(user_id: number | undefined): Game {
		return this.gamesArr.find((value: Game) =>  value.playerLeft?.id == user_id || value.playerRight?.id == user_id)
	}

	addUserToSpectators(userId: number, game: Game) {
		this.spectatorsMap.set(userId, game);
		game.spectators.push(userId);
	}

	removeUserFromSpectators(userId: number, game: Game) {
		if (game != undefined) {
			this.spectatorsMap.delete(userId);
			const index = game.spectators.indexOf(userId);
			if (index > -1) {
				game.spectators.splice(index, 1);
			}
		}
	}

	getSpectatedGame(userId: number): Game | undefined {
		return this.spectatorsMap.get(userId)
	}

	clearSpectatorArr(game: Game) {
		game.spectators.length = 0;
	}

	async joinGameOrCreateGame(user: User, server: Server, opponentUserId?: number): Promise<Game> {
		let game = this.getGame(undefined) // checking for first game with missing (undefined) opponent
		if (game == undefined || opponentUserId) {
			game = await this.createGameInstance(user.id)
			game.playerLeft = user
			// opponentUserId is set when called via Frontend::askForMatch
			if(opponentUserId != undefined) {
				const opponent = await this.userService.getUser(opponentUserId)
				game.playerRight = opponent
			}
			this.gamesArr.push(game)
		} else { // queue game exists, join and set user as opponent
			console.log("joinGameOrCreateGame: set User as playerRight");
			game.playerRight = user
		}
		return game
	}
	async createGameInstance(userId: number): Promise<Game> {
		console.log('inside createGameInstance()');
		const setup = new GameSetup;
		console.log('leaving createGameInstance()');
		return new Game(userId, setup);
	}

	startGame(server: Server, game: Game) {
		if (game.playerLeft != undefined && game.playerRight != undefined) {
			this.startEmittingGameData(server, game)
		}
	  }

	async startEmittingGameData(server: Server, game: Game) {
		this.userService.setStatus(game.playerLeft.id, UserStatus.PLAYING);
		this.userService.setStatus(game.playerRight.id, UserStatus.PLAYING);
		server.to(game.id.toString()).emit('GameInfo', game)
		console.log("startGame");
		game.interval = setInterval(() => this.emitGameData(game, server), 16) as unknown as number;
		console.log("startGame end");
	}

	async emitGameData(game: Game, server: Server) {
		// console.log("emitGameData");
		const tmpGame: Game = await this.getData(game)
		const updatedGameData: GameData = {
			ball: tmpGame.ball,
			paddleLeft: tmpGame.paddleLeft,
			paddleRight: tmpGame.paddleRight,
			score: tmpGame.score,
			// finished: tmpGame.finished,
		}
		server.to(game.id.toString()).emit('updateGame', updatedGameData);
		if (updatedGameData.score.scoreLeft === 3 || updatedGameData.score.scoreRight === 3) {
			console.log("emitGameData: closeRoom");
			this.gameGateway.closeRoom(game.id.toString());
		}
	}

	async getData(game: Game): Promise<Game | undefined> {
		// console.log("getData");

		if (game == undefined) {
			return undefined;
		}
		this.updateData(game)
		this.collisionControl(game);
		if (this.scored(game)){
			this.reset(game);
		}
		await this.isGameFinished(game);
		return game
	}
	updateData(game: Game) {
		// let game: Game = this.games.get(id);
		game.ball.position.x += game.ball.direction.x;
		game.ball.position.y += game.ball.direction.y;
		// if (this.ball.direction.x > 0) {
		// 	if (this.ball.position.x + this.ball.radius >= 640) {
		// 		this.ball.position.x = 640 - this.ball.radius;
		// 		this.ball.direction.x *= -1;
		// 	}
		// }
		// else {
		// 	if (this.ball.position.x - this.ball.radius <= 0) {
		// 		this.ball.position.x = 0 + this.ball.radius;
		// 		this.ball.direction.x *= -1;
		// 	}

		// }
		if (game.ball.direction.y > 0) {
			if (game.ball.position.y + game.ball.radius >= 480) {
				game.ball.position.y = 480 - game.ball.radius;
				game.ball.direction.y *= -1;
			}
		}
		else {
			if (game.ball.position.y - game.ball.radius <= 0) {
				game.ball.position.y = 0 + game.ball.radius;
				game.ball.direction.y *= -1;
			}
		}
		// console.log("gameid: %d | ball: x %d, y %d", id, game.ball.position.x, game.ball.position.y);
	}
	isBallWithinPaddleRange(game: Game, paddle: Paddle): boolean {
		return (game.ball.position.y >= paddle.position.y &&
			game.ball.position.y <= paddle.position.y + paddle.height)
	}
	isBallAtPaddle(game: Game, paddle: Paddle): boolean {
		let ret: boolean = false;
		// let game: Game = this.games.get(id);
		if (paddle.id == "left") {
			ret = game.ball.position.x - game.ball.radius <= paddle.position.x + paddle.width;
		} else if (paddle.id == "right") {
			ret = game.ball.position.x + game.ball.radius >= paddle.position.x;
		}
		return ret;
	}
	calcAngle(game: Game, paddle: Paddle) {
		var section: number;
		// let game: Game = this.games.get(id);

		section = paddle.height / 8;
		if (this.isBallWithinPaddleRange(game, paddle)) {
			var i: number = 1;
			while (game.ball.position.y > (paddle.position.y + i * section)) {
				i++;
			}
			game.ball.direction.angle = paddle.reboundAngles[i - 1];
		}
	}
	updateBallDirection(game: Game, paddle: Paddle) {
		this.calcAngle(game, paddle);
		// let game: Game = this.games.get(id);
		game.ball.direction.x = game.ball.direction.speed * Math.cos(game.ball.direction.angle * (Math.PI / 180));
		game.ball.direction.y = game.ball.direction.speed * Math.sin(game.ball.direction.angle * (Math.PI / 180));
	}
	collisionControl(game: Game) {
		// var game: Game = this.games.get(id);
		if (game.ball.direction.x > 0) {
			if (this.isBallAtPaddle(game, game.paddleRight) &&
				this.isBallWithinPaddleRange(game, game.paddleRight)) {
					this.updateBallDirection(game, game.paddleRight);
			}
		}
		else {
			if (this.isBallAtPaddle(game, game.paddleLeft) &&
				this.isBallWithinPaddleRange(game, game.paddleLeft)) {
					this.updateBallDirection(game, game.paddleLeft);
			}
		}
	}
	scored(game: Game): boolean {
		var ret: boolean = false;
		// let game: Game = this.games.get(id);
		if (game.ball.position.x - game.ball.radius <= 0) {
			game.score.scoreRight += game.score.increaseRight;
			game.scoreRight += game.score.increaseRight;
			ret = true;
		}
		else if (game.ball.position.x + game.ball.radius >= 640 ) {
			game.score.scoreLeft += game.score.increaseLeft;
			game.scoreLeft += game.score.increaseLeft;
			ret = true;
		}
		return ret;
	}
	reset(game: Game) {
		// let game: Game = this.games.get(id);
		game.ball.position.x = this.setup.ballPos.x;
		game.ball.position.y = this.setup.ballPos.y;
		game.ball.direction.speed = this.setup.ballDir.speed;
		do {
			game.ball.direction.angle = Math.random() * 2 * Math.PI;
			game.ball.direction.x = game.ball.direction.speed * Math.cos(game.ball.direction.angle);
			game.ball.direction.y = game.ball.direction.speed * Math.sin(game.ball.direction.angle); // * 0.1
		}
		while (game.ball.direction.x > 0.2 && game.ball.direction.x < -0.2 &&
		 - 0.2 > game.ball.direction.y && game.ball.direction.y > 0.2 &&
		 game.ball.direction.y > game.ball.direction.x * 10);
		console.log(game.ball.direction.x, game.ball.direction.y);

		// console.log("dir x: %d | dir y: %d | angle: %d", game.ball.direction.x, game.ball.direction.y, game.ball.direction.angle);
		game.ball.radius = this.setup.ballRadius;

		game.paddleLeft.width = this.setup.paddleWidth;
		game.paddleLeft.height = this.setup.paddleHeight;
		game.paddleLeft.speed = this.setup.paddleSpeed;
		game.paddleRight.width = this.setup.paddleWidth;
		game.paddleRight.height = this.setup.paddleHeight;
		game.paddleRight.speed = this.setup.paddleSpeed;

		game.score.increaseLeft = this.setup.scoreIncrease;
		game.score.increaseRight = this.setup.scoreIncrease;
	}
	async isGameFinished(game: Game) {
		if (game != undefined && (game.score.scoreLeft == 3 || game.score.scoreRight == 3)) {
			clearInterval(game.interval);
			game.interval = null
			let gameInstance: Game = this.gameRepository.create();
			gameInstance.playerRight = game.playerRight;
			gameInstance.playerLeft = game.playerLeft;
			gameInstance.scoreLeft = game.scoreLeft;
			gameInstance.scoreRight = game.scoreRight;
			await this.gameRepository.save(gameInstance);
			this.userService.setStatus(game.playerLeft.id, UserStatus.ONLINE)
			this.userService.setStatus(game.playerRight.id, UserStatus.ONLINE)
			this.removeGame(game)
			console.log("game is finished");
		}
	}

	removeGame(game: Game): boolean {
		game.spectators.forEach((element: number) => {this.spectatorsMap.delete(element)})
		const index = this.gamesArr.indexOf(game, 0);
		if (index > -1) {
			this.gamesArr.splice(index, 1);
			return true;
		}
		return false;
	}

	removePendingGame(user_id: number) {
		const game = this.getGame(user_id)
		if(game != undefined && game.playerRight == undefined) {
			this.gameGateway.closeRoom(game.id.toString());
			this.removeGame(game);
		}
	}

	handleKeypress(user_id: number, key: string){
		const game = this.getGame(user_id)
		if(game != undefined) {
			if (key == "ArrowUp" || key == "w") {
				this.movePaddleUp(game, this.getPlayerSide(game, user_id))
			} else if (key == "ArrowDown" || key == "s") {
				this.movePaddleDown(game, this.getPlayerSide(game, user_id))
			}
		}
	}

	getPlayerSide(game: Game, user_id: number) {
		if (game != undefined) {
			if (game.playerLeft.id == user_id) {
				return Side.left
			} else {
				return Side.right
			}
		}
	}

	movePaddleUp(game: Game, side: Side) {
		// console.log("movePaddleUp", side);
		if (side == Side.left) {
			if (game.paddleLeft.position.y > 0)
				game.paddleLeft.position.y -= game.paddleLeft.speed;
		}
		else {
			if (game.paddleRight.position.y > 0)
				game.paddleRight.position.y -= game.paddleRight.speed;
		}
	}
	movePaddleDown(game: Game, side: Side) {
		// console.log("movePaddleDown", side);
		if (side == Side.left) {
			if (game.paddleLeft.position.y < (480 - game.paddleLeft.height))
				game.paddleLeft.position.y += game.paddleLeft.speed;
		}
		else {
			if (game.paddleRight.position.y < (480 - game.paddleRight.height))
				game.paddleRight.position.y += game.paddleRight.speed;
		}
	}

	async getMatchHistory(user: User){
		if (user == undefined) {
			console.log("user == undefind");
		}
		console.log("user.id", user.id, typeof(user.id));
		return await this.gameRepository.createQueryBuilder("game")
		// .innerJoinAndSelect("game.player", "player", "player.id = :id", { id: user.id})
		.leftJoin('game.playerRight', 'tmp', 'tmp.id = :id', { id: user.id as number} )
		.leftJoin('game.playerLeft', 'tmp1', 'tmp1.id = :idd', { idd: user.id  as number})
		.leftJoinAndSelect('game.playerRight', 'playerRight', 'playerRight.id != :iid', { iid: user.id} )
		.leftJoinAndSelect('game.playerLeft', 'playerLeft', 'playerLeft.id != :iidd', { iidd: user.id})
		.where("game.playerRight.id = :te", {te: user.id})
		.orWhere("game.playerLeft.id = :te1", {te1: user.id})
		// .innerJoinAndSelect("game.playerRight", "playerRight", "playerRight.id != :id", { id: user.id} )
		// .innerJoinAndSelect("game.player", "player", "player.id != :id", { id: user.id})
		// .select("'scoreLeft'")
		.getMany()
	}
}
