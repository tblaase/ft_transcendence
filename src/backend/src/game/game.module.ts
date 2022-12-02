import { Module, forwardRef } from '@nestjs/common';
import { GameController } from './game.controller';
import { GameService } from './game.service';
import { GameGateway } from './game.gateway';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Game } from './game.entities/game.entity';
import { AuthModule } from 'src/auth/auth.module';
import { JwtModule } from '@nestjs/jwt';
import { UsersModule } from 'src/users/users.module';
import { FriendsModule } from 'src/users/friends/friends.module';

@Module({
  imports: [TypeOrmModule.forFeature([Game]), forwardRef(() => AuthModule), forwardRef(() => UsersModule), forwardRef(() => FriendsModule), JwtModule.register({
      secret: process.env.JWT_PASSWORD,
      signOptions: { expiresIn: '600s'}
    })],
  controllers: [GameController],
  providers: [GameService, GameGateway],
  exports: [TypeOrmModule, GameService, GameGateway],
})
export class GameModule {}
