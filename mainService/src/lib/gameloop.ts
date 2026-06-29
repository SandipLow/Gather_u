import PlayerService from "./playerService";

interface MovePayload {
    x: number;
    y: number;
    animation: string;
    timestamp: number;
}

type NearbyCallback = (
    playerId: string,
    nearby: string[],
    x: number,
    y: number,
    animation: string,
    timestamp: number
) => void;

export class GameLoop {
    private pendingMoves = new Map<string, MovePayload>();
    private timer: NodeJS.Timeout | null = null;
    private running = false;

    constructor(
        private playerService: PlayerService,
        private onNearby: NearbyCallback,
        private tickRateMs: number = 100
    ) {
        this.start();
    }

    /** Buffer a player's latest move. Called on every WS message — no gRPC here. */
    enqueue(playerId: string, x: number, y: number, animation: string, timestamp: number) {
        const existing = this.pendingMoves.get(playerId);

        // Discard stale packets (out-of-order delivery / network jitter)
        if (existing && existing.timestamp > timestamp) return;

        this.pendingMoves.set(playerId, { x, y, animation, timestamp });
    }

    /** Remove a player from the pending queue (called on disconnect) */
    dequeue(playerId: string) {
        this.pendingMoves.delete(playerId);
    }

    start() {
        if (this.running) return;
        this.running = true;
        this.timer = setInterval(() => this.flush(), this.tickRateMs);
        console.log(`GameLoop started — tick every ${this.tickRateMs}ms`);
    }

    stop() {
        if (!this.running) return;
        if (this.timer) clearInterval(this.timer);
        this.timer   = null;
        this.running = false;
        this.pendingMoves.clear();
        console.log("GameLoop stopped.");
    }

    private async flush() {
        if (this.pendingMoves.size === 0) return;

        // Snapshot and clear — new moves that arrive during async work go into
        // the next tick, not lost and not mixed into this batch
        const batch = new Map(this.pendingMoves);
        this.pendingMoves.clear();

        await Promise.all(
            [...batch.entries()].map(([playerId, { x, y, animation, timestamp }]) =>
                this.playerService
                    .setPlayerCoordinates(playerId, x, y, animation, timestamp)
                    .then((nearby) => {
                        this.onNearby(playerId, nearby, x, y, animation, timestamp);
                    })
                    .catch((err) => {
                        console.error(`[GameLoop] flush error for ${playerId}:`, err);

                        // Re-queue with original timestamp so the move isn't
                        // dropped permanently on a transient gRPC error.
                        // Only re-queue if no newer move arrived during the flush.
                        const current = this.pendingMoves.get(playerId);
                        if (!current || current.timestamp < timestamp) {
                            this.pendingMoves.set(playerId, { x, y, animation, timestamp });
                        }
                    })
            )
        );
    }
}