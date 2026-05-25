import 'reflect-metadata';
import { config } from '../config/env';
import { AppDataSource } from '../config/database';
import { User, UserRole } from '../entities/User';
import { InventoryCounter } from '../entities/InventoryCounter';
import { InstrumentType } from '../entities/InstrumentType';
import { InstrumentSubtype } from '../entities/InstrumentSubtype';
import bcrypt from 'bcryptjs';

// Начальное заполнение БД: администратор, счётчик, базовые типы СИ
async function seed() {
  await AppDataSource.initialize();

  // Администратор по умолчанию
  const userRepo = AppDataSource.getRepository(User);
  const existing = await userRepo.findOneBy({ login: 'admin' });
  if (!existing) {
    const hash = await bcrypt.hash('admin', 10);
    await userRepo.save(userRepo.create({
      login: 'admin',
      passwordHash: hash,
      role: UserRole.ADMIN,
      email: '',
    }));
    console.log('Создан пользователь admin / admin');
  }

  // Счётчик инвентарных номеров
  const counterRepo = AppDataSource.getRepository(InventoryCounter);
  const counter = await counterRepo.findOneBy({ id: 1 });
  if (!counter) {
    await counterRepo.save(counterRepo.create({ currentValue: 999 }));
    console.log('Инициализирован счётчик инвентарных номеров (старт: 1000)');
  }

  // Базовые типы СИ
  const typeRepo = AppDataSource.getRepository(InstrumentType);
  const subtypeRepo = AppDataSource.getRepository(InstrumentSubtype);

  const types = [
    { name: 'Весы', subtypes: ['Лабораторные', 'Платформенные', 'Порционные'] },
    { name: 'Термометры', subtypes: ['Переносные', 'Стационарные', 'Лабораторные'] },
    { name: 'Манометры', subtypes: ['Показывающие', 'Электроконтактные', 'Цифровые'] },
  ];

  for (const t of types) {
    let type = await typeRepo.findOneBy({ name: t.name });
    if (!type) {
      type = await typeRepo.save(typeRepo.create({ name: t.name }));
    }
    for (const s of t.subtypes) {
      const exists = await subtypeRepo.findOneBy({ typeId: type.id, name: s });
      if (!exists) {
        await subtypeRepo.save(subtypeRepo.create({ typeId: type.id, name: s }));
      }
    }
  }

  console.log('Seed завершён');
  await AppDataSource.destroy();
}

seed().catch((err) => {
  console.error('Ошибка seed:', err);
  process.exit(1);
});
