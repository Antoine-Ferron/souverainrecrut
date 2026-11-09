import bcrypt from "bcrypt";
import { Prisma } from "@prisma/client";
import type { z } from "zod";
import type { updateUserSchema } from "../validators/user.schema";

import { UserRepository } from "../repositories/user.repository";
import { AppError } from "../errors/app.error";

export class UserService {
  private readonly repository: UserRepository;

  constructor() {
    this.repository = new UserRepository();
  }

  /**
   * Retourne les utilisateurs paginés.
   */
  async getAll(skip = 0, take = 10) {
    return this.repository.findAll(skip, take);
  }

  /**
   * Retourne un utilisateur par son identifiant.
   */
  async getById(id: string) {
    const user = await this.repository.findById(id);

    if (!user) {
      throw new AppError("Utilisateur introuvable.", 404);
    }

    return user;
  }

  /**
   * Retourne le profil de l'utilisateur connecté.
   */
  async getProfile(id: string) {
    const user = await this.repository.findProfile(id);

    if (!user) {
      throw new AppError("Utilisateur introuvable.", 404);
    }

    return user;
  }

  /**
   * Crée un utilisateur.
   */
  async create(data: Prisma.UserCreateInput) {
    const existingUser = await this.repository.findByEmail(
      data.email
    );

    if (existingUser) {
      throw new AppError(
        "Cet email est déjà utilisé.",
        409
      );
    }

    const hashedPassword = await bcrypt.hash(
      data.password,
      10
    );

    return this.repository.create({
      ...data,
      password: hashedPassword,
    });
  }

  /**
   * Met à jour un utilisateur.
   */
  async update(
    id: string,
    data: z.infer<typeof updateUserSchema>
  ) {
    await this.getById(id);

    const update = { ...data };
    if (update.password !== undefined) {
      update.password = await bcrypt.hash(update.password, 10);
    }
    return this.repository.update(id, update);
  }

  /**
   * Supprime un utilisateur.
   */
  async delete(id: string) {
    await this.getById(id);

    return this.repository.delete(id);
  }
}
