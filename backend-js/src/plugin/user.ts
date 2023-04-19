import { TYPE as MeditreeType, type MeditreePlugin } from "../server.js"
import { type UserStorageService, type UserService } from "../user.js"

export const HLSMediaType = "application/x-mpegURL"
// eslint-disable-next-line @typescript-eslint/dot-notation
interface UserPluginConfig {

}

export default function UserPlugin(config: UserPluginConfig): MeditreePlugin {
  let storage: UserStorageService
  return {
    onRegisterService(container) {
      storage = container.get(MeditreeType.UserStorage)
      container.rebind(MeditreeType.User).toValue({
        authenticationMeddleware: (req, res, next) => { }
      })
    },
    async onRegisterExpressHandler(app) {

    }
  }
}
