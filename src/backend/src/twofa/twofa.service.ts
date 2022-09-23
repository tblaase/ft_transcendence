import { Injectable } from "@nestjs/common";
import { User } from "src/users/entitys/user.entity";
import { authenticator } from 'otplib';
import { toFileStream } from 'qrcode';
import { UsersService } from "src/users/users.service";


@Injectable()
 export class TwofaService {

    constructor(private readonly usersService: UsersService) {}

    public async genaatetwofaSecret(user: User) {

        const secret = authenticator.generateSecret();

        const otpauthUrl = authenticator.keyuri(user.unique_name,  process.env.TWO_FACTOR_AUTHENTICATION_APP_NAME , secret);
 
        await this.usersService.setTwoFactorAuthenticationSecret(secret, user.id);
     
        return {
          secret,
          otpauthUrl
        }
    }

    public async pipeQrCodeStream(stream: Response, otpauthUrl: string) {
        return toFileStream(stream, otpauthUrl);
    }

    public isTwoFactorAuthenticationCodeValid(twoFactorAuthenticationCode: string, user: User) {
        return authenticator.verify({
            token: twoFactorAuthenticationCode,
            secret: user.twoFactorAuthenticationSecret
        })
    }   

}

