import { Application } from 'express';
import passport from 'passport';
import { logger } from '../utils/logger';

export const initializePassport = (app: Application) => {
  app.use(passport.initialize());
  app.use(passport.session());
  
  logger.info('Passport initialized');
  
  // Add passport strategies here (Google OAuth, etc.)
};
