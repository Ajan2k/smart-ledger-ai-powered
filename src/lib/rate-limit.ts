export class RateLimiter {
    private timestamps: Map<string, number[]>;
    private limit: number;
    private windowMs: number;

    constructor(limit: number, windowMs: number) {
        this.timestamps = new Map();
        this.limit = limit;
        this.windowMs = windowMs;
    }

    public check(key: string): boolean {
        const now = Date.now();
        const userTimestamps = this.timestamps.get(key) || [];
        
        // Remove old timestamps outside the window
        const windowTimestamps = userTimestamps.filter(t => now - t < this.windowMs);
        
        if (windowTimestamps.length >= this.limit) {
            return false; // Rate limit exceeded
        }
        
        windowTimestamps.push(now);
        this.timestamps.set(key, windowTimestamps);
        
        return true; // Allowed
    }

    public cleanup(): void {
        const now = Date.now();
        for (const [key, timestamps] of this.timestamps.entries()) {
            const validTimestamps = timestamps.filter(t => now - t < this.windowMs);
            if (validTimestamps.length === 0) {
                this.timestamps.delete(key);
            } else {
                this.timestamps.set(key, validTimestamps);
            }
        }
    }
}

// Default instances
// e.g., 5 requests per minute for sensitive endpoints
export const authRateLimiter = new RateLimiter(5, 60 * 1000); 

// Cleanup old entries periodically (e.g., every 5 minutes)
setInterval(() => {
    authRateLimiter.cleanup();
}, 5 * 60 * 1000);
