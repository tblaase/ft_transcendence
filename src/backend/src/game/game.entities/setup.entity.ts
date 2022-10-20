import { PosXY } from "../game.interfaces/pos.interface";
import { BallDirObj } from "../game.interfaces/balldirobj.interface";

export class GameSetup {
	ballPos: PosXY = {x: 340, y: 240};
	ballRadius: number = 10;
	ballSpeed: number = 10;
	ballDir: BallDirObj = {
		angle: Math.random() * 2 * Math.PI,
		speed: 4,
		x: 1,
		y: 1,
	};
	paddleWidth: number = 20;
	paddleHeight: number = 100;
	paddleSpeed: number = 10;
	scoreIncrease: number = 1;
}
