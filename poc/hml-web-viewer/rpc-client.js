const PROTOCOL_VERSION = 1;
const CAPABILITIES = ['transferable-array-buffer'];

function secureSessionId() {
  if (typeof crypto.randomUUID === 'function') return crypto.randomUUID();
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');
}

function copiedParams(params) {
  const value = params?.data;
  if (!(value instanceof ArrayBuffer) && !ArrayBuffer.isView(value)) {
    return { params, transfer: [] };
  }
  const source = value instanceof ArrayBuffer
    ? new Uint8Array(value)
    : new Uint8Array(value.buffer, value.byteOffset, value.byteLength);
  const data = source.slice();
  return { params: { ...params, data }, transfer: [data.buffer] };
}

export class EmbedRpcClient {
  constructor(frame, studioUrl, options = {}) {
    this.frame = frame;
    this.origin = new URL(studioUrl).origin;
    this.channelFactory = options.channelFactory || (() => new MessageChannel());
    this.sessionId = options.sessionId || secureSessionId();
    this.timeoutMs = options.timeoutMs ?? 60_000;
    this.nextId = 0;
    this.pending = new Map();
    this.port = null;
  }

  connect() {
    const channel = this.channelFactory();
    this.port = channel.port1;
    this.port.onmessage = ({ data }) => this.handleMessage(data);
    this.port.start();
    return new Promise((resolve, reject) => {
      this.connectPending = this.timedPending('connect', resolve, reject);
      this.frame.contentWindow.postMessage({
        type: 'rhwp-connect',
        version: PROTOCOL_VERSION,
        sessionId: this.sessionId,
        capabilities: CAPABILITIES,
      }, this.origin, [channel.port2]);
    });
  }

  request(method, params = {}) {
    if (!this.port) return Promise.reject(new Error('RPC client is not connected'));
    const id = ++this.nextId;
    const prepared = copiedParams(params);
    return new Promise((resolve, reject) => {
      this.pending.set(id, this.timedPending(method, resolve, reject, id));
      this.port.postMessage({
        type: 'rhwp-request', version: PROTOCOL_VERSION,
        sessionId: this.sessionId, id, method, params: prepared.params,
      }, prepared.transfer);
    });
  }

  timedPending(method, resolve, reject, id) {
    const timeout = setTimeout(() => {
      if (id) this.pending.delete(id);
      reject(new Error(`RPC timeout: ${method}`));
    }, this.timeoutMs);
    return { resolve, reject, timeout };
  }

  handleMessage(message) {
    if (message?.sessionId !== this.sessionId || message.version !== PROTOCOL_VERSION) return;
    if (message.type === 'rhwp-connected') {
      clearTimeout(this.connectPending?.timeout);
      this.connectPending?.resolve();
      this.connectPending = null;
      return;
    }
    if (message.type !== 'rhwp-response' || !Number.isSafeInteger(message.id)) return;
    const pending = this.pending.get(message.id);
    if (!pending) return;
    this.pending.delete(message.id);
    clearTimeout(pending.timeout);
    if (message.error) pending.reject(this.rpcError(message.error));
    else pending.resolve(message.result);
  }

  rpcError(value) {
    const error = new Error(value?.message || String(value));
    if (value?.code) error.code = value.code;
    return error;
  }

  ready() { return this.request('ready'); }

  loadFile(data, fileName) { return this.request('loadFile', { data, fileName }); }

  pageCount() { return this.request('pageCount'); }

  exportHml() { return this.request('exportHml'); }

  destroy() {
    clearTimeout(this.connectPending?.timeout);
    this.connectPending?.reject(new Error('RPC client destroyed'));
    for (const pending of this.pending.values()) {
      clearTimeout(pending.timeout);
      pending.reject(new Error('RPC client destroyed'));
    }
    this.pending.clear();
    this.port?.close();
    this.port = null;
  }
}
