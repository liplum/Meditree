import { token } from "@liplum/ioc"
import { type PluginMeta } from "../plugin.js"
import { type MeditreePlugin } from "../server.js"
import multer from "multer"

interface UploadPluginConfig {
  /**
   * The root directory where to save the uploaded files.
   */
  storageRoot?: string

  /** 
   * Maximum size of each form field value in bytes. 
   * 1048576 by default
   */
  maxFileSize?: number
}

export interface UploadService {
  upload: multer.Multer
}

export const UploadPluginType = {
  Serivce: token<UploadService>("net.liplum.Upload.Serivce"),
}

const UploadPlugin: PluginMeta<MeditreePlugin, UploadPluginConfig> = {
  create(config) {
    let storage: multer.StorageEngine
    let upload: multer.Multer
    return {
      init: async () => {
        storage = multer.diskStorage({
          destination: config.storageRoot,
        })
        upload = multer({
          storage, limits: {
            fieldSize: config.maxFileSize,
          }
        })
      },
      setupService: (container) => {
        container.bind(UploadPluginType.Serivce).toValue({
          upload,
        })
      },
    }
  }
}
export default UploadPlugin
