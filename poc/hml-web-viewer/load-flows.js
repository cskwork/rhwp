function messageOf(error) {
  return error instanceof Error ? error.message : String(error);
}

export function friendlyError(error, action) {
  const message = messageOf(error);
  if (action === 'exportHml' && /Unknown method:\s*exportHml/i.test(message)) {
    return {
      kind: 'blocked',
      message: '현재 공개 호스트는 HML 내보내기 RPC를 제공하지 않습니다. 편집 결과는 HWP/HWPX 저장 경로를 검토하세요.',
    };
  }
  if (action === 'fetch') {
    return { kind: 'error', message: `문서를 가져오지 못했습니다: ${message}` };
  }
  return { kind: 'error', message: `문서를 처리하지 못했습니다: ${message}` };
}

export function createLoadController({ client, view, fetchImpl }) {
  async function loadBytes(bytes, fileName) {
    view.setStatus({ kind: 'busy', message: `${fileName} 로드 중…` });
    try {
      await client.loadFile(bytes, fileName);
      const pages = await client.pageCount();
      view.setStatus({ kind: 'success', message: `${fileName} · ${pages}페이지 로드 완료` });
      return pages;
    } catch (error) {
      view.setStatus(friendlyError(error, 'load'));
      throw error;
    }
  }

  async function loadUrl(url, fileName = nameFromUrl(url)) {
    view.setStatus({ kind: 'busy', message: '원격 문서 가져오는 중…' });
    try {
      const response = await fetchImpl(url);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return await loadBytes(new Uint8Array(await response.arrayBuffer()), fileName);
    } catch (error) {
      view.setStatus(friendlyError(error, 'fetch'));
      throw error;
    }
  }

  async function loadLocalFile(file) {
    return loadBytes(new Uint8Array(await file.arrayBuffer()), file.name);
  }

  return { loadBytes, loadUrl, loadLocalFile };
}

function nameFromUrl(url) {
  try {
    return new URL(url, globalThis.location?.href).pathname.split('/').pop() || 'document.hml';
  } catch {
    return 'document.hml';
  }
}
