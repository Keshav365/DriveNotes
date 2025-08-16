import { Server as SocketIOServer } from 'socket.io';
import { logger } from '../utils/logger';

export const initializeSocketIO = (io: SocketIOServer) => {
  io.on('connection', (socket) => {
    logger.info(`User connected: ${socket.id}`);
    
    socket.on('disconnect', () => {
      logger.info(`User disconnected: ${socket.id}`);
    });
    
    // Add more socket event handlers here
  });
};
