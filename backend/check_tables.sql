SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND (table_name LIKE '%region%' OR table_name LIKE '%size%')
ORDER BY table_name;
