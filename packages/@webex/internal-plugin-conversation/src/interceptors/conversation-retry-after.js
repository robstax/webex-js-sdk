/*!
 * Copyright (c) 2015-2026 Cisco Systems, Inc. See LICENSE file.
 */

import {Interceptor} from '@webex/http-core';

export const DEFAULT_RETRY_AFTER_DELAY = 30_000;
export const MAX_RETRY_AFTER_DELAY = 3_600_000;
export const MAX_REPLAYS = 3;
export const CONVERSATION_PARENT_RATE_LIMIT = 25;
export const CONVERSATION_PARENT_RATE_LIMIT_HEADROOM = 2;
export const CONVERSATION_PARENT_RATE_LIMIT_WINDOW = 10_000;
// Retain two permits below the service limit and round up so starts never exceed the paced target.
export const CONVERSATION_PARENT_REQUEST_MINIMUM_SPACING =
  Math.ceil(
    CONVERSATION_PARENT_RATE_LIMIT_WINDOW /
      (CONVERSATION_PARENT_RATE_LIMIT - CONVERSATION_PARENT_RATE_LIMIT_HEADROOM) /
      50
  ) * 50;

const RETRY_AFTER_HEADER = 'retry-after';
const CONVERSATION_PARENT_REQUEST_PATTERN =
  /(?:^|\/)conversations\/([a-f\d]{8}-[a-f\d]{4}-[a-f\d]{4}-[a-f\d]{4}-[a-f\d]{12})\/parents(?:[/?#]|$)/i;

const wait = (delay) =>
  new Promise((resolve) => {
    setTimeout(resolve, delay);
  });

export const getRetryAfterDelay = (reason = {}) => {
  const headers = reason.headers || {};
  const headerName = Object.keys(headers).find((name) => name.toLowerCase() === RETRY_AFTER_HEADER);
  const retryAfter = headerName ? headers[headerName] : reason.retryAfter;

  if (retryAfter === undefined || retryAfter === null || String(retryAfter).trim() === '') {
    return DEFAULT_RETRY_AFTER_DELAY;
  }

  const retryAfterSeconds = Number(String(retryAfter ?? '').trim());

  if (Number.isFinite(retryAfterSeconds)) {
    if (retryAfterSeconds < 0) {
      return DEFAULT_RETRY_AFTER_DELAY;
    }

    return Math.min(retryAfterSeconds * 1000, MAX_RETRY_AFTER_DELAY);
  }

  const retryAfterDate = Date.parse(String(retryAfter));

  if (!Number.isFinite(retryAfterDate)) {
    return DEFAULT_RETRY_AFTER_DELAY;
  }

  return Math.min(Math.max(retryAfterDate - Date.now(), 0), MAX_RETRY_AFTER_DELAY);
};

export const getConversationParentRequestKey = ({resource, uri, url} = {}) =>
  [uri, url, resource]
    .map((requestLocation) =>
      typeof requestLocation === 'string'
        ? requestLocation.match(CONVERSATION_PARENT_REQUEST_PATTERN)?.[1]
        : undefined
    )
    .find(Boolean)
    ?.toLowerCase();

export default class ConversationRetryAfterInterceptor extends Interceptor {
  static create() {
    return new ConversationRetryAfterInterceptor({webex: this});
  }

  constructor(...args) {
    super(...args);
    // Replays traverse the interceptor chain again; track them to prevent a nested retry loop.
    this.replayingOptions = new WeakSet();
    this.admissionQueues = new Map();
  }

  onRequest(options = {}) {
    if (
      this.replayingOptions.has(options) ||
      !this.isConversationRequest(options) ||
      !this.isRetryableMethod(options)
    ) {
      return Promise.resolve(options);
    }

    const key = getConversationParentRequestKey(options);

    return key ? this.enqueueAdmissionRequest(key, options) : Promise.resolve(options);
  }

  onResponseError(options, reason) {
    if (this.replayingOptions.has(options) || !this.shouldRetry(options, reason)) {
      return Promise.reject(reason);
    }

    const key = getConversationParentRequestKey(options);

    if (!key) {
      return this.replay(options, reason);
    }

    const state = this.getAdmissionQueueState(key);

    this.extendAdmissionCooldown(state, getRetryAfterDelay(reason));

    return this.enqueueAdmissionReplay(key, state, options);
  }

  shouldRetry(options, reason) {
    return (
      this.isConversationRequest(options) &&
      this.isRetryableMethod(options) &&
      reason?.statusCode === 429
    );
  }

  isRetryableMethod(options = {}) {
    return (options.method || 'GET').toUpperCase() === 'GET';
  }

  isConversationRequest(options = {}) {
    const service = options.service || options.api;

    if (typeof service === 'string' && service.toLowerCase() === 'conversation') {
      return true;
    }

    const requestUrl = options.uri || options.url;

    if (typeof requestUrl !== 'string') {
      return false;
    }

    try {
      return (
        this.webex.internal.services.getServiceFromUrl(requestUrl)?.name?.toLowerCase() ===
        'conversation'
      );
    } catch {
      return false;
    }
  }

  // Each request owns its wait/retry loop so unrelated 429 responses cannot delay one another.
  async replay(options, reason) {
    let replayReason = reason;

    for (let replayCount = 0; replayCount < MAX_REPLAYS; replayCount += 1) {
      // eslint-disable-next-line no-await-in-loop
      await wait(getRetryAfterDelay(replayReason));
      this.replayingOptions.add(options);

      try {
        // eslint-disable-next-line no-await-in-loop
        return await this.webex.request(options);
      } catch (nextReason) {
        if (!this.shouldRetry(options, nextReason)) {
          throw nextReason;
        }

        replayReason = nextReason;
      } finally {
        this.replayingOptions.delete(options);
      }
    }

    throw replayReason;
  }

  getAdmissionQueueState(key) {
    const existingState = this.admissionQueues.get(key);

    if (existingState) {
      existingState.cleanup = undefined;

      return existingState;
    }

    const state = {
      cleanup: undefined,
      cooldown: Promise.resolve(),
      drain: undefined,
      entries: [],
      spacing: Promise.resolve(),
    };

    this.admissionQueues.set(key, state);

    return state;
  }

  enqueueAdmissionRequest(key, options) {
    const state = this.getAdmissionQueueState(key);

    return new Promise((resolve) => {
      state.entries.push({type: 'request', options, resolve});
      this.startAdmissionQueue(key, state);
    });
  }

  enqueueAdmissionReplay(key, state, options) {
    return new Promise((resolve, reject) => {
      state.entries.push({
        type: 'replay',
        options,
        replayCount: 0,
        resolve,
        reject,
      });
      this.startAdmissionQueue(key, state);
    });
  }

  extendAdmissionCooldown(state, delay) {
    state.cooldown = Promise.all([state.cooldown, wait(delay)]).then(() => undefined);
  }

  startAdmissionQueue(key, state) {
    state.cleanup = undefined;

    if (state.drain) {
      return;
    }

    state.drain = this.drainAdmissionQueue(state).finally(() => {
      state.drain = undefined;

      if (state.entries.length) {
        this.startAdmissionQueue(key, state);
      } else {
        this.scheduleAdmissionQueueCleanup(key, state);
      }
    });
  }

  async waitForAdmissionQueue(state) {
    const {cooldown, spacing} = state;

    await Promise.all([cooldown, spacing]);

    // Either wait may have been extended while pending, so only admit against the current promises.
    if (cooldown !== state.cooldown || spacing !== state.spacing) {
      return this.waitForAdmissionQueue(state);
    }

    return undefined;
  }

  async drainAdmissionQueue(state) {
    while (state.entries.length) {
      // eslint-disable-next-line no-await-in-loop
      await this.waitForAdmissionQueue(state);

      const entry = state.entries.shift();

      state.spacing = wait(CONVERSATION_PARENT_REQUEST_MINIMUM_SPACING);

      if (entry.type === 'request') {
        entry.resolve(entry.options);
      } else {
        // eslint-disable-next-line no-await-in-loop
        await this.replayAdmissionEntry(state, entry);
      }
    }
  }

  async replayAdmissionEntry(state, entry) {
    entry.replayCount += 1;
    this.replayingOptions.add(entry.options);

    try {
      const response = await this.webex.request(entry.options);

      entry.resolve(response);
    } catch (reason) {
      if (this.shouldRetry(entry.options, reason) && entry.replayCount < MAX_REPLAYS) {
        this.extendAdmissionCooldown(state, getRetryAfterDelay(reason));
        state.entries.unshift(entry);
      } else {
        entry.reject(reason);
      }
    } finally {
      this.replayingOptions.delete(entry.options);
    }
  }

  scheduleAdmissionQueueCleanup(key, state) {
    if (state.drain || state.entries.length) {
      return;
    }

    const cleanup = Promise.all([state.cooldown, state.spacing]).then(() => {
      if (
        state.cleanup === cleanup &&
        this.admissionQueues.get(key) === state &&
        !state.drain &&
        !state.entries.length
      ) {
        this.admissionQueues.delete(key);
      }
    });

    state.cleanup = cleanup;
  }
}
