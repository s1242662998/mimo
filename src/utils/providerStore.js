/**
 * AI 模型配置存储层
 *
 * 改造前的问题：
 *   1. DEFAULT_PROVIDERS 硬编码了 3 个预设模型（mimo-pro / mimo-omni / gpt-4），
 *      用户必须先从下拉框里选一个预设，才能去填 API Key。等于强制用户理解
 *      「厂商」概念，实际上OpenAI 兼容接口只需要 baseUrl + modelId + key 三样。
 *   2. 配置分散在三个 localStorage 键（rag_custom_providers / rag_api_keys / rag_selected_provider），
 *      「添加模型」和「保存设置」是两个独立动作，用户添加完模型还得再点一次保存，
 *      否则刷新就丢（添加时虽然写了一次 providers，但 key 要再点保存才写）。
 *   3. 鉴权方式靠 id.startsWith('mimo') 猜测，用户自己加的模型如果名字里没有 mimo
 *      一律走 Bearer header，遇到需要 api-key header 的接口就认证失败。
 *   4. 删除模型时 setSelectedProviderId(DEFAULT_PROVIDERS[0].id) 会选中一个已被删/预设的模型。
 *
 * 现在：零预设、单一存储键、字段级即时保存、鉴权方式显式可选并带自动推断。
 */

const STORAGE_KEY = 'ai_providers_v2';
const SELECTED_KEY = 'ai_selected_provider_v2';

/** 归一化 baseUrl：去掉尾部斜杠、补全 /v1 */
export function normalizeBaseUrl(url) {
  if (!url) return '';
  let u = String(url).trim().replace(/\/+$/, '');
  if (!u) return '';
  // 允许用户省略 /v1，自动补上（OpenAI 兼容接口的通用约定）
  if (!/\/v\d+$/.test(u)) u += '/v1';
  return u;
}

/**
 * 推断鉴权 header 方式。
 * 多数服务用 Bearer，但小米 MiMo 等用 api-key，用户也可能有私有网关。
 */
export function inferAuthType(baseUrl) {
  const u = String(baseUrl || '').toLowerCase();
  if (u.includes('xiaomimimo') || u.includes('mimo')) return 'api-key';
  return 'bearer';
}

/** 校验一条模型配置，返回 { ok, errors, warnings } */
export function validateProvider(draft) {
  const errors = [];
  const warnings = [];

  if (!draft.name?.trim()) errors.push('请填写显示名称');
  if (!draft.modelId?.trim()) errors.push('请填写模型 ID');
  if (!draft.baseUrl?.trim()) errors.push('请填写 Base URL');
  if (!draft.apiKey?.trim()) errors.push('请填写 API Key');

const url = draft.baseUrl?.trim() || '';
  if (url) {
    if (!/^https?:\/\//i.test(url)) {
      errors.push('Base URL 必须以 http:// 或 https:// 开头');
    } else if (/\/chat\/completions/.test(url)) {
   warnings.push('Base URL 通常只写到 /v1，不需要包含 /chat/completions，程序会自动拼接');
    } else if (/\/v\d+$/.test(url.replace(/\/+$/, ''))) {
   warnings.push('Base URL 已包含版本号，将直接使用');
    }
  }

  // 超时：可选，但填了必须在合理范围内（毫秒）
  if (draft.timeout !== undefined && draft.timeout !== null && draft.timeout !== '') {
    const n = Number(draft.timeout);
    if (!Number.isFinite(n)) {
  errors.push('超时时间必须是数字（单位：秒）');
    } else if (n > 0 && n < 30) {
      errors.push('超时时间不能小于 30 秒');
    }
  }

  return { ok: errors.length === 0, errors, warnings };
}

/** 读取全部配置 */
export function loadProviders() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(p => p && p.internalId && p.modelId && p.baseUrl);
  } catch (e) {
    console.error('读取模型配置失败：', e);
    return [];
  }
}

export function saveProviders(list) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
    return true;
  } catch (e) {
    console.error('保存模型配置失败：', e);
    return false;
  }
}

export function loadSelectedId() {
  try {
    return localStorage.getItem(SELECTED_KEY) || '';
  } catch {
    return '';
  }
}

export function saveSelectedId(internalId) {
  try {
    localStorage.setItem(SELECTED_KEY, internalId || '');
  } catch (e) {
    console.error('保存当前模型失败：', e);
  }
}

/** 生成内部唯一 id（允许用户填写的 modelId 重名） */
export function makeInternalId(modelId) {
  return `${modelId}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
}

/** 组装请求所需的鉴权 header */
export function buildAuthHeaders(provider, apiKey) {
  const headers = { 'Content-Type': 'application/json' };
  const authType = provider?.authType || inferAuthType(provider?.baseUrl);
  if (authType === 'api-key') {
    headers['api-key'] = apiKey;
  } else if (authType === 'both') {
    headers['api-key'] = apiKey;
    headers['Authorization'] = `Bearer ${apiKey}`;
  } else {
    headers['Authorization'] = `Bearer ${apiKey}`;
  }
  return headers;
}

/** 发起一次轻量请求验证配置是否可用 */
export async function testProviderConnection(provider) {
  const url = `${normalizeBaseUrl(provider.baseUrl)}/models`;
  const headers = buildAuthHeaders(provider, provider.apiKey);

  const controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
  const timer = controller ? setTimeout(() => controller.abort(), 15000) : null;

  try {
    const resp = await fetch(url, { method: 'GET', headers, signal: controller?.signal });
    if (resp.status === 401 || resp.status === 403) {
      return { ok: false, message: '鉴权失败：API Key 不正确或无权限' };
    }
    if (!resp.ok) {
      return { ok: false, message: `连接失败：HTTP ${resp.status}${resp.status === 404 ? '（Base URL 可能不正确）' : ''}` };
    }
    const data = await resp.json().catch(() => ({}));
    const models = Array.isArray(data?.data)
      ? data.data.map(m => m.id).filter(Boolean)
      : [];
    return {
      ok: true,
      models,
      message: models.length ? `连接成功，检测到 ${models.length} 个可用模型` : '连接成功',
    };
  } catch (e) {
    if (e?.name === 'AbortError') {
      return { ok: false, message: '连接超时（15 秒），请检查网络或 Base URL' };
    }
    return { ok: false, message: `连接失败：${e?.message || e}` };
  } finally {
    if (timer) clearTimeout(timer);
  }
}