-- Run once against an existing database before starting the updated backend.
ALTER TABLE material_receives
  MODIFY COLUMN buy VARCHAR(150) NULL;

ALTER TABLE material_receive_items
  CHANGE COLUMN fabric_name fabric_details VARCHAR(150) NULL;
