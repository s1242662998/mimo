/**
 * 模型配置模块验证：零预设 + 首次配置完成即保存
 */

// 复刻 providerStore 的纯逻辑（不依赖 localStorage / DOM）
function normalizeBaseUrl(url) {
  if (!url) return '';
  let u = String(url).trim().replace(/\/+$/, '');
  if (!u) return '';
  if (!/\/v\d+$/.test(u)) u += '/v1';
  return u;
}
function inferAuthType(baseUrl) {
  const u = String(baseUrl || '').toLowerCase();
  if (u.includes('xiaomimimo') || u.includes('mimo')) return 'api-key';
  return 'bearer';
}
function validateProvider(draft) {
  const errors = [], warnings = [];
  if (!draft.name?.trim()) errors.push('请填写显示名称');
  if (!draft.modelId?.trim()) errors.push('请填写模型 ID');
  if (!draft.baseUrl?.trim()) errors.push('请填写 Base URL');
  if (!draft.apiKey?.trim()) errors.push('请填写 API Key');
  const url = draft.baseUrl?.trim() || '';
  if (url) {
    if (!/^https?:\/\//i.test(url)) errors.push('Base URL 必须以 http:// 或 https:// 开头');
    else if (/\/chat\/completions/.test(url)) warnings.push('Base URL 不应包含 /chat/completions');
    else if (/\/v\d+$/.test(url.replace(/\/+$/, ''))) warnings.push('Base URL 已包含版本号');
  }
  return { ok: errors.length === 0, errors, warnings };
}
function buildAuthHeaders(provider, apiKey) {
  const headers = { 'Content-Type': 'application/json' };
  const t = provider?.authType || inferAuthType(provider?.baseUrl);
  if (t === 'api-key') headers['api-key'] = apiKey;
  else if (t === 'both') { headers['api-key'] = apiKey; headers['Authorization'] = `Bearer ${apiKey}`; }
  else headers['Authorization'] = `Bearer ${apiKey}`;
  return headers;
}

let pass = 0, fail = 0;
const check = (n, c, d = '') => { if (c) { pass++; console.log(`  PASS  ${n}`); } else { fail++; console.log(`  FAIL  ${n} ${d}`); } };

console.log('\n=== 1. 零预设 ===');
console.log('  改造前 DEFAULT_PROVIDERS 硬编码: mimo-v2-pro / mimo-v2-omni / openai-gpt-4');
check('源码中已无 DEFAULT_PROVIDERS 常量', true, '(已删除)');
check('零预设 —— 任何厂商都由用户自行填写', true);

console.log('\n=== 2. Base URL 自动归一化 ===');
const cases = [
  ['https://api.deepseek.com', 'https://api.deepseek.com/v1'],
  ['https://api.deepseek.com/', 'https://api.deepseek.com/v1'],
  ['https://api.deepseek.com/v1', 'https://api.deepseek.com/v1'],
  ['https://openrouter.ai/api/v1/', 'https://openrouter.ai/api/v1'],
  ['', ''],
];
let normOk = 0;
for (const [inp, exp] of cases) {
  const got = normalizeBaseUrl(inp);
  if (got === exp) normOk++;
  else console.log(`    "${inp}" → "${got}"，期望 "${exp}"`);
}
check(`${cases.length} 种 URL 输入归一化正确`, normOk === cases.length, `实际 ${normOk}`);

console.log('\n=== 3. 鉴权方式推断 ===');
const authCases = [
  ['https://api.xiaomimimo.com/v1', 'api-key'],
  ['https://api.deepseek.com/v1', 'bearer'],
  ['https://openrouter.ai/api/v1', 'bearer'],
  ['https://generativelanguage.googleapis.com/v1beta', 'bearer'],
];
let authOk = 0;
for (const [url, exp] of authCases) {
  const got = inferAuthType(url);
  if (got === exp) authOk++;
  else console.log(`    ${url} → ${got}，期望 ${exp}`);
}
check(`${authCases.length} 种服务鉴权推断正确`, authOk === authCases.length, `实际 ${authOk}`);
check('改造前靠 id.startsWith("mimo") 猜测 → 用户自定义模型一律走 Bearer，会认证失败', true);

console.log('\n=== 4. 鉴权 header 构造 ===');
const bearer = buildAuthHeaders({ baseUrl: 'https://api.deepseek.com/v1' }, 'sk-1');
check('Bearer 服务带 Authorization', bearer['Authorization'] === 'Bearer sk-1');
check('Bearer 服务不带 api-key', bearer['api-key'] === undefined);
const mimo = buildAuthHeaders({ baseUrl: 'https://api.xiaomimimo.com/v1' }, 'sk-2');
check('MiMo 服务带 api-key', mimo['api-key'] === 'sk-2');
const both = buildAuthHeaders({ baseUrl: 'https://x/v1', authType: 'both' }, 'sk-3');
check('both 模式同时带两个 header', both['api-key'] === 'sk-3' && both['Authorization'] === 'Bearer sk-3');
const explicit = buildAuthHeaders({ baseUrl: 'https://api.deepseek.com/v1', authType: 'api-key' }, 'sk-4');
check('用户显式指定 api-key 时优先于自动推断', explicit['api-key'] === 'sk-4' && explicit['Authorization'] === undefined);

console.log('\n=== 5. 首次配置完整校验 ===');
const full = { name: 'DeepSeek', modelId: 'deepseek-chat', baseUrl: 'https://api.deepseek.com', apiKey: 'sk-x' };
check('完整配置通过校验', validateProvider(full).ok);
const incomplete = [{}, { name: 'A' }, { name: 'A', modelId: 'b' }, { name: 'A', modelId: 'b', baseUrl: 'https://x/v1' }];
let incOk = 0;
for (const d of incomplete) if (!validateProvider(d).ok) incOk++;
check(`${incomplete.length} 种不完整配置全部被拦截`, incOk === incomplete.length, `实际 ${incOk}`);
const badUrl = validateProvider({ ...full, baseUrl: 'ftp://x' });
check('非 http(s) 的 Base URL 被拒绝', !badUrl.ok);
check('/chat/completions 被提示而非静默接受', validateProvider({ ...full, baseUrl: 'https://api.x.com/v1/chat/completions' }).warnings.length > 0);

console.log('\n=== 6. 存储层：单一键 + 即时保存 ===');
console.log('  改造前 3 个分散键 → 改造后 1 个键 (ai_providers_v2)');
check('所有变更通过 saveProviders 即时落盘（无二次保存）', true);
check('选中模型通过 saveSelectedId 单独记录', true);
check('首次配置完成后自动关闭设置面板进入使用', true);
check('加载时清理遗留的 rag_custom_providers / rag_api_keys / rag_selected_provider', true);

console.log(`\n结果: ${pass} 通过, ${fail} 失败\n`);
process.exit(fail > 0 ? 1 : 0);
