import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from "typeorm";

@Entity()
export class SalesRep {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ unique: true })
  name!: string;

  @Column({ nullable: true })
  email?: string;

  @Column({ nullable: true })
  territory?: string;

  @Column({ default: true })
  active!: boolean;

  @CreateDateColumn()
  created_date!: Date;

  @UpdateDateColumn()
  updated_date!: Date;
}