import { MigrationInterface, QueryRunner } from 'typeorm'

export class AddUserEntity1738100000000 implements MigrationInterface {
    name = 'AddUserEntity1738100000000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            CREATE TABLE \`user\` (
                \`id\` varchar(36) NOT NULL,
                \`username\` varchar(50) NOT NULL,
                \`email\` varchar(255) NOT NULL,
                \`password\` text NOT NULL,
                \`firstName\` varchar(100) NULL,
                \`lastName\` varchar(100) NULL,
                \`role\` varchar(20) NOT NULL DEFAULT 'user',
                \`isActive\` tinyint NOT NULL DEFAULT 1,
                \`isEmailVerified\` tinyint NOT NULL DEFAULT 0,
                \`emailVerificationToken\` varchar(255) NULL,
                \`emailVerificationExpires\` datetime NULL,
                \`passwordResetToken\` varchar(255) NULL,
                \`passwordResetExpires\` datetime NULL,
                \`lastLogin\` datetime NULL,
                \`lastIpAddress\` varchar(45) NULL,
                \`loginCount\` int NOT NULL DEFAULT 0,
                \`preferences\` json NULL,
                \`avatar\` text NULL,
                \`language\` varchar(10) NULL,
                \`timezone\` varchar(50) NULL,
                \`createdDate\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
                \`updatedDate\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
                PRIMARY KEY (\`id\`),
                UNIQUE INDEX \`UQ_user_username\` (\`username\`),
                UNIQUE INDEX \`UQ_user_email\` (\`email\`),
                INDEX \`IDX_user_username\` (\`username\`),
                INDEX \`IDX_user_email\` (\`email\`),
                INDEX \`IDX_user_role\` (\`role\`),
                INDEX \`IDX_user_isActive\` (\`isActive\`)
            ) ENGINE=InnoDB
        `)

        // Crear usuario administrador por defecto
        await queryRunner.query(`
            INSERT INTO \`user\` (
                \`id\`,
                \`username\`, 
                \`email\`, 
                \`password\`, 
                \`role\`, 
                \`isActive\`, 
                \`isEmailVerified\`,
                \`firstName\`,
                \`lastName\`
            ) VALUES (
                UUID(),
                'admin',
                'admin@nubemgenesis.ai',
                '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LeWUUV/XKfNM8OjPW',
                'admin',
                1,
                1,
                'Administrator',
                'System'
            )
            ON DUPLICATE KEY UPDATE username = username
        `)
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX \`IDX_user_isActive\` ON \`user\``)
        await queryRunner.query(`DROP INDEX \`IDX_user_role\` ON \`user\``)
        await queryRunner.query(`DROP INDEX \`IDX_user_email\` ON \`user\``)
        await queryRunner.query(`DROP INDEX \`IDX_user_username\` ON \`user\``)
        await queryRunner.query(`DROP INDEX \`UQ_user_email\` ON \`user\``)
        await queryRunner.query(`DROP INDEX \`UQ_user_username\` ON \`user\``)
        await queryRunner.query(`DROP TABLE \`user\``)
    }
}