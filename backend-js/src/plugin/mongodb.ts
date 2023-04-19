import { type Db, MongoClient, ObjectId, type MongoClientOptions } from "mongodb"
import { TYPE, type MeditreePlugin } from "../server.js"
import { type User, type UserStorageService } from "../user.js"

export const HLSMediaType = "application/x-mpegURL"
// eslint-disable-next-line @typescript-eslint/dot-notation
interface MongoDbPluginConfig {
  url: string
  options?: MongoClientOptions
}
export default function MongoDbPlugin(config: MongoDbPluginConfig): MeditreePlugin {
  if (!config.url) throw new Error("MongoDb url cannot be empty or null.")
  let client: MongoClient
  return {
    async init() {
      client = new MongoClient(config.url, config.options)
    },
    registerService(container) {
      container.rebind(TYPE.UserStorage).toClass(MongoDbServiceStorage).asSingleton()
    },
    onExit() {
      client?.close(true)
    },
  }
}

class MongoDbServiceStorage implements UserStorageService {
  addUser(user: User): boolean {
    throw new Error("Method not implemented.")
  }

  getUser(account: string): User | undefined {
    throw new Error("Method not implemented.")
  }

  updateUser(user: User): boolean {
    throw new Error("Method not implemented.")
  }

  deleteUser(account: string): boolean {
    throw new Error("Method not implemented.")
  }
}
