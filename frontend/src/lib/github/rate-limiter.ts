export class RateLimitManager {
  private remainingRequests: number = 5000
  private resetTimestamp: number = 0

  /**
   * Returns the number of milliseconds to wait before the next request.
   * If quota is available, returns 0.
   */
  shouldWait(): number {
    if (this.remainingRequests > 0) {
      return 0
    }
    
    const now = Date.now()
    if (now >= this.resetTimestamp) {
      // The reset time has passed; assume quota is restored until we get new headers
      this.remainingRequests = 5000
      return 0
    }

    // Add a 1-second buffer to the wait time to be safe
    return this.resetTimestamp - now + 1000
  }

  /**
   * Records the latest rate limit headers from a GitHub API response.
   * 
   * @param remaining Value from the 'x-ratelimit-remaining' header
   * @param resetSeconds Value from the 'x-ratelimit-reset' header (in epoch seconds)
   */
  recordRequest(remaining: number, resetSeconds: number): void {
    if (!isNaN(remaining)) {
      this.remainingRequests = remaining
    }
    if (!isNaN(resetSeconds)) {
      this.resetTimestamp = resetSeconds * 1000 // Convert seconds to milliseconds
    }
  }

  getRemaining(): number {
    return this.remainingRequests
  }

  getResetTimestamp(): number {
    return this.resetTimestamp
  }
}

// Export a singleton instance to be shared acrossREST and GraphQL clients
export const rateLimitManager = new RateLimitManager()
