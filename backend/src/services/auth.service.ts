import bcrypt from 'bcrypt'
import jwt from 'jsonwebtoken'
import type { StringValue } from 'ms'
import { env } from '../config/env.js'
import { UserRepository } from '../repositories/user.repository.js'
import type { LoginInput, RegisterInput } from '../schemas/auth.schema.js'
import { AppError } from '../utils/errors.js'

const users = new UserRepository()

function publicUser(user: { id: string; email: string; name: string; createdAt?: Date }) {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    createdAt: user.createdAt,
  }
}

export class AuthService {
  async register(input: RegisterInput) {
    const existing = await users.findByEmail(input.email)
    if (existing) throw new AppError(409, 'CONFLICT', 'An account with that email already exists')

    const passwordHash = await bcrypt.hash(input.password, env.BCRYPT_ROUNDS)
    const user = await users.create({ email: input.email, name: input.name, passwordHash })
    return { user: publicUser(user), token: this.signToken(user) }
  }

  async login(input: LoginInput) {
    const user = await users.findByEmail(input.email)
    if (!user) throw new AppError(401, 'AUTHENTICATION_ERROR', 'Invalid email or password')

    const ok = await bcrypt.compare(input.password, user.passwordHash)
    if (!ok) throw new AppError(401, 'AUTHENTICATION_ERROR', 'Invalid email or password')

    return { user: publicUser(user), token: this.signToken(user) }
  }

  async me(userId: string) {
    const user = await users.findById(userId)
    if (!user) throw new AppError(401, 'AUTHENTICATION_ERROR', 'Invalid session')
    return publicUser(user)
  }

  private signToken(user: { id: string; email: string; name: string }) {
    return jwt.sign(
      { email: user.email, name: user.name },
      env.JWT_SECRET,
      { subject: user.id, algorithm: 'HS256', expiresIn: env.JWT_EXPIRES_IN as StringValue },
    )
  }
}
