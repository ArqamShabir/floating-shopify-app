import { useEffect, useMemo, useRef, useLayoutEffect, useState } from "react";
import { useFetcher, useLoaderData } from "react-router";
import { useAppBridge } from "@shopify/app-bridge-react";
import { boundary } from "@shopify/shopify-app-react-router/server";
import { authenticate } from "../shopify.server";
import {
  Page,
  Layout,
  Card,
  BlockStack,
  InlineGrid,
  TextField,
  Select,
  Checkbox,
  RangeSlider,
  Button,
  Divider,
  Text,
  Box,
  ButtonGroup,
} from "@shopify/polaris";

const SETTINGS_NAMESPACE = "floating_proof";
const SETTINGS_KEY = "widget_settings";

const defaultSettings = {
  enabled: true,
  textTemplate: "{{count}} people are viewing this store",
  position: "bottom-right",
  countMin: 80,
  countMax: 140,
  updateIntervalMs: 10000,
  backgroundColor: "#111827",
  textColor: "#ffffff",
  borderRadius: 12,
  shadow: true,
  showOnMobile: true,
  iconType: "emoji",
  iconEmoji: "👀",
  iconUrl: "",
  paddingX: 14,
  paddingY: 10,
  fontSize: 14,
  variant: "pill",
  opacity: 1,
  borderWidth: 0,
  borderColor: "#000000",
  backdropBlur: false,
  zIndex: 10,
  visibility: {
    showOnHome: true,
    showOnProduct: true,
    showOnCollection: true,
    showOnCart: true,
  },
  excludeProductHandles: [],
  excludeProductIds: [],
  excludeTags: [],
};

export const loader = async ({ request }) => {
  const { admin } = await authenticate.admin(request);

  const query = `#graphql
    query FPSettingsQuery($ns: String!, $key: String!) {
      shop { id }
      metafield: shopMetafield(namespace: $ns, key: $key) {
        id
        type
        value
      }
    }
  `;

  const altQuery = `#graphql
    query FPSettingsQueryAlt($ns: String!, $key: String!) {
      shop {
        id
        metafield(namespace: $ns, key: $key) {
          id
          type
          value
        }
      }
    }
  `;

  let shopId = null;
  let settings = defaultSettings;
  try {
    let resp = await admin.graphql(query, {
      variables: { ns: SETTINGS_NAMESPACE, key: SETTINGS_KEY },
    });
    let json = await resp.json();
    if (json?.data?.shop?.id) shopId = json.data.shop.id;
    const mf = json?.data?.metafield;
    if (mf?.value) {
      try {
        settings = { ...defaultSettings, ...JSON.parse(mf.value) };
      } catch (_) {}
    }
    if (!shopId) {
      resp = await admin.graphql(altQuery, {
        variables: { ns: SETTINGS_NAMESPACE, key: SETTINGS_KEY },
      });
      json = await resp.json();
      if (json?.data?.shop?.id) shopId = json.data.shop.id;
      const mfAlt = json?.data?.shop?.metafield;
      if (mfAlt?.value) {
        try {
          settings = { ...defaultSettings, ...JSON.parse(mfAlt.value) };
        } catch (_) {}
      }
    }
  } catch (e) {}

  return { shopId, settings };
};

export const action = async ({ request }) => {
  const { admin } = await authenticate.admin(request);
  const formData = await request.formData();
  const raw = formData.get("settings");

  let settingsToSave = defaultSettings;
  try {
    const parsed = JSON.parse(raw || "{}");
    settingsToSave = { ...defaultSettings, ...parsed };
    if (settingsToSave.countMin > settingsToSave.countMax) {
      const t = settingsToSave.countMin;
      settingsToSave.countMin = settingsToSave.countMax;
      settingsToSave.countMax = t;
    }
  } catch (_) {}

  const mutation = `#graphql
    mutation FPSettingsSave($metafields: [MetafieldsSetInput!]!) {
      metafieldsSet(metafields: $metafields) {
        metafields { id key namespace type }
        userErrors { field message }
      }
    }
  `;

  let ownerId = null;
  try {
    const sResp = await admin.graphql(`#graphql\n      query { shop { id } }\n    `);
    const sJson = await sResp.json();
    ownerId = sJson?.data?.shop?.id || null;
  } catch (_) {}

  if (!ownerId) {
    return { ok: false, errors: [{ message: "Unable to resolve shop id" }] };
  }

  const variables = {
    metafields: [
      {
        ownerId,
        namespace: SETTINGS_NAMESPACE,
        key: SETTINGS_KEY,
        type: "json",
        value: JSON.stringify(settingsToSave),
      },
    ],
  };

  const resp = await admin.graphql(mutation, { variables });
  const json = await resp.json();
  const errors = json?.data?.metafieldsSet?.userErrors || [];

  return {
    ok: errors.length === 0,
    errors,
    saved: settingsToSave,
  };
};

