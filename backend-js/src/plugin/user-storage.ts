import { token } from "../ioc.js"

export const TYPE = {
  UserStorage: token<UserStorageService>("UserStorage"),
}

/**
 * Represents a user with an account and password.
 */
export interface User {
  account: string
  password: string
  lastLogin?: Date
  viewTimes: number
  favorites?: string[]
}

/**
 * Represents a service to be injected for storing and manipulating users.
 */
export interface UserStorageService {
  /**
   * Adds a new user to the storage.
   * @param user The user to add.
   * @returns `true` if the user was added successfully, `false` otherwise.
   */
  addUser(user: User): Promise<boolean>

  /**
   * Retrieves a user from the storage based on the account.
   * @param account The account of the user to retrieve.
   * @returns The retrieved user object or `null` if the user was not found.
   */
  getUser(account: string): Promise<User | null>

  /**
   * Checks if a user with the specified account exists in the storage.
   * @param account The account of the user to check.
   * @returns A Promise that resolves to `true` if the user exists, `false` otherwise.
  */
  hasUser(account: string): Promise<boolean>

  /**
   * Updates an existing user in the storage.
   * @param user The updated user object.
   * @returns `true` if the user was updated successfully, `false` otherwise.
   */
  updateUser(user: User): Promise<boolean>

  /**
   * Deletes a user from the storage based on the account.
   * @param account The account of the user to delete.
   * @returns `true` if the user was deleted successfully, `false` otherwise.
   */
  deleteUser(account: string): Promise<boolean>
}
