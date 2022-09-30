import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { message } from '../message/message.entity';
import { UsersService } from 'src/users/users.service';
import { ChatroomService } from 'src/chatroom/chatroom.service';
import { MessageService } from 'src/message/message.service';

@Injectable()
export class ChatService {
    constructor(
        private chatroomService: ChatroomService,
        private usersService: UsersService,
        private messageService: MessageService,
    ){}
    
    async manageLeave(user_id: number, room_name: string) {
        const user = await this.usersService.getUser(user_id)
        await this.chatroomService.removeUserFromChatroom(user, room_name)
  }


  async createMessage(user_id: number, room_name:string, content: string) {
        const user = await this.usersService.getUser(user_id)
        
        const room = await this.chatroomService.getRoom(room_name)
        return await this.messageService.userAddMessageToRoom(user, content, room)
    }


  async manageJoin(user_id: number, room_name: string) {
    const user = await this.usersService.getUser(user_id)
    this.chatroomService.userToRoom(user, room_name);
  }



    async findAllMessages(room_name: string) {
        return await this.messageService.getAllMessagesOfRoom(room_name)
    }
  
    async getClientName(id: number) {
        const user = await this.usersService.getUser(id)
        console.log("getClientName");
        console.log(id);
        console.log(user);
        return user.unique_name
    }
      
}
