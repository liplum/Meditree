import { ForwardType, type AppConfig } from "./config"

export async function setupMesh(config: AppConfig): Promise<void> {
  const allNodeConnections = []
  // If node is defined and not empty, subnodes can connect to this.
  if (config.node?.length) {

  }
  // If central is defined and not empty, it will try connecting to every central.
  if (config.central?.length && config.publicKey && config.privateKey) {
    for (const central of config.central) {
      if (central.forward === ForwardType.redirect) {

      } else if (central.forward === ForwardType.socket) {

      }
    }
  }
}
