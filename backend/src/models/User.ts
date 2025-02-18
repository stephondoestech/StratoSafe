// backend/src/models/User.ts
import { Entity, PrimaryGeneratedColumn, Column, Unique, OneToMany } from "typeorm";
import { File } from "./File";

@Entity()
@Unique(["username"])
export class User {
  @PrimaryGeneratedColumn()
  id!: number;  // non-null assertion

  @Column()
  username!: string;  // non-null assertion

  @Column()
  passwordHash!: string;  // non-null assertion

  @OneToMany(() => File, (file) => file.owner)
  files!: File[];  // non-null assertion
}
