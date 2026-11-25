import * as authService from '../services/authService.js';
import * as users from '../repositories/userRepository.js';
import { notFound } from '../utils/httpError.js';

export async function register(req, res) {
  res.status(201).json(await authService.register(req.body, req.ip));
}

export async function login(req, res) {
  res.json(await authService.login(req.body, req.ip));
}

export async function me(req, res) {
  const user = await users.findById(req.user.id);
  if (!user) throw notFound('User not found');
  res.json({ user });
}