export default function Index() {
  const { shopId, settings: initialSettings } = useLoaderData();
  const fetcher = useFetcher();
  const shopify = useAppBridge();

  const [settings, setSettings] = useState(initialSettings || defaultSettings);
  const [selectedProducts, setSelectedProducts] = useState([]);
  const [intervalValue, setIntervalValue] = useState(10);
  const [intervalUnit, setIntervalUnit] = useState('seconds');

  // Sync intervalValue and intervalUnit with settings.updateIntervalMs
  useEffect(() => {
    const ms = settings.updateIntervalMs || 10000;
    if (ms >= 60000 && ms % 60000 === 0) {
      setIntervalUnit('minutes');
      setIntervalValue(ms / 60000);
    } else {
      setIntervalUnit('seconds');
      setIntervalValue(ms / 1000);
    }
  }, [settings.updateIntervalMs]);

  const isSaving = useMemo(
    () => ["loading", "submitting"].includes(fetcher.state),
    [fetcher.state],
  );

  useEffect(() => {
    if (fetcher.data?.ok) {
      if (shopify?.toast?.show) {
        shopify.toast.show("Settings saved");
      }
    } else if (fetcher.data?.errors?.length) {
      if (shopify?.toast?.show) {
        shopify.toast.show("Failed to save settings");
      }
    }
  }, [fetcher.data, shopify]);

function useTopBarOffset(extra = 16) {
  const [offset, setOffset] = useState(72 + extra);
  useEffect(() => {
    const update = () => {
      const el =
        document.querySelector('.Polaris-Frame__TopBar') ||
        document.querySelector('[data-polaris-top-bar]') ||
        document.querySelector('header[role="banner"]');
      const h = el ? el.getBoundingClientRect().height : 56;
      setOffset(h + extra);
    };
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, [extra]);
  return offset;
}

function useIsNarrow(brk = 768) {
  const [narrow, setNarrow] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia(`(max-width:${brk}px)`);
    const on = (e) => setNarrow(e.matches);
    on(mq);
    mq.addEventListener ? mq.addEventListener('change', on) : mq.addListener(on);
    return () => {
      mq.removeEventListener ? mq.removeEventListener('change', on) : mq.removeListener(on);
    };
  }, [brk]);
  return narrow;
}


  const submit = () => {
    const payload = new FormData();
    payload.set("settings", JSON.stringify(settings));
    payload.set("shopId", shopId || "");
    fetcher.submit(payload, { method: "POST" });
  };

  const openProductPicker = async () => {
    try {
      const selected = await shopify.resourcePicker({
        type: "product",
        action: "select",
        multiple: true,
      });
      
      if (selected && selected.length > 0) {
        const productIds = selected.map(p => p.id);
        const productHandles = selected.map(p => p.handle);
        setSelectedProducts(selected);
        setSettings((s) => ({ 
          ...s, 
          excludeProductIds: [...new Set([...(s.excludeProductIds || []), ...productIds])],
          excludeProductHandles: [...new Set([...(s.excludeProductHandles || []), ...productHandles])]
        }));
      }
    } catch (error) {
      console.error('Product picker error:', error);
    }
  };

    const topOffset = useTopBarOffset(16); // clears admin title bar + a little spacing
  const isNarrow = useIsNarrow();

  return (
    <Page
      title="Floating Viewers Widget"
      primaryAction={{
        content: "Save Settings",
        loading: isSaving,
        onAction: submit,
      }}
      secondaryActions={[
        {
          content: "Reset to Defaults",
          destructive: true,
          onAction: () => {
            if (confirm("Are you sure you want to reset all settings to defaults?")) {
              setSettings(defaultSettings);
            }
          },
        },
      ]}
    >
      <Layout>
        <Layout.Section variant="oneHalf">
          <BlockStack gap="500">
            <Card>
              <BlockStack gap="400">
                <Text variant="headingMd" as="h2">Quick Presets</Text>
                <ButtonGroup>
                  <Button onClick={() => { setSettings((s) => ({ ...s, backgroundColor: '#111827', textColor: '#ffffff', shadow: true, borderRadius: 999, variant: 'pill', opacity: 1, paddingX: 16, paddingY: 10, iconType: 'emoji', iconEmoji: '👀' })); }}>Bold Pill</Button>
                  <Button onClick={() => { setSettings((s) => ({ ...s, backgroundColor: '#111827', textColor: '#ffffff', variant: 'glass', backdropBlur: true, opacity: 0.85, shadow: true, borderRadius: 16, paddingX: 14, paddingY: 12, iconType: 'emoji', iconEmoji: '✨' })); }}>Glassy</Button>
                  <Button onClick={() => { setSettings((s) => ({ ...s, backgroundColor: '#ffffff', textColor: '#111827', shadow: false, borderWidth: 1, borderColor: '#E5E7EB', variant: 'card', borderRadius: 8, paddingX: 12, paddingY: 8, iconType: 'emoji', iconEmoji: '🛒' })); }}>Minimal</Button>
                </ButtonGroup>
              </BlockStack>
            </Card>

            <Card>
              <BlockStack gap="400">
                <Text variant="headingMd" as="h2">Behavior</Text>
                <Checkbox label="Enable widget" checked={settings.enabled} onChange={(checked) => setSettings((s) => ({ ...s, enabled: checked }))} helpText="Turn the widget on or off across your store" />
                <TextField label="Message template" value={settings.textTemplate} onChange={(value) => setSettings((s) => ({ ...s, textTemplate: value }))} helpText="Use {{count}} to insert the live count" autoComplete="off" />
                <Select label="Position on screen" options={[{label: 'Bottom Right', value: 'bottom-right'}, {label: 'Bottom Left', value: 'bottom-left'}, {label: 'Top Right', value: 'top-right'}, {label: 'Top Left', value: 'top-left'}]} value={settings.position} onChange={(value) => setSettings((s) => ({ ...s, position: value }))} />
                <InlineGrid columns={2} gap="400">
                  <TextField 
                    type="number" 
                    label="Minimum count" 
                    value={String(settings.countMin)} 
                    onChange={(value) => {
                      const val = parseInt(value || '0', 10);
                      setSettings((s) => ({ ...s, countMin: val }));
                    }} 
                    autoComplete="off"
                    min={0}
                  />
                  <TextField 
                    type="number" 
                    label="Maximum count" 
                    value={String(settings.countMax)} 
                    onChange={(value) => {
                      const val = parseInt(value || '0', 10);
                      setSettings((s) => ({ ...s, countMax: val }));
                    }} 
                    autoComplete="off"
                    min={settings.countMin || 0}
                  />
                </InlineGrid>
                {settings.countMin > settings.countMax && (
                  <Text variant="bodySm" as="p" tone="critical">
                    Minimum count should be less than maximum count
                  </Text>
                )}
                <BlockStack gap="300">
                  <Text variant="bodySm" as="p" fontWeight="semibold">How often the count changes</Text>
                  <InlineGrid columns={2} gap="400">
                    <TextField 
                      type="number" 
                      label="Value" 
                      value={String(intervalValue)} 
                      onChange={(value) => {
                        const val = Math.max(1, Math.min(60, parseInt(value || '1', 10)));
                        setIntervalValue(val);
                        const ms = intervalUnit === 'minutes' ? val * 60000 : val * 1000;
                        setSettings((s) => ({ ...s, updateIntervalMs: ms }));
                      }} 
                      autoComplete="off"
                      min={1}
                      max={60}
                      helpText="1-60"
                    />
                    <Select 
                      label="Unit" 
                      options={[
                        {label: 'Seconds', value: 'seconds'}, 
                        {label: 'Minutes', value: 'minutes'}
                      ]} 
                      value={intervalUnit} 
                      onChange={(value) => {
                        setIntervalUnit(value);
                        const ms = value === 'minutes' ? intervalValue * 60000 : intervalValue * 1000;
                        setSettings((s) => ({ ...s, updateIntervalMs: ms }));
                      }} 
                    />
                  </InlineGrid>
                </BlockStack>
                <Checkbox label="Show on mobile devices" checked={settings.showOnMobile} onChange={(checked) => setSettings((s) => ({ ...s, showOnMobile: checked }))} />
              </BlockStack>
            </Card>

            <Card>
              <BlockStack gap="400">
                <Text variant="headingMd" as="h2">Visibility</Text>
                <Text variant="headingSm" as="h3">Show on page types</Text>
                <BlockStack gap="300">
                  <Checkbox label="Home page" checked={settings.visibility?.showOnHome ?? true} onChange={(checked) => setSettings((s) => ({ ...s, visibility: { ...s.visibility, showOnHome: checked } }))} />
                  <Checkbox label="Product pages" checked={settings.visibility?.showOnProduct ?? true} onChange={(checked) => setSettings((s) => ({ ...s, visibility: { ...s.visibility, showOnProduct: checked } }))} />
                  <Checkbox label="Collection pages" checked={settings.visibility?.showOnCollection ?? true} onChange={(checked) => setSettings((s) => ({ ...s, visibility: { ...s.visibility, showOnCollection: checked } }))} />
                  <Checkbox label="Cart page" checked={settings.visibility?.showOnCart ?? true} onChange={(checked) => setSettings((s) => ({ ...s, visibility: { ...s.visibility, showOnCart: checked } }))} />
                </BlockStack>
                <Divider />
                <BlockStack gap="300">
                  <Text variant="headingSm" as="h3">Exclude specific products</Text>
                  <Button onClick={openProductPicker}>Choose products to exclude</Button>
                  {settings.excludeProductHandles && settings.excludeProductHandles.length > 0 && (
                    <Box>
                      <Text variant="bodySm" as="p" tone="subdued">
                        {settings.excludeProductHandles.length} product(s) excluded
                      </Text>
                      <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', marginTop: '8px' }}>
                        {settings.excludeProductHandles.map((handle, idx) => (
                          <div key={handle} style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '4px 8px', background: '#f3f4f6', borderRadius: '4px', fontSize: '12px' }}>
                            <span>{handle}</span>
                            <button 
                              type="button" 
                              onClick={() => {
                                setSettings((s) => ({ 
                                  ...s, 
                                  excludeProductHandles: s.excludeProductHandles.filter((_, i) => i !== idx),
                                  excludeProductIds: s.excludeProductIds?.filter((_, i) => i !== idx) || []
                                }));
                              }}
                              style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, lineHeight: 1 }}
                            >
                              ✕
                            </button>
                          </div>
                        ))}
                      </div>
                    </Box>
                  )}
                </BlockStack>
                <TextField label="Exclude product tags" value={(settings.excludeTags || []).join(', ')} onChange={(value) => setSettings((s) => ({ ...s, excludeTags: value.split(',').map(v => v.trim()).filter(Boolean) }))} autoComplete="off" helpText="Comma-separated list" placeholder="excluded, no-widget" />
              </BlockStack>
            </Card>

            <Card>
              <BlockStack gap="400">
                <Text variant="headingMd" as="h2">Design</Text>
                <InlineGrid columns={2} gap="400">
                  <TextField label="Background color" value={settings.backgroundColor} onChange={(value) => setSettings((s) => ({ ...s, backgroundColor: value }))} autoComplete="off" prefix="#" placeholder="111827" />
                  <TextField label="Text color" value={settings.textColor} onChange={(value) => setSettings((s) => ({ ...s, textColor: value }))} autoComplete="off" prefix="#" placeholder="ffffff" />
                </InlineGrid>
                <Select label="Style variant" options={[{label:'Pill (rounded)', value:'pill'}, {label:'Card (square)', value:'card'}, {label:'Glass (translucent)', value:'glass'}]} value={settings.variant} onChange={(value) => setSettings((s) => ({ ...s, variant: value }))} />
                <RangeSlider label="Border radius" value={settings.borderRadius} onChange={(value) => setSettings((s) => ({ ...s, borderRadius: value }))} min={0} max={50} suffix={<Text variant="bodyMd" as="p">{settings.borderRadius}px</Text>} />
                <RangeSlider label="Font size" value={settings.fontSize} onChange={(value) => setSettings((s) => ({ ...s, fontSize: value }))} min={10} max={24} suffix={<Text variant="bodyMd" as="p">{settings.fontSize}px</Text>} />
                <InlineGrid columns={2} gap="400">
                  <RangeSlider label="Padding X" value={settings.paddingX} onChange={(value) => setSettings((s) => ({ ...s, paddingX: value }))} min={0} max={64} suffix={<Text variant="bodyMd" as="p">{settings.paddingX}px</Text>} />
                  <RangeSlider label="Padding Y" value={settings.paddingY} onChange={(value) => setSettings((s) => ({ ...s, paddingY: value }))} min={0} max={64} suffix={<Text variant="bodyMd" as="p">{settings.paddingY}px</Text>} />
                </InlineGrid>
                <RangeSlider label="Opacity" value={settings.opacity} onChange={(value) => setSettings((s) => ({ ...s, opacity: value }))} min={0} max={1} step={0.05} suffix={<Text variant="bodyMd" as="p">{Math.round(settings.opacity * 100)}%</Text>} />
                <Checkbox label="Drop shadow" checked={settings.shadow} onChange={(checked) => setSettings((s) => ({ ...s, shadow: checked }))} />
                <Checkbox label="Backdrop blur (glass effect)" checked={settings.backdropBlur} onChange={(checked) => setSettings((s) => ({ ...s, backdropBlur: checked }))} />
                <Divider />
                <InlineGrid columns={2} gap="400">
                  <TextField type="number" label="Border width" value={String(settings.borderWidth)} onChange={(value) => setSettings((s) => ({ ...s, borderWidth: parseInt(value || '0', 10) }))} autoComplete="off" suffix="px" />
                  <TextField label="Border color" value={settings.borderColor} onChange={(value) => setSettings((s) => ({ ...s, borderColor: value }))} autoComplete="off" prefix="#" placeholder="000000" />
                </InlineGrid>
                <RangeSlider label="Z-index (stacking order)" value={settings.zIndex || 10} onChange={(value) => setSettings((s) => ({ ...s, zIndex: value }))} min={1} max={4999} step={10} suffix={<Text variant="bodyMd" as="p">{settings.zIndex || 10}</Text>} helpText="Higher values appear above other elements (e.g., cart drawer)" />
              </BlockStack>
            </Card>

            <Card>
              <BlockStack gap="400">
                <Text variant="headingMd" as="h2">Icon</Text>
                <Select label="Icon type" options={[{label:'Emoji', value:'emoji'}, {label:'Image URL', value:'url'}, {label:'None', value:'none'}]} value={settings.iconType} onChange={(value) => setSettings((s) => ({ ...s, iconType: value }))} />
                {settings.iconType === 'emoji' && (
                  <BlockStack gap="300">
                    <TextField label="Current emoji" value={settings.iconEmoji} onChange={(value) => setSettings((s) => ({ ...s, iconEmoji: value }))} autoComplete="off" />
                    <Text variant="bodySm" as="p" tone="subdued">Pick an emoji:</Text>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(8, 1fr)', gap: '8px' }}>
                      {['👀','🔥','⭐','⚡','🛒','📈','💬','🎉','❤️','✅','🧡','💎','🕒','🏷️','🆕','✨'].map((em) => (
                        <Button key={em} onClick={() => setSettings((s) => ({ ...s, iconEmoji: em }))} pressed={em === settings.iconEmoji} size="large">{em}</Button>
                      ))}
                    </div>
                  </BlockStack>
                )}
                {settings.iconType === 'url' && (
                  <TextField label="Icon image URL" value={settings.iconUrl} onChange={(value) => setSettings((s) => ({ ...s, iconUrl: value }))} autoComplete="off" placeholder="https://example.com/icon.png" helpText="16x16 or 24x24 recommended" />
                )}
              </BlockStack>
            </Card>
          </BlockStack>
        </Layout.Section>

        <Layout.Section variant="oneHalf">
          <Affix offsetTop={topOffset} disabled={isNarrow} zIndex={10}>
            <Card>
              <BlockStack gap="400">
                <Text variant="headingMd" as="h2">Live Preview</Text>
                <Text variant="bodySm" as="p" tone="subdued">
                  This preview updates in real-time as you change settings
                </Text>
                <WidgetPreview settings={settings} />
              </BlockStack>
            </Card>
          </Affix>
        </Layout.Section>
      </Layout>
    </Page>
  );
}

