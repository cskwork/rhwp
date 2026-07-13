import test from 'node:test';
import assert from 'node:assert/strict';

import { createLoadController, friendlyError } from '../load-flows.js';

function fixture() {
  const calls = [];
  const client = {
    async loadFile(bytes, name) {
      calls.push({ bytes: [...bytes], name });
      return { pageCount: 1 };
    },
    async pageCount() { return 3; },
  };
  const states = [];
  const view = { setStatus(state) { states.push(state); } };
  return { calls, client, states, view };
}

test('sample URL을 GET하고 loadFile/pageCount 결과를 상태에 반영한다', async () => {
  const { calls, client, states, view } = fixture();
  const fetchImpl = async (url) => {
    assert.equal(url, '/samples/equation-lim.hwp');
    return { ok: true, arrayBuffer: async () => new Uint8Array([7, 8]).buffer };
  };
  const controller = createLoadController({ client, view, fetchImpl });

  await controller.loadUrl('/samples/equation-lim.hwp', 'equation-lim.hwp');

  assert.deepEqual(calls, [{ bytes: [7, 8], name: 'equation-lim.hwp' }]);
  assert.equal(states.at(-1).kind, 'success');
  assert.match(states.at(-1).message, /3페이지/);
});

test('로컬 파일 bytes와 이름을 그대로 로드한다', async () => {
  const { calls, client, states, view } = fixture();
  const controller = createLoadController({ client, view, fetchImpl: async () => {} });
  const file = {
    name: 'question.hml',
    arrayBuffer: async () => new Uint8Array([9, 1]).buffer,
  };

  await controller.loadLocalFile(file);

  assert.deepEqual(calls, [{ bytes: [9, 1], name: 'question.hml' }]);
  assert.equal(states.at(-1).kind, 'success');
});

test('원격 GET 실패를 사용자에게 표시하고 다시 throw한다', async () => {
  const { client, states, view } = fixture();
  const controller = createLoadController({
    client,
    view,
    fetchImpl: async () => ({ ok: false, status: 403 }),
  });

  await assert.rejects(controller.loadUrl('https://files.example/q.hml'), /HTTP 403/);
  assert.equal(states.at(-1).kind, 'error');
  assert.match(states.at(-1).message, /가져오지 못했습니다/);
});

test('exportHml 미지원 RPC 오류를 저장 차단 안내로 바꾼다', () => {
  const error = Object.assign(new Error('Unknown method: exportHml'), { code: 'RPC_ERROR' });
  const result = friendlyError(error, 'exportHml');

  assert.equal(result.kind, 'blocked');
  assert.match(result.message, /공개 호스트는 HML 내보내기 RPC를 제공하지 않습니다/);
});
