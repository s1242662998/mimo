import { useState } from 'react';
import {
  validateProvider,
  normalizeBaseUrl,
  inferAuthType,
  testProviderConnection,
} from '../utils/providerStore';

const AUTH_TYPE_OPTIONS = [
  { value: 'bearer', label: 'Bearer（默认）', hint: 'OpenAI / DeepSeek / Moonshot / 通义 等绝大多数服务' },
  { value: 'api-key', label: 'api-key', hint: '小米 MiMo 等使用 api-key header 的服务' },
  { value: 'both', label: '两者都发', hint: '私有网关同时校验两种 header 时使用' },
];

/** 首次配置 / 新增模型共用的表单。配置完成点保存即写入，无需二次保存 */
function ProviderForm({ initialValue, onSave, onCancel, autoFocus = false }) {
const [draft, setDraft] = useState(() => {
    const base = initialValue || {
      name: '',
      modelId: '',
      baseUrl: '',
      apiKey: '',
      authType: 'bearer',
      timeout: '',
    };
    // 存储的是毫秒，表单显示秒
    return {
      ...base,
      timeout: base.timeout ? Math.round(base.timeout / 1000) : '',
    };
  });
  const [errors, setErrors] = useState([]);
  const [warnings, setWarnings] = useState([]);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState(null);

  const set = (key) => (e) => {
    const value = e.target.value;
    setDraft(prev => {
      const next = { ...prev, [key]: value };
      // baseUrl 变化时自动重推断鉴权方式（用户未手动指定过才覆盖）
      if (key === 'baseUrl' && prev.authType === inferAuthType(prev.baseUrl)) {
        next.authType = inferAuthType(value);
      }
      return next;
    });
    setTestResult(null);
  };

  const handleBaseUrlBlur = () => {
    const normalized = normalizeBaseUrl(draft.baseUrl);
    if (normalized && normalized !== draft.baseUrl) {
      setDraft(prev => ({ ...prev, baseUrl: normalized }));
    }
  };

  const handleTest = async () => {
    const result = validateProvider(draft);
    setErrors(result.errors);
    setWarnings(result.warnings);
    if (!result.ok) return;

    setTesting(true);
    setTestResult(null);
    const res = await testProviderConnection({
      baseUrl: draft.baseUrl,
      authType: draft.authType,
      apiKey: draft.apiKey,
    });
    setTestResult(res);
    setTesting(false);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const result = validateProvider(draft);
    setErrors(result.errors);
    setWarnings(result.warnings);
    if (!result.ok) return;

    onSave({
      ...draft,
      name: draft.name.trim(),
      modelId: draft.modelId.trim(),
   baseUrl: normalizeBaseUrl(draft.baseUrl),
      // 表单填的是秒，存毫秒；留空存 0 表示用自动值
      timeout: draft.timeout ? Number(draft.timeout) * 1000 : 0,
    });
  };

  const inputId = (field) => `provider-field-${field}`;

  return (
    <form className="provider-form" onSubmit={handleSubmit}>
      <div className="provider-form-row">
        <label className="provider-label" htmlFor={inputId('name')}>
          显示名称
        </label>
        <input
          id={inputId('name')}
          type="text"
          value={draft.name}
          onChange={set('name')}
          placeholder="例如：DeepSeek、我的内网模型"
          className="provider-input"
          autoFocus={autoFocus}
        />
      </div>

      <div className="provider-form-row">
        <label className="provider-label" htmlFor={inputId('baseUrl')}>
          Base URL
        </label>
        <input
          id={inputId('baseUrl')}
          type="text"
          value={draft.baseUrl}
          onChange={set('baseUrl')}
          onBlur={handleBaseUrlBlur}
          placeholder="例如：https://api.deepseek.com/v1"
          className="provider-input"
        />
        <span className="provider-hint">
          填到 /v1 即可，程序会自动拼接 /chat/completions
        </span>
      </div>

      <div className="provider-form-row">
        <label className="provider-label" htmlFor={inputId('modelId')}>
          模型 ID
        </label>
        <input
          id={inputId('modelId')}
          type="text"
          value={draft.modelId}
          onChange={set('modelId')}
          placeholder="例如：deepseek-chat、gpt-4o、mimo-v2-pro"
          className="provider-input"
        />
      </div>

      <div className="provider-form-row">
        <label className="provider-label" htmlFor={inputId('apiKey')}>
          API Key
        </label>
        <input
          id={inputId('apiKey')}
          type="password"
          value={draft.apiKey}
          onChange={set('apiKey')}
          placeholder="sk-..."
          className="provider-input"
        />
        <span className="provider-hint">仅保存在本机localStorage，不会上传</span>
      </div>

      <div className="provider-form-row">
        <label className="provider-label" htmlFor={inputId('authType')}>
          鉴权方式
        </label>
        <select
          id={inputId('authType')}
          value={draft.authType}
          onChange={set('authType')}
          className="provider-input"
        >
          {AUTH_TYPE_OPTIONS.map(opt => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
        <span className="provider-hint">
          {AUTH_TYPE_OPTIONS.find(o => o.value === draft.authType)?.hint}
        </span>
      </div>

      <div className="provider-form-row">
        <label className="provider-label" htmlFor={inputId('timeout')}>
          超时时间（秒）
        </label>
        <input
          id={inputId('timeout')}
          type="number"
          min="30"
          step="30"
          value={draft.timeout ?? ''}
          onChange={set('timeout')}
          placeholder="留空则自动（文本 180 秒 / 截图复刻 600 秒）"
          className="provider-input"
        />
     <span className="provider-hint">
   截图复刻耗时长，如果经常超时可调大；填 0 或留空使用自动值
  </span>
      </div>

      {errors.length > 0 && (
        <div className="provider-msg provider-msg-error">
          {errors.map(err => <div key={err}>{err}</div>)}
        </div>
      )}
      {warnings.length > 0 && (
        <div className="provider-msg provider-msg-warn">
          {warnings.map(warn => <div key={warn}>{warn}</div>)}
        </div>
      )}
      {testResult && (
        <div className={`provider-msg ${testResult.ok ? 'provider-msg-ok' : 'provider-msg-error'}`}>
          <div>{testResult.message}</div>
          {testResult.models?.length > 0 && (
            <details className="provider-model-list">
              <summary>查看该服务可用模型（点选可自动填入模型 ID）</summary>
              <div className="provider-model-chips">
                {testResult.models.map(m => (
                  <button
                    key={m}
                    type="button"
                    className="provider-model-chip"
                    onClick={() => setDraft(prev => ({ ...prev, modelId: m, baseUrl: normalizeBaseUrl(draft.baseUrl) }))}
                  >
                    {m}
                  </button>
                ))}
              </div>
            </details>
          )}
        </div>
      )}

      <div className="provider-form-actions">
        <button type="button" onClick={handleTest} disabled={testing} className="provider-btn provider-btn-ghost">
          {testing ? '测试中...' : '测试连接'}
        </button>
        {onCancel && (
          <button type="button" onClick={onCancel} className="provider-btn provider-btn-ghost">
            取消
          </button>
        )}
        <button type="submit" className="provider-btn provider-btn-primary">
          保存并使用
        </button>
      </div>
    </form>
  );
}

/** 已配置的模型列表（可编辑/删除/切换） */
export default function ProviderSettings({ providers, selectedId, onAdd, onUpdate, onRemove, onSelect, onTestExisting }) {
  // editingId: 正在编辑的模型 internalId；null 表示当前展示的是「新增」表单
  const [editingId, setEditingId] = useState(null);

  // 未配置任何模型 → 直接展示引导表单，一次填完即完成配置
  if (providers.length === 0) {
    return (
      <div className="provider-settings">
        <div className="provider-setup-guide">
          <h3 className="provider-setup-title">配置 AI 模型</h3>
          <p className="provider-setup-desc">
            本工具不预设任何厂商，你需要填入一个 OpenAI 兼容接口的三项信息。
            配置完成后立即生效并保存在本机，之后无需重复配置。
          </p>
        </div>
        <ProviderForm onSave={onAdd} autoFocus />
      </div>
    );
  }

  return (
    <div className="provider-settings">
      <div className="provider-list-header">
        <span>已配置的模型（{providers.length}）</span>
      </div>

      <div className="provider-list">
        {providers.map(p => {
          const active = p.internalId === selectedId;
          return (
            <div
              key={p.internalId}
              className={`provider-list-item ${active ? 'active' : ''}`}
              onClick={() => onSelect(p.internalId)}
            >
              <div className="provider-list-main">
                <div className="provider-list-name">
                  {p.name}
                  {active && <span className="provider-badge-active">使用中</span>}
                </div>
                <div className="provider-list-meta">
                  {p.modelId} · {p.baseUrl}
                  {p.authType !== 'bearer' && ` · ${p.authType}`}
                </div>
              </div>
              <div className="provider-list-ops" onClick={e => e.stopPropagation()}>
                <button
                  className="provider-op-btn"
                  onClick={() => onTestExisting(p)}
                  title="测试连接"
                >
                  测试
                </button>
                <button
                  className="provider-op-btn"
                  onClick={() => setEditingId(p.internalId)}
                  title="编辑"
                >
                  编辑
                </button>
                <button
                  className="provider-op-btn danger"
                  onClick={() => onRemove(p.internalId)}
                  title="删除"
                >
                  删除
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {editingId && (
        <div className="provider-edit-head">
          <span>编辑模型配置</span>
          <button className="provider-op-btn" onClick={() => setEditingId(null)}>收起</button>
        </div>
      )}

      <ProviderForm
        key={`form-${editingId || 'new'}`}
        initialValue={editingId ? providers.find(p => p.internalId === editingId) : null}
        onSave={(draft) => {
          if (editingId) onUpdate(editingId, draft);
          else onAdd(draft);
          setEditingId(null);
        }}
        onCancel={() => setEditingId(null)}
      />
    </div>
  );
}