import {
  createRoom,
  getRoomById,
  updateRoom,
  toggleRoomActive,
  deleteRoom,
  searchRooms,
  getUnavailableDates,
} from '../services/rooms.js';

export const roomController = {
  async search(req, res, next) {
    try {
      const result = await searchRooms(req.validatedQuery);
      res.json(result);
    } catch (error) {
      next(error);
    }
  },

  async getById(req, res, next) {
    try {
      const room = await getRoomById(req.validatedParams.id);
      res.json({ data: room });
    } catch (error) {
      next(error);
    }
  },

  async getUnavailableDates(req, res, next) {
    try {
      const { id } = req.validatedParams;
      const { from, to } = req.validatedQuery;
      const result = await getUnavailableDates(id, from, to);
      res.json({ data: result });
    } catch (error) {
      next(error);
    }
  },

  async create(req, res, next) {
    try {
      const room = await createRoom(req.validatedBody);
      res.status(201).json({ data: room });
    } catch (error) {
      next(error);
    }
  },

  async update(req, res, next) {
    try {
      const { id } = req.validatedParams;
      const room = await updateRoom(id, req.validatedBody);
      res.json({ data: room });
    } catch (error) {
      next(error);
    }
  },

  async toggleActive(req, res, next) {
    try {
      const { id } = req.validatedParams;
      const room = await toggleRoomActive(id);
      res.json({ data: room });
    } catch (error) {
      next(error);
    }
  },

  async delete(req, res, next) {
    try {
      const { id } = req.validatedParams;
      await deleteRoom(id);
      res.status(204).send();
    } catch (error) {
      next(error);
    }
  },
};