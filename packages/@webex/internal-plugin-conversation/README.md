# @webex/internal-plugin-conversation

[![standard-readme compliant](https://img.shields.io/badge/readme%20style-standard-brightgreen.svg?style=flat-square)](https://github.com/RichardLitt/standard-readme)

> Plugin for the Conversation service

This is an internal Cisco Webex plugin. As such, it does not strictly adhere to semantic versioning. Use at your own risk. If you're not working on one of our first party clients, please look at our [developer api](https://developer.webex.com/) and stick to our public plugins.

- [Install](#install)
- [Usage](#usage)
- [Rate-limit handling](#rate-limit-handling)
- [Contribute](#contribute)
- [Maintainers](#maintainers)
- [License](#license)

## Install

```bash
npm install --save @webex/internal-plugin-conversation
```

## Usage

```js
import '@webex/internal-plugin-conversation';

import WebexCore from '@webex/webex-core';

const webex = new WebexCore();
webex.internal.conversation.WHATEVER;
```

This is the list of environment variable used by this plugin:

- `WEBEX_CONVERSATION_DEFAULT_CLUSTER` - The name of the conversation cluster that contains all of the organizations and spaces prior to federation phase 2. This defaults to `urn:TEAM:us-east-2_a:identityLookup` for production but can be changed to `urn:TEAM:us-east-1_int13:identityLookup` for integration.
- `WEBEX_CONVERSATION_CLUSTER_SERVICE` - The name of the conversation cluster service used to lookup the host in the hostmap. Defaults to `identityLookup`, but if the service changes, will need to be updated.

## Rate-limit handling

The plugin provides an opt-in Conversation-specific interceptor. Enable it when creating the SDK instance:

```js
const webex = new WebexCore({
  config: {
    conversation: {
      enableRetryAfterInterceptor: true,
    },
  },
});
```

When a Conversation `GET` receives HTTP 429, the interceptor waits for the response's `Retry-After` value and
replays the request with a limit of three replays (four total attempts, including the original request).
Missing or invalid delay values default to 30 seconds, and delays are capped at one hour.

For `GET /conversations/{conversationId}/parents` and child paths, fresh requests and replays share a paced
admission queue keyed by conversation ID. Starts for each conversation are separated by at least 450 ms. This
keeps two requests of headroom below the backend policy of 25 requests per 10 seconds per conversation and
user. The executable action in the Conversation service policy specifies 25 permits per 10 seconds with
per-conversation, per-user scope:
[`get-parents-rate-per-conversation-dc-user`](https://sqbu-github.cisco.com/WebExSquared/configuration/blob/bf963c497b3dcd7f20fff120f11ff98a5290f707/config/conversation/include.conversation-rateLimitingPolicy.json#L1578-L1584).

Every fresh parent-list or child-activity read enters the paced admission backlog rather than being rejected by
a fixed item cap. The backlog is therefore unbounded and can retain pending or stale work during extreme
sustained demand. A 429 pauses only the affected conversation's queue for `Retry-After`; requests for other
conversations continue through their own queues.

Other Conversation `GET` requests remain reactive and wait and retry independently after a 429, so requests
with the same delay may replay concurrently. Requests that write data are never queued or replayed, and
requests to other services are unaffected. `X-RateLimit-Limit` reports the request count but not the policy
window, so it is not used to calculate pacing dynamically.

Consumers that replace `config.interceptors` must also include `ConversationRetryAfterInterceptor`. The config
flag alone enables the interceptor only when the SDK uses its default interceptor set.

## Maintainers

This package is maintained by [Cisco Webex for Developers](https://developer.webex.com/).

## Contribute

Pull requests welcome. Please see [CONTRIBUTING.md](https://github.com/webex/webex-js-sdk/blob/master/CONTRIBUTING.md) for more details.

## License

© 2016-2020 Cisco and/or its affiliates. All Rights Reserved.
