import { Entity, Column, CreateDateColumn, UpdateDateColumn, PrimaryGeneratedColumn, Index } from 'typeorm'

@Entity()
export class User {
    @PrimaryGeneratedColumn('uuid')
    id: string

    @Column({ type: 'varchar', length: 50, unique: true })
    @Index()
    username: string

    @Column({ type: 'varchar', length: 255, unique: true })
    @Index()
    email: string

    @Column({ type: 'text' })
    password: string

    @Column({ type: 'varchar', length: 100, nullable: true })
    firstName: string

    @Column({ type: 'varchar', length: 100, nullable: true })
    lastName: string

    @Column({ type: 'varchar', length: 20, default: 'user' })
    role: string // 'admin', 'user', 'viewer'

    @Column({ type: 'boolean', default: true })
    isActive: boolean

    @Column({ type: 'boolean', default: false })
    isEmailVerified: boolean

    @Column({ type: 'varchar', length: 255, nullable: true })
    emailVerificationToken: string

    @Column({ type: 'timestamp', nullable: true })
    emailVerificationExpires: Date

    @Column({ type: 'varchar', length: 255, nullable: true })
    passwordResetToken: string

    @Column({ type: 'timestamp', nullable: true })
    passwordResetExpires: Date

    @Column({ type: 'timestamp', nullable: true })
    lastLogin: Date

    @Column({ type: 'varchar', length: 45, nullable: true })
    lastIpAddress: string

    @Column({ type: 'int', default: 0 })
    loginCount: number

    @Column({ type: 'jsonb', nullable: true })
    preferences: Record<string, any>

    @Column({ type: 'text', nullable: true })
    avatar: string

    @Column({ type: 'varchar', length: 10, nullable: true })
    language: string

    @Column({ type: 'varchar', length: 50, nullable: true })
    timezone: string

    @CreateDateColumn()
    createdDate: Date

    @UpdateDateColumn()
    updatedDate: Date
}