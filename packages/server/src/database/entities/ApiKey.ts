import { Column, Entity, PrimaryColumn, UpdateDateColumn, CreateDateColumn, Index } from 'typeorm'
import { IApiKey } from '../../Interface'

@Entity('apikey')
export class ApiKey implements IApiKey {
    @PrimaryColumn({ type: 'varchar', length: 20 })
    id: string

    @Column({ type: 'text' })
    @Index()
    apiKey: string

    @Column({ type: 'text' })
    apiSecret: string

    @Column({ type: 'text' })
    @Index({ unique: true })
    keyName: string

    @Column({ type: 'varchar', length: 64, nullable: true })
    salt: string

    @Column({ default: true })
    isActive: boolean

    @Column({ type: 'timestamp', nullable: true })
    expiresAt: Date | null

    @Column({ type: 'timestamp', nullable: true })
    lastUsed: Date | null

    @Column({ type: 'int', default: 0 })
    usageCount: number

    @Column({ type: 'varchar', length: 45, nullable: true })
    lastIpAddress: string | null

    @Column({ type: 'jsonb', nullable: true })
    metadata: Record<string, any> | null

    @CreateDateColumn()
    createdDate: Date

    @Column({ type: 'timestamp' })
    @UpdateDateColumn()
    updatedDate: Date
}
