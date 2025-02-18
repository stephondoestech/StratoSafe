// backend/src/models/File.ts
import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, CreateDateColumn } from "typeorm";
import { User } from "./User";

@Entity()
export class File {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column()
  filename!: string;

  @Column()
  originalName!: string;

  @CreateDateColumn()
  uploadDate!: Date;

  @ManyToOne(() => User, (user) => user.files, { onDelete: "CASCADE" })
  owner!: User;
}
