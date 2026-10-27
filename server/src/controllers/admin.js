import {
  getStats,
  getOccupancy,
  listBookings,
  cancelBooking,
  listFailedEmails,
  retryEmail,
  listRooms,
  createRoom,
  updateRoom,
  toggleRoom,
  deleteRoom,
} from '../services/admin.js';

export const adminController = {
  async getStats(req, res, next) {
    try {
      const stats = await getStats();
      res.json({ data: stats });
    } catch (error) {
      next(error);
    }
  },

  async getOccupancy(req, res, next) {
    try {
      const occupancy = await getOccupancy(req.validatedQuery);
      res.json({ data: occupancy });
    } catch (error) {
      next(error);
    }
  },

  async listBookings(req, res, next) {
    try {
      const result = await listBookings(req.validatedQuery);
      res.json(result);
    } catch (error) {
      next(error);
    }
  },

  async cancelBooking(req, res, next) {
    try {
      const booking = await cancelBooking(req.validatedParams.id);
      res.json({ data: booking });
    } catch (error) {
      next(error);
    }
  },

  async listFailedEmails(req, res, next) {
    try {
      const result = await listFailedEmails(req.validatedQuery);
      res.json(result);
    } catch (error) {
      next(error);
    }
  },

  async retryEmail(req, res, next) {
    try {
      const email = await retryEmail(req.validatedParams.id);
      res.json({ data: email });
    } catch (error) {
      next(error);
    }
  },

  async listRooms(req, res, next) {
    try {
      const result = await listRooms(req.validatedQuery || req.query);
      res.json(result);
    } catch (error) {
      next(error);
    }
  },

  async createRoom(req, res, next) {
    try {
      const room = await createRoom(req.validatedBody);
      res.status(201).json({ data: room });
    } catch (error) {
      next(error);
    }
  },

  async updateRoom(req, res, next) {
    try {
      const room = await updateRoom(req.validatedParams.id, req.validatedBody);
      res.json({ data: room });
    } catch (error) {
      next(error);
    }
  },

  async toggleRoom(req, res, next) {
    try {
      const room = await toggleRoom(req.validatedParams.id);
      res.json({ data: room });
    } catch (error) {
      next(error);
    }
  },

  async deleteRoom(req, res, next) {
    try {
      await deleteRoom(req.validatedParams.id);
      res.status(204).send();
    } catch (error) {
      next(error);
    }
  },
};