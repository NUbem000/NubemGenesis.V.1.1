import { MigrationInterface, QueryRunner, Table, Index } from 'typeorm'

export class AddUseCases1738000000000 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        // Create use_cases table
        await queryRunner.createTable(
            new Table({
                name: 'use_cases',
                columns: [
                    {
                        name: 'id',
                        type: 'uuid',
                        isPrimary: true,
                        isGenerated: true,
                        generationStrategy: 'uuid',
                        default: 'uuid_generate_v4()'
                    },
                    {
                        name: 'title',
                        type: 'varchar',
                        length: '255',
                        isNullable: false
                    },
                    {
                        name: 'description',
                        type: 'text',
                        isNullable: false
                    },
                    {
                        name: 'user_query',
                        type: 'text',
                        isNullable: false,
                        isUnique: true
                    },
                    {
                        name: 'components',
                        type: 'jsonb',
                        isNullable: false
                    },
                    {
                        name: 'flow',
                        type: 'jsonb',
                        isNullable: false
                    },
                    {
                        name: 'metrics',
                        type: 'jsonb',
                        isNullable: true,
                        default: "'{}'"
                    },
                    {
                        name: 'tags',
                        type: 'jsonb',
                        isNullable: false,
                        default: "'[]'"
                    },
                    {
                        name: 'created_at',
                        type: 'timestamp',
                        default: 'CURRENT_TIMESTAMP',
                        isNullable: false
                    },
                    {
                        name: 'updated_at',
                        type: 'timestamp',
                        default: 'CURRENT_TIMESTAMP',
                        isNullable: false
                    }
                ]
            }),
            true
        )

        // Create indexes for better search performance
        await queryRunner.createIndex(
            'use_cases',
            new Index({
                name: 'IDX_use_cases_title',
                columnNames: ['title']
            })
        )

        await queryRunner.createIndex(
            'use_cases',
            new Index({
                name: 'IDX_use_cases_tags',
                columnNames: ['tags'],
                isUsing: 'GIN'
            })
        )

        await queryRunner.createIndex(
            'use_cases',
            new Index({
                name: 'IDX_use_cases_created_at',
                columnNames: ['created_at']
            })
        )

        // Create orchestration_history table for learning
        await queryRunner.createTable(
            new Table({
                name: 'orchestration_history',
                columns: [
                    {
                        name: 'id',
                        type: 'uuid',
                        isPrimary: true,
                        isGenerated: true,
                        generationStrategy: 'uuid',
                        default: 'uuid_generate_v4()'
                    },
                    {
                        name: 'flow_id',
                        type: 'varchar',
                        length: '255',
                        isNullable: false
                    },
                    {
                        name: 'user_query',
                        type: 'text',
                        isNullable: false
                    },
                    {
                        name: 'clarifications',
                        type: 'jsonb',
                        isNullable: true,
                        default: "'[]'"
                    },
                    {
                        name: 'components_used',
                        type: 'jsonb',
                        isNullable: false
                    },
                    {
                        name: 'model_used',
                        type: 'jsonb',
                        isNullable: false
                    },
                    {
                        name: 'confidence',
                        type: 'decimal',
                        precision: 3,
                        scale: 2,
                        isNullable: true
                    },
                    {
                        name: 'user_rating',
                        type: 'integer',
                        isNullable: true
                    },
                    {
                        name: 'feedback',
                        type: 'text',
                        isNullable: true
                    },
                    {
                        name: 'performance_metrics',
                        type: 'jsonb',
                        isNullable: true
                    },
                    {
                        name: 'created_at',
                        type: 'timestamp',
                        default: 'CURRENT_TIMESTAMP',
                        isNullable: false
                    }
                ]
            }),
            true
        )

        // Create indexes for orchestration history
        await queryRunner.createIndex(
            'orchestration_history',
            new Index({
                name: 'IDX_orchestration_history_flow_id',
                columnNames: ['flow_id']
            })
        )

        await queryRunner.createIndex(
            'orchestration_history',
            new Index({
                name: 'IDX_orchestration_history_created_at',
                columnNames: ['created_at']
            })
        )

        await queryRunner.createIndex(
            'orchestration_history',
            new Index({
                name: 'IDX_orchestration_history_user_rating',
                columnNames: ['user_rating']
            })
        )
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // Drop indexes
        await queryRunner.dropIndex('orchestration_history', 'IDX_orchestration_history_user_rating')
        await queryRunner.dropIndex('orchestration_history', 'IDX_orchestration_history_created_at')
        await queryRunner.dropIndex('orchestration_history', 'IDX_orchestration_history_flow_id')
        
        await queryRunner.dropIndex('use_cases', 'IDX_use_cases_created_at')
        await queryRunner.dropIndex('use_cases', 'IDX_use_cases_tags')
        await queryRunner.dropIndex('use_cases', 'IDX_use_cases_title')
        
        // Drop tables
        await queryRunner.dropTable('orchestration_history')
        await queryRunner.dropTable('use_cases')
    }
}