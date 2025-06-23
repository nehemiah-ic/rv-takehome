import { Column, Entity, PrimaryGeneratedColumn, ManyToOne, JoinColumn } from "typeorm";
import { SalesRep } from "../salesRep/SalesRep";

@Entity()
export class Deal {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column()
  deal_id!: string;

  @Column()
  company_name!: string;

  @Column()
  contact_name!: string;

  @Column()
  transportation_mode!: string;

  @Column()
  stage!: string;

  @Column("decimal")
  value!: number;

  @Column("decimal")
  probability!: number;

  @Column()
  created_date!: string;

  @Column()
  updated_date!: string;

  @Column()
  expected_close_date!: string;

  @Column()
  sales_rep_id!: number;

  @ManyToOne(() => SalesRep)
  @JoinColumn({ name: 'sales_rep_id' })
  sales_rep!: SalesRep;

  @Column()
  origin_city!: string;

  @Column()
  destination_city!: string;

  @Column({ nullable: true })
  cargo_type?: string;

  @Column({ nullable: true })
  territory?: string;
}
