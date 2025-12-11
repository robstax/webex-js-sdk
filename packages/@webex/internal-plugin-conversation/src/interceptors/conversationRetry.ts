/**
 * Rate Limit Interceptor
 *
 * Handles 429 Too Many Requests responses by transparently retrying
 * the request after the Retry-After period. Components just see longer
 * loading times and don't need to handle rate limiting errors.
 */
// @ts-ignore
import {Interceptor} from '@webex/http-core';
// @ts-ignore
import {WebexHttpError} from '@webex/webex-core';

/**
 * ConversationRateLimitInterceptor
 * Intercepts HTTP responses and handles rate limiting by retrying requests
 */
export default class ConversationRateLimitInterceptor extends Interceptor {
  /**
   * @returns {ConversationRateLimitInterceptor}
   */
  static create() {
    // @ts-ignore
    return new ConversationRateLimitInterceptor({webex: this});
  }

  /**
   * Handle response errors
   * @param {Object} options
   * @param {WebexHttpError} reason
   * @returns {Promise<WebexHttpError>}
   */
  onResponseError(options: any, reason: WebexHttpError) {
    if (reason instanceof WebexHttpError.TooManyRequests) {
      if (reason.retryAfter === undefined) {
        return Promise.reject(reason);
      }

      return this.handleRetryAfterTime(options, reason.retryAfter * 1000);
    }

    return Promise.reject(reason);
  }

  /**
   * Retries the request after a certain time
   * @param {Object} options associated with the request
   * @param {number} retryAfterTime retry after time in milliseconds
   * @returns {Promise}
   */
  handleRetryAfterTime(options: any, retryAfterTime: number) {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        clearTimeout(timeout);

        // @ts-ignore
        this.webex.request(options).then(resolve).catch(reject);
      }, retryAfterTime);
    });
  }
}
