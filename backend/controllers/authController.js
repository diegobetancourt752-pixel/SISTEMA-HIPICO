const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { successResponse, errorResponse } = require('../utils/responses');
const User = require('../models/User');

const generateToken = (payload) => {
  const jwtSecret = process.env.JWT_SECRET;
  if (!jwtSecret) {
    throw new Error('JWT_SECRET no está configurado');
  }
  return jwt.sign(payload, jwtSecret, { expiresIn: '7d' });
};

const register = async (req, res) => {
  const { username, email, password } = req.body;

  if (!username || !email || !password) {
    return errorResponse(res, 'Todos los campos son requeridos', 400);
  }

  try {
    const emailExists = await User.findUserByEmail(email);
    if (emailExists) {
      return errorResponse(res, 'El email ya está registrado', 400);
    }

    const usernameExists = await User.findUserByUsername(username);
    if (usernameExists) {
      return errorResponse(res, 'El nombre de usuario ya está en uso', 400);
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const user = await User.createUser(username, email, passwordHash);
    const token = generateToken({ id: user.id, role: user.role });

    return successResponse(
      res,
      {
        token,
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          role: user.role,
          balance: Number(user.balance) || 0
        },
      },
      'Registro exitoso',
      201
    );
  } catch (error) {
    console.error('Register error:', error);
    return errorResponse(res, 'Error al registrar el usuario', 500, error.message);
  }
};

const login = async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return errorResponse(res, 'Email y contraseña son requeridos', 400);
  }

  try {
    const user = await User.findUserByEmail(email);
    if (!user) {
      return errorResponse(res, 'Credenciales inválidas', 400);
    }

    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      return errorResponse(res, 'Credenciales inválidas', 400);
    }

    const token = generateToken({ id: user.id, role: user.role });
    const userPayload = {
      id: user.id,
      username: user.username,
      email: user.email,
      role: user.role,
      balance: Number(user.balance) || 0,
    };

    return successResponse(res, { token, user: userPayload }, 'Inicio de sesión exitoso');
  } catch (error) {
    console.error('Login error:', error);
    return errorResponse(res, 'Error al iniciar sesión', 500, error.message);
  }
};

module.exports = { register, login };