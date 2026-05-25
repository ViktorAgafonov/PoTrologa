import passport from 'passport';
import { Strategy as LocalStrategy } from 'passport-local';
import bcrypt from 'bcryptjs';
import { AppDataSource } from './database';
import { User } from '../entities/User';

// Настройка Passport: локальная стратегия по логину/паролю
export function configurePassport(): void {
  passport.use(
    new LocalStrategy(
      { usernameField: 'login', passwordField: 'password' },
      async (login, password, done) => {
        try {
          const repo = AppDataSource.getRepository(User);
          const user = await repo.findOneBy({ login });
          if (!user || !user.isActive) {
            return done(null, false, { message: 'Неверный логин или пароль' });
          }
          const valid = await bcrypt.compare(password, user.passwordHash);
          if (!valid) {
            return done(null, false, { message: 'Неверный логин или пароль' });
          }
          return done(null, user);
        } catch (err) {
          return done(err);
        }
      }
    )
  );

  passport.serializeUser((user: any, done) => {
    done(null, user.id);
  });

  passport.deserializeUser(async (id: number, done) => {
    try {
      const repo = AppDataSource.getRepository(User);
      const user = await repo.findOneBy({ id });
      done(null, user || undefined);
    } catch (err) {
      done(err);
    }
  });
}
