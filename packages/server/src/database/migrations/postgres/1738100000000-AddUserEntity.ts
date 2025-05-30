import { MigrationInterface, QueryRunner } from 'typeorm'

export class AddUserEntity1738100000000 implements MigrationInterface {
    name = 'AddUserEntity1738100000000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            CREATE TABLE "user" (
                "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
                "username" character varying(50) NOT NULL,
                "email" character varying(255) NOT NULL,
                "password" text NOT NULL,
                "firstName" character varying(100),
                "lastName" character varying(100),
                "role" character varying(20) NOT NULL DEFAULT 'user',
                "isActive" boolean NOT NULL DEFAULT true,
                "isEmailVerified" boolean NOT NULL DEFAULT false,
                "emailVerificationToken" character varying(255),
                "emailVerificationExpires" TIMESTAMP,
                "passwordResetToken" character varying(255),
                "passwordResetExpires" TIMESTAMP,
                "lastLogin" TIMESTAMP,
                "lastIpAddress" character varying(45),
                "loginCount" integer NOT NULL DEFAULT 0,
                "preferences" jsonb,
                "avatar" text,
                "language" character varying(10),
                "timezone" character varying(50),
                "createdDate" TIMESTAMP NOT NULL DEFAULT now(),
                "updatedDate" TIMESTAMP NOT NULL DEFAULT now(),
                CONSTRAINT "PK_user_id" PRIMARY KEY ("id"),
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
            INSERT INTO "user" (
                "username", 
                "email", 
                "password", 
                "role", 
                "isActive", 
                "isEmailVerified",
                "firstName",
                "lastName"
            ) VALUES (
                'admin',
                'admin@nubemgenesis.ai',
                '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LeWUUV/XKfNM8OjPW',
                'admin',
                true,
                true,
                'Administrator',
                'System'
            )
            ON CONFLICT (username) DO NOTHING
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