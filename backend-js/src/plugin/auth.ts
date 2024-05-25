/* eslint-disable @typescript-eslint/no-misused-promises */
import { MeditreeType, type MeditreePlugin } from "../server.js"
import { v4 as uuidv4 } from "uuid"
import jwt, { type JwtPayload } from "jsonwebtoken"
import { createLogger } from "@liplum/log"
import { type Request } from "express"
import { type PluginMeta } from "../plugin.js"
import { UserType, type User, type UserStorageService } from "./user/storage.js"
import { validateRequest } from "zod-express-middleware"
import { z } from "zod"

interface AuthPluginConfig {
  /**
   * "7d" by default.
   */
  jwtExpiration?: number | string
  /**
   * A random uuid v4 by default.
   */
  jwtSecret?: string
  /**
   * No register by default.
   * 
   * Without the built-in registration, an external server for user management can be used.
   */
  register?: boolean
}

const AuthPlugin: PluginMeta<MeditreePlugin, AuthPluginConfig> = {
  depends: ["upload"],
  create(config) {
    let storage: UserStorageService
    const log = createLogger("Auth")
    const jwtExpiration = config.jwtExpiration ?? "7d"
    const register = config.register
    const jwtSecret = config.jwtSecret ?? uuidv4()
    log.info(`JWT secret: "${jwtSecret}", expiration: "${jwtExpiration}".`)
    return {
      setupMeta: (meta) => {
        meta.auth = {
        }
      },
      setupMiddleware: ({ registry, container }) => {
        storage = container.get(UserType.UserStorage)
        registry.named("auth-user", 100, async (req, res, next) => {
          // Get the JWT from the cookie, body or authorization header in a fallback chain.
          const token = req.cookies.jwt ?? req.body.jwt ?? getJwtFromAuthHeader(req)
          if (!token) {
            res.status(401).send("Token Missing").end()
            return
          }
          // Handle missing token error
          // Verify the JWT using the secret key
          try {
            const jwtPayload = jwt.verify(token, jwtSecret) as JwtPayload
            const account = jwtPayload.account
            if (typeof account !== "string") {
              res.status(401).send("Token Invalid").end()
              return
            }
            const user = await storage.getUser(account)
            if (!user) {
              res.status(401).send("Token Invalid").end()
              return
            }
            req.user = user
            next()
          } catch (error) {
            res.status(401).send("Auth Error").end()
            return
          }
        })
      },
      setupMeditree: async ({ app, manager, container }) => {
        app.post("/api/login", validateRequest({
          body: z.object({
            account: z.string(),
            password: z.string(),
          })
        }), async (req, res) => {
          const { account, password } = req.body
          // only finding active staffs
          const user = await storage.getUser(account)
          if (!user || user.password !== password) {
            res.status(401).send("Wrong Credentials")
            return
          }
          // Authenticated and update last login time.
          user.lastLogin = new Date()
          await storage.updateUser(user)
          // Create JWT token
          const token = jwt.sign({ account }, jwtSecret, {
            expiresIn: jwtExpiration
          })
          // Send token in response and staff info
          return res.json({
            jwt: token,
          })
        })

        if (register) {
          log.info("User registration hosts on \"/api/register\".")
          app.post("/api/register", validateRequest({
            body: z.object({
              account: z.string(),
              password: z.string(),
            })
          }), async (req, res) => {
            const { account, password } = req.body
            const user = await storage.getUser(account)
            if (user !== null) {
              res.status(400).send("Account Exists")
              return
            }
            await storage.addUser({ account, password, viewTimes: 0 })
            res.status(200).send("Account Created")
            return
          })
        }
      }
    }
  }
}
export default AuthPlugin

export interface WithUser {
  user: User
}

function getJwtFromAuthHeader(req: Request): string | null {
  // Check if Authorization header is present
  const authHeader = req.headers.authorization
  if (!authHeader) {
    return null
  }
  try {
    // Extract token from Authorization header
    const scheme = authHeader.split(" ")
    // Use Bearer authentication scheme
    if (scheme[0] === "Bearer") {
      return scheme[1]
    }
    return null
  } catch (error) {
    return null
  }
}
