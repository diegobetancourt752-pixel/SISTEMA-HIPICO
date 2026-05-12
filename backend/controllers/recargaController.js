const db = require('../config/db');
const { successResponse, errorResponse } = require('../utils/responses');
const Recarga = require('../models/Recarga');
const multer = require('multer');
const path = require('path');
const { v4: uuidv4 } = require('uuid');  // ← Agregar esta línea

// Configurar multer para subida de archivos
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, '../uploads'));
  },
  filename: (req, file, cb) => {
    const uniqueName = uuidv4() + path.extname(file.originalname);
    cb(null, uniqueName);
  }
});

const fileFilter = (req, file, cb) => {
  if (file.mimetype.startsWith('image/')) {
    cb(null, true);
  } else {
    cb(new Error('Solo se permiten archivos de imagen'), false);
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 2 * 1024 * 1024 } // 2MB
});

const solicitarRecarga = async (req, res) => {
  const userId = req.user.id;
  const { amount, method, reference } = req.body;

  if (!amount || !method) {
    return errorResponse(res, 'Monto y método de pago son obligatorios', 400);
  }

  try {
    const recarga = await Recarga.createSolicitud(userId, amount, method, reference || null);
    
    const io = req.app.get('io');
    io.to('admins').emit('nueva_recarga', { recarga });
    
    return successResponse(res, { recarga }, 'Solicitud de recarga enviada', 201);
  } catch (error) {
    console.error('Error solicitarRecarga:', error);
    return errorResponse(res, 'No se pudo generar la solicitud de recarga');
  }
};

const subirComprobante = [
  upload.single('comprobante'),
  async (req, res) => {
    const { id } = req.params;
    const userId = req.user.id;

    if (!req.file) {
      return errorResponse(res, 'No se recibió ningún archivo', 400);
    }

    try {
      const solicitudes = await Recarga.getByUser(userId);
      const solicitud = solicitudes.find(s => s.id == id);
      if (!solicitud) {
        return errorResponse(res, 'Solicitud no encontrada', 404);
      }

      const comprobanteUrl = `/uploads/${req.file.filename}`;
      await Recarga.updateComprobante(id, comprobanteUrl);

      return successResponse(res, { comprobante_url: comprobanteUrl }, 'Comprobante subido correctamente');
    } catch (error) {
      console.error('Error subirComprobante:', error);
      return errorResponse(res, 'No se pudo subir el comprobante');
    }
  }
];

const misSolicitudes = async (req, res) => {
  try {
    const solicitudes = await Recarga.getByUser(req.user.id);
    return successResponse(res, { solicitudes }, 'Solicitudes de recarga cargadas');
  } catch (error) {
    console.error('Error misSolicitudes:', error);
    return errorResponse(res, 'No se pudieron cargar tus solicitudes');
  }
};

const getPendientes = async (req, res) => {
  try {
    const recargas = await Recarga.getPendientes();
    return successResponse(res, { recargas }, 'Recargas pendientes cargadas');
  } catch (error) {
    console.error('Error getPendientes:', error);
    return errorResponse(res, 'No se pudieron cargar las recargas pendientes');
  }
};

const approveRecarga = async (req, res) => {
  const { id } = req.params;
  const { comment } = req.body;

  const client = await db.pool.connect();
  try {
    await client.query('BEGIN');

    const recargaResult = await client.query(
      `SELECT user_id, amount, status FROM recargas_solicitudes WHERE id = $1 FOR UPDATE`,
      [id]
    );
    const recarga = recargaResult.rows[0];

    if (!recarga) {
      await client.query('ROLLBACK');
      return errorResponse(res, 'Recarga no encontrada', 404);
    }

    if (recarga.status !== 'pending') {
      await client.query('ROLLBACK');
      return errorResponse(res, 'La recarga ya fue procesada', 400);
    }

    await Recarga.approve(id, comment || 'Aprobada por administrador', client);
    await client.query(
      `UPDATE users SET balance = balance + $1 WHERE id = $2`,
      [recarga.amount, recarga.user_id]
    );

    await client.query('COMMIT');
    
    const io = req.app.get('io');
    io.to(`user_${recarga.user_id}`).emit('recarga_aprobada', { 
      amount: recarga.amount,
      message: 'Tu recarga ha sido aprobada'
    });
    
    return successResponse(res, null, 'Recarga aprobada correctamente');
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error approveRecarga:', error);
    return errorResponse(res, 'No se pudo aprobar la recarga');
  } finally {
    client.release();
  }
};

const rejectRecarga = async (req, res) => {
  const { id } = req.params;
  const { comment } = req.body;

  try {
    const recarga = await Recarga.reject(id, comment || 'Rechazada por administrador');
    if (!recarga) {
      return errorResponse(res, 'Recarga no encontrada', 404);
    }
    
    const io = req.app.get('io');
    io.to(`user_${recarga.user_id}`).emit('recarga_rechazada', { recarga });
    
    return successResponse(res, { recarga }, 'Recarga rechazada correctamente');
  } catch (error) {
    console.error('Error rejectRecarga:', error);
    return errorResponse(res, 'No se pudo rechazar la recarga');
  }
};

module.exports = {
  solicitarRecarga,
  subirComprobante,
  misSolicitudes,
  getPendientes,
  approveRecarga,
  rejectRecarga,
};