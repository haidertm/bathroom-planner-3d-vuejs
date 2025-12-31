#!/bin/bash
export PGPASSWORD='3dAdmin!!!'

while IFS= read -r line; do
  if [ -n "$line" ]; then
    psql -h 182.191.91.226 -p 5432 -U threed_planner -d threed_planner -c "$line"
  fi
done < /home/hamza/WebstormProjects/bathroomplanner/bathroom-planner-3d-vuejs/migration.sql

echo "Migration complete!"
