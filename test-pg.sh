#!/bin/bash
export PGPASSWORD='3dAdmin!!!'
psql -h 182.191.91.226 -p 5432 -U threed_planner -d threed_planner -c 'SELECT 1;'
