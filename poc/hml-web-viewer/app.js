import { EmbedRpcClient } from './rpc-client.js';
import { createLoadController, friendlyError } from './load-flows.js';

const STUDIO_URL = 'https://hwp-editor.agentic-worker.store/';
const SAMPLE_HWP = '/samples/equation-lim.hwp';
const SAMPLE_HML = './samples/exambank-math.hml';

const elements = {
  frameHost: document.querySelector('#editor-host'),
  status: document.querySelector('#status'),
  statusText: document.querySelector('#status-text'),
  localFile: document.querySelector('#local-file'),
  remoteUrl: document.querySelector('#remote-url'),
  loadRemote: document.querySelector('#load-remote'),
  loadHwp: document.querySelector('#load-hwp'),
  loadHml: document.querySelector('#load-hml'),
  exportHml: document.querySelector('#export-hml'),
};

const view = {
  setStatus({ kind, message }) {
    elements.status.dataset.kind = kind;
    elements.statusText.textContent = message;
  },
};

function createFrame() {
  const frame = document.createElement('iframe');
  frame.title = 'rhwp hosted editor';
  frame.src = STUDIO_URL;
  frame.allow = 'clipboard-read; clipboard-write';
  elements.frameHost.appendChild(frame);
  return frame;
}

function waitForLoad(frame) {
  return new Promise((resolve, reject) => {
    frame.addEventListener('load', resolve, { once: true });
    frame.addEventListener('error', () => reject(new Error('호스팅 편집기 로드 실패')), { once: true });
  });
}

function bindLoadActions(controller) {
  elements.loadHwp.addEventListener('click', () => controller.loadUrl(SAMPLE_HWP).catch(() => {}));
  elements.loadHml.addEventListener('click', () => controller.loadUrl(SAMPLE_HML).catch(() => {}));
  elements.localFile.addEventListener('change', () => {
    const [file] = elements.localFile.files;
    if (file) controller.loadLocalFile(file).catch(() => {});
  });
  elements.loadRemote.addEventListener('click', () => {
    const url = elements.remoteUrl.value.trim();
    if (url) controller.loadUrl(url).catch(() => {});
  });
}

function bindExport(client) {
  elements.exportHml.addEventListener('click', async () => {
    view.setStatus({ kind: 'busy', message: 'HML 내보내기 지원 여부 확인 중…' });
    try {
      await client.exportHml();
      view.setStatus({ kind: 'success', message: 'HML 내보내기가 완료되었습니다.' });
    } catch (error) {
      view.setStatus(friendlyError(error, 'exportHml'));
    }
  });
}

async function start() {
  const frame = createFrame();
  try {
    await waitForLoad(frame);
    const client = new EmbedRpcClient(frame, STUDIO_URL);
    await client.connect();
    await client.ready();
    bindLoadActions(createLoadController({ client, view, fetchImpl: fetch }));
    bindExport(client);
    view.setStatus({ kind: 'success', message: '호스팅 편집기 연결 완료 · 문서를 선택하세요.' });
    window.addEventListener('pagehide', () => client.destroy(), { once: true });
  } catch (error) {
    view.setStatus(friendlyError(error, 'connect'));
  }
}

start();
