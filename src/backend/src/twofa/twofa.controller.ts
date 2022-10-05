import { Body, Controller, Get, HttpCode, Post, Req, Res, UnauthorizedException, UseGuards } from "@nestjs/common";
import { AuthService } from "src/auth/auth.service";
import TwoFactorAuthenticationCodeDto from "../auth/dto/turnOnTwoFactorAuthentication.dto";
import { JwtAuthGuard } from "src/auth/jwt-two/jwt-auth.guard";
import { TwofaService } from "./twofa.service";
import { Jwt2AuthGuard } from "src/auth/jwt-first/jwt2-auth.guard";


@Controller('twofa')
export class TwoFactorAuthenticationController {
    constructor(
        private readonly twoFactorAuthenticationService: TwofaService,
        private readonly authService: AuthService
        ) {}


    @Get('generate')
    @UseGuards(JwtAuthGuard)
    async register(@Res() response: Response, @Req() request) {
        const { otpauthUrl } = await this.twoFactorAuthenticationService.genaretwofaSecret(request.user);
        return this.twoFactorAuthenticationService.pipeQrCodeStream(response, otpauthUrl);
    }

    @Post('authenticate')
    @HttpCode(200)
    @UseGuards(Jwt2AuthGuard)
    async authenticate(
    @Req() request,
    @Body() { twoFactorAuthenticationCode } : TwoFactorAuthenticationCodeDto
    ) {
        // console.log('authenticate');

        const isCodeValid = this.twoFactorAuthenticationService.isTwoFactorAuthenticationCodeValid(
            twoFactorAuthenticationCode,
            request.user
        );
            // console.log('authenticate1');
            if (!isCodeValid) {
                throw new UnauthorizedException('Wrong authentication code');
            }
            // console.log('authenticate2');

        // const accessTokenCookie = this.authService.getCookieWithJwtAccessToken(request.user._id, true);

        // request.res.cookie('token', [accessTokenCookie]);

        request.res.setHeader('Set-Cookie', this.authService.getCookieWithJwtAccessToken(
			request.user._id,
			true,
		))

        return request.user;
    }



}
