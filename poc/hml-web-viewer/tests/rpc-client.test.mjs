import test from 'node:test';
import assert from 'node:assert/strict';

import { EmbedRpcClient } from '../rpc-client.js';

function connectedChannel(respond) {
  let hostPort;
  const peerPort = {
    start() {},
    close() {},
    postMessage(message) {
      queueMicrotask(() => hostPort.onmessage?.({ data: message }));
    },
  };
  hostPort = {
    onmessage: null,
    start() {},
    close() {},
    postMessage(message) {
      respond(message, peerPort);
    },
  };
  return { port1: hostPort, port2: peerPort };
}

test('v1 MessageChannel로 연결하고 바이너리를 복사해 loadFile한다', async () => {
  let request;
  const channel = connectedChannel((message, peer) => {
    request = message;
    peer.postMessage({
      type: 'rhwp-response', version: 1, sessionId: message.sessionId,
      id: message.id, result: { pageCount: 1 },
    });
  });
  const frame = { contentWindow: { postMessage(message, origin, ports) {
    assert.equal(origin, 'https://editor.example');
    assert.equal(message.type, 'rhwp-connect');
    assert.equal(ports[0], channel.port2);
    queueMicrotask(() => channel.port2.postMessage({
      type: 'rhwp-connected', version: 1, sessionId: message.sessionId,
      capabilities: ['transferable-array-buffer'],
    }));
  } } };
  const client = new EmbedRpcClient(frame, 'https://editor.example/app', {
    channelFactory: () => channel,
    sessionId: 'test-session',
    timeoutMs: 100,
  });

  await client.connect();
  const source = new Uint8Array([1, 2, 3]);
  assert.deepEqual(await client.loadFile(source, 'equation-lim.hwp'), { pageCount: 1 });
  assert.deepEqual([...source], [1, 2, 3]);
  assert.deepEqual([...request.params.data], [1, 2, 3]);
  assert.notEqual(request.params.data.buffer, source.buffer);
  client.destroy();
});

test('pageCount 결과와 구조화된 RPC 오류를 전달한다', async () => {
  const channel = connectedChannel((message, peer) => {
    const envelope = message.method === 'pageCount'
      ? { result: 2 }
      : { error: { code: 'RPC_ERROR', message: 'Unknown method: exportHml' } };
    peer.postMessage({
      type: 'rhwp-response', version: 1, sessionId: message.sessionId,
      id: message.id, ...envelope,
    });
  });
  const frame = { contentWindow: { postMessage(message) {
    queueMicrotask(() => channel.port2.postMessage({
      type: 'rhwp-connected', version: 1, sessionId: message.sessionId,
      capabilities: ['transferable-array-buffer'],
    }));
  } } };
  const client = new EmbedRpcClient(frame, 'https://editor.example', {
    channelFactory: () => channel,
    sessionId: 'test-session',
    timeoutMs: 100,
  });

  await client.connect();
  assert.equal(await client.pageCount(), 2);
  await assert.rejects(
    client.exportHml(),
    (error) => error.code === 'RPC_ERROR' && /Unknown method: exportHml/.test(error.message),
  );
  client.destroy();
});

test('응답이 없으면 요청 이름이 포함된 timeout 오류를 낸다', async () => {
  const channel = connectedChannel(() => {});
  const frame = { contentWindow: { postMessage(message) {
    queueMicrotask(() => channel.port2.postMessage({
      type: 'rhwp-connected', version: 1, sessionId: message.sessionId,
      capabilities: ['transferable-array-buffer'],
    }));
  } } };
  const client = new EmbedRpcClient(frame, 'https://editor.example', {
    channelFactory: () => channel,
    sessionId: 'test-session',
    timeoutMs: 10,
  });

  await client.connect();
  await assert.rejects(client.ready(), /RPC timeout: ready/);
  client.destroy();
});
