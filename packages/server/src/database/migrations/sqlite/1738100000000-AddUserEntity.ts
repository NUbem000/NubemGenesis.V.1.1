import { MigrationInterface, QueryRunner } from 'typeorm'

export class AddUserEntity1738100000000 implements MigrationInterface {
    name = 'AddUserEntity1738100000000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            CREATE TABLE "user" (
                "id" varchar PRIMARY KEY NOT NULL,
                "username" varchar(50) NOT NULL,
                "email" varchar(255) NOT NULL,
                "password" text NOT NULL,
                "firstName" varchar(100),
                "lastName" varchar(100),
                "role" varchar(20) NOT NULL DEFAULT 'user',
                "isActive" boolean NOT NULL DEFAULT (1),
                "isEmailVerified" boolean NOT NULL DEFAULT (0),
                "emailVerificationToken" varchar(255),
                "emailVerificationExpires" datetime,
                "passwordResetToken" varchar(255),
                "passwordResetExpires" datetime,
                "lastLogin" datetime,
                "lastIpAddress" varchar(45),
                "loginCount" integer NOT NULL DEFAULT (0),
                "preferences" text,
                "avatar" text,
                "language" varchar(10),
                "timezone" varchar(50),
                "createdDate" datetime NOT NULL DEFAULT (datetime('now')),
                "updatedDate" datetime NOT NULL DEFAULT (datetime('now')),
                CONSTRAINT "UQ_user_username" UNIQUE ("username"),
                CONSTRAINT "UQ_user_email" UNIQUE ("email")
            )
        `)

        await queryRunner.query(`
            CREATE INDEX "IDX_user_username" ON "user" ("username")
        `)

        await queryRunner.query(`
            CREATE INDEX "IDX_user_email" ON "user" ("email")
        `)

        await queryRunner.query(`
            CREATE INDEX "IDX_user_role" ON "user" ("role")
        `)

        await queryRunner.query(`
            CREATE INDEX "IDX_user_isActive" ON "user" ("isActive")
        `)

        // Crear usuario administrador por defecto
        await queryRunner.query(`
            INSERT OR IGNORE INTO "user" (
                "id",
                "username", 
                "email", 
                "password", 
                "role", 
                "isActive", 
                "isEmailVerified",
                "firstName",
                "lastName"
            ) VALUES (
                lower(hex(randomblob(4))) || '-' || lower(hex(randomblob(2))) || '-4' || substr(lower(hex(randomblob(2))),2) || '-' || substr('89ab',abs(random()) % 4 + 1, 1) || substr(lower(hex(randomblob(2))),2) || '-' || lower(hex(randomblob(6))),
                'admin',
                'admin@nubemgenesis.ai',
                '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LeWUUV/XKfNM8OjPW',
                'admin',
                1,
                1,
                'Administrator',
                'System'
            )
        `)
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX "IDX_user_isActive"`)
        await queryRunner.query(`DROP INDEX "IDX_user_role"`)
        await queryRunner.query(`DROP INDEX "IDX_user_email"`)
        await queryRunner.query(`DROP INDEX "IDX_user_username"`)
        await queryRunner.query(`DROP TABLE "user"`)
    }
}