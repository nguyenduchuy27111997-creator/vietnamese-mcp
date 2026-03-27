ALTER TABLE api_keys ADD COLUMN allowed_servers TEXT[];
-- NULL = all servers allowed (backward compatible)
