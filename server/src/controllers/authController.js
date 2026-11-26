import * as authService from '../services/authService.js';
import * as users from '../repositories/userRepository.js';
import { notFound } from '../utils/httpError.js';

export async function register(req, res) {
  res.status(201).json(await authService.register(req.body, req.ip));
}

export async function login(req, res) {
  res.json(await authService.login(req.body, req.ip));
}

export async function refresh(req, res) {
  res.json(await authService.refreshAccessToken(req.body.refreshToken));
}

export async function logout(req, res) {
  res.json(await authService.logout({
    refreshToken: req.body?.refreshToken,
    userId: req.user?.id ?? null,
    ip: req.ip,
  }));
}

export async function verifyEmail(req, res) {
  res.json(await authService.verifyEmail(req.body.token, req.ip));
}

export async function resendVerification(req, res) {
  res.json(await authService.resendVerification(req.user.id));
}

export async function forgotPassword(req, res) {
  res.json(await authService.forgotPassword(req.body.email, req.ip));
}

export async function resetPassword(req, res) {
  res.json(await authService.resetPassword(req.body.token, req.body.password, req.ip));
}

export async function me(req, res) {
  const user = await users.findById(req.user.id);
  if (!user) throw notFound('User not found');
  res.json({ user });
}

export async function updateProfile(req, res) {
  res.json(await authService.updateProfile(req.user.id, req.body, req.ip));
}

export async function changePassword(req, res) {
  res.json(await authService.changePassword(req.user.id, req.body, req.ip));
}
