/**
 * Represents the authentication configuration for Meditree metadata.
 */
export interface MeditreeMetaAuth {
  /**
   * The endpoint path for verifying authentication tokens.
   */
  verify: string

  /**
   * The endpoint path for user login.
   */
  login: string
}

/**
 * Represents metadata for Meditree backend services.
 */
export interface MeditreeMeta {
  /**
   * The name of the Meditree backend server.
   */
  name: string

  /**
   * Authentication configuration for the Meditree backend (optional).
   * If omitted, authentication is not required for this backend.
   */
  auth?: MeditreeMetaAuth
}
