/*!
 * Copyright (c) 2015-2026 Cisco Systems, Inc. See LICENSE file.
 */

import {assert} from '@webex/test-helper-chai';
import sinon from 'sinon';

import ConversationRetryAfterInterceptor, {
  CONVERSATION_PARENT_REQUEST_MINIMUM_SPACING,
  DEFAULT_RETRY_AFTER_DELAY,
  getConversationParentRequestKey,
  getRetryAfterDelay,
  MAX_REPLAYS,
  MAX_RETRY_AFTER_DELAY,
} from '../../../../src/interceptors/conversation-retry-after';

describe('ConversationRetryAfterInterceptor', () => {
  let clock;
  let interceptor;
  let webex;

  const conversationOptions = {
    method: 'GET',
    service: 'conversation',
  };
  const rateLimitReason = {
    headers: {'retry-after': '1'},
    statusCode: 429,
  };
  const firstConversationId = '11111111-1111-1111-1111-111111111111';
  const secondConversationId = '22222222-2222-2222-2222-222222222222';
  const getParentOptions = (conversationId = firstConversationId) => ({
    method: 'GET',
    resource: `conversations/${conversationId}/parents`,
    service: 'conversation',
  });

  beforeEach(() => {
    clock = sinon.useFakeTimers();
    webex = {
      internal: {
        services: {
          getServiceFromUrl: sinon.stub(),
        },
      },
      request: sinon.stub(),
    };
    interceptor = Reflect.apply(ConversationRetryAfterInterceptor.create, webex, []);
  });

  afterEach(() => {
    clock.restore();
    sinon.restore();
  });

  describe('getRetryAfterDelay()', () => {
    [
      [{headers: {'Retry-After': '2'}}, 2_000],
      [{retryAfter: '3'}, 3_000],
      [{headers: {'retry-after': 'Fri, 01 Jan 2100 00:00:00 GMT'}}, MAX_RETRY_AFTER_DELAY],
      [{headers: {'retry-after': 'Wed, 31 Dec 1969 23:59:59 GMT'}}, 0],
      [{headers: {}}, DEFAULT_RETRY_AFTER_DELAY],
      [{headers: {'retry-after': 'invalid'}}, DEFAULT_RETRY_AFTER_DELAY],
      [{headers: {'retry-after': '7200'}}, MAX_RETRY_AFTER_DELAY],
    ].forEach(([reason, expectedDelay]) => {
      it(`returns ${expectedDelay}ms for ${JSON.stringify(reason)}`, () => {
        assert.equal(getRetryAfterDelay(reason), expectedDelay);
      });
    });
  });

  describe('getConversationParentRequestKey()', () => {
    [
      {resource: `conversations/${firstConversationId}/parents`},
      {
        uri: `https://conversation.example.com/conversation/api/v1/conversations/${firstConversationId}/parents`,
      },
      {
        url: `https://conversation.example.com/conversation/api/v1/conversations/${firstConversationId}/parents/aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa?includeChildren=true`,
      },
    ].forEach((options) => {
      it(`extracts the conversation ID from ${Object.keys(options)[0]}`, () => {
        assert.equal(getConversationParentRequestKey(options), firstConversationId);
      });
    });

    it('does not match non-parent Conversation requests', () => {
      assert.isUndefined(
        getConversationParentRequestKey({
          resource: `conversations/${firstConversationId}/activities`,
        })
      );
    });
  });

  describe('parent request admission', () => {
    it('paces parent request starts for the same conversation', async () => {
      const firstOptions = getParentOptions();
      const secondOptions = {...getParentOptions(), qs: {limit: 20}};

      assert.strictEqual(await interceptor.onRequest(firstOptions), firstOptions);

      const secondRequest = interceptor.onRequest(secondOptions);
      let secondRequestResolved = false;

      secondRequest.then(() => {
        secondRequestResolved = true;
      });

      await clock.tickAsync(CONVERSATION_PARENT_REQUEST_MINIMUM_SPACING - 1);
      assert.isFalse(secondRequestResolved);

      await clock.tickAsync(1);
      assert.strictEqual(await secondRequest, secondOptions);
    });

    it('keeps admission queues isolated by conversation', async () => {
      const firstOptions = getParentOptions();
      const queuedOptions = {...getParentOptions(), qs: {limit: 20}};
      const otherConversationOptions = getParentOptions(secondConversationId);

      await interceptor.onRequest(firstOptions);

      const queuedRequest = interceptor.onRequest(queuedOptions);

      assert.strictEqual(
        await interceptor.onRequest(otherConversationOptions),
        otherConversationOptions
      );

      await clock.tickAsync(CONVERSATION_PARENT_REQUEST_MINIMUM_SPACING);
      assert.strictEqual(await queuedRequest, queuedOptions);
    });

    it('does not pace non-parent Conversation GETs', async () => {
      const options = {
        method: 'GET',
        resource: `conversations/${firstConversationId}/activities`,
        service: 'conversation',
      };

      assert.strictEqual(await interceptor.onRequest(options), options);
    });

    it('does not pace parent writes', async () => {
      const options = {...getParentOptions(), method: 'POST'};

      assert.strictEqual(await interceptor.onRequest(options), options);
    });

    it('uses one paced queue for a parent replay and fresh request', async () => {
      const options = getParentOptions();
      const freshOptions = {...getParentOptions(), qs: {limit: 20}};
      const response = {body: {items: []}};

      await interceptor.onRequest(options);
      webex.request.resolves(response);

      const replay = interceptor.onResponseError(options, rateLimitReason);
      const freshRequest = interceptor.onRequest(freshOptions);
      let freshRequestResolved = false;

      freshRequest.then(() => {
        freshRequestResolved = true;
      });

      await clock.tickAsync(999);
      assert.notCalled(webex.request);
      assert.isFalse(freshRequestResolved);

      await clock.tickAsync(1);
      assert.deepEqual(await replay, response);

      await clock.tickAsync(CONVERSATION_PARENT_REQUEST_MINIMUM_SPACING - 1);
      assert.isFalse(freshRequestResolved);

      await clock.tickAsync(1);
      assert.strictEqual(await freshRequest, freshOptions);
    });

    it('applies a parent cooldown only to the affected conversation', async () => {
      const options = getParentOptions();
      const response = {body: {items: []}};
      const otherConversationOptions = getParentOptions(secondConversationId);

      webex.request.resolves(response);

      const replay = interceptor.onResponseError(options, rateLimitReason);

      assert.strictEqual(
        await interceptor.onRequest(otherConversationOptions),
        otherConversationOptions
      );

      await clock.tickAsync(1_000);
      await replay;
    });

    it('honors an updated Retry-After when a parent replay is rate limited again', async () => {
      const options = getParentOptions();
      const secondReason = {headers: {'retry-after': '2'}, statusCode: 429};
      const response = {body: {items: []}};

      webex.request.onFirstCall().rejects(secondReason);
      webex.request.onSecondCall().resolves(response);

      const replay = interceptor.onResponseError(options, rateLimitReason);

      await clock.tickAsync(1_000);
      assert.calledOnce(webex.request);

      await clock.tickAsync(1_999);
      assert.calledOnce(webex.request);

      await clock.tickAsync(1);
      assert.deepEqual(await replay, response);
      assert.calledTwice(webex.request);
    });

    it('bounds parent replay attempts per request', async () => {
      const options = getParentOptions();

      webex.request.rejects(rateLimitReason);

      const replay = interceptor
        .onResponseError(options, rateLimitReason)
        .catch((reason) => reason);

      for (let replayIndex = 0; replayIndex < MAX_REPLAYS; replayIndex += 1) {
        // eslint-disable-next-line no-await-in-loop
        await clock.tickAsync(1_000);
      }

      assert.strictEqual(await replay, rateLimitReason);
      assert.callCount(webex.request, MAX_REPLAYS);
    });

    it('eventually admits a large parent request backlog', async () => {
      const options = Array.from({length: 60}, (_, index) => ({
        ...getParentOptions(),
        qs: {page: index},
      }));
      const requests = options.map((requestOptions) => interceptor.onRequest(requestOptions));

      await clock.runAllAsync();

      assert.deepEqual(await Promise.all(requests), options);
    });
  });

  it('replays a Conversation GET after Retry-After', async () => {
    const response = {body: {items: []}};

    webex.request.resolves(response);

    const replay = interceptor.onResponseError(conversationOptions, rateLimitReason);

    await clock.tickAsync(999);
    assert.notCalled(webex.request);

    await clock.tickAsync(1);

    assert.deepEqual(await replay, response);
    assert.calledOnceWithExactly(webex.request, conversationOptions);
  });

  it('recognizes a Conversation URL through the service catalog', async () => {
    const options = {
      method: 'GET',
      url: 'https://conversation.example.com/conversation/api/v1/conversations',
    };
    const response = {body: {items: []}};

    webex.internal.services.getServiceFromUrl.returns({name: 'conversation'});
    webex.request.resolves(response);

    const replay = interceptor.onResponseError(options, rateLimitReason);

    await clock.tickAsync(1_000);

    assert.deepEqual(await replay, response);
    assert.calledOnceWithExactly(webex.internal.services.getServiceFromUrl, options.url);
  });

  it('replays concurrent rate-limited requests independently', async () => {
    let resolveFirstRequest;
    const firstOptions = {...conversationOptions, resource: 'conversations/first'};
    const secondOptions = {...conversationOptions, resource: 'conversations/second'};
    const firstResponse = {body: {id: 'first'}};
    const secondResponse = {body: {id: 'second'}};
    const firstRequest = new Promise((resolve) => {
      resolveFirstRequest = resolve;
    });

    webex.request.onFirstCall().returns(firstRequest);
    webex.request.onSecondCall().resolves(secondResponse);

    const firstReplay = interceptor.onResponseError(firstOptions, rateLimitReason);
    const secondReplay = interceptor.onResponseError(secondOptions, rateLimitReason);

    await clock.tickAsync(1_000);
    assert.calledTwice(webex.request);
    assert.calledWithExactly(webex.request.firstCall, firstOptions);
    assert.calledWithExactly(webex.request.secondCall, secondOptions);
    assert.deepEqual(await secondReplay, secondResponse);

    resolveFirstRequest(firstResponse);
    assert.deepEqual(await firstReplay, firstResponse);
  });

  it('replays a later request first when its Retry-After is shorter', async () => {
    const firstOptions = {...conversationOptions, resource: 'conversations/first'};
    const secondOptions = {...conversationOptions, resource: 'conversations/second'};
    const firstResponse = {body: {id: 'first'}};
    const secondResponse = {body: {id: 'second'}};

    webex.request.withArgs(firstOptions).resolves(firstResponse);
    webex.request.withArgs(secondOptions).resolves(secondResponse);

    const firstReplay = interceptor.onResponseError(firstOptions, {
      ...rateLimitReason,
      headers: {'retry-after': '10'},
    });

    await clock.tickAsync(1_000);

    const secondReplay = interceptor.onResponseError(secondOptions, {
      ...rateLimitReason,
      headers: {'retry-after': '2'},
    });

    await clock.tickAsync(1_999);
    assert.notCalled(webex.request);

    await clock.tickAsync(1);
    assert.deepEqual(await secondReplay, secondResponse);
    assert.calledOnceWithExactly(webex.request, secondOptions);

    await clock.tickAsync(6_999);
    assert.calledOnce(webex.request);

    await clock.tickAsync(1);
    assert.deepEqual(await firstReplay, firstResponse);
    assert.calledTwice(webex.request);
    assert.calledWithExactly(webex.request.secondCall, firstOptions);
  });

  it('bounds replay attempts per request', async () => {
    webex.request.rejects(rateLimitReason);

    const replay = interceptor
      .onResponseError(conversationOptions, rateLimitReason)
      .catch((reason) => reason);

    for (let replayIndex = 0; replayIndex < MAX_REPLAYS; replayIndex += 1) {
      // eslint-disable-next-line no-await-in-loop
      await clock.tickAsync(1_000);
    }

    const rejection = await replay;

    assert.strictEqual(rejection, rateLimitReason);
    assert.callCount(webex.request, MAX_REPLAYS);
  });

  ['POST', 'PUT', 'PATCH', 'DELETE'].forEach((method) => {
    it(`does not replay Conversation ${method} requests`, async () => {
      const reason = await interceptor
        .onResponseError({...conversationOptions, method}, rateLimitReason)
        .catch((error) => error);

      assert.strictEqual(reason, rateLimitReason);
      assert.notCalled(webex.request);
    });
  });

  [400, 500, 503].forEach((statusCode) => {
    it(`does not replay HTTP ${statusCode} responses`, async () => {
      const reason = {...rateLimitReason, statusCode};
      const rejection = await interceptor
        .onResponseError(conversationOptions, reason)
        .catch((error) => error);

      assert.strictEqual(rejection, reason);
      assert.notCalled(webex.request);
    });
  });

  it('does not replay another service request', async () => {
    const options = {method: 'GET', service: 'people'};
    const reason = await interceptor
      .onResponseError(options, rateLimitReason)
      .catch((error) => error);

    assert.strictEqual(reason, rateLimitReason);
    assert.notCalled(webex.request);
  });
});
