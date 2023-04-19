/**
 * Represents a user with an account and password.
 */
export interface User {
  account: string
  password: string
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
   * Retrieves a user from the storage based on the account name.
   * @param account The account name of the user to retrieve.
   * @returns The retrieved user object or `null` if the user was not found.
   */
  getUser(account: string): Promise<User | null>

  /**
   * Updates an existing user in the storage.
   * @param user The updated user object.
   * @returns `true` if the user was updated successfully, `false` otherwise.
   */
  updateUser(user: User): Promise<boolean>

  /**
   * Deletes a user from the storage based on the account name.
   * @param account The account name of the user to delete.
   * @returns `true` if the user was deleted successfully, `false` otherwise.
   */
  deleteUser(account: string): Promise<boolean>
}
