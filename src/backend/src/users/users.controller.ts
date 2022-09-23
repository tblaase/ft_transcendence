import { Body, Controller, Delete, Get, Param, Post, Res, UseGuards, Request, UseInterceptors, ClassSerializerInterceptor, HttpCode, Req, UnauthorizedException } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { UsersService } from './users.service';
import { User } from './entitys/user.entity';
import { JwtAuthGuard } from '../auth/jwt/jwt-auth.guard';
import { response } from 'express';
import { TwofaService } from '../twofa/twofa.service'
import TwoFactorAuthenticationCodeDto from 'src/auth/dto/turnOnTwoFactorAuthentication.dto';


@Controller('users')
export class UsersController {
	constructor(private readonly usersService: UsersService,
				private readonly twofaService: TwofaService ){}

	@Get('find/:id')
	@UseGuards(JwtAuthGuard)
	findOne(@Param('id') params: number){
		return this.usersService.getUser(params)
	}

	@Get('allUser')
	@UseGuards(JwtAuthGuard)
	findAll(){
		return this.usersService.findAll()
	}

	@Post('addUser')
	@UseGuards(JwtAuthGuard)
	addUser(@Body() user: User){
		console.log(user);

		return  this.usersService.addUser(user);
	}

	@Post('addFriend')
	@UseGuards(JwtAuthGuard)
	addFriend(@Request() req, @Body("id") id: number){
		// console.log(id);
		return  this.usersService.addfriend(req.user.id, id);
	}

	@Get('friends')
	@UseGuards(JwtAuthGuard)
	getFriends(@Request() req) {
		return this.usersService.getFriends(req.user.id)
	}

	@Get('validate')
	@UseGuards(JwtAuthGuard)
	@UseInterceptors(ClassSerializerInterceptor)
	validate(@Request() req): Promise<User> {
		console.log("inside validate");
		console.log(req.user);

		const user = this.usersService.getUser(req.user.id)
		// console.log(user);
		return user
	}

	@Post('update_name')
	@UseGuards(JwtAuthGuard)
	update_name(@Body("name") name, @Request() req) {
		this.usersService.updateName(req.user.id, name);
	}

	@Delete()
	delete(@Request() req) {
		this.usersService.remove(req.user.id)
	}

	@Post('turn-on')
	@HttpCode(200)
	@UseGuards(JwtAuthGuard)
	async turnOnTwoFactorAuthentication(
	  @Req() request,
	  @Body() { twoFactorAuthenticationCode } : TwoFactorAuthenticationCodeDto
	) {
	  const isCodeValid = this.twofaService.isTwoFactorAuthenticationCodeValid(
		twoFactorAuthenticationCode, request.user
	  );
	  if (!isCodeValid) {
		throw new UnauthorizedException('Wrong authentication code');
	  }
	  await this.usersService.turnOnTwoFactorAuthentication(request.user.id);
	}

}
