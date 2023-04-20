import { TYPE as MeditreeType, type MeditreePlugin } from "../server.js"
import { type UserStorageService } from "../user.js"
import uuid from "uuid"
import jwt from "jsonwebtoken"

// eslint-disable-next-line @typescript-eslint/dot-notation
interface UserPluginConfig {
  /**
   * "/login" by default.
   */
  loginPath?: string
  /**
   * "2h" by default.
   */
  jwtExpiration?: string
}

export default function UserPlugin(config: UserPluginConfig): MeditreePlugin {
  let storage: UserStorageService
  const loginPath = config.loginPath ?? "/login"
  const jwtExpiration = config.jwtExpiration ?? "2h"
  const jwtSecret = uuid.v4()
  return {
    onRegisterService(container) {
      storage = container.get(MeditreeType.UserStorage)
      container.bind(MeditreeType.User).toValue({
        // eslint-disable-next-line @typescript-eslint/no-misused-promises
        authentication: async (req, res, next) => {
          // Get the JWT from the cookie
          const token = req.cookies.jwt
          if (!token) {
            res.status(401).send("Token missing")
            return
          }
          // Handle missing token error
          // Verify the JWT using the secret key
          try {
            const account = jwt.verify(token, jwtSecret)
            if (typeof account !== "string") {
              res.status(401).send("Token invalid")
              return
            }
            if (await storage.getUser(account) === null) {
              res.status(401).send("Account not found")
              return
            }
            next()
          } catch (error) {
            res.status(401).send("Token invalid")
            return
          }
        }
      })
    },
    async onRegisterExpressHandler(app) {
      // eslint-disable-next-line @typescript-eslint/no-misused-promises
      app.post(loginPath, async (req, res) => {
        const { account, password } = req.body
        // only finding active staffs
        const user = await storage.getUser(account)
        if (!user || user.password !== password) {
          res.status(401).send("Wrong Credentials")
          return
        }
        // Create JWT token
        const token = jwt.sign(account, jwtSecret, {
          expiresIn: jwtExpiration
        })
        // Send token in response and staff info
        return res.json({
          jwt: token,
        })
      })
    }
  }
}
