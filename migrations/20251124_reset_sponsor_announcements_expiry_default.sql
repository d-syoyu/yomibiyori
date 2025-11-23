-- Ensure sponsor announcements default to no expiration
alter table sponsor_announcements
  alter column expires_at set default null;