function WidgetPreview({ settings }) {
  if (!settings.enabled) {
    return (
      <Box padding="400" background="bg-surface-secondary">
        <Text variant="bodySm" tone="subdued">Widget is currently disabled</Text>
      </Box>
    );
  }
  
  const range = Math.max(0, (settings.countMax ?? 0) - (settings.countMin ?? 0));
  const count = (settings.countMin ?? 0) + Math.round(Math.random() * range);
  const text = settings.textTemplate.replace("{{count}}", String(count));
  const pos = settings.position.includes("bottom") ? { bottom: 16 } : { top: 16 };
  const horizontal = settings.position.includes("right") ? { right: 16 } : { left: 16 };

  const pad = { padding: `${settings.paddingY}px ${settings.paddingX}px` };
  const variantStyles = (() => {
    const base = {
      background: settings.backgroundColor,
      color: settings.textColor,
      borderRadius: settings.variant === 'pill' ? Math.max(settings.borderRadius, 999) : settings.borderRadius,
      opacity: settings.opacity,
      border: settings.borderWidth ? `${settings.borderWidth}px solid ${settings.borderColor}` : 'none',
      boxShadow: settings.shadow ? "0 6px 20px rgba(0,0,0,0.2)" : "none",
      fontSize: settings.fontSize,
      display: 'inline-flex',
      alignItems: 'center',
      gap: 8,
      backdropFilter: settings.variant === 'glass' && settings.backdropBlur ? 'saturate(180%) blur(8px)' : 'none',
      zIndex: settings.zIndex || 10,
    };
    if (settings.variant === 'glass') {
      return { ...base, background: 'rgba(17,24,39,0.5)' };
    }
    return base;
  })();

  return (
    <Box padding="400" background="bg-surface-secondary" borderRadius="200">
      <div style={{ position: "relative", minHeight: 120, background: '#f3f4f6', borderRadius: 8, padding: 16 }}>
        <div style={{ position: "absolute", zIndex: 1, ...pos, ...horizontal, ...pad, ...variantStyles, fontWeight: 500 }}>
          {settings.iconType === 'emoji' && settings.iconEmoji ? (
            <span aria-hidden="true">{settings.iconEmoji}</span>
          ) : settings.iconType === 'url' && settings.iconUrl ? (
            <img src={settings.iconUrl} alt="" style={{ width: 18, height: 18 }} />
          ) : null}
          <span>{text}</span>
        </div>
      </div>
    </Box>
  );
}

