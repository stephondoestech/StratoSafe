import { Entity, PrimaryColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity()
export class SystemSettings {
  @PrimaryColumn()
  id!: string; // Will always be "global" as we only need one settings record

  @Column({ default: true })
  allowRegistration!: boolean;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
