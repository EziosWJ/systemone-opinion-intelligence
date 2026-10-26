/**
 * Centralized default copy. Shared UI copy is resolved from here so a future
 * locale provider can swap dictionaries without touching component structure.
 * Domain labels (statuses, industries, navigation) live in their own config
 * modules; page-specific prose stays with the page component.
 */
const zhCN = {
  localeName: '简体中文',
  common: {
    loading: '正在加载…',
    loadingPage: '页面加载中…',
    loadFailed: '加载失败',
    saveFailed: '保存失败',
    retry: '重试',
    reload: '重新加载',
    search: '搜索',
    reset: '重置',
    cancel: '取消',
    save: '保存',
    saveChanges: '保存修改',
    close: '关闭',
    confirm: '确认',
    delete: '删除',
    edit: '编辑',
    detail: '详情',
    back: '返回',
    backToList: '返回列表',
    noData: '暂无数据',
    noResult: '暂无匹配结果',
    demoMemory: '数据来自 MSW 内存模拟，刷新后重置',
    exportFailed: (message: string) => `导出失败：${message}`,
    exported: (count: number) => `已导出 ${count} 条记录`,
    noExportData: '当前没有可导出的数据',
    selectedCount: (count: number) => `已选择 ${count} 项`,
  },
  async: {
    emptyTitle: '暂无数据',
    defaultEmptyDescription: '调整筛选条件后重试。',
    genericError: '加载失败',
  },
  search: {
    placeholder: '输入关键词搜索',
  },
  table: {
    density: '表格密度',
    densityLoose: '宽松',
    densityStandard: '标准',
    densityCompact: '紧凑',
    columnSettings: '列设置',
    showColumns: '显示列',
    columnPanel: '显示列设置',
    showAllColumns: '显示全部列',
    noConfigurableColumns: '没有可配置的列',
    unnamedColumn: '未命名列',
    selectionScope: '选择范围',
    selectedPage: '当前页',
    selectedAll: '跨分页',
    selectedScopePage: '（当前页）',
    selectedScopeAll: '（跨分页）',
    clearSelection: '取消选择',
    total: (total: number) => `共 ${total} 条`,
  },
  form: {
    cancel: '取消',
    save: '保存',
    saveChanges: '保存修改',
  },
  export: {
    label: '导出',
    scopeFiltered: '当前筛选结果',
    scopeSelected: '选中行',
    csv: (scope: string) => `导出 CSV（${scope}）`,
    xlsx: (scope: string) => `导出 XLSX（${scope}）`,
  },
  upload: {
    dropTitle: '点击或拖拽文件到此区域',
    hint: (accept: string, maxSizeMB: number, maxCount: number) =>
      `支持 ${accept}，单个文件不超过 ${maxSizeMB} MB，最多 ${maxCount} 个`,
    noticeBefore: '这是演示用模拟上传：文件不会发送到服务器，也不会写入任何业务数据。文件名包含',
    noticeAfter: '可验证失败与重试流程。',
    listLabel: '模拟上传文件列表',
    success: '模拟上传成功',
    failure: '模拟上传失败（文件名包含 fail），可重试。',
    preview: '预览',
    retry: '重试',
    remove: (name: string) => `移除 ${name}`,
    removeLabel: '移除',
    previewHint: '当前示例未配置预览处理器',
    tooMany: (count: number) => `最多同时上传 ${count} 个文件`,
    unsupportedType: (accept: string) => `不支持的文件类型，仅允许 ${accept}`,
    tooLarge: (size: number) => `文件大小不能超过 ${size} MB`,
    progress: (name: string) => `${name} 上传进度`,
    selectLabel: '选择要模拟上传的文件',
  },
  command: {
    title: '全局搜索',
    placeholder: '搜索页面、导航入口或快捷操作…',
    inputLabel: '搜索页面或导航入口',
    resultsLabel: '搜索结果',
    empty: '没有匹配的页面或操作',
    resultCount: (count: number) => `${count} 个结果`,
    arrowHint: '↑↓ 选择',
    enterHint: 'Enter 打开',
    escapeHint: 'Esc 关闭',
    shortcutHint: 'Ctrl / ⌘ + K',
  },
  nav: {
    main: '主导航',
    search: '搜索',
    openSearch: '打开全局搜索',
    searchTooltip: (shortcut: string) => `全局搜索（${shortcut}）`,
    openMenu: '打开导航菜单',
    lightTheme: '切换浅色主题',
    darkTheme: '切换深色主题',
    skipToContent: '跳到主要内容',
    home: '首页',
    breadcrumb: '面包屑',
    brandHome: (name: string) => `${name} 首页`,
  },
  errors: {
    title404: '页面不存在',
    title500: '页面加载失败',
    subtitle404: '请检查地址，或返回应用首页。',
    subtitle500: '页面遇到问题，请重试或返回首页。生产环境不会展示内部堆栈。',
    home: '返回首页',
    dashboard: '返回仪表盘',
  },
} as const;

export type CopyDictionary = typeof zhCN;
export type AppLocale = 'zh-CN';

const dictionaries: Record<AppLocale, CopyDictionary> = { 'zh-CN': zhCN };

let activeLocale: AppLocale = 'zh-CN';

export const copy: CopyDictionary = dictionaries[activeLocale];

/** Locale seam for a future i18n provider; no full i18n framework in V1. */
export function setCopyLocale(locale: AppLocale): void {
  activeLocale = locale;
}

export function getCopy(): CopyDictionary {
  return dictionaries[activeLocale];
}
