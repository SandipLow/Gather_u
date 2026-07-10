#!/usr/bin/env bash

set -euo pipefail


MAIN_PID=""
PLAYER_PID=""
REDIS_PID=""


cleanup() {

    echo "Shutting down..."


    if [[ -n "${MAIN_PID}" ]]; then
        kill "${MAIN_PID}" 2>/dev/null || true
    fi


    if [[ -n "${PLAYER_PID}" ]]; then
        kill "${PLAYER_PID}" 2>/dev/null || true
    fi


    if [[ -n "${REDIS_PID}" ]]; then
        kill "${REDIS_PID}" 2>/dev/null || true
    fi


    wait || true
}


trap cleanup SIGTERM SIGINT



echo "Starting Redis..."


redis-server \
    --port 6379 \
    --bind 127.0.0.1 \
    --protected-mode yes \
    --save "" \
    --appendonly no &


REDIS_PID=$!



echo "Starting playerService..."


cd /app/playerService


PORT="${PLAYER_SERVICE_PORT:-4001}" \
GRPC_PORT="${PLAYER_SERVICE_GRPC_PORT:-50051}" \
yarn start &


PLAYER_PID=$!



echo "Starting mainService..."


cd /app/mainService


PORT="${PORT:-3001}" \
yarn start &


MAIN_PID=$!



echo "Services running:"
echo "Main PID:   ${MAIN_PID}"
echo "Player PID: ${PLAYER_PID}"
echo "Redis PID:  ${REDIS_PID}"



# Keep container alive
wait -n \
    "${MAIN_PID}" \
    "${PLAYER_PID}" \
    "${REDIS_PID}"


EXIT_CODE=$?


cleanup


exit "${EXIT_CODE}"