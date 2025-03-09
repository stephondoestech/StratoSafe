import { Entity, PrimaryGeneratedColumn, Column, OneToMany, CreateDateColumn, UpdateDateColumn } from "typeorm";
import { File } from "./File";
import * as bcrypt from "bcrypt";

// Define possible user roles
export enum UserRole {
  USER = "user",
  ADMIN = "admin"
}

@Entity()
export class User {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column({ unique: true })
  email!: string;

  @Column()
  password!: string;

  @Column()
  firstName!: string;

  @Column()
  lastName!: string;

  @Column({
    type: "enum",
    enum: UserRole,
    default: UserRole.USER
  })
  role!: UserRole;

  @OneToMany(() => File, file => file.owner)
  files!: File[];

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;

  // MFA related fields
  @Column({ default: false })
  mfaEnabled!: boolean;

  @Column({ nullable: true })
  mfaSecret?: string;

  @Column({ nullable: true })
  mfaBackupCodes?: string;

  // Theme preference
  @Column({ default: 'light' })
  themePreference!: string;

  async hashPassword() {
    this.password = await bcrypt.hash(this.password, 10);
  }

  async comparePassword(password: string): Promise<boolean> {
    return bcrypt.compare(password, this.password);
  }

  // Method to generate backup codes
  generateBackupCodes(): string[] {
    const codes: string[] = [];
    for (let i = 0; i < 10; i++) {
      // Generate a random 8-character alphanumeric code
      const code = Math.random().toString(36).substring(2, 10).toUpperCase();
      codes.push(code);
    }
    // Store hashed backup codes
    this.storeBackupCodes(codes);
    return codes;
  }

  // Store backup codes as hashed values
  private async storeBackupCodes(codes: string[]) {
    const hashedCodes = await Promise.all(
      codes.map(async (code) => await bcrypt.hash(code, 10))
    );
    this.mfaBackupCodes = JSON.stringify(hashedCodes);
  }

  // Verify a backup code and remove it after use
  async verifyBackupCode(providedCode: string): Promise<boolean> {
    if (!this.mfaBackupCodes) return false;
    
    const hashedCodes = JSON.parse(this.mfaBackupCodes);
    
    for (let i = 0; i < hashedCodes.length; i++) {
      const isValid = await bcrypt.compare(providedCode, hashedCodes[i]);
      
      if (isValid) {
        // Remove the used code
        hashedCodes.splice(i, 1);
        this.mfaBackupCodes = JSON.stringify(hashedCodes);
        return true;
      }
    }
    
    return false;
  }

  // Convenience method to check if user is an admin
  isAdmin(): boolean {
    return this.role === UserRole.ADMIN;
  }
}
