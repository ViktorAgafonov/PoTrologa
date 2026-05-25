import { AppDataSource } from '../config/database';
import { User, UserRole } from '../entities/User';
import bcrypt from 'bcryptjs';

// Сервис управления пользователями
export class UserService {
  private repo = AppDataSource.getRepository(User);

  async getAll() {
    return this.repo.find({ select: ['id', 'login', 'role', 'email', 'isActive', 'createdAt'] });
  }

  async getById(id: number) {
    return this.repo.findOne({ where: { id }, select: ['id', 'login', 'role', 'email', 'isActive', 'createdAt'] });
  }

  async create(data: { login: string; password: string; role: UserRole; email?: string }) {
    const hash = await bcrypt.hash(data.password, 10);
    const user = this.repo.create({
      login: data.login,
      passwordHash: hash,
      role: data.role,
      email: data.email || '',
    });
    return this.repo.save(user);
  }

  async update(id: number, data: { role?: UserRole; email?: string; isActive?: boolean; password?: string }) {
    const update: any = {};
    if (data.role) update.role = data.role;
    if (data.email !== undefined) update.email = data.email;
    if (data.isActive !== undefined) update.isActive = data.isActive;
    if (data.password) update.passwordHash = await bcrypt.hash(data.password, 10);
    await this.repo.update(id, update);
    return this.getById(id);
  }

  // Удаление пользователя (нельзя удалить себя и последнего админа)
  async remove(id: number, currentUserId: number): Promise<void> {
    if (id === currentUserId) throw new Error('Нельзя удалить самого себя');
    const target = await this.repo.findOneBy({ id });
    if (!target) throw new Error('Пользователь не найден');
    if (target.role === UserRole.ADMIN) {
      const adminCount = await this.repo.count({ where: { role: UserRole.ADMIN } });
      if (adminCount <= 1) throw new Error('Нельзя удалить последнего администратора');
    }
    await this.repo.delete(id);
  }
}
