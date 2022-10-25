export enum UserStatus {
	ONLINE,
	OFFLINE,
  PLAYING,
  SPECTATING,    
}

export default class User {
  constructor(_id: number, username: string, avatar_url: string,
    avatar_url_42intra: string, current_status: any, clientId: any, isTwoFactorAuthenticationEnabled: boolean) {
    this._id = _id
    this.username = username
    this.avatar_url = avatar_url
    this.avatar_url_42intra = avatar_url_42intra
    this.current_status = current_status
    this.clientId = clientId
    this.isTwoFactorAuthenticationEnabled = isTwoFactorAuthenticationEnabled
  }
  _id: number
  username: string
  avatar_url: string
  
  current_status: any
  avatar_url_42intra: string
  clientId: any
  isTwoFactorAuthenticationEnabled: boolean
}
//   constructor(_id: number, username: string, avatar_url: string, 
//     status: string, me: number
//     // , isTwoFactorAuthenticationEnabled: boolean,
//     // twoFactorAuthenticationSecret: null
//     ){
//     this._id = _id
//     this.username = username
//     this.avatar_url = avatar_url
//     this.status = status
//     this.me = me
//     // this.isTwoFactorAuthenticationEnabled = isTwoFactorAuthenticationEnabled
//     // this.twoFactorAuthenticationSecret = twoFactorAuthenticationSecret
//   }
//   _id: number
//   username: string
//   avatar_url: string
  
//   status: string
//   me: number
//   // isTwoFactorAuthenticationEnabled: boolean
//   // twoFactorAuthenticationSecret: any
// }
