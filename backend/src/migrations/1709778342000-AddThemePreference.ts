import { MigrationInterface, QueryRunner } from "typeorm";

export class AddThemePreference1709778342000 implements MigrationInterface {
    
    public async up(queryRunner: QueryRunner): Promise<void> {
        // Check if the column exists before trying to add it
        const hasColumn = await queryRunner.hasColumn('user', 'themePreference');
        if (!hasColumn) {
            await queryRunner.query(`ALTER TABLE "user" ADD "themePreference" varchar DEFAULT 'light'`);
            console.log('Added themePreference column to user table');
        } else {
            console.log('themePreference column already exists');
        }
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // Remove the column if it exists
        const hasColumn = await queryRunner.hasColumn('user', 'themePreference');
        if (hasColumn) {
            await queryRunner.query(`ALTER TABLE "user" DROP COLUMN "themePreference"`);
            console.log('Removed themePreference column from user table');
        }
    }
}
