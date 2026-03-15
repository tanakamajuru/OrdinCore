@echo off
set PGPASSWORD=Chemz@25
psql -h localhost -p 5432 -U postgres -d uniacco -c "SELECT 'governance_pulses' as table_name, COUNT(*) as record_count FROM governance_pulses UNION ALL SELECT 'incidents' as table_name, COUNT(*) as record_count FROM incidents UNION ALL SELECT 'risks' as table_name, COUNT(*) as record_count FROM risks UNION ALL SELECT 'trends' as table_name, COUNT(*) as record_count FROM trends"
pause
