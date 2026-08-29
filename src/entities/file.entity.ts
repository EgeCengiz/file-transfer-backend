import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Folder } from './folder.entity';

@Entity('files')
export class FileEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'original_name', length: 500 })
  originalName: string;

  @Column({ name: 'stored_name', length: 255 })
  storedName: string;

  @Column({ type: 'bigint' })
  size: number;

  @Column({ name: 'mime_type', type: 'varchar', length: 150, nullable: true })
  mimeType: string | null;

  @Column({ name: 'folder_id', type: 'int', nullable: true })
  folderId: number | null;

  @ManyToOne(() => Folder, (folder) => folder.files, {
    nullable: true,
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'folder_id' })
  folder: Folder | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