export const headers = (headersArgs) => {
  return boundary.headers(headersArgs);
};


function Affix({
  children,
  offsetTop = 80,
  disabled = false,
  zIndex = 5,
}) {
  const holderRef = useRef(null);
  const contentRef = useRef(null);
  const [affixed, setAffixed] = useState(false);
  const [fixedStyle, setFixedStyle] = useState({});

  const recalc = () => {
    if (!holderRef.current || !contentRef.current) return;
    const holderRect = holderRef.current.getBoundingClientRect();
    const shouldAffix = !disabled && holderRect.top <= offsetTop;

    if (shouldAffix) {
      const w = holderRect.width;
      const h = contentRef.current.getBoundingClientRect().height;
      // reserve space to prevent layout jump
      holderRef.current.style.minHeight = `${h}px`;
      setFixedStyle({
        position: 'fixed',
        top: offsetTop,
        left: holderRect.left, // viewport-relative; works with Polaris scroll container
        width: w,
        zIndex,
      });
    } else {
      holderRef.current.style.minHeight = '0px';
    }
    setAffixed(shouldAffix);
  };

  useLayoutEffect(() => {
    if (typeof window === 'undefined') return;
    const scrollEl =
      document.querySelector('.Polaris-Frame__Content') || window;

    const ro = new ResizeObserver(() => recalc());
    contentRef.current && ro.observe(contentRef.current);
    holderRef.current && ro.observe(holderRef.current);

    const onScroll = () => recalc();
    const onResize = () => recalc();

    // attach listeners to the real scroll container + window resize
    scrollEl.addEventListener?.('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onResize);

    // first pass
    recalc();

    return () => {
      scrollEl.removeEventListener?.('scroll', onScroll);
      window.removeEventListener('resize', onResize);
      ro.disconnect();
    };
  }, [disabled, offsetTop]);

  return (
    <div ref={holderRef}>
      <div ref={contentRef} style={affixed ? fixedStyle : undefined}>
        {children}
      </div>
    </div>
  );
}
