export interface MeditreeMetaAuth {
  /**
   * The path for verification of auth token.
   */
  verify: string
  /**
   * The path for login.
   */
  login: string
}

export interface MeditreeMeta {
  /**
   * The name of backend server.
   */
  name: string
  /**
   * Omitted means auth is not required.
   */
  auth?: MeditreeMetaAuth
}
