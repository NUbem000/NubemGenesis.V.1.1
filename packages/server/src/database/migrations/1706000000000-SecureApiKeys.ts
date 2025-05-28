import { MigrationInterface, QueryRunner, TableColumn, TableIndex } from 'typeorm'

export class SecureApiKeys1706000000000 implements MigrationInterface {
    name = 'SecureApiKeys1706000000000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        // Add new columns
        await queryRunner.addColumn(
            'apikey',
            new TableColumn({
                name: 'salt',
                type: 'varchar',
                length: '64',
                isNullable: true
            })
        )

        await queryRunner.addColumn(
            'apikey',
            new TableColumn({
                name: 'isActive',
                type: 'boolean',
                default: true
            })
        )

        await queryRunner.addColumn(
            'apikey',
            new TableColumn({
                name: 'expiresAt',
                type: 'timestamp',
                isNullable: true
            })
        )

        await queryRunner.addColumn(
            'apikey',
            new TableColumn({
                name: 'lastUsed',
                type: 'timestamp',
                isNullable: true
            })
        )

        await queryRunner.addColumn(
            'apikey',
            new TableColumn({
                name: 'usageCount',
                type: 'int',
                default: 0
            })
        )

        await queryRunner.addColumn(
            'apikey',
            new TableColumn({
                name: 'lastIpAddress',
                type: 'varchar',
                length: '45',
                isNullable: true
            })
        )

        await queryRunner.addColumn(
            'apikey',
            new TableColumn({
                name: 'metadata',
                type: 'jsonb',
                isNullable: true
            })
        )

        await queryRunner.addColumn(
            'apikey',
            new TableColumn({
                name: 'createdDate',
                type: 'timestamp',
                default: 'CURRENT_TIMESTAMP'
            })
        )

        // Create indexes
        await queryRunner.createIndex(
            'apikey',
            new TableIndex({
                name: 'IDX_apikey_apiKey',
                columnNames: ['apiKey']
            })
        )

        await queryRunner.createIndex(
            'apikey',
            new TableIndex({
                name: 'IDX_apikey_keyName',
                columnNames: ['keyName'],
                isUnique: true
            })
        )

        await queryRunner.createIndex(
            'apikey',
            new TableIndex({
                name: 'IDX_apikey_isActive',
                columnNames: ['isActive']
            })
        )
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // Drop indexes
        await queryRunner.dropIndex('apikey', 'IDX_apikey_isActive')
        await queryRunner.dropIndex('apikey', 'IDX_apikey_keyName')
        await queryRunner.dropIndex('apikey', 'IDX_apikey_apiKey')

        // Drop columns
        await queryRunner.dropColumn('apikey', 'createdDate')
        await queryRunner.dropColumn('apikey', 'metadata')
        await queryRunner.dropColumn('apikey', 'lastIpAddress')
        await queryRunner.dropColumn('apikey', 'usageCount')
        await queryRunner.dropColumn('apikey', 'lastUsed')
        await queryRunner.dropColumn('apikey', 'expiresAt')
        await queryRunner.dropColumn('apikey', 'isActive')
        await queryRunner.dropColumn('apikey', 'salt')
    }
}