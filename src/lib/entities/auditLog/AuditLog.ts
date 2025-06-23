import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from "typeorm";

@Entity()
export class AuditLog {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column()
  dealId!: number;

  @Column()
  dealIdentifier!: string; // RV-001, etc.

  @Column()
  fieldChanged!: string; // 'sales_rep', 'territory', etc.

  @Column({ nullable: true })
  oldValue?: string;

  @Column({ nullable: true })
  newValue?: string;

  @Column()
  changedBy!: string; // User who made the change

  @Column({ nullable: true })
  reason?: string; // Why the change was made

  @CreateDateColumn()
  changedAt!: Date;

  @Column({ default: 'manual' })
  changeType!: string; // 'manual', 'bulk', 'system'
}